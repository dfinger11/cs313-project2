CREATE TABLE users (
    user_pk SERIAL  NOT NULL PRIMARY KEY,
    parent_fname           TEXT NOT NULL,
    parent_lname           TEXT NOT NULL,
    role            TEXT NOT NULL,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL
);

CREATE TABLE student (
    student_pk      SERIAL NOT NULL PRIMARY KEY,
    fname           TEXT NOT NULL,
    lname           TEXT NOT NULL,
    grade_english   VARCHAR(2) NOT NULL,
    grade_math      VARCHAR(2) NOT NULL,
    grade_science   VARCHAR(2) NOT NULL,
    parent_fk       INT REFERENCES users(user_pk)
);

INSERT INTO users (parent_fname, parent_lname, role, username, password_hash) VALUES (
    'teacher',
    'teacher',
    'teacher',
    'teacher',
    'password_hash'
);

INSERT INTO  student (fname, lname, grade_english, grade_math, grade_science, parent_fk)  VALUES (
    fname,
    lname,
    'A',
    'A',
    'A',
    (SELECT users.user_pk FROM users WHERE username='parent')
);

ALTER TABLE users RENAME fname TO parent_fname;
ALTER TABLE users RENAME lname TO parent_lname;

SELECT * FROM student WHERE parent_fk=(SELECT users.user_pk FROM users WHERE username='parent');

SELECT student.fname, student.lname, student.grade_english, student.grade_math, student.grade_science, users.username from student INNER JOIN users ON users.user_pk = student.parent_fk;

UPDATE student SET grade_english='B' WHERE fname='one' AND lname='one' AND parent_fk=(SELECT users.user_pk FROM users WHERE username='');
UPDATE student SET grade_math='B' WHERE fname='' AND lname='' AND parent_fk=(SELECT users.user_pk FROM users WHERE username='');
UPDATE student SET grade_science='B' WHERE fname='' AND lname='' AND parent_fk=(SELECT users.user_pk FROM users WHERE username='');

DELETE FROM student where fname='' AND lname='' AND parent_fk=(SELECT users.user_pk FROM users WHERE username='parent');


CREATE USER Deaj WITH PASSWORD 'test';
GRANT SELECT, INSERT, UPDATE ON * TO Deaj;

GRANT SELECT, insert, update ON users TO PUBLIC;

GRANT SELECT, insert, update, delete ON student TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE student_student_pk_seq to public;
