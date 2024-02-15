const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { view_login } = require("./GET_handlers");

// ...


// ROUTERS SECTION 
router.get("/login", view_login);


// ...
module.exports = router
