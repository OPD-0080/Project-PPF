// IMPORTATION OF MODULES 
const store = require("store2");

// ...


const view_login = async (req, res, next) => {
    try {
        console.log("** Inside Login view **");
        let user_alert = "";






        // notification section
            const error_alert = req.flash("validate_login");
            if (error_alert !== "") {
                user_alert = error_alert;
            }else {
                user_alert = req.flash("login");
            }
            const otp_status = store.session.get("OTP_status");
            setTimeout(() => { store.session.set("OTP_status", null) }, 3000); // clear OTP status after 3s

            console.log("user alert message :", user_alert);
            console.log("OTP status :", otp_status);
        // ...
        res.json(200)

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
};
const view_signup = async (req, res, next) => {
    try {
        console.log("** Inside Signup view **");



        // notification section
            const error_alert = req.flash("validate_signup");
            const user_alert = req.flash("signup");
            console.log("Error message", error_alert);
            console.log("user alert message :", user_alert);
        // ...
        res.json(200)

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
}





module.exports = { view_login, view_signup }