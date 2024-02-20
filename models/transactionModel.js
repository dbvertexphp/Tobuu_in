const mongoose = require("mongoose");
const moment = require("moment-timezone");
const transactionSchema = new mongoose.Schema({
      payment_id: {
            type: String,
            required: true,
      },
      order_id: {
            type: String,
            required: true,
      },
      amount: {
            type: Number,
            required: true,
      },
      payment_method: {
            type: String,
            required: true,
      },
      payment_status: {
            type: String,
            required: true,
      },
      payment_check_status: {
            type: String,
            required: true,
      },
      user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      hire_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      calendar_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Calendar", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },

      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
