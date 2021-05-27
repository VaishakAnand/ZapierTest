var sqlite3 = require('sqlite3').verbose()

const DBSOURCE = "db.sqlite"

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message)
        throw err
    } else {
        console.log('Connected to the SQLite database.')
        db.run(`CREATE TABLE attendees (
            firstname text,
            lastname text, 
            email text UNIQUE,
            company text,
            job_title text,
            ticket_name text,
            ticket_no text PRIMARY KEY,
            CONSTRAINT email_unique UNIQUE (email)
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    // console.log("attendees table already created")
                } else {
                    // Table just created, creating some rows
                    // console.log("attendees table newly created")
                    var insert = 'INSERT INTO attendees (firstname, lastname, email, company, job_title, ticket_name, ticket_no) VALUES (?, ?, ?, ?, ?, ?, ?)'
                    db.run(insert, ["Jon", "Jacob", "circuitbreaker20@gmail.com", "ABC", "CEO", "VIP", "0001"])
                    db.run(insert, ["Tom", "Timothy", "greatplay@gmail.com", "BCD", "CTO", "VIP", "0002"])
                }
            })
        // db.run('DROP TABLE webhooks')
        db.run(`CREATE TABLE webhooks (
            projectId text,
            eventId text,
            ACTION_METHOD text,
            hookUrl text,
            PRIMARY KEY(projectId, eventId, ACTION_METHOD)
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    // console.log("webhooks table already created")
                } else {
                    // Table just created, creating some rows
                    // console.log("webhooks table newly created")
                    var insert = 'INSERT INTO webhooks (projectId, eventId, ACTION_METHOD, hookUrl) VALUES (?,?,?,?)'
                }
            });

        db.run(`CREATE TABLE checkedInAttendees (
            firstname text,
            lastname text, 
            email text UNIQUE,
            company text,
            job_title text,
            ticket_name text,
            ticket_no text PRIMARY KEY,
            FOREIGN KEY(ticket_no) REFERENCES attendees(ticket_no) ON UPDATE CASCADE
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    // console.log("checkedInAttendees table already created")
                } else {
                    // Table just created, creating some rows
                    // console.log("checkedInAttendees table newly created")
                }
            }
        )

        db.run(`CREATE TABLE Users (
            googleId text,
            userName text,
            authCode text,
            accessToken text
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    // console.log("Users table already created")
                } else {
                    // Table just created, creating some rows
                    // console.log("Users table newly created")
                }
            }
        )
        
        db.run(`CREATE TABLE Events (
            projectId text,
            eventId text,
            eventName text,
            PRIMARY KEY(projectId, eventId)
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    // console.log("Users table already created")
                } else {
                    // Table just created, creating some rows
                    // console.log("Users table newly created")
                    var insert = `INSERT INTO Events VALUES(?,?,?)`
                    db.run(insert, ["00001", "00001", "IT SHOW 2021"])
                    db.run(insert, ["00001", "00002", "COMEX 2021"])
                    db.run(insert, ["00002", "00001", "Research Exhibition"])
                }
            }
        )

        db.run(`CREATE TABLE UsersToEvents (
            rowid integer,
            projectId text,
            eventId text,
            PRIMARY KEY(rowid, projectId, eventId),
            FOREIGN KEY(projectId, eventId) references Events(projectId, eventId)
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    // console.log("Users table already created")
                } else {
                    // Table just created, creating some rows
                    // console.log("Users table newly created")
                }
            }
        )

        db.run(`CREATE TABLE EventRequiredFields (
            projectId text,
            eventId text,
            firstname BOOLEAN NOT NULL CHECK (firstname IN (0, 1)),
            lastname BOOLEAN NOT NULL CHECK (lastname IN (0, 1)), 
            email BOOLEAN NOT NULL CHECK (email IN (0, 1)),
            company BOOLEAN NOT NULL CHECK (company IN (0, 1)),
            job_title BOOLEAN NOT NULL CHECK (job_title IN (0, 1)),
            ticket_name BOOLEAN NOT NULL CHECK (ticket_name IN (0, 1)),
            ticket_no BOOLEAN NOT NULL CHECK (ticket_no IN (0, 1)),
            PRIMARY KEY(projectId, eventId),
            FOREIGN KEY(projectId, eventId) references Events(projectId, eventId)
            )`,
            (err) => {
                if (err) {
                    // Table already created
                    // console.log("Users table already created")
                } else {
                    // Table just created, creating some rows
                    // console.log("Users table newly created")
                    var insert = `INSERT INTO EventRequiredFields (projectId, eventId, firstname, lastname, email, company, job_title, ticket_name, ticket_no) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    db.run(insert, ["00001", "00001", 1, 1, 1, 1, 1, 1, 1])
                    db.run(insert, ["00001", "00002", 1, 1, 1, 1, 1, 0, 1])
                    db.run(insert, ["00002", "00001", 1, 1, 1, 0, 0, 0, 1])
                }
            }
        )
    }
});

db.get("PRAGMA foreign_keys = ON");

module.exports = db
