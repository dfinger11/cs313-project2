const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const sanitizer = require('sanitizer');
const bcrypt = require('bcrypt');

const { Pool } = require("pg");
const path = require('path');

let authenticated = false;
let username = null;
let role = null;

const connectionString = process.env.DATABASE_URL || "postgres://deaj:test@localhost:5432/project2";

const pool = new Pool({connectionString: connectionString});

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.set('trust proxy', 1);
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
    res.render('pages/home', {authenticated: authenticated, username: username, role: role});
});
app.get('/curriculum', (req, res) => res.render('pages/curriculum', {authenticated: authenticated, username: username, role: role}));
app.get('/register', (req, res) => res.sendFile( path.join(__dirname, 'public/register.html')));
app.post('/getUser', getUser);
app.post('/createUser', createUserAccount);
app.get('/logout', function (req, res) {
    username = null;
    role = null;
    authenticated = false;
    return res.redirect('/');
});

// endpoint for viewing the class as a whole.
app.get('/class', getClass);

// endpoint to get a users children.
app.get('/grades', getChildren);

// endpoint to edit student grade.
app.get('/gradesTeacher', (req, res) => res.render('pages/editGrades', {authenticated: authenticated, username: username, role: role}));
app.post('/editGrade', editGrade);

// endpoints to add or remove a student.
app.get('/addStudent', (req, res) => res.render('pages/addStudent', {authenticated: authenticated, username: username, role: role}));
app.post('/registerStudent', addStudent);

app.get('/removeStudent', (req, res) => res.render('pages/removeStudent', {authenticated: authenticated, username: username, role: role}));
app.post('/deleteStudent', removeStudent);

app.listen(app.get("port"), function () {
    console.log("Now listening for connection on port: ", app.get("port"));
});

function getUser(request, response) {
    username = sanitizer.sanitize(request.body.username);
    const password = sanitizer.sanitize(request.body.password);
    getUserFromDb(request, response, username, password, function (error, result) {
        if (error || result == null || result.length !== 1) {
            response.status(500).json({success: false, data: error});
            response.render('pages/home', {authenticated: authenticated, username: username, role: role});
        } else {
            //const username = result[0];
           // response.status(200).json(username);
            response.render('pages/home', {authenticated: authenticated, username: username, role: role});
        }
    });
}

function createUserAccount(request, response) {
    const fname = sanitizer.sanitize(request.body.fname);
    const lname = sanitizer.sanitize(request.body.lname);
    role = 'parent';
    username = sanitizer.sanitize(request.body.username);
    const password = sanitizer.sanitize(request.body.password);

    if(fname !== undefined && lname !== undefined && username !== undefined && password != undefined) {
        bcrypt.hash(password, 10, function(error, hash) {
            // Store hash in database
            if (error) {
                console.log("Something Broke when hashing password: " + error);
            } else {
                console.log("Success in creating password hash.");
                addUserToDb(response, request, fname, lname, role, username, password, hash, function (error) {
                    if (error) {
                        console.log("Something Broke: " + error);
                    } else {
                        console.log("Success in calling database.");
                    }
                });
            }
        });
    } else {
        console.log("Failed to create user");
        response.render('pages/home', {authenticated: authenticated, username: username, role: role});
    }
}

function addUserToDb(response, request, fname, lname, role, username, password, hash, callback) {
    console.log("Adding user to DB with fname: " + fname);
    console.log("Adding user to DB with lname: " + lname);
    console.log("Adding user to DB with username: " + username);
    console.log("Adding user to DB with password hash: " + hash);
    const sql = "INSERT INTO users(parent_fname, parent_lname, role, username, password_hash) VALUES ($1, $2, $3, $4, $5)";
    const params = [fname, lname, role, username, hash];

    pool.query(sql, params, function(err) {
        if (err) {
            console.log("Error in query: ");
            console.log(err);
            callback(err, null);
        } else {
            getUserFromDb(request, response, username, password, function (error, result) {
                if (error || result == null || result.length !== 1) {
                    response.status(500).json({success: false, data: error});
                } else {
                    const username = result[0];
                    //response.status(200).json(username);
                    response.render('pages/home', {authenticated: authenticated, username: username, role: role});
                }
            })
        }
    });
}

function getUserFromDb(request, response, username, password, callback) {
    console.log("Getting user from DB with username: " + username);

    const gethash = "SELECT password_hash FROM users WHERE username =$1";

    const hashParams = [username];

    pool.query(gethash, hashParams, function (error, result) {
        if(error) {
            console.log("Error in query: ");
            console.log(error);
            callback(error, null);
        } else {
            if(result.rows.length > 0) {
                const dbHash = result.rows[0].password_hash;
                console.log("Hash from db: " + dbHash);
                bcrypt.compare(password, dbHash, function(error, res) {
                    console.log("password from user: " + password);
                    if(res) {
                        // Passwords match
                        console.log("passwords matched!");
                        const sql = "SELECT username, role FROM users WHERE username =$1 AND password_hash=$2;";

                        const params = [username, dbHash];

                        pool.query(sql, params, function(error, result) {
                            if (error) {
                                console.log("Error in query: ");
                                console.log(error);
                                callback(error, null);
                            } else {
                                authenticated = true;
                                username = result.rows[0].username;
                                role = result.rows[0].role;
                                console.log("Found result: " + JSON.stringify(result.rows));
                            }

                            callback(null, result.rows);
                        });
                    } else {
                        // Passwords don't match
                        console.log("passwords DID NOT match!");
                        response.render('pages/home', {authenticated: authenticated, username: username, role: role});
                    }
                });
            } else {
                console.log("User or password is incorrect");
                response.render('pages/home', {authenticated: authenticated, username: username, role: role});
            }
        }
    });

}

