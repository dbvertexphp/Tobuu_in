const express = require("express");
const {
      checkout,
      WebhookGet,
} = require("../controllers/transactionController.js");
const protect = require("../middleware/authMiddleware.js");

const transactionRoutes = express.Router();

transactionRoutes.route("/checkout").post(checkout);
transactionRoutes.route("/WebhookGet").post(WebhookGet);

module.exports = { transactionRoutes };
