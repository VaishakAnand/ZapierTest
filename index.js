const { default: axios } = require("axios");
var express = require("express")
var db = require('./database')
const passport = require("passport")
require('dotenv').config();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieSession = require('cookie-session')

var app = express()
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

app.use(cookieSession({
    // milliseconds of a day
    maxAge: 24 * 60 * 60 * 1000,
    keys: [process.env.COOKIE_SECRET]
}));

app.use(passport.initialize());
app.use(passport.session());


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "/auth/google/redirect"
},
    function (accessToken, refreshToken, profile, cb) {
        var user;
        var error;

        db.get(
            'SELECT * FROM Users WHERE googleId = ? AND userName = ?',
            [profile.id, profile.displayName],
            (err, row) => {
                if (row == undefined) {
                    db.run('INSERT INTO Users(googleId, userName) VALUES (?, ?)',
                        [profile.id, profile.displayName],
                        (err2, res) => {
                            error = err2
                            user = {
                                googleId: profile.id,
                                userName: profile.displayName
                            }
                        }
                    )
                    console.log("New entry into Users table")
                } else {
                    error = err;
                    user = row;
                    console.log("Already exist in Users table")
                    console.log(row)
                }
            }
        )

        return cb(null, user)
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.get(
        'SELECT * FROM Users WHERE googleId = ?',
        id,
        (err, row) => {
            console.log(row)
            done(null, row)
        }
    );
    // User.findById(id).then(user => {
    //     done(null, user);
    // });
});


// Server port
var HTTP_PORT = process.env.PORT || 8000
// Start server
app.listen(HTTP_PORT, () => {
    console.log("Server running on port ", HTTP_PORT)
});

// Root endpoint
app.get("/", (req, res, next) => {
    res.json({ "message": "Ok" })
});

app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
}));

app.get("/auth/google/redirect", passport.authenticate('google'), (req, res) => {
    console.log("redirecting")
    res.send(req.user.userName)
});

app.get("/auth/logout", (req, res) => {
    req.logout();

    req.session = null;

    res.send(req.user);
});


app.get("/attendees", (req, res, next) => {
    var sql = "select * from attendees"
    var params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        })
    });
});

app.post("/attendees/:projectId/:eventId/:ACTION_METHOD", (req, res, next) => {
    var data = {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        company: req.body.company,
        job_title: req.body.job_title,
        ticket_name: req.body.ticket_name,
        ticket_no: req.body.ticket_no
    }

    if (req.params.ACTION_METHOD == 'create') {
        console.log("recognise create")
        var sql = 'INSERT INTO attendees (firstname, lastname, email, company, job_title, ticket_name, ticket_no) VALUES (?, ?, ?, ?, ?, ?, ?)'
        var params = [data.firstname, data.lastname, data.email, data.company, data.job_title, data.ticket_name, data.ticket_no]

        db.run(sql, params, (err, result) => {
            if (err) {
                res.status(400).json({ "error": err.message })
                return;
            }
        })
    } else if (req.params.ACTION_METHOD == 'update') {
        console.log("recognise update")
        var sql = 'UPDATE attendees set firstname = ?, lastname = ?, email = ?, company = ?, job_title = ?, ticket_name = ? WHERE ticket_no = ?'
        var params = [data.firstname, data.lastname, data.email, data.company, data.job_title, data.ticket_name, data.ticket_no]

        db.run(sql, params, (err, result) => {
            if (err) {
                res.status(400).json({ "error": err.message })
                return;
            }
        })
    }

    var getHookurl = 'select hookUrl from webhooks where projectId = ? and eventid = ? and ACTION_METHOD = ?'
    var newParams = [req.params.projectId, req.params.eventId, req.params.ACTION_METHOD]
    db.get(getHookurl, newParams, (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }

        res.json({
            "message": "success",
            "data": row,
        })

        console.log("requested url = ", row.hookUrl)
        axios.post(row.hookUrl, data).then((response) => {

        }, (error) => {
            console.log(error);
        });

    })
})

app.post("/webhooks", (req, res, next) => {
    var data = {
        projectId: req.body.projectId,
        eventId: req.body.eventId,
        ACTION_METHOD: req.body.ACTION_METHOD,
        hookUrl: req.body.hookUrl
    }

    var sql = 'INSERT INTO webhooks (projectId, eventId, ACTION_METHOD, hookUrl) VALUES (?,?,?,?)'
    var params = [data.projectId, data.eventId, data.ACTION_METHOD, data.hookUrl]
    db.run(sql, params, (err, result) => {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
        res.json({
            "message": "success",
            "data": data,
        })
    })
    console.log(data)
    console.log(req.body.hookUrl)
})

app.delete("/webhooks/:projectId/:eventId/:ACTION_METHOD", (req, res, next) => {
    db.run(
        'DELETE FROM webhooks where projectId = ? and eventId = ? and ACTION_METHOD = ?',
        req.params.projectId, req.params.eventId, req.params.ACTION_METHOD,
        function (err, result) {
            if (err) {
                res.status(400).json({ "error": res.message })
                return;
            }
            res.json({ "message": "deleted", changes: this.changes })
        }
    )
})

app.post("/checkin/:projectId/:eventId", (req, res, next) => {
    var data = {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        company: req.body.company,
        job_title: req.body.job_title,
        ticket_name: req.body.ticket_name,
        ticket_no: req.body.ticket_no
    }

    var sql = 'INSERT INTO checkedInAttendees(firstname, lastname, email, company, job_title, ticket_name, ticket_no) VALUES (?, ?, ?, ?, ?, ?, ?)'
    var params = [data.firstname, data.lastname, data.email, data.company, data.job_title, data.ticket_name, data.ticket_no]

    db.run(sql, params, (err, result) => {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }
    })

    var getHookurl = 'select hookUrl from webhooks where projectId = ? and eventid = ? and ACTION_METHOD = ?'
    var newParams = [req.params.projectId, req.params.eventId, "checkin"]
    db.get(getHookurl, newParams, (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message })
            return;
        }

        res.json({
            "message": "success",
            "data": row,
        })

        console.log("requested url = ", row.hookUrl)
        axios.post(row.hookUrl, data).then((response) => {

        }, (error) => {
            console.log(error);
        });
    })
})

// Default response for any other request
app.use(function (req, res) {
    res.status(404);
});