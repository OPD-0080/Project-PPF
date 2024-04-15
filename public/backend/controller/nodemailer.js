require("dotenv");
const nodemailer = require("nodemailer");

// IMPORTATION OF FILES
const { UserModel, DateTimeTracker } = require("../../database/schematics");
// ..
// initializing nodemailer trasport 
const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
        user: `${process.env.NODEMAILER_USER}`,
        pass: `${process.env.NODEMAILER_PASS}`
    }
});
// ...
const sendMailForSignupAuth = async (payload, code) => {
    try {
        
        const email_detail = {
            from: `PROJECT PPF ${process.env.NODEMAILER_USER}`,
            to: `${payload.email}`,
            subject: "OTP AUTHENTICATION CODE",
            text: `Dear Admin, you just singup ${payload.first_name} ${payload.last_name} with userID ${payload.userID},
                Permit user by giving the OTP CODE to the user for authentication: ${code} with the DEFAULT PASSWORD ${payload.password}`,
            //html: "" // to customize message to the receiptent tmo suit company profile 
        };
        console.log("....SENDNING EMAIL .....", email_detail);

        const resp = await transporter.sendMail(email_detail);
        return resp

    } catch (error) {
        console.log("...ERROR :: ERROR IN SEMDMAIL FUNCTION ....", error);
        
        if ((error.syscall == "getaddrinfo") && (error.code == "EDNS")) {
            return null
        }
    }
}

module.exports = { sendMailForSignupAuth }