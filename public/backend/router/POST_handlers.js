// IMPORATION OF MODULES 
const moment = require("moment");
const validator = require("validator");

// ....
// IMPORTATION OF FILES 
const config = require("../config/config");
const { UserModel, RegistrationModel, DateTimeTracker, AuthorizationModel, PurchaseModel, TrackingModel,
    ComparismeModel, PurchasePreviewModel } = require("../../database/schematics");
const { encrypt_access_code } = require("../controller/encryption");
const { randomSerialCode, authorization_code } = require("../utils/code_generator");
const { sending_email, sending_email_with_html_template } =  require("../controller/nodemailer");
const { is_user_active, getting_auth_user_data, tracking_payload_initials, verifying_user_restriction,
        verifying_user_previliges, verifying_user_authorization_codes, is_user_found_in_company } = require("../controller/validation");
const { get_date_and_time } = require("../utils/date_time");
const { ReadStream } = require("fs");



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
        console.log("... initiating tracking protocol ...");
            
        const user_profile = await getting_auth_user_data(req.session.passport.user);
        tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
        tracking_payload.payload = {
            users: [
                {
                    time: (await get_date_and_time()).time,
                    date:  (await get_date_and_time()).date,
                    action: "Signing up new user.",
                    status: config.tracking.status.sucess,
                }
            ]
        }
        console.log("...final tracking payload ...", tracking_payload);

        const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
        if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
        else {
            if (tracking_query_resp.payload.users === undefined) {
                tracking_query_resp.payload.users = tracking_payload.payload.users;
                await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                    { "payload": tracking_query_resp.payload });

            }else {
                tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                    {"$set": { "payload.users": tracking_query_resp.payload.users } });
            }
        };
            
        console.log("... tracking protocol completed ...");
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
                console.log("... initiating tracking protocol ...");
            
                const user_profile = await getting_auth_user_data(req.session.passport.user);
                tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                tracking_payload.payload = {
                    users: [
                        {
                            time: (await get_date_and_time()).time,
                            date:  (await get_date_and_time()).date,
                            action: "Signing up new user.",
                            status: config.tracking.status.failed,
                        }
                    ]
                }
                console.log("...final tracking payload ...", tracking_payload);
        
                const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
                if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
                else {
                    if (tracking_query_resp.payload.users === undefined) {
                        tracking_query_resp.payload.users = tracking_payload.payload.users;
                        await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                            { "payload": tracking_query_resp.payload });
        
                    }else {
                        tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                        await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                            {"$set": { "payload.users": tracking_query_resp.payload.users } });
                    }
                };
                    
                console.log("... tracking protocol completed ...");
                console.log("... wrappinng context befre redirecting ...");
                console.log("... redirecting ...");

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
        console.log("... initiating tracking protocol ...");
            
        let redirect_alt = "";
        const user_profile = await getting_auth_user_data(req.session.passport.user);
        tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
        if (typeof proceed === "boolean" && proceed) {
            if (user[0].role == "admin") {
                tracking_payload.payload = {
                    users: [
                        {
                            time: (await get_date_and_time()).time,
                            date:  (await get_date_and_time()).date,
                            action: "verification of OTP Code.",
                            status: config.tracking.status.sucess,
                        }
                    ]
                }
                console.log("...final tracking payload ...", tracking_payload);
                redirect_alt = true;

            }else {
                if (user[0].password.match(config.default_pass_regexp)) {  
                    tracking_payload.payload = {
                        users: [
                            {
                                time: (await get_date_and_time()).time,
                                date:  (await get_date_and_time()).date,
                                action: "verification of OTP Code.",
                                status: config.tracking.status.failed,
                            }
                        ]
                    }
                    console.log("...final tracking payload ...", tracking_payload);
                    redirect_alt = false;

                }else {
                    tracking_payload.payload = {
                        users: [
                            {
                                time: (await get_date_and_time()).time,
                                date:  (await get_date_and_time()).date,
                                action: "verification of OTP Code.",
                                status: config.tracking.status.sucess,
                            }
                        ]
                    }
                    console.log("...final tracking payload ...", tracking_payload);
                    redirect_alt = true;
                }
            }
        };

        console.log("... Redirecting based on user credentials ...");

        if (typeof redirect_alt === "boolean" && redirect_alt) {
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.users === undefined) {
                    tracking_query_resp.payload.users = tracking_payload.payload.users;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });
    
                }else {
                    tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.users": tracking_query_resp.payload.users } });
                }
            };
                
            console.log("... tracking protocol completed ...");
            console.log("... redirecting ...");

            req.flash("dashboard", "User is authenticated");
            res.redirect(303, `${config.view_urls.dashboard}`);

        }else {  
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.users === undefined) {
                    tracking_query_resp.payload.users = tracking_payload.payload.users;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });
    
                }else {
                    tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.users": tracking_query_resp.payload.users } });
                }
            };
                
            console.log("... tracking protocol completed ...");
            req.flash("reset_password", "For Security reasons, Change Password !");
            res.redirect(303, `${config.view_urls.reset_password}`);
        };
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
            console.log("... reset password failed ...");
            console.log("... initiating tracking protocol ...");
            
            const user_profile = await getting_auth_user_data(req.session.passport.user);
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                users: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: "Resetting of password.",
                        status: config.tracking.status.failed,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);
    
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.users === undefined) {
                    tracking_query_resp.payload.users = tracking_payload.payload.users;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });
    
                }else {
                    tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.users": tracking_query_resp.payload.users } });
                }
            };
                
            console.log("... tracking protocol completed ...");
            console.log("... redirecting ...");

            req.flash("reset_password", "Error. Unable to reset password. Try Again !");
            res.redirect(303, config.view_urls.reset_password);

        }else {
            console.log("... Password reset completed ...");
            console.log("... initiating tracking protocol ...");
            
            const user_profile = await getting_auth_user_data(req.session.passport.user);
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                users: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: "Resetting of password.",
                        status: config.tracking.status.sucess,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);
    
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.users === undefined) {
                    tracking_query_resp.payload.users = tracking_payload.payload.users;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });
    
                }else {
                    tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.users": tracking_query_resp.payload.users } });
                }
            };
                
            console.log("... tracking protocol completed ...");
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
        console.log("... initiating tracking protocol ...");
            
        const user_profile = await getting_auth_user_data(req.session.passport.user);
        tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
        tracking_payload.payload = {
            users: [
                {
                    time: (await get_date_and_time()).time,
                    date:  (await get_date_and_time()).date,
                    action: "Resend of OTP Code.",
                    status: config.tracking.status.sucess,
                }
            ]
        }
        console.log("...final tracking payload ...", tracking_payload);

        const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
        if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
        else {
            if (tracking_query_resp.payload.users === undefined) {
                tracking_query_resp.payload.users = tracking_payload.payload.users;
                await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                    { "payload": tracking_query_resp.payload });

            }else {
                tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                    {"$set": { "payload.users": tracking_query_resp.payload.users } });
            }
        };
            
        console.log("... tracking protocol completed ...");
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
const purchases_entry_handler = async (req, res, next) => {
    let context = {}, proceed = "";
    try {
        console.log("** Collecting data for purchases entry submission **");
        
        const payload = req.body;

        payload.companyRefID = req.session.passport.user.companyRefID;
        payload.userID = req.session.passport.user.userID;
        payload.company = req.session.passport.user.company;

        const user_profile = await  getting_auth_user_data(req.session.passport.user);
        if (user_profile[0].role === "admin") { payload.initiator = user_profile[0].ceo }
        else { payload.initiator = `${user_profile[0].first_name} ${user_profile[0].last_name}`; }

        console.log("... getting final payload ...", payload);
        console.log("... verifying if user is permitted to proceed operation ...");

        if (await verifying_user_restriction(null, req.session.passport.user)) { proceed = true }
        else { 
            if (await verifying_user_restriction(config.roles.purchases, req.session.passport.user)) { 
                console.log("... user is not restricted ...");
                console.log("... verifying user previleges ...");
                proceed = await verifying_user_previliges(req, "document", config.previliges_options.create);
            }
            else { proceed = false }; 
        };

        let tracking_payload = "";
        if (proceed) {
            console.log("... user is permitted for operation ...");
            console.log("... user is previlged to poroceed ...");
            console.log("... inserting payload into database ...");
            
            const query_resp = await PurchasePreviewModel.insertMany(payload);
        
            console.log("... query responds ...", query_resp);
            console.log("... insertion of payload completed ...");
            console.log("... initiating tracking protocol ...");
            
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                purchases: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: "Added new purchase(s).",
                        status: config.tracking.status.sucess,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);

            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.purchases === undefined) {
                    tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });

                }else {
                    tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                }
            };
            
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context before redirecting ...");
    
            context.msg = "Sucess. Purchase created.";
            context.data = query_resp;
            context.purchases_length = (await PurchasePreviewModel.find().sort({ "createdAt": -1 })).length;

            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");

            res.json(context);
        }else {
            console.log("... user is NOT previlges to proceed ...");
            console.log("... initiating tracking protocol ...");
            
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                purchases: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: "Added new purchase(s).",
                        status: config.tracking.status.denied,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);

            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.purchases === undefined) {
                    tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });

                }else {
                    tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                }
            };
            
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");

            context.msg = `Hey ${req.session.passport.user.userID}. you are not permitted for operation !`;
            res.json(context);
        }
    } catch (error) {
        console.log("** Error:: Purchases Handler **", error);

        if (error.code == "11000") { //  for duplicate of business name 
            console.log("... data is duplicated ...");
            console.log("... initiating tracking protocol ...");
            
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                purchases: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: "Added new purchase(s).",
                        status: config.tracking.status.failed,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);

            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.purchases === undefined) {
                    tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });

                }else {
                    tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                }
            };
            
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context before redirecting ...");

            const error_msg = "Error. Data is duplicated . Try Again !";
            context.msg = error_msg;

            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");

            res.json(context);
        };

        res.redirect(303, `${config.view_urls._500}`);
    }
};
const purchases_edit_delete_handler = async (req, res, next) => {
    let context = {};
    try {
        console.log("** inside purchases preview submission **");
        console.log("... collection of data payload ...");

        let proceed = "", tracking_payload = {}, is_data_deleted = "";
        const payload = req.body;
        const incoming_payload = req.body;

        console.log("... getting payload from the ui ...", payload);
        
        
        payload.companyRefID = req.session.passport.user.companyRefID;
        payload.initiator = req.session.passport.user.userID;
        payload.company = req.session.passport.user.company;

        console.log("... payload collected completed ...", payload);
        console.log("... getting user profile bases on level of crendential ");

        const user_profile = await getting_auth_user_data(req.session.passport.user);
        
        console.log("... user is found ...");
        console.log("... verifying user previlges ...");

        const is_user_permitted = await verifying_user_previliges(req, config.previliges_type.document, config.previliges_options.modify);
        console.log("... user previlges responds ...", is_user_permitted);
        
        if (is_user_permitted) {
            console.log("... user is permitted to proceed ...");
            console.log("... initiaing tracking protocol ...");

            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                purchases: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: `User ${payload.userID} permitted to operate on Purchases !`,
                        status: config.tracking.status.sucess,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);
    
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.purchases === undefined) {
                    tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });
    
                }else {
                    tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                }
            };
                
            console.log("... tracking protocol completed ...");
            proceed = true;
        }else {
            console.log("... user is not previlged to proceed operation ...");
            console.log("... initiaing tracking protocol ...");

            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                purchases: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: `Request to make changes on purchase item #${payload.item_code} !`,
                        status: config.tracking.status.restricted,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);
    
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.purchases === undefined) {
                    tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });
    
                }else {
                    tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                }
            };
                
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context before redirecting ...");
            
            context.msg = "Error. User not privileged to perform operation !";
            res.json(context);
        };

        if (typeof proceed === "boolean" && proceed) {
            console.log("... user permission granted ...");
            console.log("... verifying if payload is for modification or deletion ...");

            let update_tracker = "";
            if (typeof payload.trigger === "string" && payload.trigger === config.previliges_options.delete) {
                const query_resp = await PurchasePreviewModel.findOne({ "_id": payload.delete_ids[0] });
                
                if (query_resp.companyRefID !== req.session.passport.user.companyRefID) {  
                    console.log("... data does not belong to the right company ...");
                    console.log("... initiaing tracking protocol ...");
    
                    tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                    tracking_payload.payload = {
                        purchases: [
                            {
                                time: (await get_date_and_time()).time,
                                date:  (await get_date_and_time()).date,
                                action: `Deleted ${payload.delete_ids.length} purchase item(s) upon previewing purchases. Contact Admin / Developer !`,
                                status: config.tracking.status.error,
                            }
                        ]
                    }
                    console.log("...final tracking payload ...", tracking_payload);
                    update_tracker = true;
                    
                }else {
                    console.log("... payload meant for deleteion ...");
                    console.log("... proceeding to delete purchases ...");

                    let delete_count = 0;
                    for (let i = 0; i < payload.delete_ids.length; i++) {
                        const delete_data = payload.delete_ids[i];
                        await PurchasePreviewModel.deleteMany({ "_id": delete_data });
                        delete_count = delete_count + 1;
                    };
                    if (delete_count === payload.delete_ids.length) {
                        console.log("... wrapping context before redirecting ...");
    
                        const msg = "Sucess. Purchase(s) deleted.!";
                        context.msg = msg;
                        res.json(context);
                    };
                };
            }else if (typeof payload.trigger === "string" && payload.trigger === config.previliges_options.modify) {
                const current_payload = await PurchasePreviewModel.findOne({ "item_code": payload.item_code });
    
                if (current_payload.companyRefID !== req.session.passport.user.companyRefID) {  
                    console.log("... data does not belong to the right company ...");
                    console.log("... initiaing tracking protocol ...");
    
                    tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                    tracking_payload.payload = {
                        purchases: [
                            {
                                time: (await get_date_and_time()).time,
                                date:  (await get_date_and_time()).date,
                                action: `Updating Purchase item ${payload.item_code} upon previewing purchases. Contact Admin / Developer !`,
                                status: config.tracking.status.error,
                            }
                        ]
                    }
                    console.log("...final tracking payload ...", tracking_payload);
                    update_tracker = true;

                }else {
                    console.log("... payload is meant for modification  ...");
                    console.log("... proceding to update preview ...");
                    
                    const query_resps = await PurchasePreviewModel.updateMany({ "item_code": payload.item_code }, 
                        { "supplier": payload.supplier, "invoice_date": payload.invoice_date, "invoice_number": payload.invoice_number,
                        "item_code": payload.item_code, "particular": payload.particular, "quantity": payload.quantity, "price": payload.price,
                        "amount": payload.amount, "supplier": payload.supplier }
                    );

                    console.log("... purchases updated ...", query_resps);
                    console.log("... wrapping context before redirecting ...");
    
                    const msg = "Sucess. Purchase updated.!";
                    context.msg = msg;
                    res.json(context);
                };
            };
            if (typeof update_tracker === "boolean" && update_tracker) {
                const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
                if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
                else {
                    if (tracking_query_resp.payload.purchases === undefined) {
                        tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                        await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                            { "payload": tracking_query_resp.payload });
        
                    }else {
                        tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                        await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                            {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                    }
                };
                    
                console.log("... tracking protocol completed ...");
                console.log("... wrapping context before redirecting ...");
                
                context.msg = "Error. Couldn't submit. Try Again !";
                req.flash("preview", context.msg);
                res.redirect(303, config.view_urls.purchase_preview);
            };
        };      
    } catch (error) {
        console.log("** Error:: Purchases Handler **", error);

        if (error.code == "11000") { //  for duplicate of business name
            console.log("... Attept to insert dupqlicated data into the database ...");
            console.log("... initiaing tracking protocol ...");

            const user_profile = await getting_auth_user_data(req.session.passport.user);
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                purchases: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: `Request to make changes on purchase item #${payload.item_code}. Data duplicated. !`,
                        status: config.tracking.status.error,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);
    
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.purchases === undefined) {
                    tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });
    
                }else {
                    tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                }
            };
                
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context before redirecting ...");

            const error_msg = "Error. Data is duplicated . Try Again !";
            context.msg = error_msg;

            res.json(context);
        }

        res.redirect(303, `${config.view_urls._500}`);
    }
};
const purchases_submission_handler = async (req, res, next) => {
    let context = {}, proceed = "";
    try {
        console.log("** Submission of purchases entries **");

        const payload = req.body;

        payload.companyRefID = req.session.passport.user.companyRefID;
        payload.userID = req.session.passport.user.userID;
        payload.company = req.session.passport.user.company;

        console.log("... getting payload before submission ...", payload);
        

        const user_profile = await  getting_auth_user_data(req.session.passport.user);
        if (user_profile[0].role === "admin") { payload.initiator = user_profile[0].ceo }
        else { payload.initiator = `${user_profile[0].first_name} ${user_profile[0].last_name}`; }

        console.log("... getting final payload ...", payload);
        console.log("... verifying if user is permitted to proceed operation ...");

        if (await verifying_user_restriction(null, req.session.passport.user)) { proceed = true }
        else { 
            if (await verifying_user_restriction(config.roles.purchases, req.session.passport.user)) { 
                console.log("... user is not restricted ...");
                console.log("... verifying user previleges ...");
                proceed = await verifying_user_previliges(req, "document", config.previliges_options.create);
            }
            else { proceed = false }; 
        };

        let tracking_payload = "";

        console.log("... getting payload after ...", payload);
        if (proceed) {
            console.log("... user is permitted for operation ...");
            console.log("... user is previlged to poroceed ...");
            console.log("... initiaing submission ...");

            const preview_payload = await PurchasePreviewModel.find({ "companyRefID": payload.companyRefID, "userID": payload.userID });
            console.log("... getting preview payload ...", preview_payload);
            
            let insertion_count = 0, delete_count = 0;
            for (let i = 0; i < preview_payload.length; i++) {
                const payload = preview_payload[i];
                
                const data = await PurchaseModel.findOne({ "item_code": payload.item_code });
                if (data === null) {
                    await PurchaseModel.insertMany(payload);
                    insertion_count = insertion_count + 1; 
                }else {
                    await PurchaseModel.updateMany({ "item_code": payload.item_code }, 
                        { "supplier": payload.supplier, "invoice_date": payload.invoice_date, "invoice_number": payload.invoice_number,
                        "item_code": payload.item_code, "particular": payload.particular, "quantity": payload.quantity, "price": payload.price,
                        "amount": payload.amount, "supplier": payload.supplier }
                    );
                    insertion_count = insertion_count + 1;
                }
            };
            if (insertion_count === preview_payload.length) {
                console.log("... Purchases submission completed ...");
                console.log("... clearing preview purchases ...");
                
                for (let i = 0; i < preview_payload.length; i++) {
                    const payload = preview_payload[i];
                    await PurchasePreviewModel.deleteMany({ "companyRefID": payload.companyRefID, "invoice_number": payload.invoice_number });
                    delete_count = delete_count + 1;
                }
                if (delete_count === preview_payload.length) {
                    console.log("... Preview purchase(s) cleared ...");
                    console.log("... wrapping context before redirecting ...");
    
                    context.msg = "Purchase(s) submission sucess";
        
                    console.log("... wrapping context completed ...");
                    console.log("... redireting reponses ....");
        
                    res.json(context);
                }
            }
        }else {
            console.log("... user is NOT previlges to proceed ...");
            console.log("... initiating tracking protocol ...");
            
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                purchases: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: "Submission of purchase(s) entries.",
                        status: config.tracking.status.denied,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);

            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.purchases === undefined) {
                    tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });

                }else {
                    tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                }
            };
            
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");

            context.msg = `Hey ${req.session.passport.user.userID}. you are not permitted for operation !`;
            res.json(context);
        }

    }catch (error) {
        console.log("** Error:: Submission Purchases Handler **", error);

        if (error.code == "11000") { //  for duplicate of business name 
            console.log("... data is duplicated ...");
            console.log("... initiating tracking protocol ...");
            
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                purchases: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: "Submission of purchase(s) entries.",
                        status: config.tracking.status.failed,
                    }
                ]
            }
            console.log("...final tracking payload ...", tracking_payload);

            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.purchases === undefined) {
                    tracking_query_resp.payload.purchases = tracking_payload.payload.purchases;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });

                }else {
                    tracking_query_resp.payload.purchases.push(tracking_payload.payload.purchases[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.purchases": tracking_query_resp.payload.purchases } });
                }
            };
            
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context before redirecting ...");

            const error_msg = "Error. Purchases submission failed . Try Again !";
            context.msg = error_msg;

            console.log("... wrapping context completed ...");
            console.log("... redireting reponses ....");

            res.json(context);
        };

        res.redirect(303, `${config.view_urls._500}`);
    }
}
// END

