const mongoose = require("mongoose");
const moment = require("moment-timezone");

const videoSchema = mongoose.Schema({
      video_name: { type: String, trim: true, required: true },
      title: { type: String },
      thumbnail_name: { type: String, trim: true, required: true },
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
      comment_count: { type: Number, default: 0 },
      view_count: { type: Number, default: 0 },
      description: { type: String, maxlength: 2000 },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
      deleted_at: { type: Date, default: null },
});

videoSchema.pre("save", function (next) {
      // Capitalize the first letter of title
      if (this.isModified("title")) {
            this.title =
                  this.title.charAt(0).toUpperCase() + this.title.slice(1);
      }
      // Capitalize the first letter of description
      if (this.isModified("description")) {
            this.description =
                  this.description.charAt(0).toUpperCase() +
                  this.description.slice(1);
      }
      next();
});

const videoLikeSchema = mongoose.Schema({
      user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      video_id: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
      count: { type: Number, default: 0 },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

const videoCommentSchema = mongoose.Schema({
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      video_id: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
      comment: { type: String, required: true },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

videoSchema.set("toJSON", {
      transform: (doc, ret) => {
            const { video_name, updatedAt, __v, ...response } = ret;
            return response;
      },
});

const VideoComment = mongoose.model("VideoComment", videoCommentSchema);
const VideoLike = mongoose.model("VideoLike", videoLikeSchema);
const Video = mongoose.model("Video", videoSchema);

module.exports = { Video, VideoLike, VideoComment };
