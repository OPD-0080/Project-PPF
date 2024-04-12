const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { login_handler, signup_handler, registration_handler, OTP_verification_handler, redirect_to_dashboard_handler } = require("./POST_handlers");
// ...
// IMPORTATION OF MIDDLEWARES
const config = require("../config/config");
const { loginValidation, signupValidation, OTPValidation, registrationValidation } = require("../controller/validation");
// ...
// MULTER SECION FOR UPLOADING DATA
/*
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype.startsWith("image")) {
            console.log("multer storage found");
            cb(null, "./public/storage/multer");
        }
        else {
            console.log("Uploaded file must be an image");
        }
        
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}`)
    }
});
const upload = multer({ storage: storage });
// ...
*/

// ROUTERS SECTION 
router.post("/register", registrationValidation, registration_handler, passport.authenticate("local", { failureRedirect: `${config.view_urls.register}`, failureFlash: "Error. User already login", failureMessage: true, successMessage: "User Authenicated" }), redirect_to_dashboard_handler );
router.post("/user-register", signupValidation, signup_handler );
router.post("/otp/verification", OTPValidation, OTP_verification_handler );
router.post("/login", loginValidation, passport.authenticate("local", { failureRedirect: `${config.view_urls.login}`, failureFlash: "Error. User already login", failureMessage: true, successMessage: "User Authenicated" }), login_handler);



// ...
module.exports = router
