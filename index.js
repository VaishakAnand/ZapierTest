const { default: axios } = require("axios");
var express = require("express")
var db = require('./database')
const cors = require('cors')
const passport = require("passport")
require('dotenv').config();
require('./passport-setup');

var app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(require('express-session')({
    secret: process.env.COOKIE_SECRET, resave: true, saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());



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

const getInfo = (req, res, next) => {
    console.log("query: ", req.query)
    next();
}

app.get("/auth/google", getInfo, passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
}));

app.get("/auth/google/redirect", passport.authenticate('google'), function (req, res) {
    console.log("Query after redirect is: ", req.query)
    var uri = !req.query.redirect_uri ? "https://zapier.com/dashboard/auth/oauth/return/App136570CLIAPI/" : req.body.redirect_uri
    db.run("UPDATE Users set authCode = ? WHERE rowid = ?",
        [req.query.code, req.user.rowid],
        (err, result) => {
            console.log("redirect_uri = ", req.body.redirect_uri)
            uri = uri + "?code=" + req.query.code + "&state=done"
            // axios.post(uri, {})

            res.status(200).redirect(uri)
        }
    )
});

app.post("/auth/token", (req, res, next) => {
    // req.body
    console.log("Access token requested")
    db.get("SELECT accessToken FROM Users WHERE authCode = ?",
        req.body.code,
        (err, row) => {
            if (row == undefined) {
                res.status(404)
            } else {
                axios.post(req.body.redirect_uri, {
                    access_token: row.accessToken
                }).then(response => { })

                res.status(200).json({
                    "access_token": row.accessToken
                })
            }
        }
    )
})

app.get("/auth/logout", (req, res) => {
    req.logout();

    req.session = null;

    res.send(req.user);
});

const authenticateAT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];

        db.get("SELECT rowid FROM Users WHERE accessToken = ?", token, (err, row) => {
            if (row == undefined || err) {
                return res.sendStatus(403);
            }

            next();
        })
    } else {
        res.sendStatus(401);
    }
}

app.get("/auth/test", authenticateAT, (req, res) => {
    res.status(200).send("All good")
})


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