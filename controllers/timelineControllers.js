const asyncHandler = require("express-async-handler");
const dotenv = require("dotenv");
require("dotenv").config();
const baseURL = process.env.BASE_URL;
const {
      PostTimeline,
      PostTimelineLike,
      TimelineComment,
} = require("../models/posttimelineModel.js");
const Subscribes = require("../models/subscribeModel.js");
const { AdminDashboard } = require("../models/userModel.js");
const mongoose = require("mongoose");
const { getSignedUrlS3 } = require("../config/aws-s3.js");

const uploadPostTimeline = asyncHandler(async (req, res) => {
      const user_id = req.user._id; // Assuming you have user authentication middleware

      const { category_id, description } = req.body;
      if (!category_id || !description) {
            res.status(200).json({
                  message: "Please enter all the required fields.",
                  status: false,
            });
            return;
      }
      const posttimeline = await PostTimeline.create({
            category_id,
            description,
            user_id,
      });
      if (posttimeline) {
            // Increment reels_count in AdminDashboard
            try {
                  const adminDashboard = await AdminDashboard.findOne();
                  adminDashboard.post_count++;
                  await adminDashboard.save();
            } catch (error) {}
      }

      if (posttimeline) {
            res.status(201).json({
                  posttimeline,
                  status: true,
            });
      } else {
            res.status(200).json({
                  message: "Timeline Not Post.",
                  status: false,
            });
            return;
      }
});

const getTimelineLikeCount = async (post_timeline_id) => {
      try {
            const postTimelineLike = await PostTimelineLike.findOne(
                  { post_timeline_id: post_timeline_id }, // Make sure your schema has the correct field name
                  { count: 1, _id: 0 }
            );
            return postTimelineLike ? postTimelineLike.count : 0;
      } catch (error) {
            throw new Error("Error fetching Post Timeline like count");
      }
};

