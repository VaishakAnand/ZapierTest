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

        console.log(accessToken)
        db.get(
            'SELECT rowid, googleId, userName FROM Users WHERE googleId = ? AND userName = ?',
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
                            console.log("New entry into Users table")
                            return cb(error, user)
                        }
                    )

                } else {
                    error = err;
                    user = row;
                    console.log("Already exist in Users table")

                    return cb(error, user)
                }
            }
        )

    }
));

