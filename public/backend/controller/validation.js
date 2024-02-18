// IMPORTATION OF MODELS
const validator = require("validator");
const moment = require("moment");


const { UserModel, LoginModel, DateTimeTracker } = require("../../database/schematics");

// ...

const loginValidation = async (req, res, next) => {
    try {
        console.log("** Validating Login fields **");
        const data = req.body;
        let status = "", msg = "";

        if (!validator.isEmail(data.username)) {
            msg = "Error. Provide Valid Email !";
            status = true;

        }else if (validator.isEmpty(data.username)) {
            msg = "Error. Provide Email !";
            status = true;

        }else if (validator.isEmpty(data.password)) {
            msg = "Error. Provide Valid Password";
            status = true;

        }else if (validator.isEmpty(data.company)) {
            msg = "Error. Select Your Company First to Login";
            status = true;

        }else if (validator.isEmpty(data.userID)) {
            msg = "Error. Provide Valid User ID";
            status = true;
        }


        if (status) { // if error is fouund
            req.flash("validate_login", msg); // alert user with a message 
            //res.redirect(303, "/api/get/user/login") // return to the login view page 

        }else {
            console.log("** Validation Completed **");

            // checking if user has already signup or not 
                const user = await UserModel.find({ "email": data.username });
                const login_resp = await LoginModel.find({ "email": data.username });

                console.log(" for user model response  ..", user, user.length);
                console.log(".. for login  model response ..", login_resp);

                if (user.length == 0) { // if user has not signup and trying to login 
                    console.log("** User has not signup **");
                    
                    // send user an alert message
                        req.flash("signup", "User not Signup. Please Signup !");
                    // ...
                    res.redirect(303, "/api/get/user/signup"); // redirect user to the signup page

                }else if ( (user.length > 0) && (login_resp.length == 0) ) { // if user has signup and trying to login 
                    next() // mve to the next middelware 
                }else if ( (user.length > 0) && (login_resp.length > 0) ) { // if user has signup and already login but login for the second time
                    // delete user login  data from db first and update date and time 
                        await DateTimeTracker.updateOne(
                                { "uuid": login_resp[0].uuid }, // filter to get user data from db
                                { $set: { // then update that data
                                    "logout_date": `${moment().format("YYYY-MM-DD")}`,
                                    "logout_time": `${moment().format("hh:mm")}`
                                }}
                            );
                        await LoginModel.deleteOne({ "uuid": login_resp[0].uuid });
                    // ..
                    // send alert message to user
                        req.flash("login", "User Login Twice. Re-login !");
                    // ...
                    res.redirect(303, "/api/get/user/logout"); // redirect user to the signout page
                }
            // ...
        }

    } catch (error) {
        console.log("** Error:: login validation **", error);
    }
};

const signupValidation = async (req, res, next) => {
    try {
        console.log("** Validating Signup fields **");
        const data = req.body;
        let status = "", msg = "";

        if (!validator.isEmail(data.email)) {
            msg = "Error. Provide Valid Email !";
            status = true;

        }else if (validator.isEmpty(data.first_name)) {
            msg = "Error. Provide Your First Name";
            status = true;

        }else if (validator.isEmpty(data.last_name)) {
            msg = "Error. Provide Your Last Name";
            status = true;

        }else if (!validator.isMobilePhone(data.tel)) {
            msg = "Error. Provide Your Active Contact Number";
            status = true;

        }else if (validator.isEmpty(data.new_pass)) {
            msg = "Error. Provide Password";
            status = true;

        }else if (validator.isEmpty(data.confirm_pass)) {
            msg = "Error. Provide Password";
            status = true;
            
        }

        if (status) { // if error is fouund
            req.flash("validate_login", msg); // alert user with a message 
            res.redirect(303, "/api/get/user/login") // return to the login view page 

        }else {
            console.log("** Validation Completed **");

            next() // mve to the next middelware 
        }

    } catch (error) {
        console.log("** Error:: login validation **", error);
    }
};

module.exports = { loginValidation, signupValidation }