const getPaginatedTimeline = asyncHandler(async (req, res) => {
      const page = parseInt(req.params.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit;

      try {
            const category_id = req.body.category_id; // Added category_id extraction from query parameters

            // Construct the query based on whether category_id is provided or not
            const query = category_id
                  ? { category_id } // If category_id is provided, filter by category_id
                  : {}; // If category_id is not provided, don't apply any additional filter

            // Use Mongoose to fetch paginated Timelines from the database
            const paginatedTimelines = await PostTimeline.find(query)
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

            // Calculate totalTimelines with category filter applied
            const totalTimelines = await PostTimeline.countDocuments(query);

            const hasMore =
                  startIndex + paginatedTimelines.length < totalTimelines;

            if (paginatedTimelines.length === 0) {
                  return res.json({
                        message: "Timeline Post Not Found",
                        status: true,
                  });
            }

            const token = req.header("Authorization");

            // Iterate through timelines to get like counts and add additional fields
            const timelinesWithAdditionalInfo = await Promise.all(
                  paginatedTimelines.map(async (timeline) => {
                        let like_status = "No";
                        let subscribe_status = "No";
                        let like_count = 0;

                        const likeCount = await getTimelineLikeCount(
                              timeline._id
                        );
                        const timelineLikeCount = await PostTimelineLike.find({
                              post_timeline_id: timeline._id,
                        });
                        for (const timelineLikeCountUpdate of timelineLikeCount) {
                              like_count = timelineLikeCountUpdate.count;
                        }

                        const pic_name_url = await getSignedUrlS3(
                              timeline.user_id.pic
                        );

                        const updatedUser = timeline.user_id
                              ? {
                                      ...timeline.user_id._doc,
                                      pic: pic_name_url,
                                }
                              : null;

                        if (token) {
                              const isLiked = await PostTimelineLike.exists({
                                    post_timeline_id: timeline._id,
                                    user_ids: req.user._id,
                              });

                              like_status = isLiked ? "Yes" : "No";

                              const issubscribe = await Subscribes.exists({
                                    my_id: timeline.user_id._id,
                                    subscriber_id: req.user._id,
                              });

                              subscribe_status = issubscribe ? "Yes" : "No";
                        }

                        return {
                              ...timeline._doc,
                              user_id: updatedUser,
                              like_count,
                              like_status: like_status,
                              subscribe_status: subscribe_status,
                        };
                  })
            );

            res.json({
                  page,
                  limit,
                  data: timelinesWithAdditionalInfo,
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

const updatePostTimelineLike = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            const { post_timeline_id, count } = req.body;

            console.log(post_timeline_id);
            console.log(count);

            // Ensure post_timeline_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(post_timeline_id)) {
                  return res.status(200).json({
                        message: "Invalid post_timeline_id format.",
                        status: false,
                  });
            }

            // Convert the post_timeline_id to ObjectId
            const objectIdPostTimelineId =
                  mongoose.Types.ObjectId(post_timeline_id);

            // Find the post timeline in the PostTimelineLike collection
            let existingLike = await PostTimelineLike.findOne({
                  post_timeline_id: objectIdPostTimelineId,
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

                  console.log("existingLike after update:", existingLike);

                  res.status(200).json({
                        message: "Post timeline like updated successfully.",
                        status: true,
                        data: existingLike,
                  });
            } else {
                  // Create a new record if the post timeline is not already in the PostTimelineLike collection
                  const newLike = new PostTimelineLike({
                        user_ids: [user_id],
                        post_timeline_id: objectIdPostTimelineId,
                        count: count === "1" ? 1 : 0, // Set count based on input
                  });

                  const savedLike = await newLike.save();

                  res.status(201).json({
                        message: "Post timeline like created successfully.",
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

const addTimelineComment = asyncHandler(async (req, res) => {
      try {
            // Extract user_id from headers
            const user_id = req.user._id;
            const { timeline_id, comment } = req.body;

            // Ensure timeline_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(timeline_id)) {
                  return res.status(200).json({
                        message: "Invalid timeline_id format.",
                        status: false,
                  });
            }

            // Convert timeline_id to ObjectId
            const objectIdTimelineId = mongoose.Types.ObjectId(timeline_id);

            // Create a new TimelineComment
            const newComment = new TimelineComment({
                  user_id: mongoose.Types.ObjectId(user_id),
                  timeline_id: objectIdTimelineId,
                  comment,
            });

            // Save the comment
            const savedComment = await newComment.save();

            // Update comment_count in PostTimeline model
            await PostTimeline.findByIdAndUpdate(
                  objectIdTimelineId,
                  { $inc: { comment_count: 1 } }, // Increment comment_count by 1
                  { new: true } // Return the updated document
            );

            res.status(201).json({
                  message: "Timeline comment added successfully.",
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

const getTimelineComments = asyncHandler(async (req, res) => {
      const { timelineId } = req.params;

      try {
            // Use Mongoose to fetch timeline comments from the database
            const timelineComments = await TimelineComment.find({
                  timeline_id: timelineId,
            })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .exec();
            // Check if there are no comments
            // if (!timelineComments || timelineComments.length === 0) {
            //       return res.json({
            //             message: "No Comments Available.",
            //             status: true,
            //             data: [],
            //       });
            // }

            // Fetch timeline data with category_name
            const timelineData = await PostTimeline.findOne({ _id: timelineId })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name", // Adjust this field based on your Category schema
                  })
                  .exec();
            // Check if timelineData is null or undefined
            if (!timelineData) {
                  return res.status(404).json({
                        message: "Timeline not found.",
                        status: false,
                  });
            }

            const likeCount = await getTimelineLikeCount(timelineId);
            const token = req.header("Authorization");

            let like_status = "No";
            let subscribe_status = "No";

            const pic_name_url = await getSignedUrlS3(timelineData.user_id.pic);

            const updatedTimelineData = {
                  ...timelineData._doc,
                  user_id: {
                        ...timelineData.user_id._doc,
                        pic: pic_name_url,
                  },
                  like_count: likeCount,
                  like_status, // Include like_status
                  subscribe_status, // Include subscribe_status
            };

            if (token) {
                  // Check if the user has liked the current post
                  const isLiked = await PostTimelineLike.exists({
                        post_timeline_id: timelineId,
                        user_ids: req.user._id,
                  });

                  // Set like_status based on whether the user has liked the post
                  updatedTimelineData.like_status = isLiked ? "Yes" : "No";

                  const isSubscribe = await Subscribes.exists({
                        my_id: timelineData.user_id._id,
                        subscriber_id: req.user._id,
                  });

                  // Set subscribe_status based on whether the user has subscribed to the author
                  updatedTimelineData.subscribe_status = isSubscribe
                        ? "Yes"
                        : "No";
            }

            const updatedTimelineComments = await Promise.all(
                  timelineComments.map(async (comment) => {
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

            res.json({
                  message: "Timeline comments fetched successfully.",
                  status: true,
                  data: updatedTimelineData,
                  comments: updatedTimelineComments,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const updateTimelineViewCount = asyncHandler(async (req, res) => {
      try {
            // Extract timeline_id from the request body
            const { timeline_id } = req.body;

            // Ensure timeline_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(timeline_id)) {
                  return res.status(200).json({
                        message: "Invalid timeline_id format.",
                        status: false,
                  });
            }

            // Convert timeline_id to ObjectId
            const objectIdTimelineId = mongoose.Types.ObjectId(timeline_id);

            // Update the view count in the PostTimeline model
            const updatedTimeline = await PostTimeline.findByIdAndUpdate(
                  objectIdTimelineId,
                  { $inc: { view_count: 1 } }, // Increment view_count by 1
                  { new: true } // Return the updated document
            );

            if (!updatedTimeline) {
                  return res.status(404).json({
                        message: "Timeline not found.",
                        status: false,
                  });
            }

            res.status(200).json({
                  message: "View count updated successfully.",
                  status: true,
                  data: updatedTimeline,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const Timelinedelete = asyncHandler(async (req, res) => {
      try {
            // Extract user_id from headers
            const user_id = req.user._id;
            const { timeline_id } = req.body;

            // Ensure timeline_id is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(timeline_id)) {
                  return res.status(200).json({
                        message: "Invalid timeline_id format.",
                        status: false,
                  });
            }

            // Convert timeline_id to ObjectId
            const objectIdTimelineId = mongoose.Types.ObjectId(timeline_id);

            // Check if the user has the right to delete the timeline
            const timeline = await PostTimeline.findOne({
                  _id: objectIdTimelineId,
                  user_id,
            });

            if (!timeline) {
                  return res.status(403).json({
                        message: "You do not have permission to delete this timeline.",
                        status: false,
                  });
            }

            // Delete the timeline document from the database
            await PostTimeline.findByIdAndDelete(objectIdTimelineId);

            await AdminDashboard.updateOne(
                  {
                        /* Your condition to identify the relevant row in admindashboards */
                  },
                  { $inc: { post_count: -1 } }
            );

            // Delete timeline comments and likes (if you have models for them)
            await TimelineComment.deleteMany({
                  timeline_id: objectIdTimelineId,
            });
            await PostTimelineLike.deleteMany({
                  timeline_id: objectIdTimelineId,
            });

            res.status(200).json({
                  message: "Timeline data deleted successfully.",
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

const getMyTimeline = asyncHandler(async (req, res) => {
      const user_id = req.user._id;

      try {
            const timelines = await PostTimeline.find({ user_id })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic",
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name",
                  });

            if (!timelines || timelines.length === 0) {
                  return res.json({
                        message: "No timeline Posts Available.",
                        status: true,
                        data: [],
                  });
            }

            const updatedTimeline = await Promise.all(
                  timelines.map(async (timeline) => {
                        let like_status = "No"; // Move the declaration inside the loop
                        let subscribe_status = "No"; // Move the declaration inside the loop
                        const likeCount = await getTimelineLikeCount(
                              timeline._id
                        );
                        // Check if the user has liked the current post
                        const isLiked = await PostTimelineLike.exists({
                              post_timeline_id: timeline._id,
                              user_ids: req.user._id,
                        });

                        // Set like_status based on whether the user has liked the post
                        like_status = isLiked ? "Yes" : "No";

                        const issubscribe = await Subscribes.exists({
                              my_id: timeline.user_id._id,
                              subscriber_id: req.user._id,
                        });

                        // Set subscribe_status based on whether the user has subscribed to the author
                        subscribe_status = issubscribe ? "Yes" : "No";
                        const pic_name_url = await getSignedUrlS3(
                              timeline.user_id.pic
                        );
                        return {
                              ...timeline._doc,
                              user_id: {
                                    ...timeline.user_id._doc,
                                    pic: pic_name_url, // Assuming "pic" is the field in your User schema that contains the URL
                              },
                              like_count: likeCount,
                              like_status: like_status, // Add like_status to the response
                              subscribe_status: subscribe_status, // Add subscribe_status to the response
                        };
                  })
            );

            res.json({
                  message: "Timeline fetched successfully.",
                  status: true,
                  data: updatedTimeline,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getUserTimeline = asyncHandler(async (req, res) => {
      const { user_id, page } = req.params;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;

      try {
            // Fetch timeline posts from the database for the given user_id with pagination
            const timelines = await PostTimeline.find({ user_id })
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

            // Check if there are no timeline posts
            if (!timelines || timelines.length === 0) {
                  return res.json({
                        message: "No Timeline Posts Available.",
                        status: true,
                        data: [],
                  });
            }

            const token = req.header("Authorization");

            // Add the base URL to the pic field in user details and handle likes and subscriptions
            const updatedTimelines = await Promise.all(
                  timelines.map(async (timeline) => {
                        let like_status = "No"; // Move the declaration inside the loop
                        let subscribe_status = "No"; // Move the declaration inside the loop
                        const likeCount = await getTimelineLikeCount(
                              timeline._id
                        );

                        if (token) {
                              // Check if the user has liked the current post
                              const isLiked = await PostTimelineLike.exists({
                                    post_timeline_id: timeline._id,
                                    user_ids: req.user._id,
                              });

                              // Set like_status based on whether the user has liked the post
                              like_status = isLiked ? "Yes" : "No";

                              const issubscribe = await Subscribes.exists({
                                    my_id: timeline.user_id._id,
                                    subscriber_id: req.user._id,
                              });

                              // Set subscribe_status based on whether the user has subscribed to the author
                              subscribe_status = issubscribe ? "Yes" : "No";
                        }
                        const pic_name_url = await getSignedUrlS3(
                              timeline.user_id.pic
                        );
                        return {
                              ...timeline._doc,
                              user_id: {
                                    ...timeline.user_id._doc,
                                    pic: pic_name_url, // Assuming "pic" is the field in your User schema that contains the URL
                              },
                              like_count: likeCount,
                              like_status: like_status,
                              subscribe_status: subscribe_status,
                        };
                  })
            );

            res.json({
                  message: "Timeline posts fetched successfully.",
                  status: true,
                  data: updatedTimelines,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});
const getAllTimeline = asyncHandler(async (req, res) => {
      const { page = 1, search = "" } = req.body;
      const perPage = 2; // You can adjust this according to your requirements

      // Build the query based on search
      const query = search
            ? {
                    $or: [{ description: { $regex: search, $options: "i" } }],
              }
            : {};

      try {
            const users = await PostTimeline.find(query)
                  .skip((page - 1) * perPage)
                  .limit(perPage)
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic",
                  })
                  .populate({
                        path: "category_id",
                        select: "category_name",
                  });

            const totalCount = await PostTimeline.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            const transformedUsers = users.map((user) => {
                  let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object

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
const statusUpdate = async (req, res) => {
      const { status } = req.body;
      const { id } = req.body;

      try {
            const reel = await PostTimeline.findById(id);

            if (!reel) {
                  return res
                        .status(200)
                        .json({ message: "Project not found", status: false });
            }

            reel.status = status;
            await reel.save();

            return res
                  .status(200)
                  .json({
                        message: "Status updated successfully",
                        status: true,
                  });
      } catch (error) {
            console.error(error);
            return res
                  .status(500)
                  .json({ message: "Internal Server Error", status: false });
      }
};
module.exports = {
      uploadPostTimeline,
      getPaginatedTimeline,
      updatePostTimelineLike,
      addTimelineComment,
      updateTimelineViewCount,
      getTimelineComments,
      Timelinedelete,
      getMyTimeline,
      getUserTimeline,
      getAllTimeline,
      statusUpdate,
};
