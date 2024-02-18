// IMPORATATION OF MODELS
require("dotenv");
const crypto =  require("crypto");
const bcyrpt = require("bcrypt");

// ...


const encrypt_access_code = async (data) => {
    let proceed = "";
        console.log("....GETTIING ACCESS CODE ....", data);  

        const hmac = crypto.createHmac("sha256", `${process.env.SECRETE_KEY_1}`);   // create HMAC with crypto module
        hmac.update(data); // encrypting raw data with hamc
        const data_hashed = hmac.digest("hex"); // getting hased value in hx
        
        const data_buffer = Buffer.from(data_hashed);    // converting hex data into buffer
        const hased_access = await bcyrpt.hash(data_buffer ,`${process.env.SECRETE_KEY_2}`)    // encrypted for the second time with bcyrpt

        console.log("... hmac value ...:", data_hashed);
        console.log("... bycrypt hased ....:", hased_access);
        return hased_access
};
const verify_access_code = async (incoming_hased_data, hased_data) => {
    console.log("....VERIFYING ACCESS CODE .....");
    let resp = "";
    (hased_data.includes(incoming_hased_data))? resp = true : resp = false;
    return resp;
}



module.exports = {
    encrypt_access_code, verify_access_code
}