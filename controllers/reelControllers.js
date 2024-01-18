const dotenv = require("dotenv");
const fs = require("fs");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const { Reel, ReelLike, ReelComment } = require("../models/reelsModel.js");
const Subscribes = require("../models/subscribeModel.js");
const multer = require("multer");
const path = require("path");
const { AdminDashboard } = require("../models/userModel.js");
require("dotenv").config();

const reel_names_path = [];
const thumbnail_names_path = [];

const storage = multer.diskStorage({
      destination: (req, file, cb) => {
            const userId = req.user._id;
            const uploadPath = `public/reels/${userId}`;

            // Check if the directory exists, create it if not
            if (!fs.existsSync(uploadPath)) {
                  fs.mkdirSync(uploadPath, { recursive: true });
            }

            cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const uniqueSuffix =
                  Date.now() + "-" + Math.round(Math.random() * 1e9);
            const fileName = file.fieldname + "-" + uniqueSuffix + ext;

            if (file.fieldname === "reel") {
                  reel_names_path[0] = fileName;
            } else if (file.fieldname === "thumbnail") {
                  thumbnail_names_path[0] = fileName;
            }

            cb(null, fileName);
      },
});

const upload = multer({ storage: storage });

const uploadReel = asyncHandler(async (req, res) => {
      // upload.fields([
      //       { name: "reel", maxCount: 1 },
      //       { name: "thumbnail", maxCount: 1 },
      // ])(req, res, async (err) => {
      //       if (err) {
      //             return res.status(400).json({
      //                   message: "Error uploading file.",
      //                   status: false,
      //             });
      //       }

      const { category_id, description, title } = req.body;
      const user_id = req.user._id;

      if (!category_id || !description || !title) {
            return res.status(400).json({
                  message: "Please enter all the required fields.",
                  status: false,
            });
      }

      const reelPath = reel_names_path[0];
      const thumbnailPath = thumbnail_names_path[0];

      const reel = await Reel.create({
            //reel_name: `${user_id}/${reelPath}`,
            category_id,
            title,
            //thumbnail_name: `${user_id}/${thumbnailPath}`,
            description,
            user_id,
            //filePath: req.files["reel"][0].path, // Assuming 'reel' is the name of your reel field
      });

      if (reel) {
            // Increment reels_count in AdminDashboard
            try {
                  const adminDashboard = await AdminDashboard.findOne();
                  adminDashboard.reels_count++;
                  await adminDashboard.save();
            } catch (error) {
                  console.error("Error incrementing reels count:", error);
            }
      }

      if (reel) {
            res.status(201).json({
                  _id: reel._id,
                  reel_name: reel.reel_name,
                  category_id: reel.category_id,
                  title: reel.title,
                  thumbnail_name: reel.thumbnail_name,
                  description: reel.description,
                  user_id: reel.user_id,
                  status: true,
            });
      } else {
            res.status(200).json({
                  message: "Reel Not Uploaded.",
                  status: false,
            });
      }
});
//});

const getReelLikeCount = async (reel_id) => {
      try {
            const reelLike = await ReelLike.findOne(
                  { reel_id: reel_id },
                  { count: 1, _id: 0 }
            );
            return reelLike ? reelLike.count : 0;
      } catch (error) {
            throw new Error("Error fetching Reel like count");
      }
};

const getPaginatedReel = asyncHandler(async (req, res) => {
      const page = parseInt(req.params.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;

      try {
            // Use Mongoose to fetch paginated Reels from the database
            const paginatedReels = await Reel.find()
                  .skip(startIndex)
                  .limit(limit)
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name", // Adjust this field based on your Category schema
                  });

            const totalReels = await Reel.countDocuments();
            const hasMore = startIndex + paginatedReels.length < totalReels;

            if (paginatedReels.length === 0) {
                  return res.json({
                        message: "Reels Not Found",
                        status: true,
                  });
            }

            // Transform and exclude specific fields in the response
            const transformedReels = [];

            const token = req.header("Authorization");

            for (const reel of paginatedReels) {
                  const { reel_name, updatedAt, __v, ...response } = reel._doc;

                  let like_status = "No";
                  let subscribe_status = "No";
                  let like_count = 0;

                  // Get the like count for each reel
                  const reelLikeCount = await ReelLike.find({
                        reel_id: reel._id,
                  });

                  for (const reelLikeCountUpdate of reelLikeCount) {
                        like_count = reelLikeCountUpdate.count; // Fix the assignment here, use '=' instead of ':'
                  }

                  // Add the base URL to the user's profile picture
                  const updatedUser = {
                        ...reel.user_id._doc,
                        pic: `${process.env.BASE_URL}${reel.user_id.pic}`,
                  };

                  if (token) {
                        // Check if the user has liked the current reel
                        const isLiked = await ReelLike.exists({
                              reel_id: reel._id,
                              user_ids: req.user._id,
                        });

                        // Set like_status based on whether the user has liked the reel
                        like_status = isLiked ? "Yes" : "No";

                        // Check if the user has subscribed to the author
                        const isSubscribed = await Subscribes.exists({
                              my_id: reel.user_id._id,
                              subscriber_id: req.user._id,
                        });

                        // Set subscribe_status based on whether the user has subscribed to the author
                        subscribe_status = isSubscribed ? "Yes" : "No";
                  }

                  transformedReels.push({
                        ...response,
                        reel_url: `${process.env.BASE_URL}api/reel/streamReel/${reel._id}`,
                        thumbnail_name: `${process.env.BASE_URL}public/reels/${reel.thumbnail_name}`,
                        user_id: updatedUser,
                        like_count,
                        like_status,
                        subscribe_status,
                  });
            }

            res.json({
                  page,
                  limit,
                  data: transformedReels,
                  hasMore,
                  status: true,
            });
      } catch (error) {
            res.status(500).json({
                  message: "Internal Server Error",
                  error: error.message,
                  status: false,
            });
      }
});

