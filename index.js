// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.
const api_key = process.env.API_KEY

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: path.join(__dirname, 'ProjectSourceCode', 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'ProjectSourceCode', 'views', 'partials'),
});
  


// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'ProjectSourceCode', 'views'));

app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

// TODO - Include your API routes here
app.get('/', (req, res) => {
    res.send("Application is working!")
})

app.get('/login', (req, res) => {
    //TODO RENDER THE LOGIN PAGE
    res.render('pages/login')
})
app.get('/home', async (req, res) => {
  try {
    const response = await axios({
      method: 'get',
      url: "https://api.the-odds-api.com/v4/sports/upcoming/odds",
      params: {
        apiKey: api_key,
        regions: 'us',
        oddsFormat: 'american'
      }
    });
    const events = response.data
    .filter(event => {
      return (
        event.bookmakers.length > 0 &&
        event.bookmakers[0].markets?.length > 0 &&
        event.bookmakers[0].markets[0].outcomes?.length > 0
      );
    })
    .map(event => {
      const bookmaker = event.bookmakers[0];
      const moneyline = bookmaker?.markets.find(market => market.key === "h2h");
      const date = new Date(event.commence_time);
      const date_string = date.toLocaleString("en-US", {
        timeZone: "America/Denver",
        hour12: true,            
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
      return {
        id: event.id,
        sport: event.sport_key,
        date: date_string,
        home_team: event.home_team,
        away_team: event.away_team,
        odds: moneyline?.outcomes?.map(outcome => ({
          team: outcome.name,
          moneyline: outcome.price
        })) || []
      };
    });
    console.log('Remaining requests',response.headers['x-requests-remaining'])
    console.log('Used requests',response.headers['x-requests-used'])
    res.render('pages/home', {
      events: events,
      isLoggenIn: req.session.user !== undefined,
    })
  } catch (error) {
    console.error(error);
  }
})
// -- Register User --
app.get('/register', (req, res) => {
    //TODO RENDER THE REGISTRATION PAGE
    res.render('pages/register');

})

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  

  try {

      const searchQuery = `SELECT * FROM Users WHERE Users.Username = $1`;
      const duplicates = await db.any(searchQuery, [username]);

      if(duplicates.length > 0){
        res.render('pages/register', {message: "Username Already Exists."});
      }

      else{
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = 'INSERT INTO Users(Username, Password) VALUES ($1, $2) RETURNING *;';

        await db.one(insertQuery, [username, hashedPassword]);

        // Redirect to login after successful registration
        res.redirect('/login');
      }
      
  } catch (err) {
      console.error(err);
      res.render('pages/register', { message: "Error registering user. Try again." });
  }
});

// -- Login in User --
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const searchQuery = 'SELECT * FROM Users WHERE Username = $1;';

  try {
      const user = await db.one(searchQuery, [username]);

      // Compare the hashed password
      const match = await bcrypt.compare(password, user.password);
      if (match) {
          req.session.user = user; // Store user in session
          req.session.save(() => {
              res.redirect('/home'); // Redirect AFTER session is saved
          });
      } else {
          res.render('pages/login', { message: "Incorrect username or password!" });
      }
  } catch (err) {
      console.error(err);
      res.render('pages/login', { message: "User not found!" });
  }
});

function isAuthenticated(req, res, next) {
  if (req.session.user) {
      return next(); // User is logged in, proceed to the next middleware
  } else {
      res.redirect('/login'); // Not logged in, redirect to login page
  }
}
// -- Log User out
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
      res.render('pages/login'); // Render the logout page without redirecting
  });
});

app.get('/profile', isAuthenticated,(req, res) => {
  req.session.destroy(() => {
      res.render('pages/profile'); // Render the logout page without redirecting
  });
});

// -- Bets Routes --
app.post('/bets', isAuthenticated, async (req, res) => {
  const { eventId, amount, betType, betDetail } = req.body;
  const userId = req.session.user.userid;

  try {
    const { balance } = await db.one('SELECT Balance FROM Users WHERE UserID = $1', [userId]);
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await db.none(
      `INSERT INTO Bets (UserID, EventID, Amount, BetType, BetDetail) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, eventId, amount, betType, betDetail]
    );

    await db.none('UPDATE Users SET Balance = Balance - $1 WHERE UserID = $2', [amount, userId]);
    await db.none('INSERT INTO Transactions (UserID, Amount, Type) VALUES ($1, $2, \'bet\')', [userId, -amount]);

    res.redirect('/my-bets');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error placing bet.");
  }
});

// -- Transactions Route --
app.get('/transactions', isAuthenticated, async (req, res) => {
  const userId = req.session.user.userid;

  try {
    const transactions = await db.any(
      `SELECT * FROM Transactions WHERE UserID = $1 ORDER BY Timestamp DESC`,
      [userId]
    );

    res.render('pages/transactions', { transactions });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching transactions.");
  }
});

// -- My Bets Route
app.get('/my-bets', isAuthenticated, async (req, res) => {
  const username = req.session.user.username;

  try {
    const activeBets = await db.any(
      `SELECT * FROM UserBetHistory 
       WHERE Username = $1 AND WinLose IS NULL 
       ORDER BY Time DESC`,
      [username]
    );

    const pastBets = await db.any(
      `SELECT * FROM UserBetHistory 
       WHERE Username = $1 AND WinLose IS NOT NULL 
       ORDER BY Time DESC`,
      [username]
    );

    res.render('pages/my-bets', {
      activeBets,
      pastBets,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving bets.");
  }
});




// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');