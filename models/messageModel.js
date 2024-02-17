const mongoose = require("mongoose");
const moment = require("moment-timezone");

const messageSchema = mongoose.Schema({
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      content: { type: String, trim: true },
      chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
      readBy: { type: Boolean, default: false },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

messageSchema.pre("save", function (next) {
      // Capitalize the first letter of description
      if (this.isModified("content")) {
            this.content =
                  this.content.charAt(0).toUpperCase() + this.content.slice(1);
      }
      next();
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
