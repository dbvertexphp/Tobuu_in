const mongoose = require("mongoose");
const moment = require("moment-timezone");

const chatModel = mongoose.Schema({
      chatName: { type: String, trim: true },
      isGroupChat: { type: Boolean, default: false },
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      latestMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
      },
      groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
      blockedUsers: [
            {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "User",
            },
      ],
      updatedAt: {
            type: String,
      },
});

const Chat = mongoose.model("Chat", chatModel);

module.exports = Chat;
