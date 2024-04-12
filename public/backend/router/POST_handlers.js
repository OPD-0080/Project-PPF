// IMPORATION OF MODULES 
const store = require("store2");

// ....
// IMPORTATION OF FILES 
const config = require("../config/config");
const { UserModel, LoginModel, RegistrationModel, DateTimeTracker } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");
const { randomSerialCode } = require("../utils/code_generator");
const { sendMailForSignupAuth } =  require("../controller/nodemailer");

//

const registration_handler = async (req, res, next) => {

    const email = req.body.username;
    const businessName = req.body.businessName;
    const natureOfBusiness = req.body.natureOfBusiness;
    const businessType = req.body.businessType;
    const location = req.body.location;
    const address = req.body.address;
    const contact = req.body.contact;
    //const businessLogo = req.body.businessLogo;
    const count = req.body.country;
    const region_state = req.body.region_state;
    const town = req.body.town;
    const ceo = req.body.ceo;
    const confirm_pass = req.body.password;

    try { 
        const existingUser = await RegistrationModel.find({ "email": email });
        console.log("checking for existing company biodata from db ..", existingUser);

        if (existingUser.length > 0) {
            console.log("Email already exists in the database ");

            req.flash("register", `${businessName} already registered !`);
            res.redirect(303, `${config.view_urls.register}`);

        } else {
            // encrypt password
                const hashed_pass = await encrypt_access_code(confirm_pass);
            // ... 
            const newUser = new RegistrationModel({
                email: email,
                businessName: businessName,
                natureOfBusiness: natureOfBusiness,
                businessType: businessType,
                location:location,
                address:address,
                contact:contact,
               // businessLogo:businessLogo,
                country:count,
                region_state:region_state,
                town:town,
                ceo: ceo,
                password: hashed_pass,
                role: "superuser"
            });
            await newUser.save();

            // send message to user 
                req.flash("signup", "Registration successful");
            // ...
            next();
            //res.redirect(303, `${config.view_urls.user_register}`);   // redirect to user registeration page
        }
        
    } catch (error) {
        console.log("Error from Registeration ..", error);

        // handling duplicate UUID keys err
        if (error.code == "11000") {
            req.flash("register", `${businessName} already registered !`);
            res.redirect(303, `${config.view_urls.user_register}`);
        }
        
    }

};
const redirect_to_dashboard_handler = async (req, res, next) => {
    try {
        console.log("Redirecting to dashboard ....");

        res.redirect(303, `${config.view_urls.dashboard}`);
    } catch (error) {
        console.log("** Error:: redirect Dashboard Handler **", error);
    }
}
const signup_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data from signup UI **", req.body);
        const data = req.body;

        //  encrypt passowrd 
            const hashed_pass = await encrypt_access_code(data.confirm_pass);
            console.log("** hashing user password **", hashed_pass); 
        // ...
        // save data into db
            const biodata = await RegistrationModel.find({ businessName: data.company }); // getting company biodata from db            
            const payload = {
                first_name: data.first_name,
                last_name: data.last_name,
                middle_name: data.middle_name,
                email: data.email,
                tel: data.tel,
                password: hashed_pass,
                company: data.company,
                // department: data.department,
                userID: `${data.company.toLowerCase().slice(0, 3).trim()}${randomSerialCode(4)}`,
                companyRefID: biodata[0].uuid
            };
            console.log("** final payload **", payload);

            await UserModel.insertMany(payload);
            await DateTimeTracker.insertMany({ "companyRefID": payload.companyRefID, "email": payload.email, "userID": payload.userID });
        // ...
        // send OTP code to company email using nodemailer for authentication 
            const otp_code = await randomSerialCode(4);
            const nodemail_resp = await sendMailForSignupAuth({ 
                email: biodata[0].email, 
                first_name: payload.first_name, 
                last_name: payload.last_name, 
                userID: payload.userID, 
                company: payload.company,
                role: payload.role
            }, otp_code);
            console.log("** is OTP code sent to email :", nodemail_resp);
        // ...
        // checking if OTP code is sent via email sucessfully 
            if (nodemail_resp == null) {
                req.flash("signup", "Bad Network. OTP not sent. Please Signup again !");
                res.redirect(303, `${config.view_urls.user_register}`);

            }else if (nodemail_resp !== undefined) { // if OTP is sent sucessfully 
                store.session.set("OTP_status", true);
                res.redirect(303, `${config.view_urls.user_register}`); 
            }
        // ...

    } catch (error) {
        console.log("** Error:: Signup Handler **", error);

        // Handling errors 
            if (error.writeErrors[0].err.errmsg.includes("duplicate key error collection")) { // for duplicate key pairs in db 
                req.flash("signup", "User already SignUp. Please Login !");
                res.redirect(303, `${config.view_urls.user_register}`);
            }

        // ...
    }
};
const OTP_verification_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data for OTP verification **", req.body);
        const data = req.body;

        const user = await UserModel.find({ "email": data.email });    // get current sign data from db
        if (user.length > 0) {
             // verifying incoming OTP code with the OTP code in db
                if (user[0].otp === data.otp.trim()) {
                    console.log("OPT verified");

                    req.flash("login", "User Signup sucessful");
                    res.redirect(303, `${config.view_urls.login}`);

                }else {
                    console.log("OTP not verified");

                    req.flash("signup", "Error. OTP verification Failed. Signup again !");
                    res.redirect(303, `${config.view_urls.user_register}`);
                }
            // ...
        }else {
            console.log("User not found for OTP verification");

            req.flash("signup", "User not found. Please Signup !");
            res.redirect(303, `${config.view_urls.user_register}`);
        }
    } catch (error) {
        console.log("** Error:: OTP verification Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};
const login_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data from login UI **", req.body);
        const data = req.body;

        

        
        
    } catch (error) {
        console.log("** Error:: Login Handler **", error);
    }
};


module.exports = { signup_handler, OTP_verification_handler, login_handler, registration_handler, redirect_to_dashboard_handler }