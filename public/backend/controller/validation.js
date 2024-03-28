// IMPORTATION OF MODELS
const validator = require("validator");
const moment = require("moment");


const { UserModel, LoginModel, DateTimeTracker, RegistrationModel } = require("../../database/schematics");
const config = require("../config/config");

// ...
const registrationValidation = async (req, res, next) => {
    try {
        console.log("** Validating Registration fields **", req.body);
        const data = req.body;
        let status = "", msg = "";

        if (!validator.isEmail(data.email)) {
            msg = "Error. Provide Valid Email !";
            status = true;

        }else if (validator.isEmpty(data.email)){
            msg = "Error. Provide An Email !";
            status = true;
        
        }else if (validator.isEmpty(data.businessName)) {
            msg = "Error. Provide Business name !";
            status = true;

        }else if (validator.isEmpty(data.natureOfBusiness)){
            msg = "Error. Provide a summary of your service !";
            status = true;

        } else if (validator.isEmpty(data.businessType)){
            msg = "Error. Provide the type of business !";
            status = true;

        }else if (validator.isEmpty(data.location)){
            msg = "Error. Provide Your business location !";
            status = true;

        }else if (validator.isEmpty(data.address)){
            msg = "Error. Provide Your address !";
            status = true;

        }else if (validator.isEmpty(data.contact)){
            msg = "Error. Provide Your contact !";
            status = true;

        }else if (validator.isEmpty(data.country)){
            msg = "Error. Provide the Country you operate in!";
            status = true;

        }else if (validator.isEmpty(data.region_state)){
            msg = "Error. Provide Your business region or state !";
            status = true;

        }else if (validator.isEmpty(data.town)){
            msg = "Error. Provide Your business town!";
            status = true;

        }else if (validator.isEmpty(data.ceo)){
            msg = "Error. Provide CEO Name !";
            status = true;

        }else if (validator.isEmpty(data.new_pass)){
            msg = "Error. Provide New Password !";
            status = true;

        }else if (validator.isEmpty(data.confirm_pass)){
            msg = "Error. Provide Confirm Password !";
            status = true;

        }else if (data.new_pass.trim() !== data.confirm_pass.trim()){
            msg = "Error. Password does not matche !";
            status = true;
        }


        
        if (status) {
            req.flash("validate_register", msg);

            res.redirect(303, `${config.view_urls.register}`); // redirect to the registration page 
        }else {
            console.log("validation complete");

            next() // move to the next middleware 
        }

    } catch (error) {
        console.log("** Error:: login validation **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }   
    
};
const signupValidation = async (req, res, next) => {
    try {
        console.log("** Validating Signup fields **");
        const data = req.body;
        let status = "", msg = "";

        if (!validator.isEmpty(data.username)) {
            msg = "Error. Provide an Email !";
            status = true;

        }else if (!validator.isEmail(data.username)) {
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
            req.flash("validate_signup", msg); // alert user with a message 
            res.redirect(303, `${config.view_urls.user_register}`) // return to the login view page 

        }else {
            console.log("** Validation Completed **");
            // checking if comapny is registered or not
                const biodata = await RegistrationModel.find({ businessName: data.company }); // getting company biodata from db
                console.log("getting biodata from db ...", biodata);

                if (biodata.length == 0) { // server could not find registered biodata from db
                    req.flash("signup", `Error. ${data.company} not registered. Please Register !`) // send messge to user 
                    res.redirect(303, `${config.view_urls.user_register}`)

                }else { // server found biodata 
                    next() // move to the next middelware 
                }
        }

    } catch (error) {
        console.log("** Error:: signup validation **", error);
        res.redirect(303, `${config.view_urls._500}`)
    }
};
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
            msg = "Error. Select Your Company";
            status = true;

        }else if (validator.isEmpty(data.userID)) {
            msg = "Error. Provide Valid User ID";
            status = true;
        }


        if (status) { // if error is fouund
            req.flash("validate_login", msg); // alert user with a message 
            res.redirect(303, `${config.view_urls.login}`);// return to the login view page 

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
                    res.redirect(303, `${config.view_urls.user_register}`) // redirect user to the signup page

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
                    res.redirect(303, `${config.view_urls.logout}`); // redirect user to the signout page
                }
            // ...
        }

    } catch (error) {
        console.log("** Error:: login validation **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const OTPValidation = async (req, res, next) => {
    try {
        console.log("Validating OTP code :", req.body);
        const data = req.body
        if (data.otp.match(`[0-9]{4}`)) {
            console.log("validation complete");

            next(); // move to the next middelware
        }else {
            req.flash("signup", "Invalid OTP Code. Please Signup Again !");
            res.redirect(303, `${config.view_urls.user_register}`);
        }

    } catch (error) {
        console.log("** Error:: OTP validation **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
}

module.exports = { loginValidation, signupValidation, OTPValidation, registrationValidation }