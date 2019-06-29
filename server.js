const express = require('express');
const app = express();

const { Pool } = require("pg");
const path = require('path');

const connectionString = process.env.DATABASE_URL || "postgres://fnixvwmnywquze:914a04d2f29ba1572e12a8f19119e01b009e41ba56342db14a8b9b1d1bf31d93@ec2-50-19-221-38.compute-1.amazonaws.com:5432/dd74p95l3tpdkk";

const pool = new Pool({connectionString: connectionString});

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', (req, res) => res.sendFile( path.join(__dirname, 'public/login.html')));

app.listen(app.get("port"), function () {
    console.log("Now listening for connection on port: ", app.get("port"));
});