// DASHBOARD SECIION 
const change_user_roles_and_previlges_handler = async (req, res, next) => {
    let context = {}, proceed = "", tracking_payload = {}, is_data_updated = "", proceed_tracking_user = "", proceed_tracking_auth = "";
    try {
        console.log("** Collecting data to change user roles and previliges **");
        
        const payload = req.body;
        const passport_data = req.session.passport.user;

        const is_user_payload_for_update_or_not = async (payload) => {
            if (typeof payload.assigned_role === "string" &&  
                payload.hasOwnProperty("assigned_role") && payload.assigned_role !== ""
            ) { return payload; }
            else {
                delete payload.assigned_role
                return payload;
            }
        };

        console.log("... first payload ...", payload);
        console.log("... getting params ...", req.params);
        console.log("... verifying user found in the right company ...");

        const is_user_found = await is_user_found_in_company(req.params.id, passport_data.companyRefID);
        const user_profile = await getting_auth_user_data(req.session.passport.user);
        
        console.log("... verifcation responds ...", is_user_found);
        console.log("... getting selected user data from the database ...");
            
        let selected_user_profile = await RegistrationModel.findOne({ "_id": payload.selected_userID.trim() });
        if (selected_user_profile === null) { selected_user_profile = await UserModel.findOne({ "_id": payload.selected_userID.trim() }) };
        console.log("... selected user is found in database in completion ...", selected_user_profile);

        if (is_user_found === undefined) { 
            console.log("... database server error ...");
            console.log("... initiating tracking protocol ...");
            
            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
            tracking_payload.payload = {
                users: [
                    {
                        time: (await get_date_and_time()).time,
                        date:  (await get_date_and_time()).date,
                        action: "Change user roles and previleges. User not found. Contact Admin.",
                        status: config.tracking.status.restricted,
                    }
                ]
            };

            console.log("...final tracking payload ...", tracking_payload);
            context.msg = "Error. User not Registered. Try Again / contact Admin !";
            proceed_tracking_user = true;

        }else if (is_user_found) {
            console.log("... user is foud in the company ...");
            console.log("... verifying auth user authorizatin code ...",);

            const authorization_data = await AuthorizationModel.findOne({ "email": passport_data.email, "companyRefID": passport_data.companyRefID });
            console.log("... getting authorization data responds ...", authorization_data);
            
            if (authorization_data === null) {
                console.log("... Auth user does not have authorization code to proceed ...");
                console.log("... initiating tracking protocol ...");
            
                tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                tracking_payload.payload = {
                    authorization: [
                        {
                            time: (await get_date_and_time()).time,
                            date:  (await get_date_and_time()).date,
                            action: "Change user roles and previleges. User not having Authorization codes ",
                            status: config.tracking.status.restricted,
                        }
                    ]
                };
    
                console.log("...final tracking payload ...", tracking_payload);
                context.msg = `Error. User is not permitted to perform operation !`;
                proceed_tracking_auth = true;
                
            }else {
                console.log("... user is permitted to proceed ...");
                console.log("... verifying for user previlges ...");

                const is_user_permitted = await verifying_user_previliges(req, config.previliges_type.user, config.previliges_options.modify);
                console.log("... user previlges responds ...", is_user_permitted);
                
                if (is_user_permitted === undefined) {
                    console.log("... Server error. contact developer ...");
                    console.log("... initiating tracking protocol ...");
            
                    tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                    tracking_payload.payload = {
                        users: [
                            {
                                time: (await get_date_and_time()).time,
                                date:  (await get_date_and_time()).date,
                                action: "Change user roles and previleges. User not privilged to perform operation. Contact Admin !",
                                status: config.tracking.status.restricted,
                            }
                        ]
                    };
        
                    console.log("...final tracking payload ...", tracking_payload);
                    context.msg = "Error. User not privielegd to perform operation. Contact Admin !";
                    proceed_tracking_user = true;

                }else if (typeof is_user_permitted === "boolean" && is_user_permitted) {
                    console.log("... user is permitted to proceed ...");
                    console.log("... verifying auth authorization code ...");
                    
                    const verification_responds = await verifying_user_authorization_codes(req, payload.authorization_code);
                    
                    console.log("... is user verified to proceed ...", verification_responds);
                    console.log("... verification completed ...");

                    if (verification_responds === undefined) {
                        console.log("... User is not authorized ...");
                        console.log("... initiating tracking protocol ...");
            
                        tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                        tracking_payload.payload = {
                            authorization: [
                                {
                                    time: (await get_date_and_time()).time,
                                    date:  (await get_date_and_time()).date,
                                    action: "Change user roles and previleges. Not having Authorization codes ",
                                    status: config.tracking.status.restricted,
                                }
                            ]
                        };
            
                        console.log("...final tracking payload ...", tracking_payload);
                        context.msg = "Error. User is not authorized !";
                        proceed_tracking_auth = true;

                    }else if (typeof verification_responds === "object") {
                        if (verification_responds.status.trim() === "breach") {
                            let is_data_updated = "";

                            console.log("... breached of authorization codes ...");
                            console.log("... initiaing tracking protocol ...");
        
                            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                            tracking_payload.payload = {
                                users: [
                                    {
                                        time: (await get_date_and_time()).time,
                                        date:  (await get_date_and_time()).date,
                                        action: `Change user roles and previleges. User not authorized to perform operation !`,
                                        status: config.tracking.status.restricted,
                                    }
                                ]
                            }
                            console.log("...final tracking payload for users ...", tracking_payload);
        
                            let tracking_query_resp = "";
                            tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
                            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
                            else {
                                if (tracking_query_resp.payload.users === undefined) {
                                    tracking_query_resp.payload.users = tracking_payload.payload.users;
                                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                                        { "payload": tracking_query_resp.payload });
                    
                                }else {
                                    tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                                        {"$set": { "payload.users": tracking_query_resp.payload.users } });
                                };
                            };
        
                            tracking_payload.payload = {
                                authorization: [
                                    {
                                        time: (await get_date_and_time()).time,
                                        date:  (await get_date_and_time()).date,
                                        action: `Breach! ${verification_responds.data.userID} authorization code is breached by ${payload.initiator} on Purchases.`,
                                        status: config.tracking.status.breach,
                                    }
                                ]
                            };
        
                            console.log("...final tracking payload for authorization ...", tracking_payload);
        
                            tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
                            if (tracking_query_resp === null) { 
                                await TrackingModel.insertMany(tracking_payload);
                                await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                                    {"$set": { "is_breach_alert_activated": true }});
                                is_data_updated = true; 
                            }
                            else {
                                if (tracking_query_resp.payload.authorization === undefined) {
                                    tracking_query_resp.payload.authorization = tracking_payload.payload.authorization;
                                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                                        {"$set": [
                                            { "payload": tracking_query_resp.payload },
                                            { "is_breach_alert_activated": true }
                                        ]});
                                    is_data_updated = true;
                                }else {
                                    tracking_query_resp.payload.authorization.push(tracking_payload.payload.authorization[0]);
                                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                                        {"$set": [
                                            { "payload.authorization": tracking_query_resp.payload.authorization },
                                            { "is_breach_alert_activated": true }
                                        ]});
                                    is_data_updated = true;
                                }
                            };
        
                            if (typeof is_data_updated === "boolean" && is_data_updated) {
                                console.log("... Tracking protocol initiation completed ...");
                                console.log("... sending email to company admin and user as notification ...");
                                
                                const company_data = await RegistrationModel.findOne({ "_id": req.session.passport.user.comapnyRefID });
                                const query_data_1 = await UserModel.findOne({ "companyRefID": req.session.passport.user.comapnyRefID, "role": config.roles.managing_director });
                                const query_data_2 = await UserModel.findOne({ "companyRefID": req.session.passport.user.comapnyRefID, "role": config.roles.operation_manager });
                                
                                const email_response_1 = await sending_email(
                                    config.company_name,
                                    "Authorization Code Breached !",
                                    company_data.email,
                                    `Hi Admin, There has been a breach of authorization code. We recommend to you to check it out.`
                                );
                                const email_response_2 = await sending_email(
                                    config.company_name,
                                    "Authorization Code Breached !",
                                    verification_responds.data.email,
                                    `Hi ${verification_responds.data.userID}, There has been a breach of authorization code. We recommend to you to contact Admin.`
                                );
                                if (query_data_1 !== null) {
                                    await sending_email(
                                        config.company_name,
                                        "Authorization Code Breached !",
                                        query_data_1.email,
                                        `Hi ${query_data_1.first_name} ${query_data_1.last_name}, There has been a breach of authorization code. We recommend to you to check it out.`
                                    );
                                };
                                if (query_data_2 !== null) {
                                    await sending_email(
                                        config.company_name,
                                        "Authorization Code Breached !",
                                        query_data_2.email,
                                        `Hi ${query_data_2.first_name} ${query_data_2.last_name}, There has been a breach of authorization code. We recommend to you to check it out.`
                                    );
                                };
        
                                console.log("... is email sent to Admin ...",email_response_1, email_response_2);
                                console.log("... wrapping context before redirecting responds ...");
                                
                                context.msg = "Error. Authorization breach !";
                                context.is_data_breach = tracking_payload.is_breach_alert_activated;
                                context.response = verification_responds.data;
        
                                res.json(context);
                            };
                        };
                    }else if (typeof verification_responds === "string") {
                        if (verification_responds.trim() === "not_activated") {
                            console.log("... auth-user have authorization code, BUT NOT ACTIVATED ...");
                            console.log("... initiating tracking protocol ...");
            
                            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                            tracking_payload.payload = {
                                authorization: [
                                    {
                                        time: (await get_date_and_time()).time,
                                        date:  (await get_date_and_time()).date,
                                        action: "Change user roles and previleges. Authorization codes not activated !",
                                        status: config.tracking.status.denied,
                                    }
                                ]
                            };
                
                            console.log("...final tracking payload ...", tracking_payload);
                            context.msg = "Error. Authorization not activated. Activate codes before usage !";
                            proceed_tracking_auth = true;
            
                        }else if (verification_responds.trim() === "code_err") { 
                            console.log("... invalid authorization code ...");
                            console.log("... initiating tracking protocol ...");
            
                            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                            tracking_payload.payload = {
                                authorization: [
                                    {
                                        time: (await get_date_and_time()).time,
                                        date:  (await get_date_and_time()).date,
                                        action: "Change user roles and previleges. Authorization codes Invalid",
                                        status: config.tracking.status.denied,
                                    }
                                ]
                            };
                
                            console.log("...final tracking payload ...", tracking_payload);
                            context.msg = "Error. Invalid authorization code !";
                            proceed_tracking_auth = true;
                        
                        }else if (verification_responds.trim() === "verified") { 
                            console.log("... Authorization code verified ...");
                            console.log("... initiating tracking protocol ...");
            
                            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                            tracking_payload.payload = {
                                authorization: [
                                    {
                                        time: (await get_date_and_time()).time,
                                        date:  (await get_date_and_time()).date,
                                        action: "Change user roles and previleges. Authorization codes verified and in-used",
                                        status: config.tracking.status.sucess,
                                    }
                                ]
                            };
                
                            console.log("...final tracking payload ...", tracking_payload);

                            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
                            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
                            else {
                                if (tracking_query_resp.payload.authorization === undefined) {
                                    tracking_query_resp.payload.authorization = tracking_payload.payload.authorization;
                                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                                        { "payload": tracking_query_resp.payload });
                
                                }else {
                                    tracking_query_resp.payload.authorization.push(tracking_payload.payload.authorization[0]);
                                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                                        {"$set": { "payload.authorization": tracking_query_resp.payload.authorization } });
                                }
                            };
                            
                            console.log("... tracking protocol completed ...");
                            proceed = true 
                        };
                    };
                }else {
                    console.log("... user is not premitted to proceed opeartion ...");
                    console.log("... wrapping context before redirecting ...");
    
                    context.msg = "Error. User not privileged to perform operation !";
                    res.json(context);
                }
            };
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
                console.log("... initiating tracking protocol ...");
            
                tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                tracking_payload.payload = {
                    users: [
                        {
                            time: (await get_date_and_time()).time,
                            date:  (await get_date_and_time()).date,
                            action: "Attempted to change Admin role. Contact Admin !",
                            status: config.tracking.status.denied,
                        }
                    ]
                };
                console.log("...final tracking payload ...", tracking_payload);

                const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
                if (tracking_query_resp === null) { 
                    await TrackingModel.insertMany(tracking_payload); 
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "is_breach_alert_activated": true }});
                }
                else {
                    if (tracking_query_resp.payload.users === undefined) {
                        tracking_query_resp.payload.users = tracking_payload.payload.users;
                        await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                            {"$set": [
                                { "payload": tracking_query_resp.payload },
                                { "is_breach_alert_activated": true }
                            ]});
    
                    }else {
                        tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                        await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                            {"$set": [
                                { "payload.users": tracking_query_resp.payload.users },
                                { "is_breach_alert_activated": true }
                            ]});
                    }
                };
                
                console.log("... tracking protocol completed ...");
                console.log("... sending email to company admin as notification ...");
                        
                const company_data = await RegistrationModel.findOne({ "_id": req.session.passport.user.comapnyRefID });
                const query_data_1 = await UserModel.findOne({ "companyRefID": req.session.passport.user.comapnyRefID, "role": config.roles.managing_director });
                const query_data_2 = await UserModel.findOne({ "companyRefID": req.session.passport.user.comapnyRefID, "role": config.roles.operation_manager });
                
                const email_response = await sending_email(
                    config.company_name,
                    "Change of User Role !",
                    company_data.email,
                    `Hi Admin, ${user_profile[0].UserID} made an attempt to change your role. Such user is not permitted to perform operation`
                );
                if (query_data_1 !== null) {
                    await sending_email(
                        config.company_name,
                        "Authorization Code Breached !",
                        query_data_1.email,
                        `Hi ${query_data_1.first_name} ${query_data_1.last_name}, ${user_profile[0].UserID} made an attempt to change the role of Admin. Such user is not permitted to perform operation`
                    );
                };
                if (query_data_2 !== null) {
                    await sending_email(
                        config.company_name,
                        "Authorization Code Breached !",
                        query_data_2.email,
                        `Hi ${query_data_2.first_name} ${query_data_2.last_name}, ${user_profile[0].UserID} made an attempt to change the role of Admin. Such user is not permitted to perform operation`
                    );
                };

                console.log("... is email sent to Admin ...",email_response);
                console.log("... wrapping context before redirecting responds ...");

                context.msg = "Error. Admin role cannot be reassigned !";
                res.json(context);   
            
            }else if ( (selected_user_profile.role === config.roles.managing_director) && (passport_data.role === config.roles.operation_manager) ){
                console.log("... Admin role cannot be modified ...");
                console.log("... initiating tracking protocol ...");
            
                tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                tracking_payload.payload = {
                    users: [
                        {
                            time: (await get_date_and_time()).time,
                            date:  (await get_date_and_time()).date,
                            action: "Attempted to change the Managing Director's role. Contact Admin !",
                            status: config.tracking.status.denied,
                        }
                    ]
                };
                tracking_payload.is_breach_alert_activated = true;
    
                console.log("...final tracking payload ...", tracking_payload);

                const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
                if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
                else {
                    if (tracking_query_resp.payload.users === undefined) {
                        tracking_query_resp.payload.users = tracking_payload.payload.users;
                        await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                            {"$set": [
                                { "payload": tracking_query_resp.payload },
                                { "is_breach_alert_activated": tracking_payload.is_breach_alert_activated }
                            ]});
    
                    }else {
                        tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                        await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                            {"$set": [
                                { "payload.users": tracking_query_resp.payload.users },
                                { "is_breach_alert_activated": tracking_payload.is_breach_alert_activated }
                            ]});
                    }
                };
                
                console.log("... tracking protocol completed ...");
                console.log("... sending email to user as notification ...");
                        
                const company_data = await RegistrationModel.findOne({ "_id": req.session.passport.user.comapnyRefID });
                const query_data = await UserModel.findOne({ "companyRefID": req.session.passport.user.comapnyRefID, "role": config.roles.managing_director });
                const query_data_2 = await UserModel.findOne({ "companyRefID": req.session.passport.user.comapnyRefID, "role": config.roles.operation_manager });
                
                const email_response = await sending_email(
                    config.company_name,
                    "Change of User Role !",
                    query_data.email,
                    `Hi ${query_data.first_name}, ${user_profile[0].first_name} ${user_profile[0].last_name} made an attempt to change your role. Such user is not permitted to perform operation.`
                );
                await sending_email(
                    config.company_name,
                    "Change of User Role !",
                    company_data.email,
                    `Hi Admin, ${user_profile[0].first_name} ${user_profile[0].last_name} made an attempt to change the role of the Managing director. Such user is not permitted to perform operation`
                );
                if (query_data_2 !== null) {
                    await sending_email(
                        config.company_name,
                        "Authorization Code Breached !",
                        query_data_2.email,
                        `Hi ${query_data_2.first_name} ${query_data_2.last_name}, ${user_profile[0].UserID} made an attempt to change the role of the Managing director. Such user is not permitted to perform operation`
                    );
                };

                console.log("... is email sent to Admin ...",email_response);
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
                        let query_resp = "";
                        const user_payload = await is_user_payload_for_update_or_not(payload);
                        if (user_payload.hasOwnProperty("role")) {
                            query_resp = await UserModel.updateOne({ "_id": payload.selected_userID, "companyRefID": passport_data.companyRefID },
                                { "role": payload.assigned_role, "previliges": payload.assigned_previlges });
                        }else {
                            query_resp = await UserModel.updateOne({ "_id": payload.selected_userID, "companyRefID": passport_data.companyRefID },
                                { "previliges": payload.assigned_previlges });
                        };
                        if (query_resp !== "" && query_resp === null) {
                            console.log("... User role update failed ...");
                            console.log("... initiaing tracking protocol ...");
        
                            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                            tracking_payload.payload = {
                                users: [
                                    {
                                        time: (await get_date_and_time()).time,
                                        date:  (await get_date_and_time()).date,
                                        action: `Change user roles and previleges. Failed to update user role. Contact Admin / Developer. !`,
                                        status: config.tracking.status.error,
                                    }
                                ]
                            }
                            console.log("...final tracking payload for users ...", tracking_payload);
                            context.msg = `Error. User role update failed. Contact Admin !`;
                            proceed_tracking_user = true;

                        }else { 
                            console.log("... User role chnaged sucessfully ...");
                            console.log("... initiaing tracking protocol ...");
        
                            tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                            tracking_payload.payload = {
                                users: [
                                    {
                                        time: (await get_date_and_time()).time,
                                        date:  (await get_date_and_time()).date,
                                        action: `Change user roles and previleges. ${selected_user_profile.userID} role / priviliges change sucessfully by the ${passport_data.role}.`,
                                        status: config.tracking.status.sucess,
                                    }
                                ]
                            }
                            console.log("...final tracking payload for users ...", tracking_payload);
                            is_data_updated = true;
                        }
                    };
                }else {
                    console.log("... User is not permitted to preform operation ...");
                    console.log("... initiaing tracking protocol ...");
        
                    tracking_payload = { ...await tracking_payload_initials(req, user_profile) };
                    tracking_payload.payload = {
                        users: [
                            {
                                time: (await get_date_and_time()).time,
                                date:  (await get_date_and_time()).date,
                                action: `Change user roles and previleges. User not permitted to perform operation. !`,
                                status: config.tracking.status.denied,
                            }
                        ]
                    }
                    console.log("...final tracking payload for users ...", tracking_payload);
                    context.msg = `Error. User not premitted to perform operation. Contact Admin !`;
                    proceed_tracking_user = true;
                }
            }
        };


        if (typeof is_data_updated === "boolean" && is_data_updated) {
            console.log("... Sucess. User role reassigned ...");
            console.log("... creating and assigning an authorization code to selected user depending the level of credentials ...");

            let is_code_updated = "", indexes = [], proceed_auth_code = "";
            const auth_data_resp = await AuthorizationModel.findOne({ "userID": selected_user_profile.userID, "companyRefID": passport_data.companyRefID });
            const opts = [config.previliges_options.modify, config.previliges_options.delete, config.previliges.documents.report];
            
            payload.assigned_previlges[0].value.forEach(data => {
                const index = opts.findIndex(opt => { return opt.trim() === data.trim() });
                indexes.push(index);
            });
            console.log("... getting indexes responds ...", indexes);

            if (auth_data_resp === null ) {
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
                console.log("... verifying if user looses authorization codes or not depending on previlges assigned ...");

                proceed_auth_code = indexes.some(el => { return el >= 0 });
                if (typeof proceed_auth_code === "boolean" && proceed_auth_code) {
                    console.log("... Selected User authorization codes maintain ...");
                    console.log("... wrapping context before redirecting ...");

                    context.msg = `Sucess. User privileges modified !`;
                    res.json(context);

                }else {
                    console.log("... Selected User authorization codes Revoked...");
                    console.log("... deleting user authorizationn codes from database ...");
                    
                    await AuthorizationModel.deleteOne({ "userID": selected_user_profile.userID, "companyRefID": passport_data.companyRefID });
                    
                    console.log("... wrapping context before redirecting ...");
                    context.msg = `Sucess. ${selected_user_profile.userID} authorization codes revoked !`;
                    res.json(context);
                };
            };

            if (typeof is_code_updated === "boolean" && is_code_updated) {
                console.log("... sending email notification to selected user ...");

                const nodemail_resp = await sending_email(
                    config.company_name,
                    `Change of User Role`,
                    selected_user_profile.email,
                    `Hi ${selected_user_profile.userID}, Your role have been change from ${selected_user_profile.role} to ${payload.assigned_role} sucessfully by the ${passport_data.role}.`
                );

                console.log("...Email response ...", nodemail_resp);
                console.log("... sending email completed ...");
                console.log("... wrapping context before redirecting ...");

                context.msg = `Sucess. User role / privileges reassign !`;
                res.json(context);
            };
        };

        if (typeof proceed_tracking_user === "boolean" && proceed_tracking_user) {
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.users === undefined) {
                    tracking_query_resp.payload.users = tracking_payload.payload.users;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });

                }else {
                    tracking_query_resp.payload.users.push(tracking_payload.payload.users[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.users": tracking_query_resp.payload.users } });
                }
            };
            
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context before redirecting ...");

            res.json(context);
        };
        if (typeof proceed_tracking_auth === "boolean" && proceed_tracking_auth) {
            const tracking_query_resp = await TrackingModel.findOne({"userID": tracking_payload.userID });
            if (tracking_query_resp === null) { await TrackingModel.insertMany(tracking_payload); }
            else {
                if (tracking_query_resp.payload.authorization === undefined) {
                    tracking_query_resp.payload.authorization = tracking_payload.payload.authorization;
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        { "payload": tracking_query_resp.payload });

                }else {
                    tracking_query_resp.payload.authorization.push(tracking_payload.payload.authorization[0]);
                    await TrackingModel.updateOne({ "userID": tracking_payload.userID },
                        {"$set": { "payload.authorization": tracking_query_resp.payload.authorization } });
                }
            };
            
            console.log("... tracking protocol completed ...");
            console.log("... wrapping context before redirecting ...");

            res.json(context);
        }
    } catch (error) {
        console.log("** Error:: Change user roles and previlges Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};

// END



module.exports = { signup_handler, OTP_verification_handler, registration_handler,
    is_OTP_verified, is_password_secured,  password_reset_handler, forgot_password_initiate_handler, 
    forgot_password_confirmation_handler, resend_OTP_code_handler, purchases_entry_handler, purchases_edit_delete_handler,
    change_user_roles_and_previlges_handler, purchases_submission_handler
}