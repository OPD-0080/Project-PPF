const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { login_handler, signup_handler, registration_handler } = require("./POST_handlers");
// ...
// IMPORATION OF MIDDLEWARES
const { loginValidation, signupValidation } = require("../controller/validation");


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
router.post("/signup", signupValidation, signup_handler)
router.post("/login", loginValidation, passport.authenticate("local", { failureRedirect: '/api/get/user/login', failureFlash: "Error. User already login", failureMessage: true, successMessage: "User Authenicated" }), login_handler);
router.post("/register", registration_handler)


// ...
module.exports = router
