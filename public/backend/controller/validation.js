// IMPORTATION OF MODELS
const validator = require("validator");
const { UserModel, LoginModel } = require("../../database/schematics");

// ...

const loginValidation = async (req, res, next) => {
    try {
        console.log("** Validating Login fields **");
        const data = req.body;
        let status = "", msg = "";

        if (!validator.isEmail(data.username)) {
            msg = "Error. Provide Valid Email !";
            status = true;

        }else if (validator.isEmpty(data.password)) {
            msg = "Error. Provide Valid Password";
            status = true;

        }else if (validator.isEmpty(data.company)) {
            msg = "Error. Select Your Company First to Login";
            status = true;

        }else if (validator.isEmpty(data.userID)) {
            msg = "Error. Provide Valid User ID";
            status = true;
        }

        if (status) { // if error is fouund
            // checking if user has already signup or not 
                const user = await UserModel.find({ "email": data.email });
                const login_resp = await LoginModel.find({ "email": data.email });

                console.log(" for user model response  ..", user);
                console.log(".. for login  model response ..", login_resp)
                if (user) {
                    
                }else {

                }

            // ...



            req.flash("validate_login", msg); // alert user with a message 
            res.redirect(303, "/api/get/user/login") // return to the login view page 

        }else {
            console.log("** Validation Completed **");

            next() // mve to the next middelware 
        }

    } catch (error) {
        console.log("** Error:: login validation **", error);
    }
};

const signupValidation = async (req, res, next) => {
    try {
        console.log("** Validating Signup fields **");
        const data = req.body;
        let status = "", msg = "";

        if (!validator.isEmail(data.email)) {
            msg = "Error. Provide Valid Email !";
            status = true;

        }else if (validator.isEmpty(data.first_name)) {
            msg = "Error. Provide Your First Name";
            status = true;

        }else if (validator.isEmpty(data.last_name)) {
            msg = "Error. Provide Your Last Name";
            status = true;

        }else if (!validator.isMobilePhone(data.tel)) {
            msg = "Error. Provide Your Active Contact Number";
            status = true;

        }else if (validator.isEmpty(data.new_pass)) {
            msg = "Error. Provide Password";
            status = true;

        }else if (validator.isEmpty(data.confirm_pass)) {
            msg = "Error. Provide Password";
            status = true;
            
        }

        if (status) { // if error is fouund
            req.flash("validate_login", msg); // alert user with a message 
            res.redirect(303, "/api/get/user/login") // return to the login view page 

        }else {
            console.log("** Validation Completed **");

            next() // mve to the next middelware 
        }

    } catch (error) {
        console.log("** Error:: login validation **", error);
    }
};

module.exports = { loginValidation, signupValidation }