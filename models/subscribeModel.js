const mongoose = require("mongoose");
const moment = require("moment-timezone");
const subscribeSchema = new mongoose.Schema({
      my_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      subscriber_id: [
            {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "User", // Assuming you have a User model, adjust the ref accordingly
                  required: true,
            },
      ],
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

const Subscribes = mongoose.model("Subscribe", subscribeSchema);

module.exports = Subscribes;
