const express = require("express");
const {
      accessChat,
      fetchChats,
      createGroupChat,
      removeFromGroup,
      addToGroup,
      renameGroup,
      blockUser,
      blockUserList,
} = require("../controllers/chatControllers.js");

const protect = require("../middleware/authMiddleware.js");

const chatRoutes = express.Router();

chatRoutes.route("/").post(protect, accessChat);
chatRoutes.route("/blockUserList").get(protect, blockUserList);
chatRoutes.route("/:limit").get(protect, fetchChats);
chatRoutes.route("/group").post(protect, createGroupChat);
chatRoutes.route("/blockUser").post(protect, blockUser);

chatRoutes.route("/rename").put(protect, renameGroup);
chatRoutes.route("/groupremove").put(protect, removeFromGroup);
chatRoutes.route("/groupadd").put(protect, addToGroup);

module.exports = { chatRoutes };
