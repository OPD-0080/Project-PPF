const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { view_login, view_signup } = require("./GET_handlers");

// ...


// ROUTERS SECTION 
router.get("/login", view_login);
router.get("/signup", view_signup);

// ...
module.exports = router
