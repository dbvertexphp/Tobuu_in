const mongoose = require("mongoose");

const AdminNotificationMessage = mongoose.Schema({
      sender_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      receiver_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      message: { type: String, required: true },
      readstatus: { type: Boolean, default: false },
      type: { type: String, required: true },
      datetime: {
            type: String,
            required: true,
      },
      metadata: { type: Object, default: null },
});

const AdminNotificationMessages = mongoose.model(
      "AdminNotificationMessage",
      AdminNotificationMessage
);

module.exports = {
      AdminNotificationMessages,
};
