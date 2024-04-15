// IMPORTATION OF MODULES 
require("dotenv").config();
const LocalStrategy = require('passport-local');
const passport = require("passport");
const crypto = require("crypto");
const moment = require("moment");
// ....
// IMPORTATION OF FILES 
const { LoginModel, DateTimeTracker, UserModel, RegistrationModel } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");
const { config } = require("../config/config");
// ...


// PASSPORT VERIFYING LOGIN CREDDENTIALS LOCALLY 
const verify = async(username, password, cb) => {
    let resp = {};
    console.log("..PASSPORT DATA...", username, password);
    //  encrypt passowrd 
        const hashed_pass = await encrypt_access_code(password);
        console.log("** hashing user password **", hashed_pass); 
    // ...
    // checking if username has a role of superuser or not before proceeding to login 
        const superuser_status = await is_user_superuser(username);
        if (superuser_status) {
            console.log("for superuser only");
            // getting business biodata from  db in other to have access to the business email
            const biodata = await RegistrationModel.find({ "email": username });

            const payload = {
                email: biodata[0].email,
                company: biodata[0].businessName,
                userID: biodata[0].ceo, // important !. the userID become ethe cCEO name for user with superuser role.
                role: biodata[0].role
            };
            console.log("getting superuser payload ...", payload);

            if (await update_login_credentials(payload, biodata, username)) {
                return cb(null, payload); // important ! using payload in-place of the usermmodel schema since is of the same  
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
                    return cb(null, payload);
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
    (req.session.passport)? next() : res.redirect(303, config.view_urls.login);
}
// ......
// CUSTOM MODULES SECTION
const is_user_superuser = async (username) => {
    let is_user_superuser = "";
    const biodata = await RegistrationModel.find({ "email": username });

    if (biodata.length > 0) {
        (biodata[0].role.trim() == "superuser")? is_user_superuser = true : is_user_superuser = false;
    }
    return is_user_superuser;
};
const update_login_credentials = async (payload, user, username) => {
    const user_resp = await LoginModel.insertMany(payload);

    // updating login timer as user login 
        const date_tracker = await DateTimeTracker.find({ "email": username });
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
};
// ...


module.exports = {
    passport_strategy, isUSerAuthenticated
}