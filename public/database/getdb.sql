CREATE TABLE users (
    user_pk SERIAL  NOT NULL PRIMARY KEY,
    fname           TEXT NOT NULL,
    lname           TEXT NOT NULL,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL
);

INSERT INTO users (fname, lname, username, password_hash) VALUES (
    fname,
    lname,
    username,
    password_hash
);


CREATE USER Deaj WITH PASSWORD 'test';
GRANT SELECT, INSERT, UPDATE ON * TO Deaj;
