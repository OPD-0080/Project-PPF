require("dotenv").config();
const mongoose = require("mongoose");


// DEFINING PARAMTERS 
const DATABASE =  process.env.DATABASE;
const MONGO_USERNAME = process.env.USERNAME;
const MONGO_PASS = process.env.PASSWORD;
const MONGO_PORT = process.env.DB_PORT;
const MONGO_AUTH_SOURCE = process.env.MONGO_AUTH_SOURCE;
const MONGO_AUTH_MENCHANISM = process.env.MONGO_AUTH_MENCHANISM;
// ....
// INITIATING DB 
const config = {
    connectionString: `mongodb://localhost:${MONGO_PORT}/${DATABASE}`,
    db: `${DATABASE}`,
    collection: "session"
};
const isProduction = process.env.NODE_ENV == "production"; 
// ...

const connect_mongodb = async () => {
    try {
        if (isProduction) {
            return process.env.NODE_ENV
        }else {
            const resp = await mongoose.connect(config.connectionString, {
                /* "auth": {
                    "username": `${MONGO_USERNAME}`,
                    "password": `${MONGO_PASS}`
                }*/
            });
            console.log("** Mongo Database is connected **");
            return resp
        }
    } catch (error) {
        console.log("...Error in connecting Mongo DB ...", error);
        return error;
    }
};

module.exports = { connect_mongodb, config };
