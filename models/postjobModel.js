const mongoose = require("mongoose");
const moment = require("moment-timezone");

const jobSchema = mongoose.Schema(
      {
            user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            category_id: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "Category",
            },
            description: { type: String, maxlength: 2000 }, // Adjust the maxlength as needed
            job_status: { type: String, default: "Open" },
            datetime: {
                  type: String,
                  default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
            },
      }
);

const AppliedUserSchema = new mongoose.Schema(
      {
            user_ids: [
                  {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User", // Reference to the User model
                        required: true,
                  },
            ],
            job_id: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "PostJob", // Reference to the PostJob model
                  required: true,
            },
            datetime: {
                  type: String,
                  default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
            },
      },
);

const AppliedUser = mongoose.model("PostJobAppliedUser", AppliedUserSchema);
const PostJob = mongoose.model("PostJob", jobSchema);

module.exports = { PostJob, AppliedUser };
