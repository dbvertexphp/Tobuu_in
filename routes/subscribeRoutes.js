const express = require("express");
const {
      SubscribeRequest,
      getSubscribes,
      UnsubscribeRequest,
      getSubscriptionRequest
} = require("../controllers/subscribeControllers.js");
const protect = require("../middleware/authMiddleware.js");

const subscribeRoutes = express.Router();

subscribeRoutes.route("/SubscribeRequest").post(protect, SubscribeRequest);
subscribeRoutes.route("/UnSubscribeRequest").post(protect, UnsubscribeRequest);
subscribeRoutes.route("/").get(protect, getSubscribes);
subscribeRoutes.route("/getSubscriptionRequest").get(protect, getSubscriptionRequest);

module.exports = { subscribeRoutes };
