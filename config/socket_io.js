// socketServer.js

const { Server } = require("socket.io");
const http = require("http");
const { User } = require("../models/userModel");
// Initialize Socket.IO server
// Import necessary libraries and set up your HTTP server

const getChatStatusById = async (userId) => {
      try {
            // Search for user by userId
            const user = await User.findById(userId);
            if (user) {
                  // If user found, return Chat_Status
                  return user.Chat_Status;
            } else {
                  // If user not found, return null or any default value
                  return null;
            }
      } catch (error) {
            // Handle error if any
            console.error("Error fetching user:", error);
            return null;
      }
};

const updateChatStatus = async (userId, newStatus) => {
      try {
            // Search for user by userId and update Chat_Status
            const user = await User.findByIdAndUpdate(
                  userId,
                  { Chat_Status: newStatus },
                  { new: true } // To return updated user document
            );
            if (user) {
                  // If user found and Chat_Status updated successfully, return updated Chat_Status
                  return user.Chat_Status;
            } else {
                  // If user not found or Chat_Status not updated, return null or any default value
                  return null;
            }
      } catch (error) {
            // Handle error if any
            console.error("Error updating Chat_Status:", error);
            return null;
      }
};

function generateOfflineId(length) {
      let result = "";
      const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
            result += characters.charAt(
                  Math.floor(Math.random() * charactersLength)
            );
      }
      return result;
}

const createSocketIO = (server) => {
      const io = new Server(server, {
            pingTimeout: 60000,
            cors: {
                  origin: "*",
            },
      });

      const connectedUsers = {};

      io.on("connection", (socket) => {
            socket.on("setup", async (userData, HeaderId) => {
                  const status = userData.ChatStatus;
                  socket.join(userData._id);
                  socket.emit("connected");
                  socket.emit("serverEvent", userData);
                  let Chat_Status = await getChatStatusById(HeaderId); // Await getChatStatusById
                  if (!Chat_Status) {
                        // If Chat_Status not found by HeaderId, set it to Offline by default
                        Chat_Status = "Offline";
                  }
                  if (status) {
                        // If status is true, set Chat_Status to Online and emit user online event
                        await updateChatStatus(userData._id, "Online");
                        io.emit("user online", {
                              userId: userData._id,
                              online: status,
                              Chat_Status: Chat_Status,
                        });
                  } else {
                        // If status is false, set Chat_Status to Offline and emit user online event
                        await updateChatStatus(userData._id, "Offline");
                        io.emit("user online", {
                              userId: userData._id,
                              online: status,
                              Chat_Status: Chat_Status,
                        });
                  }
            });

            socket.on("join chat", (room) => {
                  //console.log("join chat room", room);
                  socket.join(room);
            });

            socket.on("typing", (data) => {
                  //console.log("typing");
                  socket.in(data.chatData.room).emit("typing");
            });

            socket.on("stop typing", (room) => {
                  //console.log("stop typing");
                  socket.in(room).emit("stop typing");
            });

            socket.on("block Status", (data) => {
                  const { chatId, status, userId } = data;
                  socket.in(chatId).emit("block Status", { status, userId });
            });

            socket.on("new message", (newMessageRecieved) => {
                  try {
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

                              const OfflineId = generateOfflineId(8);
                              socket.broadcast.emit("offline_room", {
                                    OfflineId,
                                    userId: user._id,
                                    myId: newMessageRecieved.response.sender
                                          ._id,
                              });
                        });
                  } catch (error) {
                        console.error("Error in new message event:", error);
                  }
            });

            socket.on("disconnect", () => {
                  // Get the user ID of the disconnected user
                  delete connectedUsers[socket.id];
                  const userId = Object.keys(socket.rooms).find(
                        (room) => room !== socket.id
                  );
                  // console.log("disconnect", socket.id);
                  if (userId) {
                        // Emit online status for the disconnected user
                        io.emit("user online", { userId, online: false });
                  }
            });
      });
};

module.exports = createSocketIO;
