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
                console.log("attendees table already created")
            }else{
                // Table just created, creating some rows
                console.log("attendees table newly created")
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
            primary key(projectId, eventId, ACTION_METHOD)
            )`,
        (err) => {
            if (err) {
                // Table already created
                console.log("webhooks table already created")
            }else{
                // Table just created, creating some rows
                console.log("webhooks table newly created")
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
                    console.log("checkedInAttendees table already created")
                }else{
                    // Table just created, creating some rows
                    console.log("checkedInAttendees table newly created")
                }
            }
        )
    }
});

db.get("PRAGMA foreign_keys = ON");

module.exports = db
