const mongoose = require("mongoose");
const moment = require("moment-timezone");
const myFriendsSchema = new mongoose.Schema({
      my_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      friends_id: [
            {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "User", // Assuming you have a User model, adjust the ref accordingly
                  required: true,
            },
      ],
      request_id: [
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

const MyFriends = mongoose.model("MyFriends", myFriendsSchema);

module.exports = MyFriends;
