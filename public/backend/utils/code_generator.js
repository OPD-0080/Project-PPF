const { RegistrationModel, UserModel } = require("../../database/schematics");



const randomSerialCode = async (number) => {
    const base = "0123456789";

    const generate = (length) => {
        var show = "";
        for (let i = 0; i < length; i++) {
            show += base.charAt(Math.floor(Math.random() * base.length))
        }
        return show;
    }
    return generate(number)
}
const randomPassword = async (number) => {
    const base = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const generate = (length) => {
        var show = "";
        for (let i = 0; i < length; i++) {
            show += base.charAt(Math.floor(Math.random() * base.length))
        }
        return show;
    }
    return generate(number)
};
const randomletters = async (number) => {
    const base = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const generate = (length) => {
        var show = "";
        for (let i = 0; i < length; i++) {
            show += base.charAt(Math.floor(Math.random() * base.length))
        }
        return show;
    }
    return generate(number)
};
const authorization_code = async () => {
    const letters = await randomletters(4);
    return `${letters[0]}${await randomSerialCode(3)}${letters[1]}${letters[2]}${await randomSerialCode(3)}${letters[3]}`
};



module.exports = {randomSerialCode, randomPassword, authorization_code};
