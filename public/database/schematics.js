const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// generating uuid
const uuid = uuidv4();

// DEFINING SCHEMATICS
const registration_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    email: {type: String, required: true, unique: true},
    businessName: { type: String, required: true },
    natureOfBusiness: {type: String, required: true},
    businessType: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    businessLogo: { type: String, default: null}, 
    country: { type: String, required: true },
    region_state: { type: String, required: true },
    town: { type: String, required: true },
    ceo: { type: String, required: true },
    password: { type: String, required: true, unique: true },
    role: { type: String, required: true, unique: false, default: "admin" },
    previliges: { type: String, required: false, unique: false, default: "super"},
    otp: {type: String, required: false, unique: false, default: null},
    photo: {type: String, required: false, unique: false, default: null},
    is_active: {type: String, required: false, unique: false, default: true}
});
const user_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    companyRefID: {type: String, required: true, unique: false, ref: 'Registration'}, 
    first_name: {type: String, required: true, unique: false, trim: true},
    last_name: {type: String, required: true, unique: false, trim: true},
    middle_name: {type: String, required: true, unique: false, trim: true},
    date_of_birth: {type: String, required: true, unique: false, trim: true},
    tel: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true, unique: true},
    company: {type: String, required: true, unique: false},
    department: {type: String, required: false, unique: false},
    userID: {type: String, required: true, unique: true},
    role: { type: String, required: false, unique: false, default: "staff"},
    previliges: { type: Object, required: true, unique: false, default: null},
    photo: {type: String, required: false, unique: false, default: null},
    ID_card_type: {type: String, required: true, unique: false, default: null},
    ID_card_number: {type: String, required: true, unique: false, default: null},
    ID_photo_font: {type: String, required: true, unique: false, default: null},
    ID_photo_back: {type: String, required: true, unique: false, default: null},
    otp: {type: String, required: false, unique: false, default: null},
    is_active: {type: String, required: false, unique: false, default: true}
}, {timestamps: true}  // for this will add createdAt and updatedAt to the schema automatically 
); 
const login_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    email: {type: String, required: true, unique: true},
    company: {type: String, required: true, unique: false},
    userID: {type: String, required: true, unique: true},
    role: {type: String, required: true},
});
const date_time_schema = new mongoose.Schema({
    companyRefID: {type: String, required: true, unique: false, ref: 'Registration'}, 
    email: {type: String, required: true},
    userID: {type: String, required: true, unique: true},
    login_date: {type: String, required: false, unique: false, default: null},
    login_time: {type: String, required: false, unique: false, default: null},
    logout_date: {type: String, required: false, unique: false, default: null},
    logout_time: {type: String, required: false, unique: false, default: null},
});
const authorization_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    email: {type: String, required: true, unique: true},
    company: {type: String, required: true, unique: false},
    userID: {type: String, required: true, unique: true},
    companyRefID: {type: String, required: true, unique: false, ref: 'Registration'},
    role: {type: String, required: true},
    authorization: {type: String, required: true, unique: true, default: null},
    authorization_active: {type: Boolean, required: false, unique: false, default: false},
    authorization_visible: {type: Boolean, required: false, unique: false, default: false},
}, {timestamps: true});

const purchases_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    companyRefID: {type: String, required: true, unique: false, ref: 'Registration'},
    company: {type: String, required: true, unique: false, default: null},
    initiator: {type: String, required: true, unique: false, default: null},
    userID: {type: String, required: true, unique: false},
    supplier: {type: String, required: true, unique: false, default: null},
    invoice_date: {type: String, required: true, unique: false, default: null},
    invoice_number: {type: String, required: true, unique: false, default: null},
    item_code: {type: String, required: true, unique: false, default: null},
    particular: {type: String, required: true, unique: false, default: null},
    quantity: {type: String, required: true, unique: false, default: null},
    price: {type: String, required: true, unique: false, default: null},
    amount: {type: String, required: true, unique: false, default: null},
},{timestamps: true});

const comparism_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    companyRefID: {type: String, required: true, unique: false, ref: 'Registration'},
    company: {type: String, required: true, unique: false, default: null},
    initiator: {type: String, required: true, unique: false, default: null},
    userID: {type: String, required: true, unique: false},
    role: {type: String, required: true, unique: false, default: null},
    previous_payload: {type: Object, required: true, unique: false, default: null},
    incoming_payload: {type: Object, required: true, unique: false, default: null},
    remarks: {type: String, required: true, unique: false, default: "conflict"},
    comment: {type: String, required: true, unique: false, default: "no comment"},
    message: {type: String, required: true, unique: false, default: null},
},{timestamps: true});

const tracking_schema = new mongoose.Schema({
    uuid: {type: String, required: true, unique: true, default: uuid},
    companyRefID: {type: String, required: true, unique: false, ref: 'Registration'},
    company: {type: String, required: true, unique: false, default: null},
    initiator: {type: String, required: true, unique: false, default: null},
    userID: {type: String, required: true, unique: false},
    role: {type: String, required: true, unique: false, default: null},

    authorization: {type: Object, required: true, unique: false, default: null},
    users: {type: Object, required: true, unique: false, default: null},
    purchases: {type: Object, required: true, unique: false, default: null},
    sales: {type: Object, required: true, unique: false, default: null},
    comparism: {type: Object, required: true, unique: false, default: null},
    cash: {type: Object, required: true, unique: false, default: null},
    inventory_management: {type: Object, required: true, unique: false, default: null},
    reports: {type: Object, required: true, unique: false, default: null},

},{timestamps: true});

// ...
// DECLARING SCHEMATICS
// eg. mongoose.model("collectionName", schemaName);
const UserModel = mongoose.model("Users", user_schema);
const LoginModel = mongoose.model("Login", login_schema);
const DateTimeTracker = mongoose.model("DateTimeTracker", date_time_schema);
const RegistrationModel = mongoose.model("Registration", registration_schema);
const AuthorizationModel = mongoose.model("Authorization", authorization_schema);
const PurchaseModel = mongoose.model("Purchases", purchases_schema);
const ComparismeModel = mongoose.model("Comparism", comparism_schema);
const TrackingModel = mongoose.model("Tracking", tracking_schema);


// ...

// EXPORT SCHEMATICS
module.exports = { 
    UserModel, LoginModel, DateTimeTracker, RegistrationModel, AuthorizationModel, PurchaseModel
}
// ..