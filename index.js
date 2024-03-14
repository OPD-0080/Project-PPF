// IMPORTATION
require("dotenv").config();
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const MongoStore = require('connect-mongo');


// ...
// EXPRESS ROUTERS
const { connect_mongodb, config } = require(path.join(__dirname, "/public/database/connection"));
const post_routes = require(path.join(__dirname, "/public/backend/router/POST_route"));
const get_routes = require(path.join(__dirname, "/public/backend/router/GET_route"));
const { passport_strategy } = require(path.join(__dirname, "/public/backend/controller/passport"));
// ...
// INITIALIZATION SERVER
const app = express(); // all app depends on ~
const PORT = process.env.PORT || `${process.env.DEV_PORT}`;
// ...

// MIDDLEWARE
app.set("views", path.join(__dirname, "/public/frontend/views/pages")); // setting new view path 
app.set("view engine", "ejs");
app.use(bodyParser.json({limit: "3mb"}));  // data will be use  in JSON Format
app.use(bodyParser.urlencoded({extended: true, limit: "3mb"})) // to post request and able to get data from it url
app.use(express.static(path.join(__dirname, "/public")))
// ...
// CONNECTING DATABASE 
connect_mongodb();
// ...
// INITIATING SESSION 
app.use(session({
    secret: `${process.env.SESSION_SECRETE}`,
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
        "collectionName": `${config.collection}`,
        "ttl": 1000 * 60 * 60 * 24 * 1, // expire in 1 day
        "dbName": `${config.db}`,
        "mongoUrl": `${config.connectionString}`,
        "autoRemove": "native", // delete data from db when session expires 
    }),
    cookie: {
        secure: (process.env.NODE_ENV == "production")? true : false, // enable only in production mode;
        maxAge: 1000 * 60 * 60 * 24 * 7 // to 7 days
    }
}));
// ...
app.use(flash());

// INITIALIZING ROUTERS 
app.use("/api/post/user", post_routes);
app.use("/api/get/user", get_routes);
// ...
// passort middleware 
passport.use(passport_strategy);
app.use(passport.initialize());
app.use(passport.session());
// ...

app.listen(PORT, () => { console.log(`.....Server is listern on PORT  ${PORT}`) })