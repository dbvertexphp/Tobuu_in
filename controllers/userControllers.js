const asyncHandler = require("express-async-handler");
const cookie = require("cookie");
const axios = require("axios");
const moment = require("moment-timezone");
const { generateToken, blacklistToken } = require("../config/generateToken.js");
const {
      User,
      NotificationMessages,
      AdminDashboard,
      WebNotification,
} = require("../models/userModel.js");
const Review = require("../models/reviewModel.js");
const BankDetails = require("../models/bankdetailsModel.js");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const MyFriends = require("../models/myfrindsModel.js");
const { Hire, HireStatus } = require("../models/hireModel.js");
require("dotenv").config();
const baseURL = process.env.BASE_URL;
const { createNotification } = require("./notificationControllers.js");
const { PutObjectProfilePic, getSignedUrlS3 } = require("../config/aws-s3.js");

const getUsers = asyncHandler(async (req, res) => {
      const userId = req.user._id;
      try {
            const user = await User.findById(userId);

            if (!user) {
                  return res.status(200).json({
                        message: "User Not Found",
                        status: false,
                  });
            }
            const updatedUser = {
                  ...user._doc,
                  pic: user.pic,
                  watch_time: convertSecondsToReadableTime(user.watch_time),
            };

            res.json({
                  user: updatedUser,
                  status: true,
            });
      } catch (error) {
            console.error("GetUsers API error:", error.message);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getUserView = asyncHandler(async (req, res) => {
      const user_id = req.params;

      try {
            // Fields jo query se exclude karna hai ko specify karein
            const excludedFields = [
                  "otp_verified",
                  "email",
                  "mobile",
                  "password",
                  "otp",
            ];

            // Exclude karne wale fields ke liye projection object banayein
            const projection = {};
            excludedFields.forEach((field) => {
                  projection[field] = 0;
            });

            // User ko user_id ke basis par find karein aur specified fields ko exclude karke select karein
            const user = await User.findById(user_id).select(projection);

            // Agar user nahi mila, toh User Not Found ka response bhejein
            if (!user) {
                  return res.status(200).json({
                        message: "User Not Found",
                        status: false,
                  });
            }

            // Friend_status ko "No" se set karein
            let Friend_status = "No";

            // Token header mein present hai ya nahi check karein
            const token = req.header("Authorization");
            if (token) {
                  // Check karein ki user ne current post ko like kiya hai ya nahi
                  const isFriend = await MyFriends.exists({
                        my_id: user_id._id,
                        friends_id: req.user._id,
                  });

                  const isRequestPending = await MyFriends.exists({
                        my_id: user_id._id,
                        request_id: req.user._id,
                  });
                  // User ne post ko like kiya hai ya nahi, is par based Friend_status set karein
                  if (isFriend) {
                        Friend_status = "Yes";
                  } else if (isRequestPending) {
                        Friend_status = "Pending";
                  }
            }

            // User ke pic field mein BASE_URL append karein
            const updatedUser = {
                  Friend_status,
                  ...user._doc,
                  pic: user.pic,
                  watch_time: convertSecondsToReadableTime(user.watch_time),
            };

            // Response mein updatedUser aur status ka json bhejein
            res.json({
                  user: updatedUser,
                  status: true,
            });
      } catch (error) {
            // Agar koi error aaye toh usko console mein log karein aur Internal Server Error ka response bhejein
            console.error("GetUsers API error:", error.message);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const registerUser = asyncHandler(async (req, res) => {
      const { first_name, last_name, email, mobile, username, password, dob } =
            req.body;
      if (
            !first_name ||
            !last_name ||
            !mobile ||
            !username ||
            !email ||
            !password
      ) {
            res.status(200).json({
                  message: "Please enter all the required fields.",
                  status: false,
            });
            return;
      }
      const mobileExists = await User.findOne({ mobile });
      if (mobileExists) {
            res.status(200).json({
                  message: "User with this mobile number already exists.",
                  status: false,
            });
            return;
      }

      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
            res.status(200).json({
                  message: "User with this username already exists.",
                  status: false,
            });
            return;
      }

      // Generate a 4-digit random OTP
      const otp = generateOTP();
      const type = "Signup";
      TextLocalApi(type, first_name, mobile, otp);
      const user = await User.create({
            first_name,
            last_name,
            email,
            mobile,
            username,
            password,
            otp, // Add the OTP field
            dob,
      });
      if (user) {
            // Increment reels_count in AdminDashboard
            try {
                  const adminDashboard = await AdminDashboard.findOne();
                  adminDashboard.user_count++;
                  await adminDashboard.save();
            } catch (error) {}
      }
      const getSignedUrl_pic = await getSignedUrlS3(user.pic);
      if (user) {
            res.status(201).json({
                  _id: user._id,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  mobile: user.mobile,
                  username: user.username,
                  isAdmin: user.isAdmin,
                  pic: getSignedUrl_pic,
                  otp_verified: user.otp_verified,
                  token: generateToken(user._id),
                  status: true,
            });
      } else {
            res.status(200).json({
                  message: "User registration failed.",
                  status: false,
            });
            return;
      }
});

const authUser = asyncHandler(async (req, res) => {
      const { mobile, password } = req.body;
      const userdata = await User.findOne({ mobile: mobile });

      if (!userdata) {
            res.status(200).json({
                  message: "User Not Found",
                  status: false,
            });
            return;
      }

      if (userdata.otp_verified === 0) {
            res.status(200).json({
                  message: "OTP Not verified",
                  status: false,
            });
            return;
      }

      const isPasswordMatch = await userdata.matchPassword(password);

      if (isPasswordMatch) {
            const token = generateToken(userdata._id);

            // Set the token in a cookie for 30 days
            res.setHeader(
                  "Set-Cookie",
                  cookie.serialize("Websitetoken", token, {
                        httpOnly: false,
                        expires: new Date(
                              Date.now() + 60 * 60 * 24 * 10 * 1000
                        ), // 30 days
                        path: "/",
                  })
            );

            const user = {
                  ...userdata._doc,
                  pic: process.env.BASE_URL + userdata._doc.pic,
            };

            res.json({
                  user,
                  token,
                  status: true,
            });
      } else {
            res.status(200).json({
                  message: "Invalid Password",
                  status: false,
            });
      }
});

const logoutUser = asyncHandler(async (req, res) => {
      const authHeader = req.headers.authorization;

      if (authHeader) {
            const token = authHeader.split(" ")[1]; // Extract token from "Bearer {token}"

            blacklistToken(token);

            // Expire the cookie immediately
            res.setHeader(
                  "Set-Cookie",
                  cookie.serialize("Websitetoken", "", {
                        httpOnly: false,
                        expires: new Date(0),
                        path: "/",
                  })
            );

            res.json({ message: "Logout successful", status: true });
      } else {
            res.status(200).json({ message: "Invalid token", status: false });
      }
});

const verifyOtp = asyncHandler(async (req, res) => {
      const { mobile, otp } = req.body;

      const user = await User.findOne({ mobile });

      if (!user) {
            res.status(200).json({
                  message: "User Not Found.",
                  status: false,
            });
            return;
      }

      if (user.otp_verified) {
            res.status(200).json({
                  message: "User is already OTP verified.",
                  status: false,
            });
            return;
      }

      // Check if the provided OTP matches the OTP in the user document
      if (user.otp !== otp) {
            res.status(200).json({
                  message: "Invalid OTP.",
                  status: false,
            });
            return;
      }

      // Update the user's otp_verified field to 1 (OTP verified)
      user.otp_verified = 1;
      await user.save();

      res.json({
            user,
            token: generateToken(user._id),
            status: true,
      });
});

const resendOTP = asyncHandler(async (req, res) => {
      const { mobile } = req.body;

      // Generate a new OTP
      const newOTP = generateOTP();

      // Find the user by mobile number
      const user = await User.findOne({ mobile });

      const type = "Resend";
      TextLocalApi(type, user.first_name, mobile, newOTP);
      if (!user) {
            res.status(200).json({
                  message: "User Not Found.",
                  status: false,
            });
            return;
      }

      // Update the user's otp field with the new OTP
      user.otp = newOTP;
      //user.otp_verified = 0; // Reset otp_verified status
      await user.save();

      // Send the new OTP to the user (you can implement this logic)

      res.json({
            message: "New OTP sent successfully.",
            status: true,
      });
});
const ForgetresendOTP = asyncHandler(async (req, res) => {
      const { mobile } = req.body;

      // Generate a new OTP
      const newOTP = generateOTP();

      // Find the user by mobile number
      const user = await User.findOne({ mobile });

      const type = "Forget_Password";
      TextLocalApi(type, user.first_name, mobile, newOTP);
      if (!user) {
            res.status(200).json({
                  message: "User Not Found.",
                  status: false,
            });
            return;
      }

      // Update the user's otp field with the new OTP
      user.otp = newOTP;
      //user.otp_verified = 0; // Reset otp_verified status
      await user.save();

      // Send the new OTP to the user (you can implement this logic)

      res.json({
            message: "New OTP sent successfully.",
            status: true,
      });
});

// Set up multer storage and file filter
const storage = multer.diskStorage({
      destination: function (req, file, cb) {
            cb(null, "uploads/profiles"); // Specify the directory where uploaded files will be stored
      },
      filename: function (req, file, cb) {
            cb(null, Date.now() + "-" + file.originalname); // Define the filename for the uploaded file
      },
});

const upload = multer({ storage: storage });

const profilePicUpload = asyncHandler(async (req, res) => {
      upload.single("profilePic")(req, res, async (err) => {
            if (err) {
                  // Handle file upload error
                  return res
                        .status(200)
                        .json({ message: "File upload error", error: err });
            }

            const userId = req.user._id; // Assuming you have user authentication middleware

            // Check if the user exists
            const user = await User.findById(userId);

            if (!user) {
                  return res.status(200).json({ message: "User not found" });
            }
            const pic_name_url = await getSignedUrlS3(user.pic);
            // Update the user's profile picture (if uploaded)
            if (req.file) {
                  const uploadedFileName = req.file.filename;
                  user.pic = "uploads/profiles/" + uploadedFileName;
                  await user.save();

                  return res.status(200).json({
                        message: "Profile picture uploaded successfully",
                        pic: pic_name_url,
                        status: true,
                  });
            }

            return res.status(200).json({ message: "No file uploaded" });
      });
});
const profilePicKey = asyncHandler(async (req, res) => {
      const userId = req.user._id; // Assuming you have user authentication middleware
      const profilePicKeys = req.body.profilePicKey;
      // Check if the user exists
      const user = await User.findById(userId);

      if (!user) {
            return res.status(200).json({ message: "User not found" });
      }
      console.log(profilePicKeys);
      // Update the user's profile picture (if uploaded)
      user.pic = profilePicKeys;
      await user.save();
      return res.status(200).json({
            message: "Profile picture uploaded successfully",
            pic: user.pic,
            status: true,
      });
      return res.status(200).json({ message: "No file uploaded" });
});

const updateProfileData = asyncHandler(async (req, res) => {
      const { interest, about_me, last_name, first_name, dob, address } =
            req.body;
      const userId = req.user._id; // Assuming you have user authentication middleware

      // Check if the user exists
      const user = await User.findById(userId);

      if (!user) {
            return res.status(200).json({ message: "User not found" });
      }

      // Update the user's profile fields if they are provided in the request
      if (interest !== undefined) {
            user.interest = interest;
      }
      if (about_me !== undefined) {
            user.about_me = about_me;
      }
      if (last_name !== undefined) {
            user.last_name = last_name;
      }
      if (first_name !== undefined) {
            user.first_name = first_name;
      }
      if (dob !== undefined) {
            user.dob = new Date(dob);
      }
      if (address !== undefined) {
            user.address = address;
      }

      // Save the updated user profile
      const updatedUser = await user.save();

      return res.status(200).json({
            _id: updatedUser._id,
            interest: updatedUser.interest,
            about_me: updatedUser.about_me,
            address: updatedUser.address,
            last_name: updatedUser.last_name,
            first_name: updatedUser.first_name,
            dob: updatedUser.dob,
            pic: updatedUser.pic,
            email: user.email,
            mobile: user.mobile,
            username: user.username,
            status: true,
      });
});

const forgetPassword = asyncHandler(async (req, res) => {
      const { newPassword, mobile, otp } = req.body;

      if (!newPassword || !mobile || !otp) {
            res.status(200).json({
                  message: "Please enter all the required fields.",
                  status: false,
            });
            return;
      }

      // Find the user by _id
      const user = await User.findOne({ mobile });

      if (!user) {
            res.status(200).json({
                  message: "User Not Found.",
                  status: false,
            });
            return;
      }
      if (user.otp !== otp) {
            res.status(200).json({
                  message: "Invalid OTP.",
                  status: false,
            });
            return;
      }

      user.password = newPassword;

      // Save the updated user with the new password
      await user.save();

      res.json({
            message: "Password reset successfully.",
            status: true,
      });
});

const ChangePassword = asyncHandler(async (req, res) => {
      const { newPassword } = req.body;
      const userId = req.user._id; // Assuming you have user authentication middleware

      // Find the user by _id
      const user = await User.findById(userId);

      if (!user) {
            res.status(200).json({
                  message: "User Not Found.",
                  status: false,
            });
            return;
      }

      user.password = newPassword;

      // Save the updated user with the new password
      await user.save();

      res.json({
            message: "Password Change successfully.",
            status: true,
      });
});

const bank_Detail_create = asyncHandler(async (req, res) => {
      const { name, bankName, accountNumber, ifscCode, branchName } = req.body;
      const userId = req.user._id; // Assuming you have user authentication middleware

      try {
            // Create bank details
            const bankDetails = await BankDetails.create({
                  name,
                  bankName,
                  accountNumber,
                  ifscCode,
                  branchName,
                  userId,
            });
            res.status(201).json({
                  bankDetails,
                  status: true,
            });
      } catch (error) {
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getBankDetails = asyncHandler(async (req, res) => {
      const userId = req.user._id; // Assuming you have user authentication middleware

      try {
            // Find bank details for the given user ID
            const bankDetails = await BankDetails.findOne({ userId });

            if (bankDetails) {
                  res.status(200).json({
                        bankDetails,
                        status: true,
                  });
            } else {
                  res.status(200).json({
                        message: "Bank details not found for the user",
                        status: false,
                  });
            }
      } catch (error) {
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getAllUsers = asyncHandler(async (req, res) => {
      const { page = 1, search = "" } = req.body;
      const perPage = 10; // You can adjust this according to your requirements

      // Build the query based on search
      const query = search
            ? {
                    $or: [
                          { first_name: { $regex: search, $options: "i" } },
                          { email: { $regex: search, $options: "i" } },
                          { last_name: { $regex: search, $options: "i" } },
                    ],
              }
            : {};

      try {
            const users = await User.find(query)
                  .skip((page - 1) * perPage)
                  .limit(perPage);

            const totalCount = await User.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            const transformedUsers = users.map((user) => {
                  let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object
                  if (transformedUser.pic) {
                        transformedUser.pic = `${baseURL}${transformedUser.pic}`;
                  }
                  if (transformedUser.watch_time) {
                        transformedUser.watch_time =
                              convertSecondsToReadableTime(
                                    transformedUser.watch_time
                              );
                  }
                  return { user: transformedUser };
            });

            const paginationDetails = {
                  current_page: parseInt(page),
                  data: transformedUsers,
                  first_page_url: `${baseURL}api/users?page=1`,
                  from: (page - 1) * perPage + 1,
                  last_page: totalPages,
                  last_page_url: `${baseURL}api/users?page=${totalPages}`,
                  links: [
                        {
                              url: null,
                              label: "&laquo; Previous",
                              active: false,
                        },
                        {
                              url: `${baseURL}api/users?page=${page}`,
                              label: page.toString(),
                              active: true,
                        },
                        {
                              url: null,
                              label: "Next &raquo;",
                              active: false,
                        },
                  ],
                  next_page_url: null,
                  path: `${baseURL}api/users`,
                  per_page: perPage,
                  prev_page_url: null,
                  to: (page - 1) * perPage + transformedUsers.length,
                  total: totalCount,
            };

            res.json({
                  Users: paginationDetails,
                  page: page.toString(),
                  total_rows: totalCount,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getAllDashboardCount = asyncHandler(async (req, res) => {
      try {
            const dashboardCounts = await AdminDashboard.findOne(); // Assuming there is only one document
            res.status(200).json({ counts: dashboardCounts });
      } catch (error) {
            console.error("Error getting dashboard counts:", error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const addReview = asyncHandler(async (req, res) => {
      const my_id = req.user._id;
      const { review_id, review_number, description, hire_list_id } = req.body;

      try {
            // Check if the user exists
            const user = await User.findOne({ _id: my_id });
            const user_reviewers = await User.findOne({ _id: review_id });

            if (!user) {
                  return res.status(400).json({
                        status: false,
                        message: "User not found.",
                  });
            }

            // Find the corresponding Hire entry based on hire_list_id
            const hireEntry = await Hire.findOne({ _id: hire_list_id });

            if (!hireEntry) {
                  return res.status(400).json({
                        status: false,
                        message: "Hire entry not found.",
                  });
            }

            // Find the corresponding HireStatus entry based on status_code "3"
            const hireStatus = await HireStatus.findOne({ status_code: "3" });

            if (!hireStatus) {
                  return res.status(400).json({
                        status: false,
                        message: "Hire status not found for code 3.",
                  });
            }

            // Update the work_status of the Hire entry to the found _id
            hireEntry.work_status = hireStatus._id;

            // Save the updated Hire entry
            await hireEntry.save();

            // If review_id is not provided, create a new review
            const review = await Review.create({
                  review_id,
                  review_number,
                  description,
                  my_id,
                  hire_list_id,
            });

            // Fetch all reviews for the current user
            const userReviews = await Review.find({ review_id });

            // Calculate the average review
            const totalReviews = userReviews.length;
            const sumOfReviews = userReviews.reduce(
                  (acc, review) => acc + review.review_number,
                  0
            );
            const averageReview = sumOfReviews / totalReviews;

            // Round to one decimal place
            const roundedAverage = averageReview.toFixed(1);

            // Update the user's review_name field with the rounded average
            user_reviewers.review = roundedAverage;
            await user_reviewers.save();

            type = "Review";
            message = `Completed Review.`;
            sender_id = my_id;
            receiver_id = review_id;
            createNotification(sender_id, receiver_id, message, type);

            res.status(200).json({
                  status: true,
                  message: "Review created/updated successfully.",
            });
      } catch (error) {
            console.error("Error creating/updating review:", error);
            res.status(500).json({
                  success: false,
                  message: "Internal Server Error",
            });
      }
});

const Watch_time_update = asyncHandler(async (req, res) => {
      try {
            const { time } = req.body;
            const userId = req.user._id;

            if (!userId) {
                  return res.status(400).json({
                        message: "User ID not provided in headers",
                  });
            }

            const user = await User.findById(userId);

            if (!user) {
                  return res.status(404).json({
                        message: "User not found",
                  });
            }

            // Incoming time ko seconds mein convert kare
            const incomingTimeInSeconds = calculateTimeInSecondsFromInput(time);

            // Update watch_time field in the user model
            user.watch_time += incomingTimeInSeconds;

            // Save the updated user
            await user.save();

            return res.json({
                  message: "Watch time updated successfully",
                  updatedUser: user,
            });
      } catch (error) {
            console.error("Watch_time_update API error:", error.message);
            return res.status(500).json({
                  message: "Internal Server Error",
            });
      }
});

const websiteNotificationToken = asyncHandler(async (req, res) => {
      try {
            const { token } = req.body;
            const user_id = req.user._id;

            // Check if user_id and token are provided
            if (!user_id || !token) {
                  return res
                        .status(400)
                        .json({ error: "Both user_id and token are required" });
            }

            // Check if the entry with the given user_id exists
            let existingNotification = await WebNotification.findOne({
                  user_id,
            });

            if (existingNotification) {
                  // Update the existing entry
                  existingNotification.token = token;
                  await existingNotification.save();

                  return res.status(200).json(existingNotification);
            }

            // Create a new entry
            const newNotification = await WebNotification.create({
                  user_id,
                  token,
            });

            return res.status(201).json(newNotification);
      } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal Server Error" });
      }
});

const NotificationList = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            const page = req.query.page || 1;
            const pageSize = 10;

            const notifications = await NotificationMessages.find({
                  receiver_id: user_id,
            })
                  .sort({ createdAt: -1 })
                  .skip((page - 1) * pageSize)
                  .limit(pageSize);

            if (!notifications || notifications.length === 0) {
                  return res
                        .status(200)
                        .json({ status: false, notifications: [] });
            }

            const notificationList = await Promise.all(
                  notifications.map(async (notification) => {
                        const senderDetails = await User.findById(
                              notification.sender_id
                        );

                        const sender = {
                              _id: senderDetails._id,
                              first_name: senderDetails.first_name,
                              last_name: senderDetails.last_name,
                              pic: `${senderDetails.pic}`,
                        };

                        const notificationWithSender = {
                              _id: notification._id,
                              sender,
                              message: notification.message,
                              type: notification.type,
                              time: calculateTimeDifference(
                                    notification.datetime
                              ),
                              date: notification.datetime.split(" ")[0],
                        };

                        return notificationWithSender;
                  })
            );

            res.status(200).json({
                  status: true,
                  notifications: notificationList,
            });
      } catch (error) {
            console.error("Error getting notification list:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
      }
});

const calculateTimeDifference = (datetime) => {
      try {
            // Check if datetime is undefined or null
            if (!datetime) {
                  return "Invalid date";
            }

            const currentTime = moment().tz("Asia/Kolkata"); // Get current time in Asia/Kolkata timezone
            const notificationTime = moment(datetime, "DD-MM-YYYY HH:mm:ss").tz(
                  "Asia/Kolkata"
            );

            return notificationTime.from(currentTime); // Use from() instead of fromNow()
      } catch (error) {
            console.error("Error calculating time difference:", error.message);
            return "Invalid date format";
      }
};

function convertSecondsToReadableTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0 && minutes > 0) {
            return `${hours} hr`;
      } else if (hours > 0) {
            return `${hours} hr`;
      } else if (minutes > 0) {
            return `${minutes} min`;
      } else {
            return "";
      }
}

function calculateTimeInSecondsFromInput(time) {
      // Convert incoming time to seconds
      const timeLower = time.toLowerCase();
      if (timeLower.includes("sec")) {
            // Extract seconds
            return parseInt(timeLower);
      } else if (timeLower.includes("min")) {
            // Extract minutes and convert to seconds
            return parseInt(timeLower) * 60;
      } else if (timeLower.includes("hr")) {
            // Extract hours and convert to seconds
            return parseInt(timeLower) * 60 * 60;
      } else if (timeLower.includes("day")) {
            // Extract days and convert to seconds
            return parseInt(timeLower) * 24 * 60 * 60;
      } else {
            return 0;
      }
}

function generateOTP() {
      const min = 1000; // Minimum 4-digit number
      const max = 9999; // Maximum 4-digit number

      // Generate a random number between min and max (inclusive)
      const otp = Math.floor(Math.random() * (max - min + 1)) + min;

      return otp.toString(); // Convert the number to a string
}

function TextLocalApi(type, name, mobile, otp) {
      let message;

      if (type === "Signup") {
            message = `Hello ${name}, welcome to Tobuu! Your OTP for account verification is: ${otp}. Enter this code to complete the process`;
      } else if (type === "Resend") {
            message = `Hello ${name}, your Tobuu account OTP is ${otp}. If you requested this resend, please use the following code to verify your account. If not, please ignore this message`;
      } else if (type === "Forget_Password") {
            message = `Hello ${name}, your Tobuu account verification code for password change is ${otp}. If you didn't request this, please ignore this message. If yes, use the code to change your password securely.`;
      }

      const apiKey = process.env.TEXTLOCAL_API;
      const sender = process.env.TEXTLOCAL_HEADER;
      const number = mobile;

      const url = `http://api.textlocal.in/send/?apiKey=${apiKey}&sender=${sender}&numbers=${number}&message=${encodeURIComponent(
            message
      )}`;

      const sendSms = async () => {
            try {
                  const response = await axios.post(url);
                  // console.log("response", response.data);
            } catch (error) {
                  //console.error("error", error.message);
            }
      };

      sendSms();
}
const getProfilePicUploadUrlS3 = asyncHandler(async (req, res) => {
      const user_id = req.user._id;
      const user = await User.findById(user_id);
      const username = user.username;
      const Profilepicget_url = await PutObjectProfilePic(username);

      return res.status(400).json({
            Profilepicget_url,
            status: false,
      });
});

module.exports = {
      getUsers,
      registerUser,
      authUser,
      verifyOtp,
      resendOTP,
      updateProfileData,
      forgetPassword,
      ChangePassword,
      profilePicUpload,
      logoutUser,
      bank_Detail_create,
      getAllUsers,
      getAllDashboardCount,
      addReview,
      Watch_time_update,
      getUserView,
      getBankDetails,
      websiteNotificationToken,
      NotificationList,
      ForgetresendOTP,
      getProfilePicUploadUrlS3,
      profilePicKey,
};
