const mongoose = require("mongoose");


// DEFINING SCHEMATICS
const registration_schema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},



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