function getClass(request, response) {
    const sql = 'SELECT student.fname, student.lname, student.grade_english, student.grade_math, student.grade_science, users.parent_fname, users.parent_lname, users.username from student INNER JOIN users ON users.user_pk = student.parent_fk;';

    pool.query(sql, function(error, result) {
        if (error) {
            console.log("Error in query: ");
            console.log(error);
            callback(error, null);
        } else {
            console.log("Getting Student List");
            // do stuff when you get the class.
            const classList = result.rows;
            console.log(result.rows[0]);
            response.render('pages/class', {authenticated: authenticated, username: username, role: role, students: classList});
        }
    });
}

function addStudent(request, response) {
    const fname = sanitizer.sanitize(request.body.fname);
    const lname = sanitizer.sanitize(request.body.lname);
    const user = sanitizer.sanitize(request.body.username);

    if(fname !== undefined && lname !== undefined && user !== undefined) {
        addStudenttDB(request, response, fname, lname, user, function (error) {
            if (error) {
                console.log("Something Broke: " + error);
            } else {
                console.log("Success in calling database.");
            }
        });
    } else {
        console.log("Failed to add student to database. Please check input fields again.")
    }
}

function addStudenttDB(request, response, fname, lname, user, callback) {
    console.log("Adding student to DB with fname: " + fname);
    console.log("Adding student to DB with lname: " + lname);
    console.log("Attaching to student, user with username: " + user);
    const sql = "INSERT INTO  student (fname, lname, grade_english, grade_math, grade_science, parent_fk) VALUES ($1, $2, 'A', 'A', 'A', (SELECT users.user_pk FROM users WHERE username=$3));";
    const params = [fname, lname, user];

    pool.query(sql, params, function(err) {
        if (err) {
            console.log("Error in query: ");
            console.log(err);
            callback(err, null);
        } else {
            response.render('pages/home', {authenticated: authenticated, username: username, role: role});
        }
    });
}

function removeStudent(request, response) {
    const fname = sanitizer.sanitize(request.body.fname);
    const lname = sanitizer.sanitize(request.body.lname);
    const user = sanitizer.sanitize(request.body.username);

    removeStudenttDB(request, response, fname, lname, user, function (error) {
        if (error) {
            console.log("Something Broke: " + error);
        } else {
            console.log("Success in calling database.");
        }
    });
}


function removeStudenttDB(request, response, fname, lname, user, callback) {
    console.log("Removing student from DB with fname: " + fname);
    console.log("Removing student from DB with lname: " + lname);
    console.log("Removing student from user with username: " + user);
    const sql = "DELETE FROM student where fname=$1 AND lname=$2 AND parent_fk=(SELECT users.user_pk FROM users WHERE username=$3);";
    const params = [fname, lname, user];

    pool.query(sql, params, function(err) {
        if (err) {
            console.log("Error in query: ");
            console.log(err);
            callback(err, null);
        } else {
            response.render('pages/home', {authenticated: authenticated, username: username, role: role});
        }
    });
}

function getChildren(request, response) {
    const sql = 'SELECT * FROM student WHERE parent_fk=(SELECT users.user_pk FROM users WHERE username=$1);';
    const params = [username];
    pool.query(sql, params, function(error, result) {
        if (error) {
            console.log("Error in query: ");
            console.log(error);
        } else {
            console.log("Getting children list for user:" + username);
            // do stuff when you get the class.
            const childList = result.rows;
            console.log(result.rows[0]);
            response.render('pages/childPage', {authenticated: authenticated, username: username, role: role, students: childList});
        }
    });
}

function editGrade(request, response) {
    const fname = sanitizer.sanitize(request.body.fname);
    const lname = sanitizer.sanitize(request.body.lname);
    const user = sanitizer.sanitize(request.body.username);
    const subject = sanitizer.sanitize(request.body.subject);
    const grade = sanitizer.sanitize(request.body.grade);
    var sql = '';
    if(subject === 'grade_english') {
        sql = 'UPDATE student SET grade_english=$1 WHERE fname=$2 AND lname=$3 AND parent_fk=(SELECT users.user_pk FROM users WHERE username=$4);';
    } else if(subject === 'grade_math') {
        sql = 'UPDATE student SET grade_math=$1 WHERE fname=$2 AND lname=$3 AND parent_fk=(SELECT users.user_pk FROM users WHERE username=$4);';
    } else if(subject === 'grade_science') {
        sql = 'UPDATE student SET grade_science=$1 WHERE fname=$2 AND lname=$3 AND parent_fk=(SELECT users.user_pk FROM users WHERE username=$4);';
    } else {
        console.log('incorrect grade type.');
        response.render('pages/', {authenticated: authenticated, username: username, role: role});
    }

    const params = [grade, fname, lname, user];

    pool.query(sql, params, function(error) {
        if (error) {
            console.log("Error in query: ");
            console.log(error);
        } else {
            console.log("Changing Grade");
            console.log("Changing grade for student with fname: " + fname);
            console.log("Changing grade for student  with lname: " + lname);
            console.log("Changing grade for student parent with username: " + user);
            console.log("Subject to be changed is: " + subject);
            console.log("Grade to be changed is: " + grade);
            response.render('pages/home', {authenticated: authenticated, username: username, role: role});
        }
    });
}