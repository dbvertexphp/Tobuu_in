const mongoose = require("mongoose");
const moment = require("moment-timezone");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    datetime: {
      type: String,
      default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
  },
  },
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message
