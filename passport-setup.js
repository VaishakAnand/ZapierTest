const passport = require("passport")
var db = require('./database')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

passport.serializeUser((user, cb) => {
    console.log("Serialising User")
    cb(null, user.rowid);
    // done(null, user.googleId);
});

passport.deserializeUser((id, cb) => {
    db.get(
        'SELECT rowid, googleId, userName FROM Users WHERE rowid = ?',
        id,
        (err, row) => {
            // console.log(row)
            return cb(null, row)
        }
    );
    console.log("Deserialising User")
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "/auth/google/redirect"
},
    function (accessToken, refreshToken, profile, cb) {
        var user;
        var error;

        // console.log(accessToken)
        db.get(
            'SELECT rowid, googleId, userName FROM Users WHERE googleId = ? AND userName = ?',
            [profile.id, profile.displayName],
            (err, row) => {
                if (row == undefined) {
                    db.run('INSERT INTO Users(googleId, userName, accessToken) VALUES (?, ?, ?)',
                        [profile.id, profile.displayName, accessToken],
                        (err2, res) => {
                            error = err2
                            console.log("New entry into Users table")

                            db.get(
                                'SELECT rowid, googleId, userName FROM Users WHERE googleId = ? AND userName = ?',
                                [profile.id, profile.displayName],
                                (err3, newRow) => {
                                    return cb(err3, newRow)
                                }
                            )
                        }
                    )

                } else {
                    console.log("Already exist in Users table")

                    db.run("UPDATE Users SET accessToken = ? WHERE googleId = ? AND userName = ?",
                        [accessToken, profile.id, profile.displayName],
                        (err4, res) => {
                            console.log("updated Access Token")
                            return cb(err4, row)
                        }
                    )
                }
            }
        )

    }
));

