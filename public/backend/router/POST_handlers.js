// IMPORATION OF MODULES 
const store = require("store2");
const validator = require("validator");

// ....
// IMPORTATION OF FILES 
const config = require("../config/config");
const { UserModel, LoginModel, RegistrationModel, DateTimeTracker } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");
const { randomSerialCode } = require("../utils/code_generator");
const { sending_email, sending_email_with_html_template } =  require("../controller/nodemailer");
const { is_user_active } = require("../controller/validation");

//

const registration_handler = async (req, res, next) => {

    const email = req.body.username.trim();
    const businessName = req.body.businessName.trim();
    const natureOfBusiness = req.body.natureOfBusiness.trim();
    const businessType = req.body.businessType.trim();
    const location = req.body.location.trim();
    const address = req.body.address.trim();
    const contact = req.body.contact.trim();
    const count = req.body.country.trim();
    const region_state = req.body.region_state.trim();
    const town = req.body.town.trim();
    const ceo = req.body.ceo.trim();
    const confirm_pass = req.body.password.trim();

    try { 
        const existingUser = await RegistrationModel.find({ "email": email });
        console.log("checking for existing company biodata from db ..", existingUser);

        if (existingUser.length > 0) {
            console.log("Email already exists in the database ");

            req.flash("register", `Error. ${businessName} already registered !`);
            res.redirect(303, `${config.view_urls.register}`);

        } else {
            // encrypt password
                const hashed_pass = await encrypt_access_code(confirm_pass);
            // ... 
            otp = await randomSerialCode(5);
            const newUser = new RegistrationModel({
                email: email,
                businessName: businessName,
                natureOfBusiness: natureOfBusiness,
                businessType: businessType,
                location:location,
                address:address,
                contact:contact,
                country:count,
                region_state:region_state,
                town:town,
                ceo: ceo,
                password: hashed_pass,
                otp: otp
            });
            await newUser.save();

            // sending email notification to company email 
                const nodemail_resp = await sending_email(
                    config.company_name,
                    `Company Registration`,
                    email,
                    `Hi ${ceo}, Thank you for registering your company ${businessName} with ${config.company_name}. Verify email with the provided OTP code ${otp}`
                )
                console.log("...Email response ...", nodemail_resp);

                if (nodemail_resp == null) { next()  }
                else if (nodemail_resp !== undefined) { next() }
            // ..
        }
        
    } catch (error) {
        console.log("Error from Registeration ..", error);

        // handling duplicate UUID keys err
            if (error.code == "11000") { //  for duplicate of business name 
                req.flash("register", `Error. ${businessName} already registered !`);
                res.redirect(303, `${config.view_urls.register}`);
            }
            if (error, error.code == "11000" && Object.keys(error.keyValue) == "password") { // for duplicate of password 
                req.flash("register", `Error. Provided Password already used !`);
                res.redirect(303, `${config.view_urls.register}`);
            }
        // ...
    }

};
const signup_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data from signup UI **", req.body);
        const data = req.body;
        const user = req.session.passport.user.company;  

        const hashed_pass = await encrypt_access_code(data.confirm_pass);
        console.log("** hashing user password **", hashed_pass); 

        // save data into db
            const otp_code = await randomSerialCode(5);
            const biodata = await RegistrationModel.find({ businessName: user.company }); // getting company biodata from db            
            
            const payload = {
                first_name: data.first_name.trim(),
                last_name: data.last_name.trim(),
                middle_name: data.middle_name.trim(),
                email: data.email.trim(),
                tel: data.tel.trim(),
                password: hashed_pass,
                company: user.company.trim(),
                userID: `${user.company.toLowerCase().slice(0, 3).trim()}${randomSerialCode(5)}`,
                companyRefID: biodata[0].uuid,
                otp: otp_code,
            };
            console.log("** final payload **", payload);

            await UserModel.insertMany(payload);
            await DateTimeTracker.insertMany({ "companyRefID": payload.companyRefID, "email": payload.email, "userID": payload.userID });
        // ...
        // send OTP code to company email using nodemailer for authentication 
            const nodemail_resp = await sending_email(
                config.company_name,
                "User Singup Authentication",
                biodata[0].email,
                `Dear Admin, you just signup user ${payload.first_name} ${payload.last_name} with UserID ${payload.userID}.
                    A DEFAULT PASSWORD & OTP CODE will sent to user for Authentication.
                    Thank You !`
            );
            console.log("** is email sent to company :", nodemail_resp);
        // ...
        // checking if OTP code is sent via user email sucessfully 
            if (nodemail_resp == null) {
                // delete signup data from db
                    await UserModel.deleteOne({ "userID": payload.userID });
                    await DateTimeTracker.deleteOne({ "userID": payload.userID });
                // ...
                req.flash("signup", "Error. OTP not sent. Please Signup again !");
                res.redirect(303, `${config.view_urls.user_register}`);

            }else if (nodemail_resp !== undefined) { // if user receives the email
                // send credential to user via email  
                    const nodemail_resp = await sending_email(
                        config.company_name,
                        "User Singup Authentication",
                        payload.email,
                        `Hi ${payload.first_name}, ${payload.company} has signed you up with UserID ${payload.userID}.
                            Login with the DEFAULT PASSWORD ${data.confirm_pass} for the first time & verify with the provided OTP CODE ${payload.otp} for Authentication.
                            NB: Failure to Login within the stipulated time of 30min, credential will be revoke.
                            Thank You !`
                    );
                    console.log("** is email sent to user :", nodemail_resp);
                // ....
                // checking if email was sent to user 
                    if (nodemail_resp == null) {
                        // delete signup data from db
                            await UserModel.deleteOne({ "userID": payload.userID });
                            await DateTimeTracker.deleteOne({ "userID": payload.userID });
                        // ...
                        req.flash("signup", "Error. OTP not sent. Please Signup again !");
                        res.redirect(303, `${config.view_urls.user_register}`);

                    }else if (nodemail_resp !== undefined) {
                        req.flash("signup", "User is signup sucessful !");
                        res.redirect(303, `${config.view_urls.user_register}`); 
                    }
                // ...
            }
        // ...

    } catch (error) {
        console.log("** Error:: Signup Handler **", error);

        // Handling errors 
            if (error.writeErrors[0].err.errmsg.includes("duplicate key error collection")) { // for duplicate key pairs in db 
                req.flash("signup", "Error. User already SignUp. Please Login !");
                res.redirect(303, `${config.view_urls.user_register}`);
            }

        // ...
    }
};
const OTP_verification_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data for OTP verification **", req.body);

        const data = req.body;
        const auth_user = req.session.passport.user;
        let proceed = "";

        console.log(".. validating if user is active or revoked ...");

        const user = await UserModel.find({ "email": auth_user.email });  // get current sign data from db
        if (user.length > 0) {
            ( await is_user_active(user[0]) )? proceed = true : proceed = false;
        }else {
            console.log("... User not found. Redirecting back to OTP page ...");

            req.flash("signup", "Error. User not found. Register or Signup !");
            res.redirect(303, `${config.view_urls.otp}`);
        }

        console.log("... validation completed ...");
        console.log("... Initializing OTP code verification ...");

        if (proceed) {
            if (user[0].otp == data.otp.trim()) {
                await UserModel.updateOne({ "email": auth_user.email }, { "otp": "verified" })
                proceed = true;

            }else {
                console.log("... OTP not verified ...");

                req.flash("otp", "Error. OTP verification Failed. Try Again !");
                res.redirect(303, `${config.view_urls.otp}`);
            }
        }

        console.log("... OTP code verification completed ...");
        console.log("... Redirecting based on user credentials ...");

        if (proceed) {
            if (user[0].role == "Admin") {
                req.flash("dashboard", "User is authenticated");
                res.redirect(303, `${config.view_urls.dashboard}`);

            }else {
                if (user[0].password.match("[a-z]{7}[0-9]{5}")) {
                    req.flash("reset_password", "For Security reasons, Change Password !");
                    res.redirect(303, `${config.view_urls.reset_password}`);

                }else {
                    req.flash("dashboard", "User is authenticated");
                    res.redirect(303, `${config.view_urls.dashboard}`);
                }
            }
        }
    } catch (error) {
        console.log("** Error:: OTP verification Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const is_OTP_verified = async (req, res, next) => {
    try {
        const data = req.body;
        const auth_user = req.session.passport.user;

        console.log("... Intializing User credential verification ...");

        const user = UserModel.find({ "email": auth_user.email, "company": data.company });
        if (await is_user_active(user)) {
            console.log("... checking if OTP is verified or not ...");

            if (user[0].otp.includes("verified")) {
                next()
            }else {
                const otp = await randomSerialCode(5);
                const nodemail_resp = await sending_email(
                    config.company_name,
                    "Email Authentication",
                    biodata[0].email,
                    `Hi ${user[0].first_name}, ${config.company_name} want you to verify your email by providing the OTP code:  ${otp}. Thank You !`
                );
                console.log("** is email sent to company :", nodemail_resp);

                if (nodemail_resp == null) {
                    req.flash("otp", `Error. OTP code not sent email. Resend OTP code !`);
                    res.redirect(303, config.view_urls.otp);
                    
                }else  if (nodemail_resp == undefined) {
                    req.flash("otp", `Error. Provide OTP code for email verification !`);
                    res.redirect(303, config.view_urls.otp);
                }
            }
        }else {
            req.flash("login", `User ${user[0].userID} credential is revoked. Contact Admin !`);
            res.redirect(303, config.view_urls.login);
        }

    } catch (error) {
        console.log("** Error:: is OTP verified Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const is_password_secured = async (req, res, next) => {
    try {
        const data = req.body;
        const auth_user = req.session.passport.user;

        console.log("... Initializing password encryption ...");

        const hashed_pass = await encrypt_access_code(data.confirm_pass);
        console.log("** hashing user password **", hashed_pass); 


        console.log("... Password encryption completed ...");
        console.log("... Checking if user password is secured or not ...");
        

        const user = await UserModel.find({ "email": auth_user.email, "company": data.company });
        if (data.password.match(config.default_pass_regexp)) {
            if (user[0].password == hashed_pass) {
                console.log("... Password Insecured. Redirecting ...");

                req.flash("reset_password", "Error. Insecure password. Reset Password !");
                res.redirect(303, config.view_urls.reset_password);

            }else {
                console.log("... Redirecting ...");

                req.flash("dashboard", "User is authenticated ");
                res.redirect(303, config.view_urls.dashboard);
            }
        }else {
            console.log("... Redirecting ...");

            req.flash("dashboard", "User is authenticated ");
            res.redirect(303, config.view_urls.dashboard);
        }

    } catch (error) {
        console.log("** Error:: is password secured Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const password_reset_handler = async (req, res, next) => {
    try {
        const data = req.body;
        const auth_user = req.session.passport.user;

        console.log("... collecting data from UI ..", data);
        console.log("... Initializing password encryption ...");

        const hashed_pass = await encrypt_access_code(data.confirm_pass);
        console.log("** hashing user password **", hashed_pass); 

        console.log("... Password encryption completed ...");
        console.log("... Initializing password reset ...");

        user = await UserModel.updateOne({ "email": auth_user.email, "company": auth_user.company }, { "password": hashed_pass });
        if (user.length <= 0) {
            req.flash("reset_password", "Error. Unable to reset password. Try Again !");
            res.redirect(303, config.view_urls.reset_password);

        }else {
            console.log("... Password reset completed ...");
            console.log("... Redirectig ...");

            req.flash("dashboard", "User is authenticated !");
            res.redirect(303, config.view_urls.dashboard);
        }

    } catch (error) {
        console.log("** Error:: is password secured Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const forgot_password_initiate_handler = async (req, res, next) => {
    try {
        const data = req.body;
        let user_email = "";
        
        console.log("... collecting data from UI ..", data);
        console.log("... Initializing user credential confirmation ...");

        if (validator.isEmail(data.username.trim())) { 
            console.log("... Email used ...");
        
            // confirm if user credentials belongs to the ceo or not 
                const biodata = await RegistrationModel.find({ "email": data.username.trim() });
                if (biodata.length > 0) {
                    user_email = biodata[0].email;

                }else {
                    const  user = await UserModel.find({ "email": data.username.trim() });
                    user_email = user[0].email;
                }
            // ...
        }else if (data.username.trim().match(config.userID_regexp)) {  
            console.log("...UserID used ...");

            const user = await UserModel.find({ "userID": data.username.trim() });
            user_email = user[0].email;
        }

        if (user_email !== "") {
            const nodemail_resp = await sending_email_with_html_template(
                config.company_name,
                "Forgot Password",
                user_email,
                `Dear Admin, to change your current password, ${config.company_name} want to you to verify if its really you and not a robot by clicking the confirmation button`
                `<a style="padding: 15px 15px; background-color: black; background: black; color: white;" href="${config.view_urls.forgot_password_confirm}" id=""> Proceed to Change Password </a>`
            );
            console.log("** is email sent to user :", nodemail_resp);

            if (nodemail_resp == null) {
                req.flash("fpass_initiate", "Error. Couldn't Auth Credential. Try Again !");
                res.redirect(303, `${config.view_urls.forgot_password_initiate}`);

            }else if (nodemail_resp !== undefined) {
                console.log("... User credential confirmation completed ...");

                req.session.fpass_username = user_email;    // register email or userID in request session data storage for setting new password in the next route 
                req.session.fpass_company = data.company;
                req.flash("fpass_initiate", "Almost there. Email sent. Confirm !");
                res.redirect(303, `${config.view_urls.forgot_password_initiate}`);
            }
        }
    } catch (error) {
        console.log("** Error:: forgot password initiate Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const forgot_password_confirmation_handler = async (req, res, next) => {
    try {
        const data = req.body;
        
        console.log("... collecting data from UI ..", data);
        console.log("... Initializing confirmation ...");

        const hashed_pass = await encrypt_access_code(data.confirm_pass);
        console.log("** hashing user password **", hashed_pass); 

        const user_email = req.session.fpass_username;
        const company = req.session.fpass_company;
        if (user_email == null || user_email == undefined) {
            req.flash("fpass_initiate", "Error. Couldn't Auth Credential. Try Again !");
            res.redirect(303, `${config.view_urls.forgot_password_initiate}`);

        }else {
            await UserModel.updateOne({ "email": user_email, "company": company }, { "password": hashed_pass });
            req.flash("login", "Password modified sucessful. Login !");
            res.redirect(303, `${config.view_urls.login}`);
        }

    } catch (error) {
        console.log("** Error:: forgot password confirmation Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};





module.exports = { signup_handler, OTP_verification_handler, registration_handler,
    is_OTP_verified, is_password_secured,  password_reset_handler, forgot_password_initiate_handler, forgot_password_confirmation_handler }