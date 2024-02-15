const { RegistrationModel } = require('../../database/schematics');

const registration_handler = async (req, res, next) => {

    var email = req.body.email;
    const  businessName = req.body.businessName;
    const  natureOfBusiness = req.body.natureOfBusiness;
    const  businessType = req.body.businessType;
    const  location = req.body.location;
    let address = req.body.address;
    let contact = req.body.contact;
    let businessLogo = req.body.businessLogo
    let nationality = req.body.nationality;
    // console.log(email, businessName, natureOfBusiness)

    try { 
        var email = await RegistrationModel.find({ "email": email });
        console.log(email)

    } catch (error) {
        
    }

}

module.exports = { registration_handler}