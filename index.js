const { default: axios } = require("axios");
var express = require("express")
var app = express()
var db = require('./database')

app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));

// Server port
var HTTP_PORT =  process.env.PORT || 8000 
// Start server
app.listen(HTTP_PORT, () => {
    console.log("Server running on port ", HTTP_PORT)
});

// Root endpoint
app.get("/", (req, res, next) => {
    res.json({"message": "Ok"})
});

app.get("/attendees", (req, res, next) => {
    var sql = "select * from attendees"
    var params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
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
                res.status(400).json({"error": err.message})
                return;
            }
        })
    } else if (req.params.ACTION_METHOD == 'update') {
        console.log("recognise update")
        var sql = 'UPDATE attendees set firstname = ?, lastname = ?, email = ?, company = ?, job_title = ?, ticket_name = ? WHERE ticket_no = ?'
        var params = [data.firstname, data.lastname, data.email, data.company, data.job_title, data.ticket_name, data.ticket_no]

        db.run(sql, params, (err, result) => {
            if (err) {
                res.status(400).json({"error": err.message})
                return;
            }
        })
    }

    var getHookurl = 'select hookUrl from webhooks where projectId = ? and eventid = ? and ACTION_METHOD = ?'
    var newParams = [req.params.projectId, req.params.eventId, req.params.ACTION_METHOD]
    db.get(getHookurl, newParams,(err, row) => {
        if (err) {
            res.status(400).json({"error": err.message})
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
            res.status(400).json({"error": err.message})
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
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({"message":"deleted", changes: this.changes})
        }
    )
})

// Default response for any other request
app.use(function(req, res){
    res.status(404);
});