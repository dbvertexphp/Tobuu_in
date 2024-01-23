// socketServer.js

const { Server } = require("socket.io");
const http = require("http");

// Initialize Socket.IO server
// Import necessary libraries and set up your HTTP server

const createSocketIO = (server) => {
      const io = new Server(server, {
            pingTimeout: 60000,
            cors: {
                  origin: "*",
            },
      });

      io.on("connection", (socket) => {
            console.log("Connected to socket.io");

            socket.on("setup", (userData) => {
                  console.log("connected");
                  socket.join(userData._id);
                  socket.emit("connected");
            });

            socket.on("join chat", (room) => {
                  socket.join(room);
                  console.log("User Joined Room: " + room);
            });

            socket.on("typing", (room) => {
                  socket.in(room).emit("typing");
                  console.log("typing");
            });

            socket.on("stop typing", (room) => {
                  socket.in(room).emit("stop typing");
                  console.log("stop typing");
            });

            socket.on("block Status", (data) => {
                  const { chatId, status, userId } = data;
                  socket.in(chatId).emit("block Status", { status, userId });
                  console.log("block Status");
            });

            socket.on("new message", (newMessageRecieved) => {
                  try {
                        var chat = newMessageRecieved.response.chat;
                        console.log("new message" + newMessageRecieved);

                        if (!chat || !chat.users) {
                              return console.log(
                                    "Chat or chat.users not defined"
                              );
                        }
                        chat.users.forEach((user) => {
                              if (
                                    user._id ==
                                    newMessageRecieved.response.sender._id
                              )
                                    return;
                              socket.in(user._id).emit(
                                    "message received",
                                    newMessageRecieved
                              );
                        });
                  } catch (error) {
                        console.error("Error in new message event:", error);
                  }
            });

            socket.on("disconnect", () => {
                  console.log("User disconnected");
            });
      });
};

module.exports = createSocketIO;
