// IMPORTATION OF MODULES 
const store = require("store2");

// ...
const view_registration = async (req, res, next) => {
    try {
        console.log("** Inside Registration view **");
        let context = {};




        // notification section
            const error_alert = req.flash("validate_register"); 
            const flash_msg = req.flash("register"); 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            
            console.log("user alert message :", context.message);
        // ...
        res.render("register", { context });

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_signup = async (req, res, next) => {
    try {
        console.log("** Inside Signup view **");
        let context = {}, user_alert = "";

        // notification section

            const error_alert = req.flash("validate_signup");
            const flash_msg = req.flash("signup");
            const otp_status = store.session.get("OTP_status");
            setTimeout(() => { store.session.set("OTP_status", null) }, 3000); // clear OTP status after 3s
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            
            console.log("user alert message :", context.message);
            console.log("OTP status :", otp_status);
        // ...
        res.render("user-register", { context })

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_login = async (req, res, next) => {
    try {
        console.log("** Inside Login view **");
        let context = {}, user_alert = "";





        // notification section
            const error_alert = req.flash("validate_login");
            const flash_msg = req.flash("login");
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            
            console.log("user alert message :", context.message);
        // ...
        res.render("login", { context })

    } catch (error) {
        console.log("** Error:: Login view **", error);
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

        res.redirect(303, "/api/get/user/404");  // redirect to login get page

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








module.exports = { view_login, view_signup, view_logout, view_registration, view_404, view_500 }