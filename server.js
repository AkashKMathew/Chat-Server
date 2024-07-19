const app = require("./app");

const dotenv = require("dotenv"); //to use the .env file
const mongoose = require("mongoose"); //to connect to the database

dotenv.config({path:"./.env"});

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
}); //handle uncaught exceptions



const http = require("http");

const server = http.createServer(app); //create a server with the app

const DB = process.env.DBURI.replace("<PASSWORD>",process.env.DBPASSWORD); //replace the password in the DBURI

mongoose.connect(DB).then(() => {
  console.log("Database connected successfully");
}).catch((err) => {
  console.log(err);
});


const port = process.env.PORT || 8000; //set the port

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); //listen to the port

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(()=>{
    process.exit(1);
  })
}); //handle unhandled promise rejections