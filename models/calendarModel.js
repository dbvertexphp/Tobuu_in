const mongoose = require("mongoose");
const moment = require("moment-timezone");

const calendarSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assuming there is a User model to reference
    required: true,
  },
  date: {
    type: String,
    validate: {
      validator: function (value) {
        // Add your custom validation logic here
        return !(this.type === "Special" && !value);
      },
      message: "Date is required when the type is Special",
    },
    match: /^\d{2}-\d{2}-\d{4}$/, // Format validation (e.g., 15-02-2023)
    required: false,
  },
  time: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  datetime: {
      type: String,
      default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
},
});

const Calendar = mongoose.model("Calendar", calendarSchema);

module.exports = Calendar;
