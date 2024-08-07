const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { signup_handler, registration_handler, OTP_verification_handler, is_OTP_verified, is_password_secured,
    password_reset_handler, forgot_password_initiate_handler, forgot_password_confirmation_handler, resend_OTP_code_handler,
    purchases_handler } = require("./POST_handlers");
// ...
// IMPORTATION OF MIDDLEWARES
const config = require("../config/config");
const { isUSerAuthenticated } = require("../controller/passport")
const { loginValidation, signupValidation, OTPValidation, registrationValidation, resetPasswordValidation,
    forgotPasswordInitiateValidation, forgotPasswordConfirmValidation } = require("../controller/validation");
const { authorization_code } = require("../utils/code_generator");
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
// AUHTHENTICATION
router.post("/register", registrationValidation, registration_handler, passport.authenticate("local", { failureRedirect: `${config.view_urls.login}`, failureFlash: "Error. Unable to login. Try Agin !", failureMessage: true, successMessage: "User Authenicated", successRedirect: `${config.view_urls.otp}` }) );
router.post("/user-register", isUSerAuthenticated, signupValidation, signup_handler );
router.post("/login", loginValidation, passport.authenticate("local", { failureRedirect: `${config.view_urls.login}`, failureFlash: "Error. User already login", failureMessage: true}), is_OTP_verified, is_password_secured );
router.post("/otpverification", isUSerAuthenticated, OTPValidation, OTP_verification_handler );
router.post("/password/reset",  isUSerAuthenticated, resetPasswordValidation, password_reset_handler );
router.post("/password/forgot/initiate", forgotPasswordInitiateValidation, forgot_password_initiate_handler );
router.post("/password/forgot/confirmation", forgotPasswordConfirmValidation, forgot_password_confirmation_handler );
router.post("/password/forgot/resend", isUSerAuthenticated, resend_OTP_code_handler );
//  END
// PURCHASES 
router.post("/purchases/entry", isUSerAuthenticated, purchases_handler );

// END



module.exports = router
