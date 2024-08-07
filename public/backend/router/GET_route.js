const express = require("express");
const router = express.Router();
const multer = require("multer");
const passport = require("passport");


// IMPORTATION OF HANDLERS
const { view_login, view_signup, view_logout, view_registration, view_404, view_500,
        view_dashboard, view_OTP, view_reset_password, view_forgot_password_initiate, view_forgot_password_confirm,
        view_purchase, view_purchase_preview, view_purchase_responds  } = require("./GET_handlers");
const { isUSerAuthenticated } = require("../controller/passport");
// ...


// ROUTERS SECTION 
router.get("/register", view_registration);
router.get("/user-register", isUSerAuthenticated, view_signup);
router.get("/otpverification", view_OTP);
router.get("/resetpassword", view_reset_password);
router.get("/forgotpasswordinitiate", view_forgot_password_initiate);
router.get("/forgotpasswordconfirm", view_forgot_password_confirm);
router.get("/login", view_login);
router.get("/logout", view_logout);
router.get("/404", view_404);
router.get("/500", view_500);
router.get("/dashboard", isUSerAuthenticated, view_dashboard);
router.get("/purchases", isUSerAuthenticated, view_purchase);
router.get("/purchasepreview", isUSerAuthenticated, view_purchase_preview);

router.get("/purchasesresponds", isUSerAuthenticated, view_purchase_responds);
// ...
module.exports = router
