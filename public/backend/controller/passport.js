// IMPORTATION OF MODULES 
require("dotenv").config();
const LocalStrategy = require('passport-local');
const passport = require("passport");
const moment = require("moment");
const validator = require("validator");
const store = require("store2");
// ....
// IMPORTATION OF FILES 
const { LoginModel, DateTimeTracker, UserModel, RegistrationModel, AuthorizationModel } = require("../../database/schematics");
const { encrypt_access_code } = require("../controller/encryption");
const  config  = require("../config/config");
// ...

// PASSPORT VERIFYING LOGIN CREDDENTIALS LOCALLY 
const verify = async(username, password, cb) => {
    console.log("..PASSPORT DATA...", username, password);
    console.log("... Initiating password encryption ...");

    const hashed_pass = await encrypt_access_code(password);

    console.log("** hashing user password **", hashed_pass); 
    console.log("... Password encryption completed ...");
    console.log("... verifiying if user is admin or not ...");


    const user_status = await is_user_admin(username);
    if (user_status) {
        console.log("... verification completed  ...");

        // getting business biodata 
        const biodata = await getting_biodata_upon_email_or_userID(username);
        console.log("...checking for biodata ...", biodata);
        
        const payload = {
            email: biodata[0].email,
            company: biodata[0].businessName,
            userID: biodata[0].ceo, // important !. the userID become the CEO name for user with superuser role.
            role: biodata[0].role,
            companyRefID: biodata[0]._id, 
        };
        console.log("getting user payload ...", payload);
        console.log("... validating user credentials before redirecting ...");


        if (await update_login_credentials(payload, biodata, username)) { 
            // confirm encryted password before login user
                if (biodata[0].password === hashed_pass) {
                    await AuthorizationModel.updateOne({"email": payload.email}, {"authorization_status": false, "authorization_visible": false });
        
                    return cb(null, payload) 
                }
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
        console.log("... verification completed  ...");

        let  user = "";
        (username.match(config.userID_regexp))? user = await UserModel.find({ "userID": username.trim() }) : user = await UserModel.find({ "email": username });
        console.log("...getting passport user ...", user);

        const payload = {
            email: user[0].email,
            company: user[0].company,
            userID: user[0].userID,
            role: user[0].role,
            companyRefID: user[0].companyRefID, 
        };

        console.log("... validating user credentials before redirecting ...");

        if (await update_login_credentials(payload, user, username)) {
            if (user[0].password.match(config.default_pass_regexp)) {

                if (user[0].password === password) { 
                    await AuthorizationModel.updateOne({"email": payload.email}, {"authorization_active": false, "authorization_visible": false });

                    return cb(null, payload) 
                }
                else {
                    store.session.set("login", " Error. Password Invalid. Provide Valid Credentails !") 
                    return cb(null, false) 
                }
            }else {
                if (user[0].password === hashed_pass) { return cb(null, payload) }
                else {
                    store.session.set("login", " Error. Password Invalid. Provide Valid Credentails !") 
                    return cb(null, false) 
                }
            }
        }else {
            store.session.set("login", "Server Error. Try Again !") 
            // return cb(null, false) 
        }
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
const is_user_admin = async (username) => {
    let is_user_admin = "", biodata = "";

    if (username.match(config.userID_regexp)) { return false } 
    else if (validator.isEmail(username)) { biodata = await RegistrationModel.find({ "email": username });}
    else { biodata = await RegistrationModel.find({ "ceo": username }) }

    if (biodata.length > 0) {
        (biodata[0].role.trim() == "admin")? is_user_admin = true : is_user_admin = false;
    }
    return is_user_admin;
};
const getting_biodata_upon_email_or_userID = async (username) => {
    let biodata = "";
    (validator.isEmail(username))? biodata = await RegistrationModel.find({ "email": username }) : biodata = await RegistrationModel.find({ "ceo": username }); 
    return biodata;
}
const update_login_credentials = async (payload, user, username) => {
    let date_tracker = "";
    try {
        if (username.match(config.userID_regexp)) { date_tracker = await DateTimeTracker.find({ "userID": username }) } 
        else if (validator.isEmail(username)) { date_tracker = await DateTimeTracker.find({ "email": username });}
        else { date_tracker = await DateTimeTracker.find({ "userID": username }) }

        await LoginModel.insertMany(payload);
        // updating login timer as user login 
            if (date_tracker.length == 0) {
                await DateTimeTracker.insertMany({ 
                    "companyRefID": user[0]._id,
                    "email": payload.email, 
                    "userID": payload.userID, 
                    "login_date": `${moment().format("YYYY-MM-DD")}`,
                    "login_time": `${moment().format("hh:mm")}`
                });
                return true;
            }else {
                await DateTimeTracker.updateOne({ 
                    "login_date": `${moment().format("YYYY-MM-DD")}`,
                    "login_time": `${moment().format("hh:mm")}`,
                    "logout_date": null,
                    "logout_time": null,
                });
                return true;
            }
        // ...
    } catch (error) {
        console.log("Error in Update login credentials ...", error, error.writeErrors[0].err.errmsg);

        if (error.code == "1100" & error.writeErrors[0].err.errmsg.includes("_id")) {
            console.log("aaaaaaaaaaaa");
            
            // delete user login data from db
                await DateTimeTracker.updateOne(
                    { "_id": user[0]._id }, // filter to get user data from db
                    { $set: { // then update that data
                        "logout_date": `${moment().format("YYYY-MM-DD")}`,
                        "logout_time": `${moment().format("hh:mm")}`
                    }}
                );
                await LoginModel.deleteOne({ "_id": user[0]._id });
            // ...
            return false;
        }else if (error.code == "1100") {
            console.log("bbbbbbbbbbbb");
            
            // delete user login data from db
                await DateTimeTracker.updateOne(
                    { "_id": user[0]._id }, // filter to get user data from db
                    { $set: { // then update that data
                        "logout_date": `${moment().format("YYYY-MM-DD")}`,
                        "logout_time": `${moment().format("hh:mm")}`
                    }}
                );
                await LoginModel.deleteOne({ "_id": user[0]._id });
            // ...
            return false;
        }
    }
};


module.exports = {
    passport_strategy, isUSerAuthenticated
}