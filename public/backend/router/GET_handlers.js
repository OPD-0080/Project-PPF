


const view_login = async (req, res, next) => {
    try {
        console.log("** Inside Login view **");



        // notification section
            const error_alert = req.flash("validate_login");
            console.log("Error message", error_alert);
        // ...
        res.json(200)

    } catch (error) {
        console.log("** Error:: Login view **", error);
    }
}



module.exports = { view_login }