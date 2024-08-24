// IMPORTATION OF MODULES 
const store = require("store2");
const moment = require("moment");
// ...

// IMPORTATION OF FILES
const config = require("../config/config");
const { UserModel, LoginModel, RegistrationModel, DateTimeTracker, AuthorizationModel, PurchaseModel } = require("../../database/schematics");
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
            context.config = config;
        // ...
        
        res.render("register", { context });

    } catch (error) {
        console.log("** Error:: Registration view **", error);
        res.redirect("500");
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
            context.config = config;
            context.random_default_pass = random_default_pass;
        // ...
        console.log(context);

        res.render("user-register", { context })

    } catch (error) {
        console.log("** Error:: Signup view **", error);
        res.redirect("500");
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
                businesses.push({name: data.businessName.trim(), photo: data.photo});
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
            context.config = config
        // ...
        // console.log(context);

        res.render("login", { context })

    } catch (error) {
        console.log("** Error:: Login view **", error);
        res.redirect("500");
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
            context.config = config;
        // ...
        console.log(context);

        res.render("otp_verification", { context })

    } catch (error) {
        console.log("** Error:: OTP verification view **", error);
        res.redirect("500");
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
            context.config = config;
        // ...
        console.log(context);

        res.render("reset_password", { context })

    } catch (error) {
        console.log("** Error:: Resetting password view **", error);
        res.redirect("500");
    }
};
const view_forgot_password_initiate = async (req, res, next) => {
    try {
        console.log("** Inside forgot password initiate view **");
        let context = {}, user_alert = "";

         // getting all business name from DB and populate it on DOM 
            let businesses = [];
            const biodata = await RegistrationModel.find();
            for (let i = 0; i < biodata.length; i++) {
                const data = biodata[i];
                businesses.push({name: data.businessName.trim(), photo: data.photo});
            }
        // ...

        // notification section
            const error_alert = req.flash("validate_forgot_password");
            const flash_msg = req.flash("fpass_initiate");
        // ...
        // wrapping data into context object 
            (error_alert.length !== 0)? context.message = error_alert : context.message = flash_msg;
            context.config = config;
            context.businesses = JSON.stringify(businesses);
        // ...
        console.log(context);

        res.render("fpass_initiate", { context })

    } catch (error) {
        console.log("** Error:: forgot password initiate view **", error);
        res.redirect("500");
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
            ccontext.config = config;
        // ...
        console.log(context);

        res.render("fpass_confirm", { context })

    } catch (error) {
        console.log("** Error:: forgot password confirm view **", error);
        res.redirect("500");
    }
};
const view_dashboard = async (req, res, next) => {
    try {
        let context = {}, user_alert = "";
        console.log("** inside Dashboard view");






        console.log("... wrapping context before rendering ...");

        const flash_msg = req.flash("dashboard");
        context.message = flash_msg;
        context.config = config;

        console.log("... context completed ...");
        console.log("... rendering ...");

        res.render("dashboard", { context });

    } catch (error) {
        console.log("** Error:: View Dashboard **", error);
        res.redirect("500");
    }
};
const view_logout = async (req, res, next) => {
    try {
        console.log("** Inside Logout view **");
        console.log("... clearing out credentials from, database ...");

        if (req.session.hasOwnProperty("passport")) {
            await LoginModel.deleteOne( {"email": req.session.passport.user.email});
            await DateTimeTracker.updateOne( {"email": req.session.passport.user.email}, 
                {"logout_date": `${moment().format("YYYY-MM-DD")}`, "logout_time": `${moment().format("hh:mm")}`}); 

            req.session.destroy();  // destroy user session data in passport
            store.session.set("login", "User Logout sucessfully. Please Login !"); // using store module and cannot use flash module for alert messaging because req.session is destroyed

            res.redirect(303, config.view_urls.login);  // redirect to login get page
        }else {
            console.log("... clearing out credentails from database completed ...");
            console.log("... clearing cookies from the browser ...");
                
            req.session.destroy();  // destroy user session data in passport
            store.session.set("login", "User Logout sucessfully. Please Login !"); // using store module and cannot use flash module for alert messaging because req.session is destroyed

            console.log("... clearing cookies completed ...");
            console.log("... redireting ...");

            res.redirect(303, config.view_urls.login);  // redirect to login get page
        }

    } catch (error) {
        console.log("** Error:: Logout view **", error);
        res.redirect("500");
    }
};
const view_404 = async (req, res, next) => {
    try {
        console.log("** Inside 404 view **");

        res.render("404");  // redirect to login get page

    } catch (error) {
        console.log("** Error:: 404 view **", error);
        res.redirect("500");
    }
};
const view_500 = async (req, res, next) => {
    try {
        console.log("** Inside 500 view **");
    
        res.render("500");  // redirect to login get page

    } catch (error) {
        console.log("** Error:: 500 view **", error);
        res.redirect("500");
    }
};
const view_purchase = async (req, res, next) => {
    try {
        let context = {}, user_alert = "";
        console.log("** inside purchase view");






        console.log("... wrapping context before rendering ...");

        const flash_msg = req.flash("purchase");
        context.message = flash_msg;
        context.config = config;
        console.log(context.message);
        

        setTimeout(() => { req.flash("purchase", "") }, 500);

        console.log("... context completed ...");
        console.log("... rendering ...");
        
        res.render("purchase", { context });

    } catch (error) {
        console.log("** Error:: View Purchase **", error);
        res.redirect("500");
    }
};
const view_purchase_preview = async (req, res, next) => {
    try {
        let context = {}, user_alert = "";
        console.log("** inside purchases preview view");
        console.log("... loading all data from the database ...");
        
        console.log("... loading data from database completed ...");
        console.log("... wrapping context before rendering ...");

        const flash_msg = req.flash("preview");
        context.message = flash_msg;
        context.config = config;
        context.user = req.session.passport.user;
        // context.purchases = purchases;

        console.log("... context completed ...");
        console.log("... rendering ...");
        
        
        res.render("purchase_preview", { context });

    } catch (error) {
        console.log("** Error:: View purchases preview **", error);
        res.redirect("500");
    }
};
const view_purchase_responds = async (req, res, next) => {
    try {
        let context = {}, user_alert = "";
        console.log("** inside purchases_responds view");
        console.log("... wrapping context before rendering ...");

        const purchases = await PurchaseModel.find();
        
        console.log("... query responds ...", purchases);
        console.log("... Loading purchases completed ...");

        const flash_msg = req.flash("purchases_responds");
        context.message = flash_msg;
        context.purchases = purchases;

        console.log("... context completed ...", context);
        console.log("... rendering ...");

        res.json(context);

    } catch (error) {
        console.log("** Error:: View purchases responds **", error);
        res.redirect("500");
    }
};






module.exports = { view_login, view_signup, view_logout, view_registration, view_404, view_500, view_dashboard,
        view_OTP, view_reset_password, view_forgot_password_initiate, view_forgot_password_confirm, view_purchase,
        view_purchase_preview, view_purchase_responds }