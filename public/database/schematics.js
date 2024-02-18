const mongoose = require("mongoose");


// DEFINING SCHEMATICS
const registration_schema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    businessName: { type: String, required: true },
    natureOfBusiness: {type: String, required: this},
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
const RegistrationModel = mongoose.model("registration", registration_schema);


// ...

// EXPORT SCHEMATICS
module.exports = { 
    RegistrationModel
}
// ..