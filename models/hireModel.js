const mongoose = require("mongoose");
const moment = require("moment-timezone");

// Define hire_status schema
const hireStatusSchema = new mongoose.Schema({
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: mongoose.Types.ObjectId("5fb983a4373852218a5c7a01"), // Default status ID
      },
      payment_status: {
        type: String,
        required: true,
        unique: true,
      },
      status_code: {
        type: String,
        required: true,
        unique: true,
      },
    });
// Define hire schema
const hireSchema = new mongoose.Schema({
  calendar_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Calendar", // Assuming there is a Calendar model to reference
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assuming there is a User model to reference
    required: true,
  },
  hire_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assuming there is a User model to reference
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  work_status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HireStatus",
    default: mongoose.Types.ObjectId("5fb983a4373852218a5c7a01"), // Default status ID
  },
  datetime: {
    type: String,
    default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
  },
});

const HireStatus = mongoose.model("HireStatus", hireStatusSchema);
const Hire = mongoose.model("Hire", hireSchema);

module.exports = { Hire, HireStatus };
