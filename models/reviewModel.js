const mongoose = require("mongoose");
const moment = require("moment-timezone");
const ReviewSchema = new mongoose.Schema({
      my_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      review_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      hire_list_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hire", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      description: {
            type: String,
            required: true,
      },
      review_number: {
            type: Number,
            default: 0,
      },

      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

const Review = mongoose.model("Review", ReviewSchema);

module.exports = Review;
