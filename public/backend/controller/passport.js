// IMPORTATION OF MODULES 
require("dotenv").config();
const LocalStrategy = require('passport-local');
const passport = require("passport");
const crypto = require("crypto");

// ....
// IMPORTATION OF FILES 
const { LoginModel, DateTimeTracker, UserModel } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");

// ...




// PASSPORT VERIFYING LOGIN CREDDENTIALS LOCALLY 
const verify = async(username, password, cb) => {
    let resp = {};
    console.log("..PASSPORT DATA...", username, password);

    //  encrypt passowrd 
        const hashed_pass = await encrypt_access_code(password);
        console.log("** hashing user password **", hashed_pass); 
    // ...
    // getting data from db
        const data = await UserModel.find({ "email": username });
    // ...
    // Save data into database
        const payload = {
            email: data.email,
            company: data.company,
            userID: data.userID
        };
        const user = await LoginModel.insertMany(payload);
        await DateTimeTracker.insertMany({ 
            "email": payload.email, 
            "userID": data.userID, 
            "login_date": "",
            "login_time": ""
            
        });
        console.log("** DB insertion responds **", user);
    // ...
    return cb(null, user);
}
const passport_strategy = new LocalStrategy( verify );
// .....................................................................
// SETTING USER INFO IN SESSION TO BE USED LATER
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        console.log("SERIALIZE USER IN PASSPORT ROUTER (IN PASSPORT JS FILE)......", user);

        return cb(null, user)
        /*
        if (user.role !== "" || user.role == undefined || user.role == null) {
            return cb(null, {
                id: user.id,
                username: user.username,
                role: user.role,
                photo: user.photo,
                first_name: user.first_name,
                last_name: user.last_name,
                time_login: user.time_login,
                time_logout: user.time_logout,
                date_login: user.date_login,
                date_logout: user.date_logout
            })
        }
        */
    });
});
passport.deserializeUser(function(user, cb) {
    process.nextTick(async function() {
        console.log("DESERIALIZE USER IN PASSPORT ROUTER (IN PASSPORT JS FILE)......", user);
        return cb(null, user)
        /*
        return cb(null,  {
            id: user.id,
            username: user.username,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            photo: user.photo,
            time_login: user.time_login,
            time_logout: user.time_logout,
            date_login: user.date_login,
            date_logout: user.date_logout
        });
        */
    });
});
// ............................................
// CHECK FOR AUTHENTICATION OF USER BEFORE ACCESSING RESOURCES
const isUSerAuthenticated = (req) => {
    if (req.session.passport) {
        return true;
    }else {
        // alert user with notification
        return false;
    }
}
// ......


module.exports = {
    passport_strategy, isUSerAuthenticated
}