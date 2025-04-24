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
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
});

  


// database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  }
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
app.set('views', path.join(__dirname, 'views'));

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
    res.render("pages/login")
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
    invalid_sports = ["baseball_ncaa", "icehockey_liiga", "cricket_psl", "soccer_conmebol_copa_sudamericana"];
    const events = response.data
    .filter(event => {
      return (
        event.bookmakers.length > 0 &&
        event.bookmakers[0].markets?.length > 0 &&
        event.bookmakers[0].markets[0].outcomes?.length > 0 &&
        !invalid_sports.includes(event.sport_key)
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
    const balance = req.session.user ? (await db.one('SELECT Balance FROM Users WHERE Username = $1', [req.session.user.username])).balance : 0;
    res.render('pages/home', {
      events: events,
      isLoggenIn: req.session.user !== undefined,
      balance: balance
    })

  } catch (error) {
    console.error(error);
  }
})

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
        const insertQuery = 'INSERT INTO Users(Username, Password, Balance) VALUES ($1, $2, 500) RETURNING *;';

        await db.one(insertQuery, [username, hashedPassword]);
        

        // Redirect to login after successful registration
        res.redirect('/login');
      }
      
  } catch (err) {
      console.error(err);
      res.render('pages/register', { message: "Error registering user. Try again." });
  }
});


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


app.get('/friends', async (req, res) => {
  //search for friends, then render the page and send friends info through
  userId = req.session.user.userid;
  
  try {
    //friend amount and friends

    const friendsWithWins = await db.any(`
      SELECT 
        Users.UserID,
        Users.Username,
        COUNT(CASE WHEN Bets.WinLose = true THEN 1 END) AS win_count
      FROM Friendships
      JOIN Users ON Friendships.FriendID = Users.UserID
      LEFT JOIN Bets ON Users.UserID = Bets.UserID
      WHERE Friendships.UserID = $1
      GROUP BY Users.UserID, Users.Username
      ORDER BY win_count DESC
    `, [userId]);

    console.log("Friends with wins:", friendsWithWins);

    res.render('pages/friends', {friends: friendsWithWins});
  }
  catch(err){
    console.error(err);
    res.render('pages/home', {message: 'Error loading friend list'});
  }
 
})


app.post('/add_friend', isAuthenticated, async (req, res) => {
  const { friend_username: friend_username } = req.body; // Destructure properly
  const userId = req.session.user.userid;

  console.log("req.body:", req.body);
  console.log("friend_username:", friend_username);
  console.log("userId:", userId);
  
  try {
      // 1. Find friend's UserID
    const result = await db.oneOrNone(
      'SELECT UserID FROM Users WHERE Username = $1', 
      [friend_username]
    );
    
    if(!result) {
      res.render('pages/friends', {message: "No user found"});
      console.log('AHH HAHA! NO FRIENDS WITH THAT NAME!');
      return;
    }

    const friend_id = result.userid;
    
    const duplicateQuery = 'SELECT * FROM Friendships WHERE UserID = $1 AND FriendID = $2;';
    const duplicates = await db.any(duplicateQuery, [userId, friend_id]);

    if (duplicates.length > 0) {
      res.render('pages/friends', {message: "Friend already added!"});
      console.log("Friend already added!")
      return;
    }

    const insertQuery = 'INSERT INTO Friendships (UserID, FriendID) VALUES ($1, $2);';
    await db.none(insertQuery, [userId, friend_id]);

    //
    console.log('IT ALL WORKED!!');
    return res.redirect('/friends');

  } catch(err) {
    console.error(err);
    res.render('pages/friends', {message: "User not found"})
  }
})

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
      res.render('pages/logout'); // Render the logout page without redirecting
  });
});

