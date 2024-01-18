const asyncHandler = require("express-async-handler");
const { PostJob, AppliedUser } = require("../models/postjobModel.js");
const { AdminDashboard } = require("../models/userModel.js");
require("dotenv").config();
const uploadPostJob = asyncHandler(async (req, res) => {
      const user_id = req.user._id; // Assuming you have user authentication middleware

      const { category_id, description } = req.body;
      if (!category_id || !description) {
            res.status(200).json({
                  message: "Please enter all the required fields.",
                  status: false,
            });
            return;
      }
      const postjob = await PostJob.create({
            category_id,
            description,
            user_id,
      });
      if (postjob) {
            // Increment reels_count in AdminDashboard
            try {
                  const adminDashboard = await AdminDashboard.findOne();
                  adminDashboard.job_count++;
                  await adminDashboard.save();
                  console.log("Reels count updated successfully.");
            } catch (error) {
                  console.error("Error updating reels count:", error);
            }
      }
      if (postjob) {
            res.status(201).json({
                  postjob,
                  status: true,
            });
      } else {
            res.status(200).json({
                  message: "Job Not Post.",
                  status: false,
            });
            return;
      }
});

const getPaginatedJob = asyncHandler(async (req, res) => {
      const page = parseInt(req.params.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;

      try {
            const paginatedJobs = await PostJob.find()
                  .sort({ createdAt: -1 })
                  .skip(startIndex)
                  .limit(limit)
                  .populate({
                        path: "category_id",
                        select: "category_name",
                  })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic",
                  })
                  .exec();

            const totalJobs = await PostJob.countDocuments();
            const hasMore = startIndex + paginatedJobs.length < totalJobs;

            if (paginatedJobs.length === 0) {
                  return res.json({
                        message: "Job Not Found",
                        status: true,
                  });
            }

            // Check if a token is present in the request header
            const token = req.header("Authorization");

            // Iterate through jobs to get apply status and add additional fields
            const jobsWithAdditionalInfo = await Promise.all(
                  paginatedJobs.map(async (job) => {
                        let apply_status = "No"; // Move the declaration inside the loop

                        if (token) {
                              // Check if the user has applied for the current job
                              const hasApplied = await AppliedUser.exists({
                                    job_id: job._id,
                                    user_ids: req.user._id,
                              });

                              // Set apply_status based on whether the user has applied for the job
                              apply_status = hasApplied ? "Yes" : "No";
                        }

                        // Add the base URL to the user's profile picture
                        const updatedUser = job.user_id
                              ? {
                                      ...job.user_id._doc,
                                      pic: `${process.env.BASE_URL}${job.user_id.pic}`,
                                }
                              : null;

                        return {
                              ...job._doc,
                              user_id: updatedUser,
                              apply_status: apply_status, // Add apply_status to the response
                              // Add additional fields here if needed
                        };
                  })
            );

            res.json({
                  page,
                  limit,
                  status: true,
                  data: jobsWithAdditionalInfo,
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

const appliedPostJob = asyncHandler(async (req, res) => {
      const { job_id } = req.body;
      const user_id = req.user._id;

      try {
            // Check if the job application already exists
            const existingApplication = await AppliedUser.findOne({ job_id });

            // Check if the job's user_id matches the current user_id (user cannot apply to their own job)
            const job = await PostJob.findOne({
                  _id: job_id,
                  user_id,
            });

            if (job) {
                  return res.json({
                        message: "You cannot apply to your own job.",
                        status: false,
                  });
            }
            if (existingApplication) {
                  // Check if user_id already exists in the user_ids array
                  if (!existingApplication.user_ids.includes(user_id)) {
                        // If it doesn't exist, update the user_ids array
                        await existingApplication.updateOne({
                              $addToSet: { user_ids: user_id },
                        });

                        return res.json({
                              message: "User added to the existing job application.",
                              status: true,
                        });
                  } else {
                        return res.json({
                              message: "User already applied for this job.",
                              status: true,
                        });
                  }
            } else {
                  // If it doesn't exist, create a new job application
                  const newApplication = new AppliedUser({
                        user_ids: [user_id],
                        job_id,
                  });
                  await newApplication.save();

                  return res.json({
                        message: "New job application created.",
                        status: true,
                  });
            }
      } catch (error) {
            console.error(error);
            return res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getAppliedJobs = asyncHandler(async (req, res) => {
      const user_id = req.user._id;

      try {
            // Use Mongoose to fetch applied jobs from the database
            const appliedJobs = await AppliedUser.find({ user_ids: user_id })
                  .populate({
                        path: "job_id",
                        populate: [
                              { path: "category_id", select: "category_name" },
                              {
                                    path: "user_id",
                                    select: "first_name pic last_name",
                              },
                        ],
                  })
                  .exec();

            if (!appliedJobs || appliedJobs.length === 0) {
                  return res.json({
                        message: "No applied jobs found.",
                        status: true,
                        data: [],
                  });
            }

            // Transform the data to include the job description
            const transformedJobs = appliedJobs.map(
                  ({ job_id, createdAt, updatedAt, __v }) => ({
                        _id: job_id._id,
                        category_id: {
                              category_name: job_id.category_id.category_name,
                        },

                        user_id: {
                              first_name: job_id.user_id.first_name,
                              last_name: job_id.user_id.last_name,
                              pic: `${process.env.BASE_URL}${job_id.user_id.pic}`, // Add the base URL to the pic field
                        },
                        description: job_id.description, // Include the job description
                        createdAt,
                        updatedAt,
                        __v,
                        apply_status: "Yes",
                        job_status: "Open",
                  })
            );

            res.json({
                  message: "Applied jobs fetched successfully.",
                  status: true,
                  data: transformedJobs,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getAppliedUsers = asyncHandler(async (req, res) => {
      const { job_id } = req.params;

      try {
            // Use Mongoose to fetch applied users for the specified job_id
            const appliedUsers = await AppliedUser.findOne({ job_id })
                  .populate({
                        path: "user_ids",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  })
                  .exec();

            if (!appliedUsers) {
                  return res.json({
                        message: "No users have applied for this job.",
                        status: true,
                        data: [],
                  });
            }

            // Transform the data to include user details
            const transformedUsers = appliedUsers.user_ids.map(
                  ({ _id, first_name, last_name, pic }) => ({
                        user_id: {
                              _id,
                              first_name,
                              last_name,
                              pic: `${process.env.BASE_URL}${pic}`, // Add the base URL to the pic field
                        },
                  })
            );

            res.json({
                  message: "Applied users fetched successfully.",
                  status: true,
                  data: transformedUsers,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getMyJobs = asyncHandler(async (req, res) => {
      const user_id = req.user._id; // Assuming you have user authentication middleware
      const page = parseInt(req.params.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const startIndex = (page - 1) * limit;

      try {
            // Use Mongoose to fetch paginated Jobs for the authenticated user
            const paginatedJobs = await PostJob.find({ user_id })
                  .populate({
                        path: "category_id",
                        select: "category_name",
                  })
                  .skip(startIndex)
                  .limit(limit);

            const totalJobs = await PostJob.countDocuments({ user_id });
            const hasMore = startIndex + paginatedJobs.length < totalJobs;

            // Transform the data to include user details and applied_count
            const transformedJobs = await Promise.all(
                  paginatedJobs.map(async (job) => {
                        // Count the number of user_ids in the AppliedUser table for the current job
                        const userCountData = await AppliedUser.aggregate([
                              {
                                    $match: {
                                          job_id: job._id,
                                    },
                              },
                              {
                                    $project: {
                                          userCount: { $size: "$user_ids" },
                                    },
                              },
                        ]);

                        const appliedUsersCount =
                              userCountData.length > 0
                                    ? userCountData[0].userCount
                                    : 0;

                        return {
                              ...job._doc,
                              category_id: {
                                    category_name:
                                          job.category_id.category_name,
                              },
                              user_id: {
                                    first_name: req.user.first_name,
                                    last_name: req.user.last_name,
                                    pic: `${process.env.BASE_URL}${req.user.pic}`,
                              },
                              applied_count: appliedUsersCount, // Add applied_count to the transformed job data
                        };
                  })
            );

            if (transformedJobs.length === 0) {
                  return res.json({
                        message: "No jobs posted by you.",
                        status: false,
                        data: [],
                  });
            }

            res.json({
                  status: true,
                  page,
                  limit,
                  data: transformedJobs,
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

const updateJobStatus = asyncHandler(async (req, res) => {
      const { job_id, job_status } = req.body;

      try {
            // Check if the job with the given job_id exists
            const job = await PostJob.findOne({ _id: job_id });

            if (!job) {
                  return res.status(404).json({
                        message: "Job not found.",
                        status: false,
                  });
            }
            // Update the job_status based on the received value
            job.job_status = job_status === 1 ? "Close" : "Open";
            await job.save();

            // Log the updated job status for debugging

            res.json({
                  message: "Job status updated successfully.",
                  status: true,
                  job_status: job.job_status,
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
      uploadPostJob,
      getPaginatedJob,
      appliedPostJob,
      getAppliedJobs,
      getAppliedUsers,
      getMyJobs,
      updateJobStatus,
};
