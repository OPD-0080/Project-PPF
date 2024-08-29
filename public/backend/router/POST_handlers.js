// IMPORATION OF MODULES 
const moment = require("moment");
const validator = require("validator");

// ....
// IMPORTATION OF FILES 
const config = require("../config/config");
const { UserModel, RegistrationModel, DateTimeTracker, AuthorizationModel, PurchaseModel, TrackingModel,
    ComparismeModel } = require("../../database/schematics");
const { encrypt_access_code } = require("../controller/encryption");
const { randomSerialCode, authorization_code } = require("../utils/code_generator");
const { sending_email, sending_email_with_html_template } =  require("../controller/nodemailer");
const { is_user_active, getting_auth_user_data, tracking_payload_initials, verifying_user_restriction,
        verifying_user_previliges, verifying_user_authorization_codes, is_user_found_in_company } = require("../controller/validation");
const { get_date_and_time } = require("../utils/date_time");


//
// AUTHENTICATION
const registration_handler = async (req, res, next) => {

    const email = req.body.username.trim();
    const businessName = req.body.businessName.trim().toLowerCase().toLowerCase();
    const natureOfBusiness = req.body.natureOfBusiness.trim().toLowerCase();
    const businessType = req.body.businessType.trim().toLowerCase();
    const location = req.body.location.trim().toLowerCase();
    const address = req.body.address.trim().toLowerCase();
    const contact = req.body.contact.trim();
    const count = req.body.country.trim().toLowerCase();
    const region_state = req.body.region_state.trim().toLowerCase();
    const town = req.body.town.trim().toLowerCase();
    const ceo = req.body.ceo.trim().toLowerCase();
    const confirm_pass = req.body.password.trim();

    try { 
        const existingUser = await RegistrationModel.find({ "email": email });
        console.log("checking for existing company biodata from db ..", existingUser);

        if (existingUser.length > 0) {
            console.log("Company already exists in the database ");

            req.flash("register", `Error. ${businessName} already registered !`);
            res.redirect(303, `${config.view_urls.register}`);

        } else {
            // encrypt password
                const hashed_pass = await encrypt_access_code(confirm_pass);
            // ... 
            const otp = await randomSerialCode(5);
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
                otp: otp,
            });
            await newUser.save();
            
            const biodata = await RegistrationModel.findOne({ "email": email });
            console.log("... getting registration data ...", biodata);

            const auth_payload = {
                email: biodata.email,
                company: biodata.businessName,
                userID: biodata.ceo, // important !. the userID become the CEO name for user with superuser role.
                role: biodata.role,
                companyRefID: biodata._id, 
                authorization: await authorization_code(),
            };
            await AuthorizationModel.insertMany(auth_payload);

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

        // handling duplicate _id keys err
            if (error.code == "11000") { //  for duplicate of business name 
                req.flash("register", `Error. ${businessName} already registered !`);
                res.redirect(303, `${config.view_urls.register}`);
            };
            if (error, error.code == "11000" && Object.keys(error.keyValue) == "password") { // for duplicate of password 
                req.flash("register", `Error. Provided Password already used !`);
                res.redirect(303, `${config.view_urls.register}`);
            };
            if (error, error.code == "11000" && Object.keys(error.keyValue) == "authorizations") {
                console.log("... authorization code id duplicated. But registration sucess. ...");
                console.log("... move to the next middelware...");
                next();
            }
        // ...
    }

};
const signup_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data from signup UI **", req.body);
        const data = req.body;
        const user = req.session.passport.user;  

        console.log("... Initializing password encryption ...");

        // const hashed_pass = await encrypt_access_code(data.confirm_pass);
        
        // console.log("** hashing user password **", hashed_pass); 
        console.log("... Password encryption completed...");
        console.log("... Initializing business registration ...");

        const otp_code = await randomSerialCode(5);
        const biodata = await RegistrationModel.find({ businessName: user.company }); // getting company biodata from db            
        const payload = {
            first_name: data.first_name.trim().toLowerCase(),
            last_name: data.last_name.trim().toLowerCase(),
            middle_name: data.middle_name.trim().toLowerCase(),
            email: data.username.trim(),
            tel: data.tel.trim(),
            date_of_birth: data.date_of_birth,
            password: data.confirm_pass,
            company: user.company,
            userID: `${user.company.slice(0, 3).trim()}${await randomSerialCode(5)}`,
            companyRefID: biodata[0]._id,
            otp: otp_code,
        };
        console.log("** final payload **", payload);

        await UserModel.insertMany(payload);
        await DateTimeTracker.insertMany({ "companyRefID": payload.companyRefID, "email": payload.email, "userID": payload.userID });


        console.log("... Business registration completed ...");
        console.log("... Sending email notification to company ...");


        const nodemail_resp = await sending_email(
            config.company_name,
            "User Singup Authentication",
            biodata[0].email,
            `Dear Admin, you just signup user ${payload.first_name} ${payload.last_name} with UserID ${payload.userID}.
                A DEFAULT PASSWORD & OTP CODE will sent to user for Authentication.
                Thank You !`
        );
        console.log("** is email sent to company :", nodemail_resp);
        
        if (nodemail_resp == null) {
            console.log("... Email notification failed. Redirecting...");

            // delete signup data from db
                await UserModel.deleteOne({ "userID": payload.userID });
                await DateTimeTracker.deleteOne({ "userID": payload.userID });
            // ...
            req.flash("signup", "Error. OTP not sent. Please Signup again !");
            res.redirect(303, `${config.view_urls.user_register}`);

        }else if (nodemail_resp !== undefined) { // if user receives the email
            console.log("... Sending email notification to user ...");

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

            if (nodemail_resp == null) {
                console.log("... Email notification failed. Redirecting...");

                await UserModel.deleteOne({ "userID": payload.userID });
                await DateTimeTracker.deleteOne({ "userID": payload.userID });

                req.flash("signup", "Error. OTP not sent. Please Signup again !");
                res.redirect(303, `${config.view_urls.user_register}`);

            }else if (nodemail_resp !== undefined) {
                console.log("... Email notification completed. Redirecting...");

                req.flash("signup", "User is signup sucessful !");
                res.redirect(303, `${config.view_urls.user_register}`); 
            }
        }

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

        console.log("... Verifying user credentials ...");

        const user = await getting_auth_user_data(auth_user);

        console.log(".. user verification completed ...", user);
        console.log(".. validating if user is active or revoked ...");


        if (user.length > 0) { ( await is_user_active(user[0]) )? proceed = true : proceed = false; } 
        else {
            console.log("... User not found. Redirecting back to OTP page ...");

            req.flash("signup", "Error. User not found. Register or Signup !");
            res.redirect(303, `${config.view_urls.otp}`);
        }

        console.log("... validation completed ...");
        console.log("... Initializing OTP code verification ...");

        if (proceed) {
            if (user[0].otp == data.otp.trim()) {
                if (auth_user.role == "admin") {
                    await RegistrationModel.updateOne({ "email": auth_user.email }, { "otp": "verified" })
                    proceed = true;

                }else {
                    await UserModel.updateOne({ "email": auth_user.email }, { "otp": "verified" })
                    proceed = true;
                }
            }else {
                console.log("... OTP not verified ...");

                req.flash("otp", "Error. OTP verification Failed. Try Again !");
                res.redirect(303, `${config.view_urls.otp}`);
            }
        }else {
            console.log("... user is not active. Logout user ...");
            res.redirect(303, `${config.view_urls.logout}`);
        }

        console.log("... OTP code verification completed ...");
        console.log("... Redirecting based on user credentials ...");

        if (proceed) {
            if (user[0].role == "admin") {
                req.flash("dashboard", "User is authenticated");
                res.redirect(303, `${config.view_urls.dashboard}`);

            }else {
                if (user[0].password.match(config.default_pass_regexp)) {  
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
        console.log(typeof error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const is_OTP_verified = async (req, res, next) => {
    try {
        const auth_user = req.session.passport.user;
        let proceed = "";

        console.log("... checking user role ...");

        (auth_user.role == "admin")? proceed = true : proceed = false;

        console.log("... checking user role completed ...", proceed);
        console.log("... Intializing User credential verification ...");

        const user = await getting_auth_user_data(auth_user);
        
        console.log("...getting user ...", user);
        console.log("... verifying if user credential is active or revoked ...");


        if (await is_user_active(user[0])) {
            console.log("... verification completed ...");
            console.log("... checking if OTP is verified or not ...");

            if (user[0].otp.includes("verified")) {
                console.log("... OTP verification completed ...");

                next()
            }else {
                console.log("... OTP not verified ...");
                console.log("... generating new OTP code and updating database ...");


                const otp = await randomSerialCode(5);
                if (user[0].role === "admin") {
                    await RegistrationModel.updateOne( {"email": req.session.passport.user.email}, {"otp": otp} );
                }else { await UserModel.updateOne( {"email": req.session.passport.user.email}, {"otp": otp} ); }


                console.log("... OTP geneartion and update of database completed ...");
                console.log("... Sending OTP code via email ...");


                const nodemail_resp = await sending_email(
                    config.company_name,
                    "Email Authentication",
                    auth_user.email,
                    `Hi ${user[0].first_name}, ${config.company_name} want you to verify your email by providing the OTP code:  ${otp}. Thank You !`
                );
                console.log("** is email sent to company :", nodemail_resp);

                if (nodemail_resp == null) {
                    console.log("... Email Sent ...");
                    console.log("... OTP not sent ...");
                    console.log("... redireting ...");
                    
                    
                    req.flash("otp", `Error. OTP code not sent. Resend OTP code !`);
                    res.redirect(303, config.view_urls.otp);
                    
                }else  if (nodemail_resp === undefined) {
                    console.log("... Email Sent ...");
                    console.log("... OTP not sent ...");
                    console.log("... redireting ...");
                    

                    req.flash("otp", `Error. OTP code not sent. Resend OTP code !`);
                    res.redirect(303, config.view_urls.otp);

                }else  if (nodemail_resp !== undefined) {
                    console.log("... Email Sent ...");
                    console.log("... OTP sent ...");
                    console.log("... redireting ...");

                    req.flash("otp", `Provide OTP code for email verification !`);
                    res.redirect(303, config.view_urls.otp);
                }
            }
        }else {
            console.log("... user credentail revoked ...");
            console.log("... redirecting ...");
        
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

        const hashed_pass = await encrypt_access_code(data.password);
        console.log("** hashing user password **", hashed_pass); 


        console.log("... Password encryption completed ...");
        console.log("... Intializing User credential verification ...");

        const user = await getting_auth_user_data(auth_user);

        console.log("...getting user ...", user);
        console.log("... Checking if user password is secured or not ...");
        

        if (data.password.match(config.default_pass_regexp)) {
            if (user[0].password == hashed_pass) {
                console.log("... Password Insecured. Redirecting ...");

                req.flash("reset_password", "Error. Password Insecure. Reset Password !");
                res.redirect(303, config.view_urls.reset_password);

            }else {
                console.log("... User password is secured ...");
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
        console.log("... Intializing User credential verification ...");

        const user = await getting_auth_user_data(auth_user);
        
        console.log("...getting user ...", user);
        console.log("... Initializing password reset ...");

        let is_user_updated = "";
        if (user[0].role == "admin") {
            is_user_updated = await RegistrationModel.updateOne({ "email": auth_user.email }, { "password": hashed_pass });
        }
        else {
            is_user_updated = await UserModel.updateOne({ "email": auth_user.email }, { "password": hashed_pass });
        }
        
        if (is_user_updated !== "" && is_user_updated.length <= 0) {
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
            console.log("... sending email to user ...");

            const nodemail_resp = await sending_email_with_html_template(
                config.company_name,
                "Forgot Password",
                user_email,
                `Dear Admin, to change your current password, ${config.company_name} want you to verify if its really you and not a robot by clicking the confirmation button`,
                `<a style="padding: 15px 15px; background-color: black; background: black; color: white;" href="${config.view_urls.forgot_password_confirm}" id=""> Proceed to Change Password </a>`
            );
            console.log("** is email sent to user :", nodemail_resp);

            if (nodemail_resp == null) {
                req.flash("fpass_initiate", "Error. Couldn't Auth Credential / Internet Err. Try Again !");
                res.redirect(303, `${config.view_urls.forgot_password_initiate}`);

            }else if (nodemail_resp !== undefined) {
                console.log("... User credential confirmation completed ...");

                req.session.fpass_username = user_email;    // register email or userID in request session data storage for setting new password in the next route 
                req.flash("fpass_initiate", "Almost there. Email sent. Confirm !");
                res.redirect(303, `${config.view_urls.forgot_password_initiate}`);
            }else {
                req.flash("fpass_initiate", "Error. Couldn't Auth Credential / Internet Err. Try Again !");
                res.redirect(303, `${config.view_urls.forgot_password_initiate}`);
            }
        }else {
            console.log("... user / company not registerd ...");

            req.flash("fpass_initiate", "User not registerd. Contact Admin !");
            res.redirect(303, `${config.view_urls.forgot_password_initiate}`);
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
        console.log("... Initializing password encryption ...");

        const hashed_pass = await encrypt_access_code(data.confirm_pass);
        console.log("** hashing user password **", hashed_pass); 

        console.log("... Password encyption completed ...");
        console.log("... Initializing confirmation ...");

        const user_email = req.session.fpass_username;
        if (user_email == null || user_email == undefined) {
            req.flash("fpass_initiate", "Error. Couldn't Auth Credential. Try Again !");
            res.redirect(303, `${config.view_urls.forgot_password_initiate}`);

        }else {
            let  proceed = "";
            const biodata = await RegistrationModel.find({ "email": user_email });
            if (biodata.length > 0) {
                await RegistrationModel.updateOne({ "email": user_email }, { "password": hashed_pass });
                proceed = true;

            }else {
                await UserModel.updateOne({ "email": user_email }, { "password": hashed_pass });
                proceed = true;
            }
            if (proceed) {
                console.log("... Password confirmation completed ...");

                req.session.fpass_username = "";
                req.flash("login", "Password modified sucessful. Login with new password !");
                res.redirect(303, `${config.view_urls.login}`);
            }
        }
    } catch (error) {
        console.log("** Error:: forgot password confirmation Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const resend_OTP_code_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data for resend OTP code **");

        const auth_user = req.session.passport.user;
        let proceed = "";

        console.log("... Generating OTP code ...");
        const otp = await randomSerialCode(5);

        console.log("... OTP code genrated  completed ...");
        console.log("... Sending email to auth user ...");

        const nodemail_resp = await sending_email(
            config.company_name,
            "Resend OTP Code",
            auth_user.email,
            `Dear ${auth_user.userID}, use the OTP code ${otp} resend to you for Email Verification. OTP will elapse in 10min. Thank You !`
        );
        console.log("** is email sent to company :", nodemail_resp);

        if (nodemail_resp == null) {
            console.log("... Email notification failed. Redirecting...");

            req.flash("otp", "Error. OTP not sent. Check Internet connection & Try again !");
            res.redirect(303, `${config.view_urls.otp}`);

        }else if (nodemail_resp !== undefined) {
            console.log("... Email notification completed. Redirecting...");

            req.flash("otp", "OTP code resent. Confirm OTP code !");
            res.redirect(303, `${config.view_urls.otp}`);
        }

    } catch (error) {
        console.log("** Error:: Resend OTP code Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }

};
// END 
// PURCHASES
const purchases_handler = async (req, res, next) => {
    let context = {}, proceed = "";
    try {
        console.log("** Collecting data for purchases entry submission **");
        
        const payload = req.body;

        payload.companyRefID = req.session.passport.user.companyRefID;
        payload.userID = req.session.passport.user.userID;
        payload.company = req.session.passport.user.company;

        console.log("... payload collected completed ...", payload);

        const user_profile = await  getting_auth_user_data(req.session.passport.user);
        if (user_profile[0].role === "admin") { payload.initiator = user_profile[0].ceo }
        else { payload.initiator = `${user_profile[0].first_name} ${user_profile[0].last_name}`; }

        console.log("... getting final payload ...", payload);
        console.log("... verifying if user is permitted to proceed operation ...");

        if (await verifying_user_restriction(null, req.session.passport.user)) { proceed = true }
        else { 
            if (await verifying_user_restriction(config.roles.purchases, req.session.passport.user)) { 
                console.log("... verifying user previleges ...");
                proceed = await verifying_previliges_only(req, "document", config.previliges_options.create);
            }
            else { proceed = false }; 
        };

        if (proceed) {
            console.log("... user is permitted for operation ...");
            console.log("... user is previlged to poroceed ...");
            console.log("... inserting payload into database ...");
            
            const query_resp = await PurchaseModel.insertMany(payload);
        
            console.log("... query responds ...", query_resp);
            console.log("... insertion of payload completed ...");
            console.log("... wrapping context before redirecting ...");
    
            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");
    
            context.msg = "Purchase submission sucess";
            context.data = query_resp;
            
            res.json(context);
        }else {
            console.log("... user is NOT previlges to proceed ...");
            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");

            context.msg = `Hey ${eq.session.passport.user.userID}. you are not permitted for operation !`;
            res.json(context);
        }
    } catch (error) {
        console.log("** Error:: Purchases Handler **", error);

        if (error.code == "11000") { //  for duplicate of business name 
            console.log("... data is duplicated ...");
            
            console.log("... wrapping context before redirecting ...");

            const error_msg = "Error. Data is duplicated . Try Again !";
            context.msg = error_msg;

            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");

            // req.flash("purchase", context.msg);
            // res.redirect(303, config.view_urls.purchase);
            res.json(context);
        }

        res.redirect(303, `${config.view_urls._500}`);
    }
};
const purchases_preview_handler = async (req, res, next) => {
    let context = {};
    try {
        console.log("** inside purchases preview submission **");
        console.log("... collection of data payload ...");

        let proceed = "";
        const payload = req.body;
        const incoming_payload = req.body;
        
        payload.companyRefID = req.session.passport.user.companyRefID;
        payload.initiator = req.session.passport.user.userID;
        payload.company = req.session.passport.user.company;

        console.log("... payload collected completed ...", payload);
        console.log("... getting user profile bases on level of crendential ");

        const user_profile = await getting_auth_user_data(req.session.passport.user.email)
        
        console.log("... user is found ...");
        console.log("... verifying user previlges ...");

        const is_user_permitted = await verifying_user_previliges(req, config.previliges_type.document, config.previliges_options.modify);
        console.log("... user previlges responds ...", is_user_permitted);
        
        if (is_user_permitted) {
            console.log("... user is permitted to proceed ...");
            console.log("... verifying auth authorization code ...");
            
            const verification_responds = await verifying_user_authorization_codes(req, payload.authorization_code);
            
            console.log("... is user verified to proceed ...", verification_responds);
            console.log("... verification completed ...");

            if (verification_responds === undefined) {
                console.log("... User is not authorized ...");
                console.log("... wrapping context before rediecting ...");
                
                context.msg = "Error. User is not authorized !";
                res.json(context);

            }else if (typeof verification_responds === "object") {
                if (verification_responds.status.trim() === "breach") {
                    let tracking_payload = {}, is_data_updated = "", update_resp = "";

                    console.log("... breached of authorization codes ...");
                    console.log("... preparing payload for update of database ...");

                    const breach_msg = `Breach! ${auth_response.data.userID} authorization code is breached by ${payload.initiator} on Purchases`;
                    tracking_payload = { ...await tracking_payload_initials(req, user_profile) };

                    // tracking_payload.breached_by = {
                    
                    // }
                    tracking_payload.breaches = [{
                        msg: breach_msg,
                        ...await get_date_and_time(),
                    }];
                    tracking_payload.purchases = {  
                        ...await get_date_and_time(),
                        msg: `Request to make changes on purchase item #${payload.item_code}`,
                    }
                    tracking_payload.is_breach_alert_activated = true;
                    
                    console.log("... payload completed ...");
                    console.log("... updating database ...");

                    const tracking_query_response = await TrackingModel.findOne({ "companyRefID": tracking_payload.companyRefID, "userID": tracking_payload.userID });
                    if (tracking_query_response === null) {
                        update_resp = await TrackingModel.insertOne(tracking_payload);
                        is_data_updated = true;

                    }else {
                        const payload_update = {
                            msg: breach_msg,
                            ...await get_date_and_time(),
                        };

                        tracking_query_response.breaches.push(payload_update);
                        update_resp = await TrackingModel.updateOne({ "companyRefID": req.session.passport.user.companyRefID, "userID": req.session.passport.user.userID }, 
                            { "breaches": tracking_query_response.breaches, "is_breach_alert_activated": true });
                        is_data_updated = true;
                    }

                    if (is_data_updated) {
                        console.log("... updating database completed ...");
                        console.log("... sending email to company admin and user as notification ...");
                        
                        const company_data = await RegistrationModel.findOne({ "_id": req.session.passport.user.comapnyRefID });
                        const email_response_1 = await sending_email(
                            config.company_name,
                            "Authorization Code Breached !",
                            company_data.email,
                            `Hi Admin, There has been a breach of authorization code. We recommend to you to check it out.`
                        );
                        const email_response_2 = await sending_email(
                            config.company_name,
                            "Authorization Code Breached !",
                            auth_response.data.email,
                            `Hi ${auth_response.data.userID}, There has been a breach of authorization code. We recommend to you to contact Admin.`
                        );

                        console.log("... is email sent to Admin ...",email_response_1, email_response_2);
                        console.log("... flagging the breach alert to user ...");
                        
                        if (update_resp !== "") {
                            console.log("... getting final query responds from the database ...", update_resp);
                            console.log("... wrapping context before redirecting responds ...");
                            
                            context.msg = "Error. Authorization breach !";
                            context.is_data_breach = update_resp.is_breach_alert_activated;
                            context.response = "";

                            res.json(context);
                        }
                        
                    }
                }
            }else if (typeof verification_responds === "string") {
                if (verification_responds.trim() === "not_activated") {
                    console.log("... auth-user have authorization code, BUT NOT ACTIVATED ...");
                    console.log("... wrapping context before redirecting ...");
    
                    context.msg = "Error. Authorization not activated. Activate Authorization code before usage !";
                    res.json(context);
    
                }else if (verification_responds.trim() === "code_err") { 
                    console.log("... invalid authorization code ...");
                    console.log("... wrapping context before redirecting ...");
    
                    context.msg = "Error. Invalid authorization code !";
                    res.json(context);
                
                }else if (verification_responds.trim() === "verified") { proceed = true };
            };
        }else {
            console.log("... user is not previlged to proceed operation ...");
            
            context.msg = "Error. User not privileged to perform operation !";
            res.json(context);
        }


        if (typeof proceed === "boolean" && proceed) {
            console.log("... user is authorized to proceed ...");
            console.log("... inserting data into database for comparism and verification base on data existence ...");

            const current_payload = await PurchaseModel.findOne({ "item_code": payload.item_code });
            console.log("... getting the current payload from database ...", current_payload);

            if (current_payload.companyRefID !== req.session.passport.user.companyRefID) {  
                console.log("... data does not belong to the right company ...");
                console.log("... wrapping context before redirecting ...");
                
                context.msg = "Error. Couldn't submit. Try Again !";
                res.json(context);
            }else {
                const comparism_payload = {
                    companyRefID: req.session.passport.user.companyRefID,
                    initiator: req.session.passport.user.userID,
                    company: req.session.passport.user.company,
                    userID: req.session.passport.user.userID,
                    role: req.session.passport.user.role,
                    payload: [
                        {
                            current_data: current_payload,
                            incoming_data: incoming_payload,
                            remarks: 'conflict',
                            user_comment: payload.comment,
                            lead_comment: null,
                            entry_date_time: `${(await get_date_and_time()).date}/${(await get_date_and_time()).time}`,
                            response_date_time: null,
                            headline: "modify",
                        }
                    ],
                };
    
                let is_data_inserted = "";
                const comparism_obj = await ComparismeModel.findOne({ "userID": comparism_payload.userID });
                if (comparism_obj === null) {
                    await ComparismeModel.insertMany(comparism_payload);
                    is_data_inserted = true;
                }else {
                    const updated_payload = comparism_obj.payload.push(comparism_payload.payload[0]);
                    await ComparismeModel.updateOne({ "userID": comparism_payload.userID },
                        { "payload": updated_payload });
                        is_data_inserted = true;
                }
                if (typeof is_data_inserted === "boolean" && is_data_inserted) {
                    console.log("... insertion responds ...");
                    console.log("... insertion of payload completed ...");
                    console.log("... wrapping context before redirecting ...");
    
                    const msg = "Sucess. Request is sent and will be verify for approval !";
                    context.msg = msg;
                    res.json(context);
                }
            }
        };      
    } catch (error) {
        console.log("** Error:: Purchases Handler **", error);

        if (error.code == "11000") { //  for duplicate of business name 
            console.log("... wrapping context before redirecting ...");

            const error_msg = "Error. Data is duplicated . Try Again !";
            context.msg = error_msg;

            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");

            res.json(context);
        }

        res.redirect(303, `${config.view_urls._500}`);
    }
};
// END

// DASHBOARD SECIION 
const change_user_roles_handler = async (req, res, next) => {
    let context = {}, proceed = "", is_data_updated = "";
    try {
        console.log("** Collecting data to change user roles and previliges **");
        
        const payload = req.body;
        const passport_data = req.session.passport.user;

        console.log("... first payload ...", payload);
        console.log("... getting params ...", req.params);
        console.log("... verifying user found in the right company ...");

        const is_user_found = await is_user_found_in_company(req.params.id, passport_data.companyRefID);
        
        console.log("... verifcation responds ...", is_user_found);
        console.log("... getting selected user data from the database ...");
            
        let selected_user_profile = await RegistrationModel.findOne({ "_id": payload.selected_userID.trim() });
        if (selected_user_profile === null) { selected_user_profile = await UserModel.findOne({ "_id": payload.selected_userID.trim() }) };
        console.log("... selected user is found in database in completion ...", selected_user_profile);

        if (is_user_found === undefined) { 
            console.log("... database server error ...");
            console.log("... wrapping context before redirecting ...");

            context.msg = "Error. Server not responding. Try Again / contact Admin !";
            res.json(context);

        }else if (is_user_found) {
            console.log("... user is foud in the company ...");
            console.log("... verifying auth user authorizatin code ...",);

            const authorization_data = await AuthorizationModel.findOne({ "email": passport_data.email, "companyRefID": passport_data.companyRefID });
            console.log("... getting authorization data responds ...", authorization_data);
            
            if (authorization_data === null) {
                console.log("... Auth user does not have authorization code to proceed ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = `Error. User is not permitted to perform operation !`;
                res.json(context);
                
            }else {
                console.log("... user is permitted to proceed ...");
                console.log("... verifying for user previlges ...");

                const user_profile = await getting_auth_user_data(req.session.passport.user.email);
                const is_user_permitted = await verifying_user_previliges(req, config.previliges_type.user, config.previliges_options.modify);
                console.log("... user previlges responds ...", is_user_permitted);
                
                if (is_user_permitted) {
                    console.log("... user is permitted to proceed ...");
                    console.log("... verifying auth authorization code ...");
                    
                    const verification_responds = await verifying_user_authorization_codes(req, payload.authorization_code);
                    
                    console.log("... is user verified to proceed ...", verification_responds);
                    console.log("... verification completed ...");

                    if (verification_responds === undefined) {
                        console.log("... User is not authorized ...");
                        console.log("... wrapping context before rediecting ...");
                        
                        context.msg = "Error. User is not authorized !";
                        res.json(context);

                    }else if (typeof verification_responds === "object") {
                        if (verification_responds.status.trim() === "breach") {
                            let tracking_payload = {}, update_resp = "";

                            console.log("... breached of authorization codes ...");
                            console.log("... preparing payload for update of database ...");

                            const breach_msg = `Breach! ${auth_response.data.userID} authorization code is breached by ${payload.initiator} on Purchases`;
                            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };

                            


                        }
                    }else if (typeof verification_responds === "string") {
                        if (verification_responds.trim() === "not_activated") {
                            console.log("... auth-user have authorization code, BUT NOT ACTIVATED ...");
                            console.log("... wrapping context before redirecting ...");
            
                            context.msg = "Error. Authorization not activated. Activate codes before usage !";
                            res.json(context);
            
                        }else if (verification_responds.trim() === "code_err") { 
                            console.log("... invalid authorization code ...");
                            console.log("... wrapping context before redirecting ...");
            
                            context.msg = "Error. Invalid authorization code !";
                            res.json(context);
                        
                        }else if (verification_responds.trim() === "verified") { proceed = true };
                    };
                }else {
                    console.log("... user is not premitted to proceed opeartion ...");
                    console.log("... wrapping context before redirecting ...");
    
                    context.msg = "Error. User not privileged to perform operation !";
                    res.json(context);
                }
            }
        }else {
            console.log("... user nopt found in the company ...");
            console.log("... wrapping context before redirecting ...");

            context.msg = "Error. User not registred !";
            res.json(context);
        };
        


        if (typeof proceed === "boolean" && proceed) {
            console.log("... user authorization code verified ...");
            console.log("... proceed to update database ...");

            if (selected_user_profile.role === config.roles.admin) {
                console.log("... Admin role cannot be modified ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = "Error. Admin role cannot be reassigned !";
                res.json(context);    
            
            }else if ( (selected_user_profile.role === config.roles.managing_director) && (passport_data.role === config.roles.operation_manager) ){
                console.log("... Admin role cannot be modified ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = `Error. ${config.roles.managing_director} role cannot be reassigned. Contact Admin !`;
                res.json(context);
            
            }else {
                console.log("... initiating ...");
                if ((passport_data.role === config.roles.admin) 
                    || (passport_data.role === config.roles.managing_director)
                    || (passport_data.role === config.roles.operation_manager)
                ) {
                    if (selected_user_profile.role !== config.roles.admin) {
                        const query_resp = await UserModel.updateOne({ "_id": payload.selected_userID, "companyRefID": passport_data.companyRefID },
                        { "role": payload.assigned_role, "previliges": payload.assigned_previlges });

                        if (query_resp === null) {
                            context.msg = `Error. User role update failed. Contact Admin !`;
                            res.json(context);

                        }else { is_data_updated = true }
                    };
                }else {
                    console.log("... User is not permitted to preform operation ...");
                    console.log("... wrapping context before redirecting ...");

                    context.msg = `Error. User not premitted to perform operation. Contact Admin !`;
                    res.json(context);
                }
            }
        };



        if (typeof is_data_updated === "boolean" && is_data_updated) {
            console.log("... Sucess. User role reassigned ...");
            console.log("... creating and assigning an authorization code to selected user depending the level of credentials ...");

            let is_code_updated = "", indexes = [], proceed_auth_code = "";
            if ((await AuthorizationModel.findOne({ "userID": selected_user_profile.userID, "companyRefID": passport_data.companyRefID })) === null ) {
                
                const opts = [config.previliges_options.modify, config.previliges_options.delete, config.previliges.documents.report];
                payload.assigned_previlges[0].value.forEach(data => {
                    const index = opts.findIndex(opt => { return opt.trim() === data.trim() });
                    indexes.push(index);
                });
                console.log("... getting indexes responds ...", indexes);
                
                if (indexes.length === payload.assigned_previlges[0].value.length) { proceed_auth_code = indexes.some(el => { return el >= 0 }); }
                if (typeof proceed_auth_code === "boolean" && proceed_auth_code) {
                    console.log("... Sucess. Update of selected user authorizaion code . ...");
                    const auth_payload = {
                        email: selected_user_profile.email,
                        company: selected_user_profile.company,
                        userID: selected_user_profile.userID,
                        role: payload.assigned_role,
                        companyRefID: selected_user_profile.companyRefID, 
                        authorization: await authorization_code(),
                    };
                    console.log("... final payload before insertion ...", auth_payload);
                    
                    if (await AuthorizationModel.insertMany(auth_payload)) { is_code_updated = true; }
                    else {
                        console.log("... Update of selected user authorizaion code failed. ...");
                        console.log("... undo the reassigning of role and previlges ...");
    
                        await UserModel.updateOne({ "_id": payload.selected_userID, "companyRefID": passport_data.companyRefID },
                            { "role": selected_user_profile.role, "previliges": selected_user_profile.previliges });
    
                        console.log("... undo completed ...");
                        console.log("... wrapping context before redirecting ...");
    
                        context.msg = `Error. User role and privileges reassign failed. Contact Admin !`;
                        res.json(context);
                    };
                }else {
                    console.log("... User denied to have an authorization code ...");
                    is_code_updated = true;
                }
            }else {
                console.log("... User authorization code data already exist ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = `Error. ${selected_user_profile.userID} already has authorization code !`;
                res.json(context);
            };

            if (typeof is_code_updated === "boolean" && is_code_updated) {
                console.log("... sending email notification to selected user ...");

                const nodemail_resp = await sending_email(
                    config.company_name,
                    `Change of User Role`,
                    selected_user_profile.email,
                    `Hi ${selected_user_profile.userID}, Your role have been change from ${selected_user_profile.role} to ${payload.assigned_role} sucessfully.`
                );

                console.log("...Email response ...", nodemail_resp);
                console.log("... sending email completed ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = `Sucess. User role and privileges reassign !`;
                res.json(context);
            };
        }
    } catch (error) {
        console.log("** Error:: Change user roles and previlges Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const change_user_previlges_handler = async (req, res, next) => {
    let context = {};
    try {
        console.log("** Collecting data to change user roles and previliges **");
        
        const payload = req.body;
        const passport_data = req.session.passport.user;

        console.log("... first payload ...", payload);
        console.log("... getting params ...", req.params);
        console.log("... verifying user found in the right company ...");

        const is_user_found = await is_user_found_in_company(req.params.id, passport_data.companyRefID);
        console.log("... verifcation responds ...", is_user_found);
        
        if (is_user_found === undefined) { 
            console.log("... database server error ...");
            console.log("... wrapping context before redirecting ...");

            context.msg = "Error. Server not responding. Try Again / contact Admin !";
            res.json(context);

        }else if (is_user_found) {
            console.log("... user is foud in the company ...");
            console.log("... getting selected user data from the database ...");
            
            let selected_user_profile = await RegistrationModel.findOne({ "_id": payload.selected_userID.trim() });
            if (selected_user_profile === null) { selected_user_profile = await UserModel.findOne({ "_id": payload.selected_userID.trim() }) };

            console.log("... selected user is found in database in completion ...");
            console.log("... verifying auth user authorizatin code ...");

            const authorization_data = await AuthorizationModel.findOne({ 
                "email": passport_data.email, "companyRefID": passport_data.comapnyRefID });
            console.log("... getting authroization data responds ...", authorization_data);
            
            if (authorization_data === null) {
                console.log("... Auth user does not have authorization code to proceed ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = `Error. Hey ${selected_user_profile.userID}. You are not permitted to perform operation !`;
                res.json(context);
                
            }else {

            }



        }else {
            console.log("... user nopt found in the company ...");
            console.log("... wrapping context before redirecting ...");

            context.msg = "Error. User not registred !";
            res.json(context);
        };
        
        

        // payload.companyRefID = req.session.passport.user.companyRefID;
        // payload.userID = req.session.passport.user.userID;
        // payload.company = req.session.passport.user.company;

        // console.log("... payload collected completed ...", payload);

        // const user_profile = await  getting_auth_user_data(req.session.passport.user);
        // if (user_profile[0].role === "admin") { payload.initiator = user_profile[0].ceo }
        // else { payload.initiator = `${user_profile[0].first_name} ${user_profile[0].last_name}`; }

        // console.log("... getting final payload ...", payload);
        // console.log("... verifying if user is permitted to proceed operation ...");

        // if (await verifying_user_restriction(null, req.session.passport.user)) { proceed = true }
        // else { 
        //     if (await verifying_user_restriction(config.roles.purchases, req.session.passport.user)) { 
        //         console.log("... verifying user previleges ...");
        //         proceed = await verifying_previliges_only(req, "document", config.previliges_options.create);
        //     }
        //     else { proceed = false }; 
        // };

        // if (proceed) {
        //     console.log("... user is permitted for operation ...");
        //     console.log("... user is previlged to poroceed ...");
        //     console.log("... inserting payload into database ...");
            
        //     const query_resp = await PurchaseModel.insertMany(payload);
        
        //     console.log("... query responds ...", query_resp);
        //     console.log("... insertion of payload completed ...");
        //     console.log("... wrapping context before redirecting ...");
    
        //     console.log("... wrapping context completed ...");
        //     console.log("... redireting reponses ....");
    
        //     context.msg = "Purchase submission sucess";
        //     context.data = query_resp;
            
        //     res.json(context);
        // }else {
        //     console.log("... user is NOT previlges to proceed ...");
        //     console.log("... wrapping context completed ...");
        //     console.log("... redireting reponses ....");

        //     context.msg = `Hey ${eq.session.passport.user.userID}. you are not permitted for operation !`;
        //     res.json(context);
        // }
    } catch (error) {
        console.log("** Error:: Change user roles and previlges Handler **", error);

        // if (error.code == "11000") { //  for duplicate of business name 
        //     console.log("... data is duplicated ...");
            
        //     console.log("... wrapping context before redirecting ...");

        //     const error_msg = "Error. Data is duplicated . Try Again !";
        //     context.msg = error_msg;

        //     console.log("... wrapping context completed ...");
        //     console.log("... redireting reponses ....");

        //     // req.flash("purchase", context.msg);
        //     // res.redirect(303, config.view_urls.purchase);
        //     res.json(context);
        // }

        res.redirect(303, `${config.view_urls._500}`);
    }
};


// END



module.exports = { signup_handler, OTP_verification_handler, registration_handler,
    is_OTP_verified, is_password_secured,  password_reset_handler, forgot_password_initiate_handler, 
    forgot_password_confirmation_handler, resend_OTP_code_handler, purchases_handler, purchases_preview_handler,
    change_user_roles_handler
}