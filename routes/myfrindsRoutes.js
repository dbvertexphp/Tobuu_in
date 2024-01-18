const express = require("express");
const {
      SendFriendRequest,
      getMyFriends,
      AcceptFriendRequest,
      getMyFriendsrequests
} = require("../controllers/myfrindsController.js");
const protect = require("../middleware/authMiddleware.js");

const myfriendRoutes = express.Router();

myfriendRoutes.route("/Sendfriendrequest").post(protect, SendFriendRequest);
myfriendRoutes.route("/AcceptFriendRequest").post(protect, AcceptFriendRequest);
myfriendRoutes.route("/").get(protect, getMyFriends);
myfriendRoutes.route("/getMyFriendsrequests").get(protect, getMyFriendsrequests);

module.exports = { myfriendRoutes };
