// IMPORATION OF MODULES 
const store = require("store2");

// ....
// IMPORTATION OF FILES 
const { UserModel, LoginModel, RegistrationModel, DateTimeTracker } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");
const { randomSerialCode } = require("../utils/code_generator");
const { sendMailForSignupAuth } =  require("../controller/nodemailer");

//

const registration_handler = async (req, res, next) => {

    const email = req.body.email;
    const businessName = req.body.businessName;
    const natureOfBusiness = req.body.natureOfBusiness;
    const businessType = req.body.businessType;
    const location = req.body.location;
    const address = req.body.address;
    const contact = req.body.contact;
    const businessLogo = req.body.businessLogo;
    const country = req.body.country;
    const region_state = req.body.region_state;
    const town = req.body.town;
    const ceo = req.body.ceo;
    const confirm_pass = req.body.confirm_pass;

    try { 
        const existingUser = await RegistrationModel.find({ "email": email });
        console.log("checking for existing company biodata from db ..", existingUser);

        if (existingUser.length > 0) {
            console.log("Email already exists in the database ");

            req.flash("register", `${businessName} already registered !`);
            res.redirect(303, "/api/get/user/register");

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
                businessLogo:businessLogo,
                country:country,
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
            res.redirect(303, "/api/get/user/signup");    // redirect to signup page
        }
        
    } catch (error) {
        console.log("Error from Registeration ..", error);
        res.status(303).redirect("/api/get/user/500");
        
    }

};
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
                department: data.department,
                userID: `${data.company.toLowerCase().slice(0, 3).trim()}${randomSerialCode(4)}`,
                companyRefID: biodata[0].uuid
            };
            console.log("** final payload **", payload);

            await UserModel.insertMany(payload);
            await DateTimeTracker.insertMany({ "companyRefID": payload.companyRefID, "email": payload.email, "userID": payload.userID });
        // ...
        // send OTP code to user email using nodemailer
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
                res.redirect(303, "/api/get/user/signup");

            }else if (nodemail_resp !== undefined) { // if OTP is sent sucessfully 
                store.session.set("OTP_status", true);
                res.redirect(303, "/api/get/user/signup"); 
            }
        // ...

    } catch (error) {
        console.log("** Error:: Signup Handler **", error);

        // Handling errors 
            if (error.writeErrors[0].err.errmsg.includes("duplicate key error collection")) { // for duplicate key pairs in db 
                req.flash("signup", "User already SignUp. Please Login !");
                res.redirect(303, "/api/get/user/signup");
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
                    res.redirect(303, "/api/get/user/login");

                }else {
                    console.log("OTP not verified");

                    req.flash("signup", "Error. OTP verification Failed. Signup again !");
                    res.redirect(303, "/api/get/user/signup");
                }
            // ...
        }else {
            console.log("User not found for OTP verification");

            req.flash("signup", "User not found. Please Signup !");
            res.redirect(303, "/api/get/user/signup");
        }
    } catch (error) {
        console.log("** Error:: OTP verification Handler **", error);
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


module.exports = { signup_handler, OTP_verification_handler, login_handler, registration_handler }