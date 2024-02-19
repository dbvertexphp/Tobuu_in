const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const asyncHandler = require("express-async-handler");
const { Video, VideoLike, VideoComment } = require("../models/videoModel.js");
const Subscribes = require("../models/subscribeModel.js");
const multer = require("multer");
const path = require("path");
const { AdminDashboard } = require("../models/userModel.js");
const {
      getSignedUrlS3,
      PutObjectVideo,
      PutObjectVideothumbnail,
      DeleteSignedUrlS3,
} = require("../config/aws-s3.js");
require("dotenv").config();
const baseURL = process.env.BASE_URL;

const getAllVideo = asyncHandler(async (req, res) => {
      const page = parseInt(req.params.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;

      try {
            let videoQuery = Video.find();

            // Check if category_id is provided in the request body
            if (req.body.category_id) {
                  videoQuery = videoQuery.where({
                        category_id: req.body.category_id,
                  });
            }

            // Use Mongoose to fetch paginated videos from the database
            const paginatedVideos = await videoQuery
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

            const totalVideos = await Video.countDocuments(
                  videoQuery.getQuery()
            );
            const hasMore = startIndex + paginatedVideos.length < totalVideos;

            if (paginatedVideos.length === 0) {
                  return res.json({
                        message: "Video Not Found",
                        status: true,
                  });
            }

            // Transform and exclude specific fields in the response
            const transformedVideos = [];
            const token = req.header("Authorization");

            for (const video of paginatedVideos) {
                  const { video_name, updatedAt, __v, ...response } =
                        video._doc;

                  let like_status = "No";
                  let subscribe_status = "No";
                  let like_count = 0;

                  // Get the total like count for each video
                  const videoLikeCount = await VideoLike.findOne({
                        video_id: video._id,
                  }).select("count");

                  if (videoLikeCount) {
                        like_count = videoLikeCount.count;
                  }

                  const pic_name_url = await getSignedUrlS3(video.user_id.pic);
                  const updatedUser = {
                        ...video.user_id._doc,
                        pic: pic_name_url,
                  };

                  if (token) {
                        // Check if the user has liked the current video
                        const isLiked = await VideoLike.exists({
                              video_id: video._id,
                              user_ids: req.user._id,
                        });

                        like_status = isLiked ? "Yes" : "No";

                        // Check if the user has subscribed to the author
                        const isSubscribed = await Subscribes.exists({
                              my_id: video.user_id?._id,
                              subscriber_id: req.user?._id,
                        });

                        subscribe_status = isSubscribed ? "Yes" : "No";
                  }

                  const thumbnail_name_url = await getSignedUrlS3(
                        video.thumbnail_name
                  );
                  const video_name_url = await getSignedUrlS3(video.video_name);

                  transformedVideos.push({
                        ...response,
                        video_url: video_name_url,
                        thumbnail_name: thumbnail_name_url,
                        user_id: updatedUser,
                        like_count,
                        like_status,
                        subscribe_status,
                  });
            }

            // Now transformedVideos contains the updated videos with like_count, like_status, and subscribe_status

            res.json({
                  page,
                  limit,
                  status: true,
                  data: transformedVideos,
                  hasMore,
                  totalVideos,
            });
      } catch (error) {
            res.status(500).json({
                  message: "Internal Server Error",
                  error: error.message,
                  status: false,
            });
      }
});

const uploadVideo = asyncHandler(async (req, res) => {
      const { category_id, description, title, video_key, thumbnail_key } =
            req.body;
      const user_id = req.user._id;

      if (!category_id || !description || !title) {
            return res.status(400).json({
                  message: "Please enter all the required fields.",
                  status: false,
            });
      }

      const video = await Video.create({
            video_name: video_key,
            category_id,
            title,
            thumbnail_name: thumbnail_key,
            description,
            user_id,
      });

      if (video) {
            res.status(201).json({
                  _id: video._id,
                  video_name: video.video_name,
                  category_id: video.category_id,
                  title: video.title,
                  thumbnail_name: video.thumbnail_name,
                  description: video.description,
                  user_id: video.user_id,
                  status: true,
            });
      } else {
            res.status(200).json({
                  message: "Video Not Uploaded.",
                  status: false,
            });
      }
});

const getVideoLikeCount = async (videoId) => {
      try {
            const videoLike = await VideoLike.findOne(
                  { video_id: videoId },
                  { count: 1, _id: 0 }
            );
            return videoLike ? videoLike.count : 0;
      } catch (error) {
            throw new Error("Error fetching video like count");
      }
};

const getPaginatedVideos = asyncHandler(async (req, res) => {
      const page = parseInt(req.params.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;

      try {
            let videoQuery = Video.find({ deleted_at: null });

            // Check if category_id is provided in the request body
            if (req.body.category_id) {
                  videoQuery = videoQuery.where({
                        category_id: req.body.category_id,
                  });
            }

            if (req.body.search) {
                  videoQuery = videoQuery.where({
                        title: { $regex: req.body.search, $options: "i" },
                  });
            }

            // Use Mongoose to fetch paginated videos from the database
            const paginatedVideos = await videoQuery
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

            const totalVideos = await Video.countDocuments(
                  videoQuery.getQuery()
            );
            const hasMore = startIndex + paginatedVideos.length < totalVideos;

            if (paginatedVideos.length === 0) {
                  return res.json({
                        message: "Video Not Found",
                        status: true,
                  });
            }

            // Transform and exclude specific fields in the response
            const transformedVideos = [];
            const token = req.header("Authorization");

            for (const video of paginatedVideos) {
                  const { video_name, updatedAt, __v, ...response } =
                        video._doc;

                  let like_status = "No";
                  let subscribe_status = "No";
                  let like_count = 0;

                  // Get the total like count for each video
                  const videoLikeCount = await VideoLike.findOne({
                        video_id: video._id,
                  }).select("count");

                  if (videoLikeCount) {
                        like_count = videoLikeCount.count;
                  }

                  const pic_name_url = await getSignedUrlS3(video.user_id.pic);
                  const updatedUser = {
                        ...video.user_id._doc,
                        pic: pic_name_url,
                  };

                  if (token) {
                        // Check if the user has liked the current video
                        const isLiked = await VideoLike.exists({
                              video_id: video._id,
                              user_ids: req.user._id,
                        });

                        like_status = isLiked ? "Yes" : "No";

                        // Check if the user has subscribed to the author
                        const isSubscribed = await Subscribes.exists({
                              my_id: video.user_id?._id,
                              subscriber_id: req.user?._id,
                        });

                        subscribe_status = isSubscribed ? "Yes" : "No";
                  }

                  const thumbnail_name_url = await getSignedUrlS3(
                        video.thumbnail_name
                  );
                  const video_name_url = await getSignedUrlS3(video.video_name);

                  transformedVideos.push({
                        ...response,
                        video_url: video_name_url,
                        thumbnail_name: thumbnail_name_url,
                        user_id: updatedUser,
                        like_count,
                        like_status,
                        subscribe_status,
                  });
            }

            // Now transformedVideos contains the updated videos with like_count, like_status, and subscribe_status

            res.json({
                  page,
                  limit,
                  status: true,
                  data: transformedVideos,
                  hasMore,
            });
      } catch (error) {
            res.status(500).json({
                  message: "Internal Server Error",
                  error: error.message,
                  status: false,
            });
      }
});

const getPaginatedVideosAdmin = asyncHandler(async (req, res) => {
      const page = parseInt(req.body.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit;

      try {
            let videoQuery = Video.find();

            if (req.body.search) {
                  videoQuery = videoQuery.where({
                        title: { $regex: req.body.search, $options: "i" },
                  });
            }

            // Use Mongoose to fetch paginated videos from the database
            const paginatedVideos = await videoQuery
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

            const totalVideos = await Video.countDocuments(
                  videoQuery.getQuery()
            );
            const totalPages = Math.ceil(totalVideos / limit);
            const hasMore = startIndex + paginatedVideos.length < totalVideos;

            if (paginatedVideos.length === 0) {
                  return res.json({
                        message: "Video Not Found",
                        status: true,
                  });
            }

            // Transform and exclude specific fields in the response
            const transformedVideos = [];
            const token = req.header("Authorization");

            for (const video of paginatedVideos) {
                  const { video_name, updatedAt, __v, ...response } =
                        video._doc;

                  let like_status = "No";
                  let subscribe_status = "No";
                  let like_count = 0;

                  // Get the total like count for each video
                  const videoLikeCount = await VideoLike.findOne({
                        video_id: video._id,
                  }).select("count");

                  if (videoLikeCount) {
                        like_count = videoLikeCount.count;
                  }

                  const pic_name_url = await getSignedUrlS3(video.user_id.pic);
                  const updatedUser = {
                        ...video.user_id._doc,
                        pic: pic_name_url,
                  };

                  if (token) {
                        // Check if the user has liked the current video
                        const isLiked = await VideoLike.exists({
                              video_id: video._id,
                              user_ids: req.user._id,
                        });

                        like_status = isLiked ? "Yes" : "No";

                        // Check if the user has subscribed to the author
                        const isSubscribed = await Subscribes.exists({
                              my_id: video.user_id?._id,
                              subscriber_id: req.user?._id,
                        });

                        subscribe_status = isSubscribed ? "Yes" : "No";
                  }

                  const thumbnail_name_url = await getSignedUrlS3(
                        video.thumbnail_name
                  );
                  const video_name_url = await getSignedUrlS3(video.video_name);

                  transformedVideos.push({
                        ...response,
                        video_url: video_name_url,
                        thumbnail_name: thumbnail_name_url,
                        user_id: updatedUser,
                        like_count,
                        like_status,
                        subscribe_status,
                  });
            }
            const paginationDetails = {
                  current_page: page,
                  data: transformedVideos,
                  first_page_url: `${baseURL}api/videos?page=1&limit=${limit}`,
                  from: startIndex + 1,
                  last_page: totalPages,
                  last_page_url: `${baseURL}api/videos?page=${totalPages}&limit=${limit}`,
                  next_page_url:
                        page < totalPages
                              ? `${baseURL}api/videos?page=${
                                      page + 1
                                }&limit=${limit}`
                              : null,
                  path: `${baseURL}api/videos`,
                  per_page: limit,
                  prev_page_url:
                        page > 1
                              ? `${baseURL}api/videos?page=${
                                      page - 1
                                }&limit=${limit}`
                              : null,
                  to: startIndex + transformedVideos.length,
                  total: totalVideos,
                  hasMore: hasMore, // Include the hasMore flag in the response
            };

            res.json({
                  Videos: paginationDetails,
                  page: page.toString(),
                  total_rows: totalVideos,
            });
      } catch (error) {
            res.status(500).json({
                  message: "Internal Server Error",
                  error: error.message,
                  status: false,
            });
      }
});

const streamVideo = asyncHandler(async (req, res) => {
      const videoId = req.params.videoId;

      const video = await Video.findById(videoId);

      if (!video) {
            return res.status(404).json({
                  message: "Video not found",
                  status: false,
            });
      }

      const fileName = video.video_name;
      const filePath = await getSignedUrlS3(fileName);
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

const updateVideoLike = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            const { video_id, count } = req.body;

            // Ensure video_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(video_id)) {
                  return res.status(200).json({
                        message: "Invalid video_id format.",
                        status: false,
                  });
            }

            // Convert the video_id to ObjectId
            const objectIdVideoId = mongoose.Types.ObjectId(video_id);

            // Find the video in the VideoLike collection
            let existingLike = await VideoLike.findOne({
                  video_id: objectIdVideoId,
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
                        message: "Video like updated successfully.",
                        status: true,
                        data: existingLike,
                  });
            } else {
                  // Create a new record if the video is not already in the VideoLike collection
                  const newLike = new VideoLike({
                        user_ids: [user_id],
                        video_id: objectIdVideoId,
                        count: count === "1" ? 1 : 0, // Set count based on input
                  });

                  const savedLike = await newLike.save();

                  res.status(201).json({
                        message: "Video like created successfully.",
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

const addVideoComment = asyncHandler(async (req, res) => {
      try {
            // Extract user_id from headers
            const user_id = req.user._id;
            const { video_id, comment } = req.body;

            // Ensure video_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(video_id)) {
                  return res.status(200).json({
                        message: "Invalid video_id format.",
                        status: false,
                  });
            }

            // Convert video_id to ObjectId
            const objectIdVideoId = mongoose.Types.ObjectId(video_id);

            // Create a new VideoComment
            const newComment = new VideoComment({
                  user_id: mongoose.Types.ObjectId(user_id),
                  video_id: objectIdVideoId,
                  comment,
            });

            // Save the comment
            const savedComment = await newComment.save();

            await Video.findByIdAndUpdate(
                  objectIdVideoId,
                  { $inc: { comment_count: 1 } }, // Increment comment_count by 1
                  { new: true } // Return the updated document
            );

            res.status(201).json({
                  message: "Video comment added successfully.",
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

const getVideoComments = asyncHandler(async (req, res) => {
      const { videoId } = req.params;

      try {
            // Use Mongoose to fetch video comments from the database
            const videoComments = await VideoComment.find({ video_id: videoId })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .exec();

            // Check if there are no comments

            // Fetch video details
            const videoDetails = await Video.findOne({ _id: videoId })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name", // Adjust this field based on your Category schema
                  })
                  .exec();
            const likeCount = await getVideoLikeCount(videoId);
            const token = req.header("Authorization");

            let like_status = "No";
            let subscribe_status = "No";

            const pic_name_url = await getSignedUrlS3(videoDetails.user_id.pic);

            // Add the base URL to the pic field in video details

            const thumbnail_name_url = await getSignedUrlS3(
                  videoDetails.thumbnail_name
            );
            const video_name_url = await getSignedUrlS3(
                  videoDetails.video_name
            );
            const updatedVideoDetails = {
                  ...videoDetails._doc,
                  user_id: {
                        ...videoDetails.user_id._doc,
                        pic: pic_name_url,
                  },
                  like_count: likeCount,
                  thumbnail_name: thumbnail_name_url,
                  video_url: video_name_url,
                  like_status, // Include like_status
                  subscribe_status, // Include subscribe_status
            };

            if (token) {
                  // Check if the user has liked the current post
                  const isLiked = await VideoLike.exists({
                        video_id: videoId,
                        user_ids: req.user._id,
                  });

                  // Set like_status based on whether the user has liked the post
                  updatedVideoDetails.like_status = isLiked ? "Yes" : "No";

                  const isSubscribe = await Subscribes.exists({
                        my_id: videoDetails.user_id._id,
                        subscriber_id: req.user._id,
                  });

                  // Set subscribe_status based on whether the user has subscribed to the author
                  updatedVideoDetails.subscribe_status = isSubscribe
                        ? "Yes"
                        : "No";
            }

            // Add the base URL to the pic field in comments
            const updatedVideoComments = await Promise.all(
                  videoComments.map(async (comment) => {
                        const pic_name_url = await getSignedUrlS3(
                              comment.user_id.pic
                        );
                        return {
                              ...comment._doc,
                              user_id: {
                                    ...comment.user_id._doc,
                                    pic: pic_name_url,
                              },
                        };
                  })
            );

            if (!videoComments || videoComments.length === 0) {
                  return res.json({
                        message: "No Comments Available.",
                        status: true,
                        data: updatedVideoDetails,
                        comments: updatedVideoComments,
                  });
            }
            res.json({
                  message: "Video comments fetched successfully.",
                  status: true,
                  data: updatedVideoDetails,
                  comments: updatedVideoComments,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const updateVideoViewCount = asyncHandler(async (req, res) => {
      try {
            // Extract video_id from the request body
            const { video_id } = req.body;

            // Ensure video_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(video_id)) {
                  return res.status(200).json({
                        message: "Invalid video_id format.",
                        status: false,
                  });
            }

            // Convert video_id to ObjectId
            const objectIdVideoId = mongoose.Types.ObjectId(video_id);

            // Update the view count in the Video model
            const updatedVideo = await Video.findByIdAndUpdate(
                  objectIdVideoId,
                  { $inc: { view_count: 1 } }, // Increment view_count by 1
                  { new: true } // Return the updated document
            );

            if (!updatedVideo) {
                  return res.status(404).json({
                        message: "Video not found.",
                        status: false,
                  });
            }

            res.status(200).json({
                  message: "View count updated successfully.",
                  status: true,
                  data: updatedVideo,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getMyVideos = asyncHandler(async (req, res) => {
      const user_id = req.user._id; // Assuming you have user authentication middleware
      const page = parseInt(req.params.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;

      try {
            // Fetch videos from the database for the given user_id with pagination
            const videos = await Video.find({ user_id, deleted_at: null })
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

            // Check if there are no videos
            if (!videos || videos.length === 0) {
                  return res.json({
                        message: "No Video Available.",
                        status: true,
                        data: [],
                  });
            }

            // Add the base URL to the pic field in user details
            const updatedVideos = await Promise.all(
                  videos.map(async (video) => {
                        let like_status = "No"; // Move the declaration inside the loop
                        let subscribe_status = "No"; // Move the declaration inside the loop
                        const likeCount = await getVideoLikeCount(video._id);
                        // Check if the user has liked the current post
                        const isLiked = await VideoLike.exists({
                              post_timeline_id: video._id,
                              user_ids: req.user._id,
                        });

                        // Set like_status based on whether the user has liked the post
                        like_status = isLiked ? "Yes" : "No";

                        const issubscribe = await Subscribes.exists({
                              my_id: video.user_id._id,
                              subscriber_id: req.user._id,
                        });

                        // Set subscribe_status based on whether the user has subscribed to the author
                        subscribe_status = issubscribe ? "Yes" : "No";

                        const thumbnail_name_url = await getSignedUrlS3(
                              video.thumbnail_name
                        );
                        const video_name_url = await getSignedUrlS3(
                              video.video_name
                        );
                        const pic_name_url = await getSignedUrlS3(
                              video.user_id.pic
                        );
                        return {
                              ...video._doc,
                              user_id: {
                                    ...video.user_id._doc,
                                    pic: pic_name_url, // Assuming "pic" is the field in your User schema that contains the URL
                              },
                              like_count: likeCount,
                              like_status: like_status, // Add like_status to the response
                              subscribe_status: subscribe_status, // Add subscribe_status to the response
                              video_url: video_name_url,
                              thumbnail_name: thumbnail_name_url,
                        };
                  })
            );

            res.json({
                  message: "Videos fetched successfully.",
                  status: true,
                  data: updatedVideos,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getUserVideos = asyncHandler(async (req, res) => {
      const { user_id, page } = req.params;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;
      try {
            // Fetch videos from the database for the given user_id with pagination
            const videos = await Video.find({ user_id, deleted_at: null })
                  .skip(startIndex)
                  .limit(limit)
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic",
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name",
                  });

            const userVideoCount = await Video.countDocuments({ user_id });

            const hasMore = startIndex + videos.length < userVideoCount;
            // Check if there are no videos
            if (!videos || videos.length === 0) {
                  return res.json({
                        message: "No Video Available.",
                        status: true,
                        data: [],
                  });
            }
            const token = req.header("Authorization");
            // Add the base URL to the pic field in user details
            const updatedVideos = await Promise.all(
                  videos.map(async (video) => {
                        let like_status = "No"; // Move the declaration inside the loop
                        let subscribe_status = "No"; // Move the declaration inside the loop
                        const likeCount = await getVideoLikeCount(video._id);

                        if (token) {
                              const isLiked = await VideoLike.exists({
                                    post_timeline_id: video._id,
                                    user_ids: req.user._id,
                              });
                              like_status = isLiked ? "Yes" : "No";
                              const issubscribe = await Subscribes.exists({
                                    my_id: video.user_id._id,
                                    subscriber_id: req.user._id,
                              });
                              subscribe_status = issubscribe ? "Yes" : "No";
                        }

                        const thumbnail_name_url = await getSignedUrlS3(
                              video.thumbnail_name
                        );
                        const video_name_url = await getSignedUrlS3(
                              video.video_name
                        );

                        const pic_name_url = await getSignedUrlS3(
                              video.user_id.pic
                        );
                        return {
                              ...video._doc,
                              user_id: {
                                    ...video.user_id._doc,
                                    pic: pic_name_url, // Assuming "pic" is the field in your User schema that contains the URL
                              },
                              like_count: likeCount,
                              like_status: like_status, // Add like_status to the response
                              subscribe_status: subscribe_status, // Add subscribe_status to the response
                              video_url: video_name_url,
                              thumbnail_name: thumbnail_name_url,
                        };
                  })
            );

            res.json({
                  message: "Videos fetched successfully.",
                  status: true,
                  data: updatedVideos,
                  hasMore,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getVideosThumbnails = asyncHandler(async (req, res) => {
      try {
            const limit = parseInt(req.params.limit, 10);
            const category_id = req.body.category_id;

            // Construct the query based on whether category_id is provided or not
            const query = category_id
                  ? { category_id } // If category_id is provided, filter by category_id
                  : {}; // If category_id is not provided, don't apply any additional filter
            // Fetch videos based on the limit and category_id (if provided)
            const videos = await Video.find({ ...query, deleted_at: null }) // Only non-deleted videos will be retrieved
                  .limit(limit)
                  .select("thumbnail_name video_name title");

            if (!videos || videos.length === 0) {
                  return res.status(404).json({
                        message: "Videos not found.",
                        status: false,
                  });
            }

            // Construct full URLs for videos
            const videoData = await Promise.all(
                  videos.map(async (thumbnail) => {
                        if (
                              !thumbnail.thumbnail_name ||
                              !thumbnail.video_name
                        ) {
                              // Handle the case where either thumbnail_name or video_name is missing
                              return null;
                        }

                        const thumbnail_name_url = await getSignedUrlS3(
                              thumbnail.thumbnail_name
                        );
                        const video_name_url = await getSignedUrlS3(
                              thumbnail.video_name
                        );

                        return {
                              id: thumbnail._id,
                              title: thumbnail.title,
                              thumbnail_url: thumbnail_name_url,
                              video_url: video_name_url,
                        };
                  })
            );

            // Filter out null values
            const validVideoData = videoData.filter((data) => data !== null);

            res.status(200).json({
                  data: validVideoData,
                  status: true,
            });
      } catch (error) {
            console.error("Error fetching videos:", error);
            res.status(500).json({
                  message: "Internal Server Error.",
                  status: false,
            });
      }
});

const deleteVideo = asyncHandler(async (req, res) => {
      try {
            // Extract user_id from headers
            const user_id = req.user._id;
            const { video_id } = req.body;
            // Ensure video_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(video_id)) {
                  return res.status(200).json({
                        message: "Invalid video_id format.",
                        status: false,
                  });
            }
            const videoDetails = await Video.findById(video_id);

            if (!videoDetails) {
                  return res.status(403).json({
                        message: "Video Id Not Found.",
                        status: false,
                  });
            }

            // Convert video_id to ObjectId
            const objectIdVideoId = mongoose.Types.ObjectId(video_id);
            // Check if the user has the right to delete the video
            const video = await Video.findOne({
                  _id: objectIdVideoId,
                  user_id: user_id,
            });
            if (!video) {
                  return res.status(403).json({
                        message: "You do not have permission to delete this video.",
                        status: false,
                  });
            }

            // Get the video details

            // Delete the video document from the database
            await Video.findByIdAndDelete(objectIdVideoId);

            // Delete the video file
            const thumbnail_name_url = await DeleteSignedUrlS3(
                  videoDetails.thumbnail_name
            );
            const video_name_url = await DeleteSignedUrlS3(
                  videoDetails.video_name
            );

            const deleteThumbnailResponse = await fetch(thumbnail_name_url, {
                  method: "DELETE",
            });
            const deleteVideoResponse = await fetch(video_name_url, {
                  method: "DELETE",
            });

            await AdminDashboard.updateOne(
                  {
                        /* Your condition to identify the relevant row in admindashboards */
                  },
                  { $inc: { video_count: -1 } }
            );

            // Delete video comments and likes
            await VideoComment.deleteMany({ video_id: objectIdVideoId });
            await VideoLike.deleteMany({ video_id: objectIdVideoId });

            res.status(200).json({
                  message: "Video deleted successfully.",
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

const getVideoUploadUrlS3 = asyncHandler(async (req, res) => {
      const user_id = req.user._id;
      const randomFilenameVideo = `Video-${Math.random()
            .toString(36)
            .substring(2)}`;
      const randomFilenameThumbnail = `Thumbnail-${Math.random()
            .toString(36)
            .substring(2)}`;
      const videoget_url = await PutObjectVideo(user_id, randomFilenameVideo);
      const thumbnailget_url = await PutObjectVideothumbnail(
            user_id,
            randomFilenameThumbnail
      );

      return res.status(400).json({
            message: { videoget_url, thumbnailget_url },
            status: false,
      });
});

const searchVideos = asyncHandler(async (req, res) => {
      const { page = 1, title = "" } = req.body;
      const perPage = 4; // You can adjust this according to your requirements

      // Build the query based on title with case-insensitive search
      const query = {
            title: { $regex: title, $options: "i" },
      };

      try {
            const videos = await Video.find({ ...query, deleted_at: null })
                  .select("_id title")
                  .skip((page - 1) * perPage)
                  .limit(perPage);

            const totalCount = await Video.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            let transformedVideos = videos.map((video) => ({
                  ...video.toObject(),
                  label: "Video List", // Add the label field
            }));

            if (transformedVideos.length === 4) {
                  transformedVideos.push({
                        _id: "See_All",
                        title: "See All",
                        label: "Video List",
                  });
            }

            res.json({
                  data: transformedVideos,
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

const VideoAdminStatus = asyncHandler(async (req, res) => {
      const videoId = req.body.videoId;
      try {
            // Find the video by its _id
            const video = await Video.findById(videoId);

            if (!video) {
                  return res.status(404).json({ message: "Video not found" });
            }

            // Check if deleted_at field is null or has a value
            if (video.deleted_at === null) {
                  // If deleted_at is null, update it with new Date()
                  video.deleted_at = new Date();
            } else {
                  // If deleted_at has a value, update it with null
                  video.deleted_at = null;
            }

            // Save the updated video
            await video.save();

            return res.status(200).json({
                  message: "Video soft delete status toggled successfully",
            });
      } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal Server Error" });
      }
});

module.exports = {
      uploadVideo,
      getPaginatedVideos,
      streamVideo,
      updateVideoLike,
      addVideoComment,
      updateVideoViewCount,
      getVideoComments,
      getMyVideos,
      deleteVideo,
      getVideosThumbnails,
      getUserVideos,
      getVideoUploadUrlS3,
      getAllVideo,
      searchVideos,
      getPaginatedVideosAdmin,
      VideoAdminStatus,
};
