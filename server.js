const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const { Pool } = require("pg");
const path = require('path');

//const connectionString = process.env.DATABASE_URL || "postgres://fnixvwmnywquze:914a04d2f29ba1572e12a8f19119e01b009e41ba56342db14a8b9b1d1bf31d93@ec2-50-19-221-38.compute-1.amazonaws.com:5432/dd74p95l3tpdkk";
const connectionString = process.env.DATABASE_URL || "postgres://deaj:test@localhost:5432/project2";

const pool = new Pool({connectionString: connectionString});

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', (req, res) => res.sendFile( path.join(__dirname, 'public/login.html')));
app.post('/getUser', getUser);

app.listen(app.get("port"), function () {
    console.log("Now listening for connection on port: ", app.get("port"));
});

function getUser(request, response) {
    const username = request.body.username;
    const password = request.body.password;

    getUserFromDb(username, password, function (error, result) {
        if (error || result == null || result.length != 1) {
            response.status(500).json({success: false, data: error});
        } else {
            const username = result[0];
            response.status(200).json(username);
        }
    });

}


function getUserFromDb(username, password, callback) {
    console.log("Getting user from DB with username: " + username);

    const sql = "SELECT username FROM users WHERE username =$1 AND password_hash=$2;";

    const params = [username, password];

    pool.query(sql, params, function(err, result) {
        if (err) {
            console.log("Error in query: ");
            console.log(err);
            callback(err, null);
        }

        console.log("Found result: " + JSON.stringify(result.rows));

        callback(null, result.rows);
    });

}