const { RegistrationModel } = require('../../database/schematics');

const registration_handler = async (req, res, next) => {

    const email = req.body.email;
    const businessName = req.body.businessName;
    const natureOfBusiness = req.body.natureOfBusiness;
    const businessType = req.body.businessType;
    const location = req.body.location;
    const address = req.body.address;
    const contact = req.body.contact;
    const businessLogo = req.body.businessLogo;
    const country = req.body.country;
    const region_state = req.body.region_state
    const town = req.body.town
    // console.log(email, businessName, natureOfBusiness)

    try { 
        const existingUser = await RegistrationModel.find({ "email": email });
        console.log(email)
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Email already exists in the database." });
        } else {
            const newUser = new RegistrationModel({
                email: email,
                businessName: businessName,
                natureOfBusiness: natureOfBusiness,
                businessType: businessType,
                location:location,
                address:address,
                contact:contact,
                businessLogo:businessLogo,
                country:country,
                region_state:region_state,
                town:town
            });
            await newUser.save();
            return res.status(200).json({ message: "Registration successful." });
        }
        
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error." });
    }

}

module.exports = { registration_handler}