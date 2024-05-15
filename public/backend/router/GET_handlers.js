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
            const random_default_pass = `defpass${await randomPassword(5)}`;
            console.log(random_default_pass);
        // ...
        // notification section
            const error_alert = req.flash("validate_signup");
            const flash_msg = req.flash("signup");
            
        // ...
        // wrapping data into context object 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
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
        console.log("** Inside Login view **", store.session.get("login"));
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
        // ...
        // wrapping data into context object 
            if (store.session.get("login") !== null) { 
                context.message = store.session.get("login"); 
                setTimeout(() => { store.session.remove("login") }, 3000); 
            }
            else {(error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg; }
            context.businesses = JSON.stringify(businesses);
            context.login_url = config.post_urls.login;
        // ...
        console.log(context);

        res.render("login", { context })

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_OTP = async (req, res, next) => {
    try {
        console.log("** Inside OTP verification view **");
        let context = {}, user_alert = "";


        // notification section
            const error_alert = req.flash("validate_otp");
            const flash_msg = req.flash("otp");
        // ...
        // wrapping data into context object 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            context.otp_url = config.post_urls.otp;
        // ...
        console.log(context);

        res.render("otp_verification", { context })

    } catch (error) {
        console.log("** Error:: OTP verification view **", error);
    }
};
const view_reset_password = async (req, res, next) => {
    try {
        console.log("** Inside resetting password view **");
        let context = {}, user_alert = "";


        // notification section
            const error_alert = req.flash("validate_reset_password");
            const flash_msg = req.flash("reset_password");
        // ...
        // wrapping data into context object 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            context.reset_pass_url = config.post_urls.reset_password;
        // ...
        console.log(context);

        res.render("reset_password", { context })

    } catch (error) {
        console.log("** Error:: Resetting password view **", error);
    }
};
const view_forgot_password_initiate = async (req, res, next) => {
    try {
        console.log("** Inside forgot password initiate view **");
        let context = {}, user_alert = "";


        // notification section
            const error_alert = req.flash("validate_forgot_password");
            const flash_msg = req.flash("forgot_password");
        // ...
        // wrapping data into context object 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            context.fpass_initiate_url = config.post_urls.forgot_password_initiate;
        // ...
        console.log(context);

        res.render("fpass_initiate", { context })

    } catch (error) {
        console.log("** Error:: forgot password initiate view **", error);
    }
};
const view_forgot_password_confirm = async (req, res, next) => {
    try {
        console.log("** Inside forgot password confirmation view **");
        let context = {}, user_alert = "";


        // notification section
            const error_alert = req.flash("validate_fpass_confirm");
            const flash_msg = req.flash("fpass_confirm");
        // ...
        // wrapping data into context object 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            context.fpass_confirm_url = config.post_urls.forgot_password_confirm;
        // ...
        console.log(context);

        res.render("fpass_confirm", { context })

    } catch (error) {
        console.log("** Error:: forgot password confirm view **", error);
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
        req.session.destroy();  // destroy user session data in passport
        store.session.set("login", "User Logout sucessfully. Please Login !"); // using store module and cannot use flash module for alert messaging because req.session is destroyed

        res.redirect(303, config.view_urls.login);  // redirect to login get page

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








module.exports = { view_login, view_signup, view_logout, view_registration, view_404, view_500, view_dashboard,
        view_OTP, view_reset_password, view_forgot_password_initiate, view_forgot_password_confirm }