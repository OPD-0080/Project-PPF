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

        if (validator.isEmpty(data.username)){
            msg = "Error. Provide An Email !";
            status = true;
        
        }else if (!validator.isEmail(data.username)) {
            msg = "Error. Provide Valid Email !";
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

        }else if (validator.isEmpty(data.password)){
            msg = "Error. Provide Confirm Password !";
            status = true;

        }else if (data.new_pass.trim() !== data.password.trim()){
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

        if (validator.isEmpty(data.username)){
            msg = "Error. Provide An Email !";
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

        }else if (validator.isEmpty(data.tel)) {
            msg = "Error. Provide Your Active Contact Number";
            status = true;

        }else if (validator.isEmpty(data.date_of_birth)) {
            msg = "Error. Provide Your Date of Birth";
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
            const user = req.session.passport.user;
            // checking if comapny is registered or not
                const biodata = await RegistrationModel.find({ businessName: user.company.trim() }); // getting company biodata from db
                console.log("getting biodata from db ...", biodata);

                if (biodata.length == 0) { // server could not find registered biodata from db
                    req.flash("signup", `Error. ${user.company} not registered. Please Register !`) // send messge to user 
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
    
        
        if (validator.isEmpty(data.username.trim())) {
            msg = "Error. Provide Email !";
            status = true;

        }
        else if (validator.isEmpty(data.password.trim())) {
            msg = "Error. Provide Valid Password";
            status = true;

        }else if (validator.isEmpty(data.company.trim())) {
            msg = "Error. Select Your Company";
            status = true;
        }
        console.log(status);
        if (status) { // if error is fouund
            req.flash("validate_login", msg); // alert user with a message 
            res.redirect(303, `${config.view_urls.login}`);// return to the login view page 

        }else {
            console.log("** Validation Completed **");

            let user = "", login_resp = "";
            // check if user used either the userID or email approach
                if (validator.isEmail(data.username.trim())) { // when user uses email approach for login 
                    console.log("user login with Email");
                    // confirm if user provide belongs to the ceo or not 
                        const is_user_ceo = await RegistrationModel.find({ "email": data.username.trim() });
                        if (is_user_ceo.length > 0) {
                            user = is_user_ceo;
                            login_resp = await LoginModel.find({ "email": data.username.trim() });

                        }else {
                            user = await UserModel.find({ "email": data.username.trim() });
                            login_resp = await LoginModel.find({ "email": data.username.trim() });
                        }
                    // ...
                }else if (data.username.trim().match(config.userID_regexp)) {   // when a user uses the UserID approach for login 
                    console.log("user login with UserID");

                    user = await UserModel.find({ "userID": data.username.trim() });
                    login_resp = await LoginModel.find({ "userID": data.username.trim() });
                    
                }else { // only for ceo 
                    console.log("user login with ceo name");

                    user = await RegistrationModel.find({ "ceo": data.username.trim() });
                    login_resp = await LoginModel.find({ "userID": data.username.trim() });

                }
                console.log("... for user model response  ..", user, user.length);
                console.log(".. for login  model response ..", login_resp);
            // ...
            // checking if user is a superuser or not and has already signup or not 
                if (user.length == 0) { // if user has not signup and trying to login 
                    req.flash("signup", "Error. User not Found. For Signup, Contact Admin !"); // send user an alert message
                    res.redirect(303, `${config.view_urls.login}`) // redirect user to the signup page

                }else if ( (user.length > 0) && (login_resp.length <= 0) ) { // if user has signup and trying to login 
                    next() 
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
                        req.flash("login", "Error. User Login Twice. Re-login !");
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
    let msg = "", status = "";
    try {
        console.log("Validating OTP code :", req.body);
        const data = req.body

        if (validator.isEmpty(data.otp) || data.otp.length < 5) {
            msg = "Error. Provide Valid OTP code";
            status = true;

        }else if (data.otp.match(`[0-9]{5}`)) {
            status = false;
            
        }else {
            msg = "Error. Invalid OTP Code. Try Again !";
            status = true;
        }

        if (status) {
            req.flash("otp", msg);
            res.redirect(303, `${config.view_urls.otp}`);
        }else {
            next()
        }

    } catch (error) {
        console.log("** Error:: OTP validation **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const resetPasswordValidation = async (req, res, next) => {
    let msg = "", status = "";
    try {
        console.log("Validating reset password fields :", req.body);
        const data = req.body

        if (validator.isEmpty(data.old_pass)) {
            msg = "Error. Provide valid default password !";
            status = true;

        }else if (validator.isEmpty(data.new_pass)) {
            msg = "Error. Provide new password !";
            status = true;
            
        }else if (validator.isEmpty(data.confirm_pass)) {
            msg = "Error. Provide new password !";
            status = true;
            
        }else if (data.new_pass !== data.confirm_pass) {
            msg = "Error. Password does not match !";
            status = true;
            
        }else {
            status = false;
        }
        console.log(status);

        if (status) { // if error is fouund
            req.flash("validate_reset_password", msg); // alert user with a message 
            res.redirect(303, `${config.view_urls.login}`);// return to the login view page 

        }else {
            console.log("** Validation Completed **");
            necx();
        }

    } catch (error) {
        console.log("** Error:: OTP validation **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const forgotPasswordInitiateValidation = async (req, res, next) => {
    try {
        console.log("** Validating forgot password initiate fields **");
        const data = req.body;
        let status = "", msg = "";
    
        if (validator.isEmpty(data.username.trim())) {
            msg = "Error. Provide Email / userID !";
            status = true;

        }else if (validator.isEmpty(data.company.trim())) {
            msg = "Error. Provide Your Company";
            status = true;
        }
        console.log(status);
        
        if (status) { // if error is fouund
            req.flash("fpass_initiate", msg); // alert user with a message 
            res.redirect(303, `${config.view_urls.forgot_password_initiate}`);

        }else {
            console.log("** Validation Completed **");
            next();
        }

    } catch (error) {
        console.log("** Error:: forgot password initiate validation **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const forgotPasswordConfirmValidation = async (req, res, next) => {
    try {
        console.log("** Validating forgot password confirm fields **");
        const data = req.body;
        let status = "", msg = "";
    
        if (validator.isEmpty(data.new_pass.trim())) {
            msg = "Error. Provide Your New Password !";
            status = true;

        }else if (validator.isEmpty(data.confirm_pass.trim())) {
            msg = "Error. Provide Confirm Password !";
            status = true;
        }
        else if (data.new_pass.trim() !== data.confirm_pass.trim()) {
            msg = "Error. Password does not match !";
            status = true;
        }
        console.log(status);
        
        if (status) { // if error is fouund
            req.flash("fpass_confirm", msg); // alert user with a message 
            res.redirect(303, `${config.view_urls.forgot_password_confirm}`);

        }else {
            console.log("** Validation Completed **");
            next();
        }

    } catch (error) {
        console.log("** Error:: forgot password confirm validation **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};



const is_user_active = async (user) => {
    let msg = "";
    (user.is_active)? msg = true : msg = false;
    return msg 
};
const getting_auth_user_data = async (auth_user) => {
    let user = "";
    (auth_user.role == "Admin")? user = await RegistrationModel.find({ "email": auth_user.email}) :  user = await UserModel.find({ "email": auth_user.email });  
    return user
};

module.exports = { loginValidation, signupValidation, OTPValidation, registrationValidation, 
    is_user_active, resetPasswordValidation, forgotPasswordInitiateValidation, forgotPasswordConfirmValidation,
    getting_auth_user_data
}