const streamReel = asyncHandler(async (req, res) => {
      const reelId = req.params.reelId;

      const reel = await Reel.findById(reelId);

      if (!reel) {
            return res.status(404).json({
                  message: "Reel not found",
                  status: false,
            });
      }

      const fileName = reel.reel_name;
      const filePath = path.join("public", "reels", fileName);

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunksize = end - start + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });

            const headers = {
                  "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                  "Accept-Ranges": "bytes",
                  "Content-Length": chunksize,
                  "Content-Type": "video/mp4",
            };

            res.writeHead(206, headers);
            fileStream.pipe(res);
      } else {
            const headers = {
                  "Content-Length": fileSize,
                  "Content-Type": "video/mp4",
            };

            res.writeHead(200, headers);
            fs.createReadStream(filePath).pipe(res);
      }
});

const updateReelLike = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            const { reel_id, count } = req.body;

            // Ensure reel_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(reel_id)) {
                  return res.status(200).json({
                        message: "Invalid reel_id format.",
                        status: false,
                  });
            }

            // Convert the reel_id to ObjectId
            const objectIdReelId = mongoose.Types.ObjectId(reel_id);

            // Find the reel in the ReelLike collection
            let existingLike = await ReelLike.findOne({
                  reel_id: objectIdReelId,
            });

            if (existingLike) {
                  // Check if the user_id is already in the user_ids array
                  const userIndex = existingLike.user_ids.indexOf(user_id);

                  if (count === "1" && userIndex === -1) {
                        // Increment count and add user_id if count is 1 and user_id is not already present
                        existingLike.count += 1;
                        existingLike.user_ids.push(user_id);
                  } else if (count === "0" && userIndex !== -1) {
                        // Decrement count and remove user_id if count is 0 and user_id is present
                        existingLike.count -= 1;
                        existingLike.user_ids.splice(userIndex, 1);
                  }

                  // Save the updated record
                  existingLike = await existingLike.save();

                  res.status(200).json({
                        message: "Reel like updated successfully.",
                        status: true,
                        data: existingLike,
                  });
            } else {
                  // Create a new record if the reel is not already in the ReelLike collection
                  const newLike = new ReelLike({
                        user_ids: [user_id],
                        reel_id: objectIdReelId,
                        count: count === "1" ? 1 : 0, // Set count based on input
                  });

                  const savedLike = await newLike.save();

                  res.status(201).json({
                        message: "Reel like created successfully.",
                        status: true,
                        data: savedLike,
                  });
            }
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const addReelComment = asyncHandler(async (req, res) => {
      try {
            // Extract user_id from headers
            const user_id = req.user._id;
            const { reel_id, comment } = req.body;

            // Ensure reel_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(reel_id)) {
                  return res.status(200).json({
                        message: "Invalid reel_id format.",
                        status: false,
                  });
            }

            // Convert reel_id to ObjectId
            const objectIdReelId = mongoose.Types.ObjectId(reel_id);

            // Create a new ReelComment
            const newComment = new ReelComment({
                  user_id: mongoose.Types.ObjectId(user_id),
                  reel_id: objectIdReelId,
                  comment,
            });

            // Save the comment
            const savedComment = await newComment.save();

            await Reel.findByIdAndUpdate(
                  objectIdReelId,
                  { $inc: { comment_count: 1 } }, // Increment comment_count by 1
                  { new: true } // Return the updated document
            );

            res.status(201).json({
                  message: "Reel comment added successfully.",
                  status: true,
                  data: savedComment,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getReelComments = asyncHandler(async (req, res) => {
      const { reelId } = req.params;

      try {
            // Use Mongoose to fetch reel comments from the database
            const reelComments = await ReelComment.find({ reel_id: reelId })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .exec();

            // Check if there are no comments
            if (!reelComments || reelComments.length === 0) {
                  return res.json({
                        message: "No Comments Available.",
                        status: true,
                        data: [],
                  });
            }

            // Fetch reel details
            const reelDetails = await Reel.findOne({ _id: reelId })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name", // Adjust this field based on your Category schema
                  })
                  .exec();

            const likeCount = await getReelLikeCount(reelId);

            // Add the base URL to the pic field in reel details
            const updatedReelDetails = {
                  ...reelDetails._doc,
                  user_id: {
                        ...reelDetails.user_id._doc,
                        pic: `${process.env.BASE_URL}${reelDetails.user_id.pic}`,
                  },
            };

            // Add the base URL to the pic field in comments
            const updatedReelComments = reelComments.map((comment) => ({
                  ...comment._doc,
                  user_id: {
                        ...comment.user_id._doc,
                        pic: `${process.env.BASE_URL}${comment.user_id.pic}`,
                  },
            }));

            res.json({
                  message: "Reel comments fetched successfully.",
                  status: true,
                  reel_details: updatedReelDetails,
                  comments: updatedReelComments,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const updateReelViewCount = asyncHandler(async (req, res) => {
      try {
            // Extract reel_id from the request body
            const { reel_id } = req.body;

            // Ensure reel_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(reel_id)) {
                  return res.status(200).json({
                        message: "Invalid reel_id format.",
                        status: false,
                  });
            }

            // Convert reel_id to ObjectId
            const objectIdReelId = mongoose.Types.ObjectId(reel_id);

            // Update the view count in the Reel model
            const updatedReel = await Reel.findByIdAndUpdate(
                  objectIdReelId,
                  { $inc: { view_count: 1 } }, // Increment view_count by 1
                  { new: true } // Return the updated document
            );

            if (!updatedReel) {
                  return res.status(404).json({
                        message: "Reel not found.",
                        status: false,
                  });
            }

            res.status(200).json({
                  message: "View count updated successfully.",
                  status: true,
                  data: updatedReel,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getMyReels = asyncHandler(async (req, res) => {
      const user_id = req.user._id; // Assuming you have user authentication middleware

      try {
            // Fetch reels from the database for the given user_id
            const reels = await Reel.find({ user_id })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name", // Adjust this field based on your Category schema
                  });

            // Check if there are no reels
            if (!reels || reels.length === 0) {
                  return res.json({
                        message: "No Reel Posts Available.",
                        status: true,
                        data: [],
                  });
            }

            // Add the base URL to the pic field in user details
            const updatedReels = await Promise.all(
                  reels.map(async (reel) => {
                        let like_status = "No"; // Move the declaration inside the loop
                        let subscribe_status = "No"; // Move the declaration inside the loop
                        const likeCount = await getReelLikeCount(reel._id);
                        // Check if the user has liked the current post
                        const isLiked = await ReelLike.exists({
                              post_timeline_id: reel._id,
                              user_ids: req.user._id,
                        });

                        // Set like_status based on whether the user has liked the post
                        like_status = isLiked ? "Yes" : "No";

                        const issubscribe = await Subscribes.exists({
                              my_id: reel.user_id._id,
                              subscriber_id: req.user._id,
                        });

                        // Set subscribe_status based on whether the user has subscribed to the author
                        subscribe_status = issubscribe ? "Yes" : "No";

                        return {
                              ...reel._doc,
                              user_id: {
                                    ...reel.user_id._doc,
                                    pic: `${process.env.BASE_URL}${reel.user_id.pic}`, // Assuming "pic" is the field in your User schema that contains the URL
                              },
                              like_count: likeCount,
                              like_status: like_status, // Add like_status to the response
                              subscribe_status: subscribe_status, // Add subscribe_status to the response
                              reel_url: `${process.env.BASE_URL}api/reel/streamReel/${reel._id}`,
                              thumbnail_name: `${process.env.BASE_URL}public/reels/${reel.thumbnail_name}`,
                        };
                  })
            );

            res.json({
                  message: "Reels fetched successfully.",
                  status: true,
                  data: updatedReels,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getUserReels = asyncHandler(async (req, res) => {
      const { user_id, page } = req.params;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;

      try {
            // Fetch reels from the database for the given user_id with pagination
            const reels = await Reel.find({ user_id })
                  .skip(startIndex)
                  .limit(limit)
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name", // Adjust this field based on your Category schema
                  });

            // Check if there are no reels
            if (!reels || reels.length === 0) {
                  return res.json({
                        message: "No Reel Posts Available.",
                        status: true,
                        data: [],
                  });
            }

            const token = req.header("Authorization");

            // Add the base URL to the pic field in user details and handle likes and subscriptions
            const updatedReels = await Promise.all(
                  reels.map(async (reel) => {
                        let like_status = "No"; // Move the declaration inside the loop
                        let subscribe_status = "No"; // Move the declaration inside the loop
                        const likeCount = await getReelLikeCount(reel._id);

                        if (token) {
                              // Check if the user has liked the current post
                              const isLiked = await ReelLike.exists({
                                    post_timeline_id: reel._id,
                                    user_ids: req.user._id,
                              });

                              // Set like_status based on whether the user has liked the post
                              like_status = isLiked ? "Yes" : "No";

                              const issubscribe = await Subscribes.exists({
                                    my_id: reel.user_id._id,
                                    subscriber_id: req.user._id,
                              });

                              // Set subscribe_status based on whether the user has subscribed to the author
                              subscribe_status = issubscribe ? "Yes" : "No";
                        }

                        return {
                              ...reel._doc,
                              user_id: {
                                    ...reel.user_id._doc,
                                    pic: `${process.env.BASE_URL}${reel.user_id.pic}`, // Assuming "pic" is the field in your User schema that contains the URL
                              },
                              like_count: likeCount,
                              like_status: like_status,
                              subscribe_status: subscribe_status,
                              reel_url: `${process.env.BASE_URL}api/reel/streamReel/${reel._id}`,
                              thumbnail_name: `${process.env.BASE_URL}public/reels/${reel.thumbnail_name}`,
                        };
                  })
            );

            res.json({
                  message: "Reels fetched successfully.",
                  status: true,
                  data: updatedReels,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getReelThumbnails = asyncHandler(async (req, res) => {
      try {
            const limit = parseInt(req.params.limit, 10);

            // Fetch thumbnails based on the limit
            const thumbnails = await Reel.find()
                  .limit(limit)
                  .select("thumbnail_name title");

            if (!thumbnails || thumbnails.length === 0) {
                  return res.status(200).json({
                        message: "No Reel Found.",
                        status: false,
                  });
            }

            // Construct full URLs for thumbnails
            const thumbnailData = thumbnails.map((thumbnail) => ({
                  id: thumbnail._id,
                  title: thumbnail.title, // Assuming you have an _id field in your Reel model
                  thumbnail_url: `${process.env.BASE_URL}public/reels/${thumbnail.thumbnail_name}`, // Replace base_url with your actual base URL
                  reel_url: `${process.env.BASE_URL}api/reel/streamReel/${thumbnail._id}`,
            }));

            res.status(200).json({
                  data: thumbnailData,
                  status: true,
            });
      } catch (error) {
            console.error("Error fetching thumbnails:", error);
            res.status(500).json({
                  message: "Internal Server Error.",
                  status: false,
            });
      }
});

const deleteReel = asyncHandler(async (req, res) => {
      try {
            // Extract user_id from headers
            const user_id = req.user._id;
            const { reel_id } = req.body;

            // Ensure reel_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(reel_id)) {
                  return res.status(200).json({
                        message: "Invalid reel_id format.",
                        status: false,
                  });
            }

            // Convert reel_id to ObjectId
            const objectIdReelId = mongoose.Types.ObjectId(reel_id);

            // Check if the user has the right to delete the reel
            const reel = await Reel.findOne({
                  _id: objectIdReelId,
                  user_id,
            });

            if (!reel) {
                  return res.status(403).json({
                        message: "You do not have permission to delete this reel.",
                        status: false,
                  });
            }

            // Get the reel details
            const reelDetails = await Reel.findById(objectIdReelId);

            // Delete the reel document from the database
            await Reel.findByIdAndDelete(objectIdReelId);

            // Delete the reel file
            const reelPath = path.join(`public/reels/${reelDetails.reel_name}`);
            fs.unlinkSync(reelPath); // This will delete the file

            // Delete the user's reel folder if it's empty
            const userFolderPath = path.join(`public/reels/${user_id}`);
            const filesInUserFolder = fs.readdirSync(userFolderPath);
            if (filesInUserFolder.length === 0) {
                  fs.rmdirSync(userFolderPath); // This will delete the folder if it's empty
            }

            await AdminDashboard.updateOne(
                  {
                        /* Your condition to identify the relevant row in admindashboards */
                  },
                  { $inc: { reels_count: -1 } }
            );

            // Delete reel comments and likes (if you have models for them)
            await ReelComment.deleteMany({ reel_id: objectIdReelId });
            await ReelLike.deleteMany({ reel_id: objectIdReelId });

            res.status(200).json({
                  message: "Reel deleted successfully.",
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

module.exports = {
      uploadReel,
      getPaginatedReel,
      streamReel,
      updateReelLike,
      addReelComment,
      updateReelViewCount,
      getReelComments,
      deleteReel,
      getReelThumbnails,
      getMyReels,
      getUserReels,
};
