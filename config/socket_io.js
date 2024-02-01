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

      const connectedUsers = {};

      io.on("connection", (socket) => {
            // console.log("Connected to socket.io");

            socket.on("setup", (userData) => {
                  socket.join(userData._id);
                  socket.emit("connected");

                  // Emit online status for the connected user
                  io.emit("user online", {
                        userId: userData._id,
                        online: true,
                  });
            });

            socket.on("join chat", (room) => {
                  socket.join(room);
            });

            socket.on("typing", (data) => {
                  socket.in(data.chatData.room).emit("typing");
            });

            socket.on("stop typing", (room) => {
                  socket.in(room).emit("stop typing");
            });

            socket.on("block Status", (data) => {
                  const { chatId, status, userId } = data;
                  socket.in(chatId).emit("block Status", { status, userId });
            });

            socket.on("new message", (newMessageRecieved) => {
                  try {
                        console.log(
                              "new message" + JSON.stringify(newMessageRecieved)
                        );
                        var chat = newMessageRecieved.response.chat;
                        var room_id = newMessageRecieved.response.chat._id;
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

                              socket.in(room_id).emit(
                                    "message received",
                                    newMessageRecieved
                              );
                        });
                  } catch (error) {
                        console.error("Error in new message event:", error);
                  }
            });

            socket.on("disconnect", () => {
                  // Get the user ID of the disconnected user
                  const userId = Object.keys(socket.rooms).find(
                        (room) => room !== socket.id
                  );

                  if (userId) {
                        // Emit online status for the disconnected user
                        io.emit("user online", { userId, online: false });
                  }
            });
      });
};

module.exports = createSocketIO;
