const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel.js");
const Message = require("../models/messageModel.js");
const { User } = require("../models/userModel.js");
const moment = require("moment-timezone");
require("dotenv").config();

const allMessages = asyncHandler(async (req, res) => {
      try {
            // Fetch the chat information using chatId
            const chat = await Chat.findById(req.params.chatId).populate(
                  "users",
                  "pic first_name last_name"
            );

            if (!chat) {
                  return res.json({
                        messages: "Chat not found",
                        status: false,
                  });
            }

            // Find the user in the chat whose ID doesn't match req.user._id
            const otherUser = chat.users.find(
                  (user) => user._id.toString() !== req.user._id.toString()
            );

            // Find the correct user ID from blockedUsers array
            const blockedUserId = chat.blockedUsers.find(
                  (userId) => userId !== req.user._id.toString()
            );

            // Create the header_user_data object with correct blocked user ID
            const headerUserData = {
                  _id: otherUser ? otherUser._id : null,
                  pic: otherUser ? process.env.BASE_URL + otherUser.pic : null,
                  first_name: otherUser ? otherUser.first_name : null,
                  last_name: otherUser ? otherUser.last_name : null,
                  blockStatus: {
                        _id: blockedUserId ? blockedUserId : null,
                        Blocked: blockedUserId ? "Yes" : "No",
                  },
            };

            // Fetch messages related to the chat
            const messages = await Message.find({ chat: req.params.chatId })
                  .populate("sender", "pic first_name last_name")
                  .populate("chat");

            if (messages.length > 0) {
                  // Add BASE_URL to the pic field for each message in the list
                  const messagesWithBaseUrl = messages.map((message) => ({
                        ...message.toObject(),
                        sender: {
                              ...message.sender.toObject(),
                              pic: process.env.BASE_URL + message.sender.pic,
                        },
                  }));

                  res.json({
                        messages: messagesWithBaseUrl,
                        status: true,
                        header_user_data: headerUserData,
                  });
            } else {
                  res.json({
                        messages: [],
                        status: true,
                        header_user_data: headerUserData,
                  });
            }
      } catch (error) {
            res.status(500).json({ error: error.message, status: false });
      }
});

const sendMessage = asyncHandler(async (req, res) => {
      const { content, chatId } = req.body;

      if (!content || !chatId) {
            console.log("Invalid data passed into request");
            return res.sendStatus(200);
      }

      // Check if the sender is blocked
      const chat = await Chat.findById(chatId);

      if (!chat || chat.blockedUsers.length > 0) {
            console.log(
                  "Blocked users found or chat not found. Message not saved."
            );
            return res.sendStatus(500);
      }

      const newMessage = {
            sender: req.user._id,
            content: content,
            chat: chatId,
      };

      try {
            let message = await Message.create(newMessage);

            message = await message
                  .populate("sender", "pic first_name last_name")
                  .execPopulate();
            message = await message.populate("chat").execPopulate();
            message = await User.populate(message, {
                  path: "chat.users",
                  select: "pic first_name last_name",
            });

            // Add BASE_URL to the pic field in the message response for each user
            message.chat.users.forEach((user) => {
                  user.pic = process.env.BASE_URL + user.pic;
            });

            // Add BASE_URL to the pic field in the sender response
            message.sender.pic = process.env.BASE_URL + message.sender.pic;

            await Chat.findByIdAndUpdate(req.body.chatId, {
                  latestMessage: message,
                  updatedAt: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"), // Update the updatedAt field
            });

            res.json(message);
      } catch (error) {
            res.status(500).json({ error: error.message, status: false });
      }
});

module.exports = { allMessages, sendMessage };
