// ********************** Initialize server **********************************

const server = require('../../index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

describe('POST /register - Register API Tests', () => {
  const uniqueUser = 'testuser_' + Date.now();

  before(function(done) {
    chai.request(server)
      .post('/register')
      .send({ username: 'existinguser', password: 'testpassword' })
      .redirects(0)
      .end((err, res) => {
      done();
      });
  });

  it('should register a new user successfully', (done) => {
    chai.request(server)
      .post('/register')
      .send({ username: uniqueUser, password: 'testpassword' })
      .redirects(0)
      .end((err, res) => {
        
        expect(res).to.have.status(302);
        expect(res.headers.location).to.equal('/login');
        done();
      });
  });

  it('should fail to register with an existing username', (done) => {
    chai.request(server)
      .post('/register')
      .send({ username: 'existinguser', password: 'testpassword' })
      .end((err, res) => {
        
        expect(res).to.have.status(409);
        expect(res.text).to.include('Error registering user');
        done();
      });
  });
});


describe('Redirect testing for protected routes', () => {
  it('GET /discover should redirect to /login with 302 HTTP status code when not authenticated', (done) => {
    chai.request(server)
      .get('/discover')
      .redirects(0)
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res.headers.location).to.equal('/login');
        done();
      });
  });
});

describe('Negative login attempt - incorrect password', () => {
  it('should return an error message for incorrect password', (done) => {
    chai.request(server)
      .post('/login')
      .send({ username: 'existinguser', password: 'wrongpassword' })
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.include('Incorrect username or password!');
        done();
      });
  });
});

// ********************************************************************************