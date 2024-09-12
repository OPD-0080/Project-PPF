const moment = require("moment");
const get_date_and_time = async () => {
    return {
        date: moment().format("LL"),
        time: moment().format("hh:mm A")
    }
};
module.exports = {get_date_and_time }