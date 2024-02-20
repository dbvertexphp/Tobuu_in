const express = require("express");
const {
      checkout,
      WebhookGet,
      getAlltransactionList,
      getAllUserTransactions,
} = require("../controllers/transactionController.js");
const protect = require("../middleware/authMiddleware.js");

const transactionRoutes = express.Router();

transactionRoutes.route("/checkout").post(checkout);
transactionRoutes.route("/WebhookGet").post(WebhookGet);
transactionRoutes
      .route("/getAlltransactionList")
      .post(protect, getAlltransactionList);
      transactionRoutes
      .route("/getAllUserTransactions")
      .post(protect, getAllUserTransactions);

module.exports = { transactionRoutes };
