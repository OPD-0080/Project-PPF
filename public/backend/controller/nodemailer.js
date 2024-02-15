require("dotenv");
const nodemailer = require("nodemailer");

const sendMail = async (payload, code) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 465,
            secure: true,
            auth: {
                user: `${process.env.NODEMAILER_USER}`,
                pass: `${process.env.NODEMAILER_PASS}`
            }
        });
        const email_detail = {
            from: `PROJECT PPF ${process.env.NODEMAILER_USER}`,
            to: `${payload.email}`,
            subject: "AUTHENTICATION CODE",
            text: `Dear ${payload.first_name} ${payload.last_name}, Please provide the codes for authentication: ${code}`,
            //html: "" // to customize message to the receiptent tmo suit company profile 
        };
        console.log("....SENDNING EMAIL .....", email_detail);

        const resp = await transporter.sendMail(email_detail);
        return resp

    } catch (error) {
        console.log("...ERROR :: ERROR IN SEMDMAIL FUNCTION ....", error);
        
        if ((error.syscall == "getaddrinfo") && (payload.role == "Super")) {
            return true
        }else {
            return false
        }
    }
}

module.exports = { sendMail }