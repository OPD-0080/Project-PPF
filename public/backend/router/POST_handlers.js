// IMPORATION OF MODULES 
const store = require("store2");

// ....
// IMPORTATION OF FILES 
const { UserModel, LoginModel, DateTimeTracker } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");
const { RegistrationModel } = require('../../database/schematics');
const { randomSerialCode } = require("../utils/code_generator");
const { sendMail } =  require("../controller/nodemailer");

//

const signup_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data from signup UI **", req.body);
        const data = req.body;

        //  encrypt passowrd 
            const hashed_pass = await encrypt_access_code(data.confirm_pass);
            console.log("** hashing user password **", hashed_pass); 
        // ...
        // save data into db
            const payload = {
                first_name: data.first_name,
                last_name: data.last_name,
                middle_name: data.middle_name,
                email: data.email,
                tel: data.tel,
                password: hashed_pass,
                company: data.company,
                department: data.department,
                userID: `${data.company.toLowerCase().slice(0, 3).trim()}${randomSerialCode(4)}`
            };
            console.log("** final payload **", payload);

            const db_insert_resp = await UserModel.insertMany(payload);
            await DateTimeTracker.insertMany({ "uuid": db_insert_resp[0].uuid, "email": payload.email });
        // ...
        // send OTP code to user email using nodemailer
            const otp_code = await randomSerialCode(4);
            const nodemail_resp = await sendMail(payload, otp_code);
            console.log("** is OTP code sent to email :", nodemail_resp);
        // ...
        // checking if OTP code is sent via email sucessfully 
            if (nodemail_resp !== undefined) { // if OTP is sent sucessfully 
                store.session.set("OTP_status", "active");
                res.redirect(303, "/api/get/user/login"); 

            }else { // if OTP is not sent 
                // undo credential data from db
                    await UserModel.deleteOne({ "email": payload.email });
                    await DateTimeTracker.deleteOne({ "email": payload.email });
                // ...
                // send alert to user 
                    req.flash("login", "Network Error. Try Again !");
                // ...
                res.redirect(303, "/api/get/user/signup");
            }
        // ...


    } catch (error) {
        console.log("** Error:: Signup Handler **", error, error.writeErrors[0]);

        // Handling errors 
            if (error.writeErrors[0].err.errmsg.includes("duplicate key error collection")) { // for duplicate key pairs in db 
                req.flash("signup", "User already SignUp. Please Login !");
                res.redirect(303, "/api/get/user/signup");
            }

        // ...
    }
}


const login_handler = async (req, res, next) => {
    try {
        console.log("** Collecting data from login UI **", req.body);
        const data = req.body;


        
        
    } catch (error) {
        console.log("** Error:: Login Handler **", error);
    }
}
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
    const region_state = req.body.region_state
    const town = req.body.town
    // console.log(email, businessName, natureOfBusiness)

    try { 
        const existingUser = await RegistrationModel.find({ "email": email });
        console.log(email)
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Email already exists in the database." });
        } else {
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
                town:town
            });
            await newUser.save();
            return res.status(200).json({ message: "Registration successful." });
        }
        
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error." });
    }

}


module.exports = { signup_handler, login_handler, registration_handler }