const express = require("express");
const {
      CreatePaymentUrl,
      WebhookGet,
} = require("../controllers/transactionController.js");
const protect = require("../middleware/authMiddleware.js");

const transactionRoutes = express.Router();

transactionRoutes.route("/createPaymentUrl").get(protect, CreatePaymentUrl);
transactionRoutes.route("/WebhookGet").post(protect, WebhookGet);

module.exports = { transactionRoutes };
