const moment = require("moment");
const get_date_and_time = async () => {
    return {
        date: moment().format("dd-mm-yyyy"),
        time: moment().format("hh:mm:ss")
    }
};
module.exports = {get_date_and_time }