const express = require("express");
const {
      SendFriendRequest,
      getMyFriends,
      AcceptFriendRequest,
      getMyFriendsrequests,
      getMyFriendsAdd,
} = require("../controllers/myfrindsController.js");
const protect = require("../middleware/authMiddleware.js");

const myfriendRoutes = express.Router();

myfriendRoutes.route("/Sendfriendrequest").post(protect, SendFriendRequest);
myfriendRoutes.route("/AcceptFriendRequest").post(protect, AcceptFriendRequest);
myfriendRoutes.route("/").post(protect, getMyFriends);
myfriendRoutes.route("/getMyFriendsAdd").post(protect, getMyFriendsAdd);
myfriendRoutes
      .route("/getMyFriendsrequests")
      .post(protect, getMyFriendsrequests);

module.exports = { myfriendRoutes };
