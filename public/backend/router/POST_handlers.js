// IMPORATION OF MODULES 


// ....
// IMPORTATION OF FILES 
const { UserModel, LoginModel, DateTimeTracker } = require("../../database/schematics");
const { encrypt_access_code, verify_access_code } = require("../controller/encryption");
const { radomSerialCode } = require("../utils/code_generator");

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
                userID: `${data.first_name.slice(0, 1).trim()}${data.last_name.slice(0, 1).trim()}${radomSerialCode()}`
            };
            console.log("** final payload **", payload);

            const db_insert_resp = await UserModel.insertMany(payload);
            await DateTimeTracker.insertMany({ "uuid": db_insert_resp[0].uuid, "email": payload.email});
        // ...
        // 

    

    } catch (error) {
        console.log("** Error:: Signup Handler **", error);
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



module.exports = { signup_handler, login_handler }