// -- Bets Routes --
app.post('/bets', isAuthenticated, async (req, res) => {
  const { eventId, amount, sport, betType, betDetail, betLine } = req.body;
  const userId = req.session.user.userid;
  console.log("Bet Line: ",betLine);
  const int_betLine = parseInt(betLine, 10);
  try {
    
    await db.none(
      `INSERT INTO Bets (UserID, EventID, Amount, Sport, BetType, BetDetail, BetLine) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, eventId, amount, sport, betType, betDetail, int_betLine]
    );

    await db.none('UPDATE Users SET Balance = Balance - $1 WHERE UserID = $2', [amount, userId]);
    await db.none('INSERT INTO Transactions (UserID, Amount, Type) VALUES ($1, $2, \'bet\')', [userId, -amount]);

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal error placing bet.");
  }
});


app.get('/profile', isAuthenticated, async (req, res) => {
  //API logic and settling bets
  const userId = req.session.user.userid;
  try {
    //api logic and settling bets
    const unsettledBets = await db.any(
      `SELECT * FROM UserBetHistory 
       WHERE UserID = $1 AND WinLose IS NULL`,
      [userId]
    );
    const uniqueSports = [...new Set(unsettledBets.map(bet => bet.sport).filter(Boolean))];
    console.log(uniqueSports);
    const all_scores = [];
    for (const sport of uniqueSports) {
      const eventIDs = unsettledBets
      .filter(bet => bet.sport === sport)
      .map(bet => bet.eventid)
      .join(',');
      
      console.log(`---`);
      console.log(`SPORT: ${sport}`);
      console.log(`EVENT IDs: ${eventIDs}`);

      if (!eventIDs || !sport) {
        console.warn("Skipping empty sport or eventIDs");
        continue;
      }

      try {
        const response = await axios({
          method: 'get',
          url: `https://api.the-odds-api.com/v4/sports/${sport}/scores`,
          params: {
            apiKey: api_key,
            daysFrom: 3,
            eventIds: eventIDs
          }
        });
        if (response.status === 200) {
          console.log('Scores:', JSON.stringify(response.data, null, 2));
        } else {
          console.log('No scores returned or events not completed.');
        }
        console.log('Remaining requests',response.headers['x-requests-remaining']);
        console.log('Used requests',response.headers['x-requests-used']);
        console.log(`API response for ${sport}:`, response.data);
        all_scores.push(...response.data);
      } catch (err) {
        console.error(`API call failed for sport: ${sport}, eventIds: ${eventIDs}`);
        console.error(err.response?.data || err.message);
      }
    }

    for (const bet of unsettledBets) {
      const match = all_scores.find(score => score.id === bet.eventid);
      if (!match || !match.completed || !match.scores || match.scores.length === 0) {
        console.log("continuing from ",bet.eventid)
        continue;
      }
      const bet_team = match.scores.find(team => team.name === bet.betdetail);
      if (!bet_team) {
        console.warn(`Could not find team ${bet.betdetail} in scores for eventID: ${bet.eventid}`);
        continue;
      }
      const didWin = match.scores
      .filter(team => team.name !== bet.betdetail)
      .every(opponent => bet_team.score > opponent.score);

      await db.none(
        `UPDATE Bets SET WinLose = $1 WHERE UserID = $2 AND EventID = $3 AND BetDetail= $4`,
        [didWin, userId, bet.eventid, bet.betdetail]
      );


      //win or loss database update
      if (didWin) {
        const line = bet.betline;
        let payout = 0;
        const wager = bet.amount;
        if (line > 0) {
          //positive line (ex. +150)
          payout = wager + (wager * (line / 100));
        } else {
          //negative line (ex. -100)
          payout = wager + (wager * (100 / Math.abs(line)));
        }

        await db.none(
          `UPDATE Users SET Balance = Balance + $1 WHERE UserID = $2`,
          [payout, userId]
        );
        await db.none(
          `UPDATE Bets SET Payout = $1 WHERE UserID = $2 AND EventID = $3 AND BetDetail = $4`,
          [payout, userId, bet.eventid, bet_team.name]
        );
        await db.none(
          `INSERT INTO Transactions (UserID, Amount, Type) 
          VALUES ($1, $2, \'win\')`, 
          [userId, payout]);
        //probably need a transactions insert here
      } 
    } 

    // -- Get current balance --
    const { balance, username } = await db.one(
      'SELECT Balance, Username FROM Users WHERE UserID = $1',
      [userId]
    );

    // -- Count won bets --
    const { count: wonCount } = await db.one(
      `SELECT COUNT(*) FROM Bets WHERE UserID = $1 AND WinLose = true`,
      [userId]
    );

    // -- Get past bets --
    const settledBets = await db.any(
      `SELECT BetDetail, Amount, WinLose, Payout
       FROM UserBetHistory 
       WHERE UserID = $1
       AND WinLose IS NOT NULL`,
      [userId]
    );
    const ongoingBets = await db.any(
      `SELECT BetDetail, Amount, WinLose, BetLine
      FROM UserBetHistory
      WHERE UserID = $1
      AND WinLose IS NULL`,
      [userId]
    );
    console.log("unsettled bets: ",unsettledBets);
    console.log("settledBets: ",settledBets);
    console.log("ongoingBets: ",ongoingBets);
    res.render('pages/profile', {
      balance,
      username,
      wonCount,
      settledBets,
      ongoingBets
    });
    

  } catch (err) {
    console.error('Error loading profile:', err);
    res.status(500).send('Error loading profile.');
  }
});





// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');