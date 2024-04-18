// IMPORTATION OF MODULES 
require("dotenv").config();
const LocalStrategy = require('passport-local');
const passport = require("passport");
const crypto = require("crypto");
const moment = require("moment");
const validator = require("validator");
const store = require("store2");
// ....
// IMPORTATION OF FILES 
const { LoginModel, DateTimeTracker, UserModel, RegistrationModel } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");
const  config  = require("../config/config");
// ...
const regex = "[a-z]{3}[0-9]{5}";

// PASSPORT VERIFYING LOGIN CREDDENTIALS LOCALLY 
const verify = async(username, password, cb) => {
    console.log("..PASSPORT DATA...", username, password);
    //  encrypt passowrd 
        const hashed_pass = await encrypt_access_code(password);
        console.log("** hashing user password **", hashed_pass); 
    // ...
    // checking if username has a role of superuser or not before proceeding to login 
        const superuser_status = await is_user_superuser(username);
        if (superuser_status) {
            console.log("for superuser only");

            // getting business biodata 
            const biodata = await getting_biodata_upon_email_or_userID(username);
            console.log("...checking for biodata ...", biodata);
            
            const payload = {
                email: biodata[0].email,
                company: biodata[0].businessName,
                userID: biodata[0].ceo, // important !. the userID become the CEO name for user with superuser role.
                role: biodata[0].role
            };
            console.log("getting superuser payload ...", payload);

            // important ! using payload in-place of the usermmodel schema since is of the same  
            if (await update_login_credentials(payload, biodata, username)) { 
                // confirm encryted password before login user
                    if (biodata[0].password === password) { return cb(null, payload) }
                    else {
                        store.session.set("login", "Error. Password Invalid. Provide Valid Credentails !") 
                        return cb(null, false) 
                    }
                // ...
            }
            else {
                store.session.set("login", "Server Error. Try Again !") 
                return cb(null, false) 
            }
            
        }else {
            // getting data from signup collection  to have access to some specific data
                const user = await UserModel.find({ "email": username });
            // Save user into database
                const payload = {
                    email: user[0].email,
                    company: user[0].company,
                    userID: user[0].userID,
                    role: user[0].role
                };
                if (await update_login_credentials(payload, user, username)) {
                     // confirm encryted password before login user
                        if (user[0].password === password) { return cb(null, payload) }
                        else {
                            store.session.set("login", " Error. Password Invalid. Provide Valid Credentails !") 
                            return cb(null, false) 
                        }
                    // ...
                }
                else {
                    store.session.set("login", "Server Error. Try Again !") 
                    return cb(null, false) 
                }
            // ..
        }
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
const isUSerAuthenticated = (req, res, next) => {
    (req.session.hasOwnProperty("passport"))? next() : res.redirect(303, config.view_urls.login);
}
// ......
// CUSTOM MODULES SECTION
const is_user_superuser = async (username) => {
    let is_user_superuser = "", biodata = "";

    if (username.match(regex)) { return false } 
    else if (validator.isEmail(username)) { biodata = await RegistrationModel.find({ "email": username });}
    else { biodata = await RegistrationModel.find({ "ceo": username }) }

    if (biodata.length > 0) {
        (biodata[0].role.trim() == "superuser")? is_user_superuser = true : is_user_superuser = false;
    }
    return is_user_superuser;
};
const getting_biodata_upon_email_or_userID = async (username) => {
    let biodata = "";
    (validator.isEmail(username))? biodata = await RegistrationModel.find({ "email": username }) : biodata = await RegistrationModel.find({ "ceo": username }); 
    return biodata;
}
const update_login_credentials = async (payload, user, username) => {
    let date_tracker = "";
    try {
        if (username.match(regex)) { date_tracker = await DateTimeTracker.find({ "userID": username }) } 
        else if (validator.isEmail(username)) { date_tracker = await DateTimeTracker.find({ "email": username });}
        else { date_tracker = await DateTimeTracker.find({ "userID": username }) }

        await LoginModel.insertMany(payload);
        // updating login timer as user login 
            if (date_tracker.length == 0) {
                await DateTimeTracker.insertMany({ 
                    "companyRefID": user[0].uuid,
                    "email": payload.email, 
                    "userID": payload.userID, 
                    "login_date": `${moment().format("YYYY-MM-DD")}`,
                    "login_time": `${moment().format("hh:mm")}`
                });
                return true;
            }else {
                await DateTimeTracker.updateOne({ 
                    "login_date": `${moment().format("YYYY-MM-DD")}`,
                    "login_time": `${moment().format("hh:mm")}`
                });
                return true;
            }
        // ...
    } catch (error) {
        console.log("Error in Update login credentials ...", error);

        if (error.code == "1100" & error.writeErrors[0].err.errmsg.includes("uuid")) {
            // delete user login data from db
                await DateTimeTracker.updateOne(
                    { "uuid": user[0].uuid }, // filter to get user data from db
                    { $set: { // then update that data
                        "logout_date": `${moment().format("YYYY-MM-DD")}`,
                        "logout_time": `${moment().format("hh:mm")}`
                    }}
                );
                await LoginModel.deleteOne({ "uuid": user[0].uuid });
            // ...
            return false;
        }
    }
};
// ...


module.exports = {
    passport_strategy, isUSerAuthenticated
}