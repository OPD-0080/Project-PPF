// IMPORATION OF MODULES 
const store = require("store2");
const validator = require("validator");

// ....
// IMPORTATION OF FILES 
const config = require("../config/config");
const { UserModel, RegistrationModel, DateTimeTracker, AuthorizationModel, PurchaseModel, TrackingModel } = require("../../database/schematics");
const { encrypt_access_code } = require("../controller/encryption");
const { randomSerialCode, authorization_code } = require("../utils/code_generator");
const { sending_email, sending_email_with_html_template } =  require("../controller/nodemailer");
const { is_user_active, getting_auth_user_data, checking_authorization_code_and_previliges, tracking_payload_initials } = require("../controller/validation");
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
                companyRefID: biodata.uuid, 
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
            companyRefID: biodata[0].uuid,
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
    let context = {};
    try {
        console.log("** Collecting data for purchases entry submission **");
        
        const payload = req.body;

        payload.companyRefID = req.session.passport.user.companyRefID;
        payload.initiator = req.session.passport.user.userID;
        payload.company = req.session.passport.user.company;

        console.log("... payload collected completed ...", payload);
        console.log("... inserting payload into database ...");

        const query_resp = await PurchaseModel.insertMany(payload);
        
        console.log("... query responds ...", query_resp);
        console.log("... insertion of payload completed ...");
        console.log("... wrapping context before redirecting ...");

        const msg = "Purchase submission completed";
        context.msg = msg;
        context.response = query_resp

        console.log("... wrapping context completed ...");
        console.log("... redireting reponses ....");

        res.json(context);
        
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
const purchases_preview_handler = async (req, res, next) => {
    let context = {};
    try {
        console.log("** inside purchases preview submission **");
        console.log("... collection of data payload ...");

        const payload = req.body;

        console.log("... payload from ui ...", payload);
        
        payload.companyRefID = req.session.passport.user.companyRefID;
        payload.initiator = req.session.passport.user.userID;
        payload.company = req.session.passport.user.company;

        console.log("... payload collected completed ...");
        console.log("... getting user profile bases on level of crendential ");

        const user_profile = await getting_auth_user_data(req.session.passport.user.email)
        
        console.log("... user is found ...");
        console.log("... verifying user authorization code ...");

        const auth_response = await checking_authorization_code_and_previliges(req, payload);
        if (auth_response == undefined) {
            console.log("... User is not authorized ...");
            console.log("... wrapping context before rediecting ...");
            
            context.msg = "Error. User is not authorized !";
            res.json(context);

        }else if (typeof auth_response === "object") {
            if (auth_response.status.trim() === "breach") {
                let tracking_payload = {}, proceed = "", update_resp = "";

                console.log("... breached of authorization codes ...");
                console.log("... preparing payload for update of database ...");

                const breach_msg = `Breach! ${breached_payload.userID} authorization code is breached by ${tracking_payload.initiator} with ID ${tracking_payload.userID} on Purchases`;
                tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
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
                    proceed = true;

                }else {
                    const payload_update = {
                        msg: breach_msg,
                        ...await get_date_and_time(),
                    };

                    tracking_query_response.breaches.push(payload_update);
                    update_resp = await TrackingModel.updateOne({ "companyRefID": req.session.passport.user.companyRefID, "userID": req.session.passport.user.userID }, 
                        { "breaches": tracking_query_response.breaches, "is_breach_alert_activated": true });
                    proceed = true;
                }

                if (proceed) {
                    console.log("... updating database completed ...");
                    console.log("... sending email to company admin and user as notification ...");
                    
                    const company_data = await RegistrationModel.findOne({ "uuid": req.session.passport.user.comapnyRefID });
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
        }else if (typeof auth_response === "string") {
            if (auth_response.trim() === "not_activated") {
                console.log("... auth-user have authorization code, BUT NOT ACTIVATED ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = "Error. Authorization not activated. Activate Authorization code before usage !";
                res.json(context);

            }else if (auth_response.trim() === "err") { 
                console.log("... invalid authorization code ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = "Error. Invalid authorization code !";
                res.json(context);
            
            }else if (auth_response.trim() === "denied") {
                console.log("... user does not have previleges. ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = "Error. Operation denied. Contact Admin !";
                res.json(context);
                
            }else if (auth_response.trim() === "verified") { 
                console.log("... user is authorized to proceed ...");
                


            }
        };


        // console.log("... inserting payload into database ...");

        // const new_payload = {

        // }

        // // const query_resp = await PurchaseModel.insertMany(payload);
        
        // // console.log("... query responds ...", query_resp);
        // console.log("... insertion of payload completed ...");
        // console.log("... wrapping context before redirecting ...");

        // const msg = "Purchase submission completed";
        // context.msg = msg;
        // // context.response = query_resp

        console.log("... wrapping context completed ...");
        console.log("... redireting reponses ....");

        // res.json(context);
        
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



module.exports = { signup_handler, OTP_verification_handler, registration_handler,
    is_OTP_verified, is_password_secured,  password_reset_handler, forgot_password_initiate_handler, 
    forgot_password_confirmation_handler, resend_OTP_code_handler, purchases_handler, purchases_preview_handler
}