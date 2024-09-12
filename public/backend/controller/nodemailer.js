require("dotenv");
const nodemailer = require("nodemailer");

// IMPORTATION OF FILES

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
const sending_email = async (company_name, subject, receiver_email, message) => {
    try {
        const email_detail = {
            from: `${company_name} ${process.env.NODEMAILER_USER}`,
            to: `${receiver_email}`,
            subject: `${subject}`,
            text: `${message}`,
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
const sending_email_with_html_template = async (company_name, subject, receiver_email, message, html_template) => {
    try {
        const email_detail = {
            from: `${company_name} ${process.env.NODEMAILER_USER}`,
            to: `${receiver_email}`,
            subject: `${subject}`,
            text: `${message}`,
            html: `${html_template}` // to customize message to the receiptent tmo suit company profile 
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

module.exports = { sending_email, sending_email_with_html_template }