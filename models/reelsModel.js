const mongoose = require("mongoose");
const moment = require("moment-timezone");

const reelSchema = mongoose.Schema({
      reel_name: { type: String, trim: true, required: true },
      title: { type: String },
      thumbnail_name: { type: String, trim: true, required: true },
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
      },
      comment_count: { type: Number, default: 0 },
      view_count: { type: Number, default: 0 },
      description: { type: String, maxlength: 2000 },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      }, // Adjust the maxlength as needed
});
const reelLikeSchema = mongoose.Schema({
      user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      reel_id: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },
      count: { type: Number, default: 0 },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});
const reelCommentSchema = mongoose.Schema({
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reel_id: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },
      comment: { type: String, required: true },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

reelSchema.set("toJSON", {
      transform: (doc, ret) => {
            const { reel_name, updatedAt, __v, ...response } = ret;
            return response;
      },
});

const ReelComment = mongoose.model("ReelComment", reelCommentSchema);
const ReelLike = mongoose.model("ReelLike", reelLikeSchema);
const Reel = mongoose.model("Reel", reelSchema);

module.exports = { Reel, ReelLike, ReelComment };
