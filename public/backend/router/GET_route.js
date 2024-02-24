const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { view_login, view_signup, view_logout, view_registration, view_404, view_500 } = require("./GET_handlers");

// ...


// ROUTERS SECTION 
router.get("/register", view_registration);
router.get("/signup", view_signup);
router.get("/login", view_login);
router.get("/logout", view_logout);
router.get("/404", view_404);
router.get("/500", view_500);
// ...
module.exports = router
