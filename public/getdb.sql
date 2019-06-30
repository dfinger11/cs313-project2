CREATE TABLE users (
    user_pk SERIAL  NOT NULL PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL
);

INSERT INTO users (username, password_hash) VALUES (
    'TestUser',
    'Test'
);


CREATE USER Deaj WITH PASSWORD 'test';
GRANT SELECT, INSERT, UPDATE ON users TO ta_user;
