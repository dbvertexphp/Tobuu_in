const mongoose = require("mongoose");
const moment = require("moment-timezone");

const jobSchema = mongoose.Schema({
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      title: { type: String },
      category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
      },
      description: { type: String, maxlength: 2000 }, // Adjust the maxlength as needed
      job_status: { type: String, default: "Open" },
      status: { type: Number, default: 0 },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
      deleted_at: { type: Date, default: null },
});

const AppliedUserSchema = new mongoose.Schema({
      user_ids: [
            {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "User", // Reference to the User model
                  required: true,
            },
      ],
      category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
      },
      job_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PostJob", // Reference to the PostJob model
            required: true,
      },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

jobSchema.pre("save", function (next) {
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

const AppliedUser = mongoose.model("PostJobAppliedUser", AppliedUserSchema);
const PostJob = mongoose.model("PostJob", jobSchema);

module.exports = { PostJob, AppliedUser };
