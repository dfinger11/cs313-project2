const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const sanitizer = require('sanitize')();
const crypto = require('crypto');

const { Pool } = require("pg");
const path = require('path');

var authenticated = false;

const connectionString = process.env.DATABASE_URL || "postgres://deaj:test@localhost:5432/project2";

const pool = new Pool({connectionString: connectionString});

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.set('trust proxy', 1);
app.use(session({
    secret: 'Keep it secret keep it safe',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true }
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
    sess = req.session;
    if(sess.authenticated !== true) {
        sess.authenticated = false
    }
    res.render('pages/home')
});
app.get('/curriculum', (req, res) => res.render('pages/curriculum'));
app.get('/register', (req, res) => res.sendFile( path.join(__dirname, 'public/register.html')));
app.post('/getUser', getUser);
app.post('/createUser', createUser);

app.listen(app.get("port"), function () {
    console.log("Now listening for connection on port: ", app.get("port"));
});

function getUser(request, response) {
    const username = request.body.username;
    const password = request.body.password;

    getUserFromDb(request, username, password, function (error, result) {
        if (error || result == null || result.length !== 1) {
            response.status(500).json({success: false, data: error});
        } else {
            const username = result[0];
            response.status(200).json(username);
        }
    });

}

function createUser(request, response) {
    const fname = request.body.fname;
    const lname = request.body.lname;
    const username = request.body.username;
    const password = request.body.password;
    addUserToDb(response, request, fname, lname, username, password, function (error) {
        if (error) {
            console.log("Something Broke: " + error);
        } else {
            console.log("Success in calling database.");
        }
    });
}

function addUserToDb(response, request, fname, lname, username, password, callback) {
    console.log("Adding user to DB with fname: " + fname);
    console.log("Adding user to DB with lname: " + lname);
    console.log("Adding user to DB with username: " + username);
    console.log("Adding user to DB with password: " + password);
    const sql = "INSERT INTO users(fname, lname, username, password_hash) VALUES ($1, $2, $3, $4)";
    const params = [fname, lname, username, password];

    pool.query(sql, params, function(err) {
        if (err) {
            console.log("Error in query: ");
            console.log(err);
            callback(err, null);
        } else {
            getUserFromDb(request, username, password, function (error, result) {
                if (error || result == null || result.length !== 1) {
                    response.status(500).json({success: false, data: error});
                } else {
                    const username = result[0];
                    response.status(200).json(username);
                }
            })
        }
    });
}

function getUserFromDb(request, username, password, callback) {
    console.log("Getting user from DB with username: " + username);

    const sql = "SELECT username FROM users WHERE username =$1 AND password_hash=$2;";

    const params = [username, password];

    pool.query(sql, params, function(err, result) {
        if (err) {
            console.log("Error in query: ");
            console.log(err);
            callback(err, null);
        } else {
            request.session.authenticated = true;
            request.session.username = username;
            console.log("Found result: " + JSON.stringify(result.rows));
        }

        callback(null, result.rows);
    });

}