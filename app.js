const express = require("express");  //to create the server

const morgan = require("morgan"); //to see the server endpoint requests in the console

const rateLimit = require("express-rate-limit"); //to limit the number of requests

const helmet = require("helmet"); //to secure the app by setting various HTTP headers

const mongoSanitize = require("express-mongo-sanitize"); //to prevent NoSQL injection

const bodyParser = require("body-parser"); //to parse the request body

const xss = require("xss"); //to prevent XSS attacks

const cors = require("cors"); 

const app = express();

app.use(express.urlencoded({
    extended: true,
}));
app.use(mongoSanitize()); //to prevent NoSQL injection
// app.use(xss()); //to prevent XSS attacks
app.use(cors({
    origin:"*", //to allow requests from all domains
    methods: ["GET","POST","PATCH","DELETE", "PUT"], //to allow these methods
    credentials: true, //to allow cookies
})); //to allow cross-origin requests
app.use(express.json({limit:"10kb"}))   //to use the middleware
app.use(bodyParser.json()); //to parse the request body
app.use(bodyParser.urlencoded({ extended: true })); //to parse the request body
app.use(helmet()); //to secure the app by setting various HTTP headers
if(process.env.NODE_ENV === "development"){
    app.use(morgan("dev")); //to see the server endpoint requests in the console
}
const limiter = rateLimit({
    max: 3000,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: "Too many requests from this IP, please try again after an hour",
});
app.use("/tawk",limiter); //to limit the number of requests


module.exports = app;
