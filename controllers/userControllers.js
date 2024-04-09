const asyncHandler = require("express-async-handler");
const cookie = require("cookie");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const moment = require("moment-timezone");
const { generateToken, blacklistToken } = require("../config/generateToken.js");
const {
      User,
      NotificationMessages,
      AdminDashboard,
      WebNotification,
} = require("../models/userModel.js");
const { Reel, ReelLike, ReelComment } = require("../models/reelsModel.js");
const { Video, VideoLike, VideoComment } = require("../models/videoModel.js");
const { PostTimeline } = require("../models/posttimelineModel.js");
const { PostJob } = require("../models/postjobModel.js");
const Category = require("../models/categoryModel.js");
const Review = require("../models/reviewModel.js");
const BankDetails = require("../models/bankdetailsModel.js");
const Transaction = require("../models/transactionModel");
const {
      AdminNotificationMessages,
} = require("../models/adminnotificationsmodel.js");
const multer = require("multer");
const MyFriends = require("../models/myfrindsModel.js");
const { Hire, HireStatus } = require("../models/hireModel.js");
require("dotenv").config();
const baseURL = process.env.BASE_URL;
const { createNotification } = require("./notificationControllers.js");
const { PutObjectProfilePic, getSignedUrlS3 } = require("../config/aws-s3.js");
const dayjs = require("dayjs");

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

            // Convert dob to desired format using dayjs
            const formattedDOB = dayjs(user.dob).format("YYYY-MM-DD");

            const updatedUser = {
                  ...user._doc,
                  pic: user.pic,
                  watch_time: convertSecondsToReadableTime(user.watch_time),
                  dob: formattedDOB, // Update dob with formatted date
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
                        $or: [
                              { my_id: req.user._id, friends_id: user_id._id },
                              { my_id: user_id._id, friends_id: req.user._id },
                        ],
                  });

                  const isRequestPending = await MyFriends.exists({
                        my_id: user_id._id,
                        request_id: req.user._id,
                  });
                  const isRequestAccept = await MyFriends.exists({
                        my_id: req.user._id,
                        request_id: user_id._id,
                  });

                  // User ne post ko like kiya hai ya nahi, is par based Friend_status set karein
                  if (isFriend) {
                        Friend_status = "Yes";
                  } else if (isRequestPending) {
                        Friend_status = "Pending";
                  } else if (isRequestAccept) {
                        Friend_status = "Accept";
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

      const EmailExists = await User.findOne({ email });
      if (EmailExists) {
            res.status(200).json({
                  message: "User with this Email already exists.",
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
      const full_name = `${first_name} ${last_name}`;
      const user = await User.create({
            first_name,
            last_name,
            email,
            mobile,
            username,
            password,
            otp, // Add the OTP field
            dob,
            full_name,
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

      if (userdata.deleted_at !== null) {
            res.status(200).json({
                  message: "Admin has deactivated you please contact admin",
                  status: false,
            });
            return;
      }

      const isPasswordMatch = await userdata.matchPassword(password);

      if (!isPasswordMatch) {
            res.status(200).json({
                  message: "Invalid Password",
                  status: false,
            });
            return;
      }

      if (userdata.otp_verified === 0) {
            const otp = generateOTP();
            const type = "Signup";
            const first_name = userdata.first_name;
            TextLocalApi(type, first_name, mobile, otp);
            const result = await User.updateOne(
                  { _id: userdata._id },
                  { $set: { otp: otp } }
            );
            res.status(200).json({
                  message: "OTP Not verified",
                  status: true,
            });
            return;
      }

      if (isPasswordMatch) {
            const token = generateToken(userdata._id);

            // Set the token in a cookie for 30 days

            // if (!userdata?.IsAdmin || userdata.IsAdmin !== "true") {
            //       res.setHeader(
            //             "Set-Cookie",
            //             cookie.serialize("Websitetoken", token, {
            //                   httpOnly: false,
            //                   expires: new Date(
            //                         Date.now() + 60 * 60 * 24 * 10 * 1000
            //                   ), // 30 days
            //                   path: "/",
            //             })
            //       );
            // }

            const user = {
                  ...userdata._doc,
                  pic: userdata._doc.pic,
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

      try {
            const user = await User.findOne({ mobile });

            if (!user) {
                  return res.status(200).json({
                        message: "User Not Found.",
                        status: false,
                  });
            }

            if (user.otp_verified) {
                  return res.status(200).json({
                        message: "User is already OTP verified.",
                        status: false,
                  });
            }

            // Check if the provided OTP matches the OTP in the user document
            if (user.otp !== otp) {
                  return res.status(200).json({
                        message: "Invalid OTP.",
                        status: false,
                  });
            }

            // Update the user's otp_verified field to 1 (OTP verified)
            const result = await User.updateOne(
                  { _id: user._id },
                  { $set: { otp_verified: 1 } }
            );

            if (result.nModified > 0) {
                  console.log("OTP verification status updated successfully.");
            } else {
                  console.log(
                        "No matching user found or OTP verification status already set."
                  );
            }

            // Retrieve the updated user document
            const updatedUser = await User.findById(user._id);

            res.json({
                  user: updatedUser,
                  token: generateToken(updatedUser._id),
                  status: true,
            });
      } catch (error) {
            console.error("Error verifying OTP:", error.message);
            res.status(500).json({ error: error.message, status: false });
      }
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
      const result = await User.updateOne(
            { _id: user._id },
            { $set: { otp: newOTP } }
      );

      // Send the new OTP to the user (you can implement this logic)

      res.json({
            message: "New OTP sent successfully.",
            status: true,
      });
});
const ForgetresendOTP = asyncHandler(async (req, res) => {
      const { mobile } = req.body;

      const userdata = await User.findOne({ mobile: mobile });

      if (!userdata) {
            res.status(200).json({
                  message: "Mobile Number Not Found",
                  status: false,
            });
            return;
      }
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

      const result = await User.updateOne(
            { _id: user._id },
            { $set: { otp: newOTP } }
      );

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
      // Update the user's profile picture (if uploaded)
      user.pic = profilePicKeys;
      await user.save();
      const pic_name_url = await getSignedUrlS3(user.pic);
      return res.status(200).json({
            message: "Profile picture uploaded successfully",
            pic: pic_name_url,
            status: true,
      });
      return res.status(200).json({ message: "No file uploaded" });
});

const updateProfileData = asyncHandler(async (req, res) => {
      const { interest, about_me, last_name, first_name, dob, address } =
            req.body;

      const userId = req.user._id; // Assuming you have user authentication middleware

      try {
            // Update the user's profile fields if they are provided in the request
            const updatedUser = await User.findByIdAndUpdate(
                  userId,
                  {
                        $set: {
                              interest: interest,
                              about_me: about_me,
                              last_name: last_name,
                              first_name: first_name,
                              dob: dob ? new Date(dob) : undefined,
                              address: address,
                        },
                  },
                  { new: true }
            ); // Option to return the updated document

            if (!updatedUser) {
                  return res.status(404).json({ message: "User not found" });
            }

            return res.status(200).json({
                  _id: updatedUser._id,
                  interest: updatedUser.interest,
                  about_me: updatedUser.about_me,
                  address: updatedUser.address,
                  last_name: updatedUser.last_name,
                  first_name: updatedUser.first_name,
                  dob: updatedUser.dob,
                  pic: updatedUser.pic,
                  email: updatedUser.email,
                  mobile: updatedUser.mobile,
                  username: updatedUser.username,
                  status: true,
            });
      } catch (error) {
            console.error("Error updating user profile:", error.message);
            return res.status(500).json({ error: "Internal Server Error" });
      }
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

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      const result = await User.updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
      );

      // Save the updated user with the new password
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

const getBankDetailsAdmin = asyncHandler(async (req, res) => {
      const userId = req.body._id; // Assuming you have user authentication middleware

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
                        bankDetails,
                        status: true,
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
      const { page = 1, search = "", Short = "" } = req.body;
      const perPage = 10; // You can adjust this according to your requirements

      // Build the query based on search and Short
      const query = search
            ? {
                    $or: [
                          { first_name: { $regex: search, $options: "i" } },
                          { email: { $regex: search, $options: "i" } },
                          { last_name: { $regex: search, $options: "i" } },
                    ],
              }
            : {};

      // Sorting based on Short field
      let sortCriteria = {};
      if (Short === "Review") {
            sortCriteria = { review: -1 }; // Sort by review in descending order
      } else if (Short === "watch_time") {
            sortCriteria = { watch_time: -1 }; // Sort by watch_time in descending order
      } else if (Short === "Subscribe") {
            sortCriteria = { subscribe: -1 }; // Sort by subscribe in descending order
      } else {
            sortCriteria = { _id: -1 }; // Default sorting
      }

      try {
            const users = await User.find(query)
                  .sort(sortCriteria)
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

const getAllUsersWebsite = asyncHandler(async (req, res) => {
      const { page = 1, search = "" } = req.body;
      const perPage = 10; // You can adjust this according to your requirements

      // Build the query based on search
      let query = {};
      if (search) {
            query = {
                  $or: [
                        { first_name: { $regex: search, $options: "i" } },
                        { username: { $regex: search, $options: "i" } },
                        { last_name: { $regex: search, $options: "i" } },
                  ],
            };
      }

      try {
            if (req.user && req.user._id) {
                  // Only exclude req.user._id if it's available
                  query._id = { $ne: req.user._id };
            }

            const users = await User.find(query)
                  .select("_id first_name last_name username pic")
                  .skip((page - 1) * perPage)
                  .limit(perPage);

            const totalCount = await User.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            // Map each user to an array of promises
            const transformedUsersPromises = users.map(async (user) => {
                  let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object
                  if (transformedUser.pic) {
                        const getSignedUrl_pic = await getSignedUrlS3(
                              transformedUser.pic
                        );
                        transformedUser.pic = getSignedUrl_pic;
                  }
                  if (transformedUser.watch_time) {
                        transformedUser.watch_time =
                              convertSecondsToReadableTime(
                                    transformedUser.watch_time
                              );
                  }
                  return transformedUser;
            });

            // Execute all promises concurrently
            const transformedUsers = await Promise.all(
                  transformedUsersPromises
            );

            res.json({
                  data: transformedUsers,
                  page: page.toString(),
                  total_rows: totalCount,
                  status: true,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const searchUsers = asyncHandler(async (req, res) => {
      const { page = 1, name = "" } = req.body;
      const perPage = 15; // Adjust according to your requirements
      try {
            let query = {
                  $or: [
                        { full_name: { $regex: name, $options: "i" } },
                        { username: { $regex: name, $options: "i" } },
                  ],
            };

            // If name contains a space, search for the last name as well

            // Exclude the current user if req.user._id is available
            if (req.user && req.user._id) {
                  query._id = { $ne: req.user._id };
            }

            const users = await User.find(query)
                  .select("_id first_name last_name username")
                  .skip((page - 1) * perPage)
                  .limit(perPage);

            let transformedUsers = users.map((user) => ({
                  _id: user._id,
                  title: `${user.first_name} ${user.last_name}`,
                  label: "User List",
            }));

            const totalCount = await User.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            res.json({
                  data: transformedUsers,
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

const updateProfileDataByAdmin = asyncHandler(async (req, res) => {
      const { edit_mobile_name, userId } = req.body;

      try {
            // Update only the mobile number
            const updatedUser = await User.findOneAndUpdate(
                  { _id: userId },
                  { $set: { mobile: edit_mobile_name } },
                  { new: true } // Option to return the updated document
            );

            if (!updatedUser) {
                  return res.status(404).json({ message: "User not found" });
            }

            return res.status(200).json({
                  _id: updatedUser._id,
                  mobile: updatedUser.mobile,
                  status: true,
            });
      } catch (error) {
            console.error("Error updating mobile number:", error.message);
            return res.status(500).json({ error: "Internal Server Error" });
      }
});

const getAllDashboardCount = asyncHandler(async (req, res) => {
      try {
            const category = await Category.countDocuments(); // Assuming there is only one document
            const user = await User.countDocuments();
            const video = await Video.countDocuments();
            const reels = await Reel.countDocuments();
            const postTimeline = await PostTimeline.countDocuments();
            const postJob = await PostJob.countDocuments();
            const adminnotifications =
                  await AdminNotificationMessages.countDocuments({
                        readstatus: false,
                  }); // Counting only documents with readstatus false
            const transactionAmountSum = await Transaction.aggregate([
                  {
                        $group: {
                              _id: null,
                              totalAmount: { $sum: "$amount" }, // Summing the "amount" field
                        },
                  },
            ]);

            // Extracting the total sum of the "amount" field
            const transactionTotalAmount =
                  transactionAmountSum.length > 0
                        ? transactionAmountSum[0].totalAmount
                        : 0;

            res.status(200).json({
                  category: category,
                  user: user,
                  video: video,
                  reels: reels,
                  PostTimeline: postTimeline,
                  PostJob: postJob,
                  adminnotifications: adminnotifications,
                  transactionTotalAmount: transactionTotalAmount,
            });
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

            await User.updateOne(
                  { _id: review_id },
                  { $set: { review: user_reviewers.review } }
            );
            //await user_reviewers.save();

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

const getReview = asyncHandler(async (req, res) => {
      try {
            const user_id = req.params.id;
            const page = req.query.page || 1;
            const pageSize = 10;

            const notifications = await Review.find({
                  review_id: user_id,
            })
                  .sort({ datetime: -1 })
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
                              notification.my_id
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
                              review_number: notification.review_number,
                              description: notification.description,
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
                  reviews: notificationList,
            });
      } catch (error) {
            console.error("Error getting notification list:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
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
            const pageSize = 500;

            const notifications = await NotificationMessages.find({
                  receiver_id: user_id,
            })
                  .sort({ _id: -1 })
                  .skip((page - 1) * pageSize)
                  .limit(pageSize);

            if (!notifications || notifications.length === 0) {
                  return res
                        .status(200)
                        .json({ status: false, notifications: [] });
            }

            await Promise.all(
                  notifications.map(async (notification) => {
                        // Update readstatus to true for the current notification
                        await NotificationMessages.findByIdAndUpdate(
                              notification._id,
                              { readstatus: true }
                        );
                  })
            );

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
                              metadata: notification.metadata,
                              type: notification.type,
                              time: NotificationTimer(notification.datetime),
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

const getNotificationId = asyncHandler(async (req, res) => {
      try {
            const sender_id = req.body.sender_id;
            const type = req.body.type; // Assuming user_id is provided as a query parameter
            const receiver_id = req.user._id;

            const notifications = await NotificationMessages.findOne(
                  {
                        sender_id: sender_id,
                        receiver_id: receiver_id,
                        type: type, // Filtering by type 'Friend_Request'
                  },
                  "_id"
            ); // Only selecting the _id field

            res.status(200).json({
                  status: true,
                  notificetion_id: notifications,
            });
      } catch (error) {
            console.error("Error getting notifications:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
      }
});
const UserAdminStatus = asyncHandler(async (req, res) => {
      const userId = req.body.userId;
      try {
            // Find the video by its _id
            const user = await User.findById(userId);

            if (!user) {
                  return res.status(404).json({ message: "User not found" });
            }
            // Check if deleted_at field is null or has a value
            if (user.deleted_at === null) {
                  const updatedUser = await User.findByIdAndUpdate(
                        userId,
                        {
                              $set: {
                                    deleted_at: new Date(),
                              },
                        },
                        { new: true }
                  );
            } else {
                  const updatedUser = await User.findByIdAndUpdate(
                        userId,
                        {
                              $set: {
                                    deleted_at: null,
                              },
                        },
                        { new: true }
                  );
            }
            return res.status(200).json({
                  message: "User soft delete status toggled successfully",
            });
      } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal Server Error" });
      }
});

const getUnreadCount = async (req, res) => {
      try {
            const user_id = req.user._id;
            const unreadNotifications = await NotificationMessages.find({
                  receiver_id: user_id,
                  readstatus: false,
            });

            let unreadCount = unreadNotifications.length;
            if (unreadCount > 10) {
                  unreadCount = 10;
            } else if (unreadCount == 0) {
                  unreadCount = "";
            }

            return res.status(200).json({ status: true, Count: unreadCount });
      } catch (error) {
            console.error("Error getting unread count:", error.message);
            throw new Error("Error getting unread count");
      }
};

const NotificationTimer = (databaseTime) => {
      try {
            if (!databaseTime) {
                  return "Invalid time";
            }

            // Calculate current time in IST timezone
            const currentTime = moment().tz("Asia/Kolkata");

            // Parse the time strings using moment
            const databaseMoment = moment.tz(
                  databaseTime,
                  "DD-MM-YYYY HH:mm:ss",
                  "Asia/Kolkata"
            );

            // Calculate the difference between the two times
            const differenceInMilliseconds = currentTime.diff(databaseMoment);

            // Convert the difference to seconds, minutes, hours, and days
            const duration = moment.duration(differenceInMilliseconds);
            const seconds = duration.seconds();
            const minutes = duration.minutes();
            const hours = duration.hours();
            const days = duration.days();

            // Construct the time difference string
            let timeDifference = "";
            if (days > 0) {
                  timeDifference += `${days} days `;
            } else if (hours > 0) {
                  timeDifference += `${hours} hours `;
            } else if (minutes > 0) {
                  timeDifference += `${minutes} minutes `;
            } else if (seconds > 0) {
                  timeDifference += `${seconds} seconds`;
            }

            // Return the time difference string
            return timeDifference.trim() === ""
                  ? "Just now"
                  : timeDifference.trim();
      } catch (error) {
            console.error("Error calculating time difference:", error.message);
            return "Invalid time format";
      }
};

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
            return 0;
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
            } catch (error) {
                  console.error("error", error.message);
            }
      };

      sendSms();
}
const getProfilePicUploadUrlS3 = asyncHandler(async (req, res) => {
      const user_id = req.user._id;
      const user = await User.findById(user_id);
      const username = user.username;
      const profilepicget_url = await PutObjectProfilePic(username);

      return res.status(200).json({
            profilepicget_url,
            status: true,
      });
});

const updateUserWatchTime = async (req, res) => {
      const userId = req.user._id;
      const newTime = req.body.time; // Assuming the new time is passed in the request body

      try {
            // Find the user by user_id to get the current watch_time
            const user = await User.findById(userId);

            if (!user) {
                  return res.status(404).json({
                        message: "User not found",
                        status: false,
                  });
            }

            // Get the current watch_time from the user object
            let currentWatchTime = user.watch_time || 0;

            // Convert the current watch_time and new time to numbers and add them
            currentWatchTime = Number(currentWatchTime) + Number(newTime);

            // Update the watch_time field in the User table
            await User.findByIdAndUpdate(userId, {
                  watch_time: currentWatchTime,
            });

            return res.json({
                  message: "Watch time updated successfully",
                  status: true,
                  watch_time: currentWatchTime,
            });
      } catch (error) {
            console.error(error);
            return res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
};

const ManullyListUpdate = asyncHandler(async (req, res) => {
      try {
            // Sabhi users ko 0 subscribe karne ke liye 'subscribe' field ko update karo
            const result = await User.updateMany({}, { subscribe: 0 });

            // Success response
            res.json({ message: "Subscriptions updated successfully" });
      } catch (error) {
            // Error handling
            console.error("Error updating subscriptions:", error);
            res.status(500).json({ error: "Error updating subscriptions" });
      }
});

const UpdateMobileAdmin = asyncHandler(async (req, res) => {
      const { UserId, mobile } = req.body;
      const _id = UserId;
      // Find the user by mobile number
      const user = await User.findOne({ _id });
      const usermobile = await User.findOne({ mobile });

      if (usermobile) {
            res.status(200).json({
                  message: "Mobile number already exit.",
                  status: true,
            });
            return;
      }
      // Update the user's otp field with the new OTP
      const result = await User.updateOne(
            { _id: user._id },
            { $set: { mobile: mobile } }
      );

      // Send the new OTP to the user (you can implement this logic)

      res.json({
            message: "Mobile number successfully.",
            status: true,
      });
});

const updateAllUsersFullName = asyncHandler(async (req, res) => {
      try {
            // Find all users
            const users = await User.find({});

            // Update full name for each user
            for (const user of users) {
                  const fullName = `${user.first_name} ${user.last_name}`;
                  user.full_name = fullName;
                  await user.save({ fields: ["full_name"] }); // Only save full_name field
                  console.log(
                        `Updated full name for user ${user._id}: ${fullName}`
                  );
            }

            console.log("All users updated successfully");
      } catch (error) {
            console.error("Error updating users:", error);
      }
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
      getBankDetailsAdmin,
      websiteNotificationToken,
      NotificationList,
      ForgetresendOTP,
      getProfilePicUploadUrlS3,
      profilePicKey,
      getReview,
      getUnreadCount,
      updateProfileDataByAdmin,
      getNotificationId,
      searchUsers,
      getAllUsersWebsite,
      updateUserWatchTime,
      UserAdminStatus,
      ManullyListUpdate,
      UpdateMobileAdmin,
      updateAllUsersFullName,
};
