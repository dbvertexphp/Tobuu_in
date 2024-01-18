const express = require("express");
const { allMessages, sendMessage } = require("../controllers/messageControllers.js");
const  protect  = require("../middleware/authMiddleware.js");


const messageRoutes = express.Router();

messageRoutes.route("/:chatId").get(protect, allMessages);
messageRoutes.route("/").post(protect, sendMessage);

module.exports = { messageRoutes };
