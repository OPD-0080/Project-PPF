const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { view_login, view_signup, view_logout, view_registration, view_404, view_500,
        view_dashboard
    } = require("./GET_handlers");
const { isUSerAuthenticated } = require("../controller/passport");
// ...


// ROUTERS SECTION 
router.get("/register", view_registration);
router.get("/user-register", isUSerAuthenticated, view_signup);
router.get("/login", view_login);
router.get("/logout", view_logout);
router.get("/404", view_404);
router.get("/500", view_500);
router.get("/dashboard", isUSerAuthenticated, view_dashboard);
// ...
module.exports = router
