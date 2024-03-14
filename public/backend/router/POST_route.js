const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { login_handler, signup_handler, registration_handler, OTP_verification_handler } = require("./POST_handlers");
// ...
// IMPORTATION OF MIDDLEWARES
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
router.post("/register", registrationValidation, registration_handler );
router.post("/user-register", signupValidation, signup_handler );
router.post("/otp/verification", OTPValidation, OTP_verification_handler );
router.post("/login", loginValidation, passport.authenticate("local", { failureRedirect: '/api/get/user/login', failureFlash: "Error. User already login", failureMessage: true, successMessage: "User Authenicated" }), login_handler);



// ...
module.exports = router
