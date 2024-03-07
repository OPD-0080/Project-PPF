const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// generating uuid
const uuid = uuidv4();

// DEFINING SCHEMATICS
const user_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    first_name: {type: String, required: true, unique: false, trim: true},
    last_name: {type: String, required: true, unique: false, trim: true},
    middle_name: {type: String, required: true, unique: false, trim: true},
    tel: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true, unique: true},
    company: {type: String, required: true, unique: false},
    department: {type: String, required: true, unique: false},
    userID: {type: String, required: true, unique: true},
    photo: {type: String, required: false, unique: false, default: null},
    ID_card_type: {type: String, required: false, unique: false, default: null},
    ID_card_number: {type: String, required: false, unique: false, default: null},
    ID_photo_font: {type: String, required: false, unique: false, default: null},
    ID_photo_back: {type: String, required: false, unique: false, default: null},
    otp: {type: String, required: false, unique: false, default: null}
}, {timestamps: true}  // for this will add createdAt and updatedAt to the schema automatically 
); 
const login_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    email: {type: String, required: true, unique: true},
    company: {type: String, required: true, unique: true},
    userID: {type: String, required: true, unique: true},
});
const date_time_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: false},
    email: {type: String, required: true},
    userID: {type: String, required: true, unique: true},
    login_date: {type: String, required: false, unique: false, default: null},
    login_time: {type: String, required: false, unique: false, default: null},
    logout_date: {type: String, required: false, unique: false, default: null},
    logout_time: {type: String, required: false, unique: false, default: null},
});

const registration_schema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    businessName: { type: String, required: true },
    natureOfBusiness: {type: String, required: true},
    businessType: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    businessLogo: { type: String }, 
    country: { type: String, required: true },
    region_state: { type: String, required: true },
    town: { type: String, required: true },
});


// ...
// DECLARING SCHEMATICS
// eg. mongoose.model("collectionName", schemaName);
const UserModel = mongoose.model("Users", user_schema);
const LoginModel = mongoose.model("Login", login_schema);
const DateTimeTracker = mongoose.model("DateTimeTracker", date_time_schema);
const RegistrationModel = mongoose.model("Registration", registration_schema);


// ...

// EXPORT SCHEMATICS
module.exports = { 
    UserModel, LoginModel, DateTimeTracker, RegistrationModel
}
// ..