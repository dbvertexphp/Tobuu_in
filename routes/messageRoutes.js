const express = require("express");
const {
      allMessages,
      sendMessage,
      UpdateMessagesRead,
} = require("../controllers/messageControllers.js");
const protect = require("../middleware/authMiddleware.js");

const messageRoutes = express.Router();

messageRoutes.route("/:chatId").get(protect, allMessages);
messageRoutes.route("/").post(protect, sendMessage);
messageRoutes.route("/UpdateMessagesRead").post(protect, UpdateMessagesRead);

module.exports = { messageRoutes };
