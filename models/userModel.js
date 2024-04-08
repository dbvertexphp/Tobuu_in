const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const format = require("date-fns");
const moment = require("moment-timezone");
const moments = require("moment");
const { getSignedUrlS3 } = require("../config/aws-s3.js");

const userSchema = mongoose.Schema({
      first_name: { type: String, required: true },
      last_name: { type: String, required: true },
      full_name: { type: String },
      email: {
            type: String,
            required: true,
            match: /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/,
      },
      mobile: { type: Number, unique: true },
      password: { type: String, required: true },
      username: { type: String, unique: true },
      otp: { type: String },
      otp_verified: { type: Number, default: 0 },
      review: { type: Number, default: 0 },
      watch_time: { type: Number, default: 0 },
      subscribe: { type: Number, default: 0 },
      interest: [{ type: String }],
      about_me: { type: String },
      Chat_Status: { type: String, default: "Offline" },
      address: { type: String },
      dob: { type: Date },
      pic: {
            type: String,
            required: true,
            default: "defult_profile/defult_pic.jpg",
      },
      deleted: { type: Boolean, default: false },
      deleted_at: { type: Date, default: null },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

userSchema.post(["find", "findOne"], async function (result) {
      if (result && result.pic && typeof result.pic === "string") {
            result.pic = await getSignedUrlS3(result.pic);
      }
});

const adminDashboardSchema = new mongoose.Schema({
      video_count: { type: Number, default: 0 },
      reels_count: { type: Number, default: 0 },
      post_count: { type: Number, default: 0 },
      user_count: { type: Number, default: 0 },
      job_count: { type: Number, default: 0 },
});

const websiteNotificationToken = mongoose.Schema({
      user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Assuming you have a User model, adjust the ref accordingly
            required: true,
      },
      token: { type: String, required: true },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

const NotificationMessage = mongoose.Schema({
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

userSchema.pre("save", async function (next) {
      if (!this.isModified("password")) {
            return next();
      }

      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
});
userSchema.methods.matchPassword = async function (enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
};
userSchema.set("toJSON", {
      transform: (doc, ret) => {
            delete ret.password;
      },
});

userSchema.statics.findById = function (userId) {
      return this.findOne({ _id: userId });
};

userSchema.pre("save", function (next) {
      // Capitalize the first letter of first_name
      if (this.isModified("first_name")) {
            this.first_name =
                  this.first_name.charAt(0).toUpperCase() +
                  this.first_name.slice(1);
      }
      // Capitalize the first letter of each interest
      if (this.isModified("interest")) {
            this.interest = this.interest.map(
                  (interest) =>
                        interest.charAt(0).toUpperCase() + interest.slice(1)
            );
      }
      // Capitalize the first letter of about_me
      if (this.isModified("about_me")) {
            this.about_me =
                  this.about_me.charAt(0).toUpperCase() +
                  this.about_me.slice(1);
      }
      // Capitalize the first letter of address
      if (this.isModified("address")) {
            this.address =
                  this.address.charAt(0).toUpperCase() + this.address.slice(1);
      }
      next();
});

const AdminDashboard = mongoose.model("AdminDashboard", adminDashboardSchema);
const User = mongoose.model("User", userSchema);
const WebNotification = mongoose.model(
      "WebsiteNotificationToken",
      websiteNotificationToken
);
const NotificationMessages = mongoose.model(
      "NotificationMessage",
      NotificationMessage
);

module.exports = {
      User,
      AdminDashboard,
      WebNotification,
      NotificationMessages,
};
