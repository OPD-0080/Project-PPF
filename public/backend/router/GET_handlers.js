// IMPORTATION OF MODULES 
const store = require("store2");
// ...

// IMPORTATION OF FILES
const config = require("../config/config");
const { UserModel, LoginModel, RegistrationModel, DateTimeTracker } = require("../../database/schematics");
const { randomPassword } = require("../utils/code_generator");
// ...


const view_registration = async (req, res, next) => {
    try {
        console.log("** Inside Registration view **");
        let context = {};




        // notification section
            const error_alert = req.flash("validate_register"); 
            const flash_msg = req.flash("register");
            
            console.log("user alert message :", context.message);
        // ...
        // wrapping data into context object
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            context.register_url = config.post_urls.register;
        // ...
        
        res.render("register", { context });

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_signup = async (req, res, next) => {
    try {
        console.log("** Inside Signup view **");
        let context = {};


        // providing a default random password for users for the first time
            const random_default_pass = `defpass-${await randomPassword(7)}`;
            console.log(random_default_pass);
        // ...
        // notification section
            const error_alert = req.flash("validate_signup");
            const flash_msg = req.flash("signup");
            const otp_status = store.session.get("OTP_status");
            setTimeout(() => { store.session.set("OTP_status", null) }, 3000); // clear OTP status after 3s
            
            console.log("user alert message :", context.message);
            console.log("OTP status :", otp_status);
        // ...
        // wrapping data into context object 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            context.OTP = otp_status;
            context.signup_url = config.post_urls.user_register;
            context.random_default_pass = random_default_pass;
        // ...
        console.log(context);

        res.render("user-register", { context })

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_login = async (req, res, next) => {
    try {
        console.log("** Inside Login view **");
        let context = {}, user_alert = "";

        
        // getting all business name from DB and populate it on DOM 
            let businesses = [];
            const biodata = await RegistrationModel.find();
            for (let i = 0; i < biodata.length; i++) {
                const data = biodata[i];
                businesses.push(data.businessName.trim());
            }
        // ...
        // notification section
            const error_alert = req.flash("validate_login");
            const flash_msg = req.flash("login");
            
            console.log("user alert message :", context.message);
        // ...
        // wrapping data into context object 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            context.businesses = JSON.stringify(businesses);
        // ...
        console.log(context);


        res.render("login", { context })

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_dashboard = async (req, res, next) => {
    try {
        let context = {}, user_alert = "";
        console.log("** inside Dashboard view");


        res.render("dashboard", { context });
    } catch (error) {
        console.log("** Error:: View Dashboard **", error);
    }
};
const view_logout = async (req, res, next) => {
    try {
        console.log("** Inside Logout view **");
        // send alert message
            req.flash("login", "User Logout. Please Login !");
        // ..
        // destroy user session data in passport
            req.session.destroy();
        // ...
        res.redirect(303, "/api/get/user/login");  // redirect to login get page

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_404 = async (req, res, next) => {
    try {
        console.log("** Inside 404 view **");

        res.render("/");  // redirect to login get page

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_500 = async (req, res, next) => {
    try {
        console.log("** Inside 500 view **");
    
        res.redirect(303, "/api/get/user/500");  // redirect to login get page

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};








module.exports = { view_login, view_signup, view_logout, view_registration, view_404, view_500, view_dashboard }