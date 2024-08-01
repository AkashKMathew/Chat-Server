const app = require("./app");

const dotenv = require("dotenv"); //to use the .env file
const mongoose = require("mongoose"); //to connect to the database
const { Server } = require("socket.io");
const path = require("path");
const OneToOneMessage = require("./models/OneToOneMessage");

dotenv.config({ path: "./.env" });

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
}); //handle uncaught exceptions

const http = require("http");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const server = http.createServer(app); //create a server with the app

const io = new Server(server, {
  cors: {
    origin: "https://chatapp-0hbx.onrender.com",
    methods: ["GET", "POST"],
  },
});

const DB = process.env.DBURI.replace("<PASSWORD>", process.env.DBPASSWORD); //replace the password in the DBURI

mongoose
  .connect(DB)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.log(err);
  });

const port = process.env.PORT || 8000; //set the port

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); //listen to the port

io.on("connection", async (socket) => {
  // console.log(JSON.stringify(socket.handshake.query));

  // console.log(socket);
  const user_id = socket.handshake.query["user_id"];

  const socket_id = socket.id;

  console.log(`User ${user_id} connected with socket id ${socket_id}`);

  if (!!user_id) {
    await User.findByIdAndUpdate(user_id, { socket_id, status: "Online" });
  }

  socket.on("friend_request", async (data) => {
    console.log(data.to);

    const to_user = await User.findById(data.to).select("socket_id");
    const from_user = await User.findById(data.from).select("socket_id");

    //create friend request

    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });

    io.to(to_user.socket_id).emit("new_friend_request", {
      message: "New friend request",
    });

    io.to(from_user.socket_id).emit("new_friend_request", {
      message: "Friend request sent",
    });
  });

  socket.on("accept_request", async (data) => {
    console.log(data);

    const request_doc = await FriendRequest.findById(data.request_id);

    console.log(request_doc);

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await sender.save({ new: true, validateModifiedOnly: true });
    await receiver.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    io.to(sender.socket_id).emit("request_accepted", {
      message: "Friend request accepted",
    });
    io.to(receiver.socket_id).emit("request_accepted", {
      message: "Friend request accepted",
    });
  });

  socket.on("get_direct_conv", async ({ user_id }, callback) => {
    const existing_conv = await OneToOneMessage.find({
      participants: { $all: [user_id] },
    }).populate("participants", "firstName lastName _id email status");

    console.log("existing conv in get dir conv",existing_conv);
    callback(existing_conv);
  });

  socket.on("start_conv", async (data) => {
    const { to, from } = data;

    const existing_conv = await OneToOneMessage.find({
      participants: { $size: 2, $all: [to, from] },
    }).populate("participants", "firstName lastName _id email status");

    console.log("existing conv",existing_conv[0]);

    if (existing_conv.length === 0) {
      let new_chat = await OneToOneMessage.create({
        participants: [to, from],
      });

      new_chat = await OneToOneMessage.findById(new_chat._id).populate(
        "participants",
        "firstName lastName _id email status"
      );

      console.log("new chat",new_chat);
      socket.emit("start_chat", new_chat);
    } else {
      console.log("new",existing_conv[0]);
      socket.emit("start_chat", existing_conv[0]);
    }
  });

  socket.on("get_messages", async (data, callback) => {
    const messages = await OneToOneMessage.findById(data.conv_id).select("messages");
    callback(messages);
  });

  socket.on("text_message", async (data) => {
    console.log("Received message ", data);

    const { to, from, message, conv_id, type } = data;

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    const new_message = {
      to,
      from,
      type,
      text: message,
      createAt: Date.now(),
    };

    const chat = await OneToOneMessage.findById(conv_id);
    console.log(chat);

    chat.messages.push(new_message);
    await chat.save({});

    io.to(to_user.socket_id).emit("new_message", {
      conv_id,
      message: new_message,
    });

    io.to(from_user.socket_id).emit("new_message", {
      conv_id,
      message: new_message,
    });
  });

  socket.on("file_message", (data) => {
    console.log("Received file message ", data);

    const fileExtension = path.extname(data.file.name);

    const fileName = `${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}${fileExtension}`;

    //upload file to aws s3
  });

  socket.on("end", async (data) => {
    if (data.user_id) {
      await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
    }

    console.log("Closing connection");
    socket.disconnect(0);
  });
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
}); //handle unhandled promise rejections
