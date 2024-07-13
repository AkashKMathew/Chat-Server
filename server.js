const app = require("./app");

const http = require("http");

const server = http.createServer(app); //create a server with the app

const port = process.env.PORT || 8000; //set the port

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); //listen to the port
