// IMPORATION OF MODULES 
const store = require("store2");

// ....
// IMPORTATION OF FILES 
const config = require("../config/config");
const { UserModel, LoginModel, RegistrationModel, DateTimeTracker } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");
const { randomSerialCode } = require("../utils/code_generator");
const { sending_email } =  require("../controller/nodemailer");

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
                role: "superuser"
            });
            await newUser.save();

            req.flash("signup", "Registration successful");       // send message to user 
            next(); // move to the next middleware
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
        const user = req.session.passport.user.company; 

        // //  encrypt passowrd 
        //     const hashed_pass = await encrypt_access_code(data.confirm_pass);
        //     console.log("** hashing user password **", hashed_pass); 
        // // ...
        // save data into db
            const otp_code = await randomSerialCode(4);
            const biodata = await RegistrationModel.find({ businessName: data.company }); // getting company biodata from db            
            const payload = {
                first_name: data.first_name,
                last_name: data.last_name,
                middle_name: data.middle_name,
                email: data.email,
                tel: data.tel,
                password: data.confirm_pass,
                company: user.company,
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
                `Dear Admin, you just signup user with the name ${payload.first_name} ${payload.last_name}, UserID ${payload.userID}.
                    A DEFAULT PASSWORD ${payload.password} & OTP CODE ${payload.otp} will sent to user for Authentication.
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
                // send credentail to user via email  
                    const nodemail_resp = await sending_email(
                        config.company_name,
                        "User Singup Authentication",
                        `Dear ${payload.first_name} ${payload.last_name}, ${ppayload.company} has signed you up with UserID ${payload.userID}.
                            Login with the DEFAULT PASSWORD ${payload.password} for the first time & verify with the provided OTP CODE ${payload.otp} for Authentication.
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
const login_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data from login UI **", req.body);
        const data = req.body;

        

        
        
    } catch (error) {
        console.log("** Error:: Login Handler **", error);
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

            req.flash("signup", "Error. User not found. Please Signup !");
            res.redirect(303, `${config.view_urls.user_register}`);
        }
    } catch (error) {
        console.log("** Error:: OTP verification Handler **", error);
        res.redirect(303, `${config.view_urls._500}`);
    }
};


module.exports = { signup_handler, OTP_verification_handler, login_handler, registration_handler, redirect_to_dashboard_handler }