const asyncHandler = require("express-async-handler");
const { PostJob, AppliedUser } = require("../models/postjobModel.js");
const { AdminDashboard } = require("../models/userModel.js");
require("dotenv").config();
const baseURL = process.env.BASE_URL;
const { getSignedUrlS3 } = require("../config/aws-s3.js");

const uploadPostJob = asyncHandler(async (req, res) => {
      const user_id = req.user._id; // Assuming you have user authentication middleware

      const { category_id, description, title } = req.body;
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
            title,
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
            let jobQuery = PostJob.find({ deleted_at: null })
                  .sort({ _id: -1 })
                  .skip(startIndex)
                  .limit(limit)
                  .populate({
                        path: "category_id",
                        select: "category_name",
                  })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic",
                  });

            let totalJobs;

            const category_id = req.body.category_id; // URL parameter for category_id
            const search = req.body.search; // URL parameter for search

            if (category_id) {
                  jobQuery = jobQuery.where("category_id").equals(category_id);
                  totalJobs = await PostJob.countDocuments({
                        category_id,
                        deleted_at: null,
                  });
            } else if (search) {
                  jobQuery = jobQuery.where("title", new RegExp(search, "i"));
                  totalJobs = await PostJob.countDocuments({
                        title: search,
                        deleted_at: null,
                  });
            } else {
                  totalJobs = await PostJob.countDocuments({
                        deleted_at: null,
                  });
            }

            const paginatedJobs = await jobQuery.exec();

            const hasMore = startIndex + paginatedJobs.length < totalJobs;

            if (paginatedJobs.length === 0) {
                  return res.json({
                        message: "Job Not Found",
                        status: true,
                  });
            }

            const token = req.header("Authorization");

            const jobsWithAdditionalInfo = await Promise.all(
                  paginatedJobs.map(async (job) => {
                        let apply_status = "No";

                        if (token) {
                              const hasApplied = await AppliedUser.exists({
                                    job_id: job._id,
                                    user_ids: req.user._id,
                              });
                              apply_status = hasApplied ? "Yes" : "No";
                        }

                        const pic_name_url = await getSignedUrlS3(
                              job.user_id.pic
                        );
                        const updatedUser = job.user_id
                              ? { ...job.user_id._doc, pic: pic_name_url }
                              : null;

                        return {
                              ...job._doc,
                              user_id: updatedUser,
                              apply_status: apply_status,
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

const getPaginatedPostJobsAdmin = asyncHandler(async (req, res) => {
      const page = parseInt(req.body.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit;

      try {
            let postJobQuery = PostJob.find();

            if (req.body.search) {
                  postJobQuery = postJobQuery.where({
                        title: { $regex: req.body.search, $options: "i" },
                  });
            }

            // Use Mongoose to fetch paginated post jobs from the database
            const paginatedPostJobs = await postJobQuery
                  .skip(startIndex)
                  .limit(limit)
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic", // Adjust these fields based on your User schema
                  });

            const totalPostJobs = await PostJob.countDocuments(
                  postJobQuery.getQuery()
            );
            const totalPages = Math.ceil(totalPostJobs / limit);
            const hasMore =
                  startIndex + paginatedPostJobs.length < totalPostJobs;

            if (paginatedPostJobs.length === 0) {
                  return res.json({
                        message: "Post Jobs Not Found",
                        status: true,
                  });
            }

            // Transform and exclude specific fields in the response
            const transformedPostJobs = [];
            const token = req.header("Authorization");

            for (const postJob of paginatedPostJobs) {
                  const { updatedAt, __v, ...response } = postJob._doc;

                  // You may need to adjust this logic based on your PostJob schema
                  // Transforming user pic as an example
                  const pic_name_url = await getSignedUrlS3(
                        postJob.user_id.pic
                  );
                  const updatedUser = {
                        ...postJob.user_id._doc,
                        pic: pic_name_url,
                  };

                  // Other transformation logic for PostJob

                  transformedPostJobs.push({
                        ...response,
                        user_id: updatedUser,
                        // Other fields as required
                  });
            }

            const paginationDetails = {
                  current_page: page,
                  data: transformedPostJobs,
                  first_page_url: `${baseURL}api/postjobs?page=1&limit=${limit}`,
                  from: startIndex + 1,
                  last_page: totalPages,
                  last_page_url: `${baseURL}api/postjobs?page=${totalPages}&limit=${limit}`,
                  next_page_url:
                        page < totalPages
                              ? `${baseURL}api/postjobs?page=${
                                      page + 1
                                }&limit=${limit}`
                              : null,
                  path: `${baseURL}api/postjobs`,
                  per_page: limit,
                  prev_page_url:
                        page > 1
                              ? `${baseURL}api/postjobs?page=${
                                      page - 1
                                }&limit=${limit}`
                              : null,
                  to: startIndex + transformedPostJobs.length,
                  total: totalPostJobs,
                  hasMore: hasMore, // Include the hasMore flag in the response
            };

            res.json({
                  PostJobs: paginationDetails,
                  page: page.toString(),
                  total_rows: totalPostJobs,
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
                  deleted_at: null,
            });

            const jobData = await PostJob.findOne({
                  _id: job_id,
                  deleted_at: null,
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
                        category_id: jobData.category_id,
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
      const { category_id } = req.body; // Extract category_id from request body

      try {
            let appliedJobsQuery = AppliedUser.find({
                  user_ids: user_id,
            }).populate({
                  path: "job_id",
                  populate: [
                        { path: "category_id", select: "category_name" },
                        { path: "user_id", select: "first_name pic last_name" },
                  ],
            });

            // Apply category filter if category_id is provided
            if (category_id) {
                  appliedJobsQuery = appliedJobsQuery
                        .where("category_id")
                        .equals(category_id);
            }

            const appliedJobs = await appliedJobsQuery.exec();

            if (!appliedJobs || appliedJobs.length === 0) {
                  return res.json({
                        message: "No applied jobs found.",
                        status: true,
                        data: [],
                  });
            }

            const transformedJobs = await Promise.all(
                  appliedJobs.map(
                        async ({ job_id, createdAt, updatedAt, __v }) => {
                              try {
                                    const pic_name_url = await getSignedUrlS3(
                                          job_id.user_id.pic
                                    );

                                    return {
                                          _id: job_id._id,
                                          category_id: {
                                                category_name:
                                                      job_id.category_id
                                                            .category_name,
                                          },
                                          user_id: {
                                                first_name:
                                                      job_id.user_id.first_name,
                                                last_name:
                                                      job_id.user_id.last_name,
                                                pic: pic_name_url,
                                          },
                                          description: job_id.description,
                                          title: job_id.title,
                                          createdAt,
                                          updatedAt,
                                          __v,
                                          apply_status: "Yes",
                                          job_status: "Open",
                                    };
                              } catch (error) {
                                    console.error(
                                          "Error fetching signed URL:",
                                          error
                                    );
                                    throw error; // Rethrow the error to catch block
                              }
                        }
                  )
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
            const transformedUsers = await Promise.all(
                  appliedUsers.user_ids.map(
                        async ({ _id, first_name, last_name, pic }) => {
                              const pic_name_url = await getSignedUrlS3(pic);

                              return {
                                    user_id: {
                                          _id,
                                          first_name,
                                          last_name,
                                          pic: pic_name_url,
                                    },
                              };
                        }
                  )
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
            let jobQuery = PostJob.find({ user_id, deleted_at: null })
                  .populate({
                        path: "category_id",
                        select: "category_name",
                  })
                  .sort({ _id: -1 })
                  .skip(startIndex)
                  .limit(limit);

            let totalJobs;

            if (req.body.category_id) {
                  jobQuery = jobQuery
                        .where("category_id")
                        .equals(req.body.category_id);
                  totalJobs = await PostJob.countDocuments({
                        user_id,
                        category_id: req.body.category_id,
                  });
            } else {
                  totalJobs = await PostJob.countDocuments({ user_id });
            }

            const paginatedJobs = await jobQuery.exec();
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
                        const pic_name_url = await getSignedUrlS3(req.user.pic);
                        return {
                              ...job._doc,
                              category_id: {
                                    category_name:
                                          job.category_id.category_name,
                                    _id: job.category_id._id,
                              },

                              user_id: {
                                    first_name: req.user.first_name,
                                    last_name: req.user.last_name,
                                    pic: req.user.pic,
                                    _id: req.user._id,
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

const getAllJob = asyncHandler(async (req, res) => {
      const { page = 1, search = "" } = req.body;
      const perPage = 5; // You can adjust this according to your requirements

      // Build the query based on search
      const query = search
            ? {
                    $or: [
                          { description: { $regex: search, $options: "i" } },
                          // Add more fields to search if needed
                    ],
              }
            : {};

      try {
            // Fetch job posts based on the query, with pagination
            const jobPosts = await PostJob.find({ query, deleted_at: null })
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

            // Get total count of job posts matching the query
            const totalCount = await PostJob.countDocuments(query);

            // Calculate total pages based on total count and per page limit
            const totalPages = Math.ceil(totalCount / perPage);

            // Transform job posts to include necessary fields
            const transformedJobPosts = jobPosts.map((user) => {
                  let transformedUser = { ...user.toObject() }; // Convert Mongoose document to plain JavaScript object

                  return { user: transformedUser };
            });

            // Prepare pagination details for response
            const paginationDetails = {
                  current_page: parseInt(page),
                  data: transformedJobPosts,
                  first_page_url: `${baseURL}api/jobs?page=1`,
                  from: (page - 1) * perPage + 1,
                  last_page: totalPages,
                  last_page_url: `${baseURL}api/jobs?page=${totalPages}`,
                  links: [
                        {
                              url: null,
                              label: "&laquo; Previous",
                              active: false,
                        },
                        {
                              url: `${baseURL}api/jobs?page=${page}`,
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
                  path: `${baseURL}api/jobs`,
                  per_page: perPage,
                  prev_page_url: null,
                  to: (page - 1) * perPage + transformedJobPosts.length,
                  total: totalCount,
            };

            // Send response with pagination details
            res.json({
                  Jobs: paginationDetails,
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
            const reel = await PostJob.findById(id);

            if (!reel) {
                  return res
                        .status(200)
                        .json({ message: "Project not found", status: false });
            }

            reel.status = status;
            await reel.save();

            return res.status(200).json({
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

const searchJobPosts = asyncHandler(async (req, res) => {
      const { page = 1, title = "" } = req.body;
      const perPage = 4; // You can adjust this according to your requirements

      // Build the query based on title with case-insensitive search
      const query = {
            title: { $regex: title, $options: "i" },
      };

      try {
            const jobPosts = await PostJob.find({ ...query, deleted_at: null })
                  .select("_id title")
                  .skip((page - 1) * perPage)
                  .limit(perPage);

            const totalCount = await PostJob.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            // Add the label "Job List" to each job post item
            let jobPostsWithLabel = jobPosts.map((jobPost) => ({
                  ...jobPost.toObject(),
                  label: "Job List",
            }));

            if (jobPostsWithLabel.length === 4) {
                  jobPostsWithLabel.push({
                        _id: "See_All",
                        title: "See All",
                        label: "Job List",
                  });
            }

            res.json({
                  data: jobPostsWithLabel,
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

const JobAdminStatus = asyncHandler(async (req, res) => {
      const jobId = req.body.jobId;
      try {
            // Find the job by its _id
            const job = await PostJob.findById(jobId);

            if (!job) {
                  return res.status(404).json({ message: "Job  not found" });
            }

            // Check if deleted_at field is null or has a value
            if (job.deleted_at === null) {
                  // If deleted_at is null, update it with new Date()
                  job.deleted_at = new Date();
            } else {
                  // If deleted_at has a value, update it with null
                  job.deleted_at = null;
            }

            // Save the updated job
            await job.save();

            return res.status(200).json({
                  message: "Timeline soft delete status toggled successfully",
            });
      } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal Server Error" });
      }
});

const getPaginatedJobHome = asyncHandler(async (category_id) => {
      const page = 1; // Default page value
      const limit = 5; // Default limit value
      const startIndex = (page - 1) * limit;

      try {
            let jobQuery = PostJob.find({ deleted_at: null })
                  .sort({ _id: -1 })
                  .skip(startIndex)
                  .limit(limit)
                  .populate({
                        path: "category_id",
                        select: "category_name",
                  })
                  .populate({
                        path: "user_id",
                        select: "first_name last_name pic",
                  });

            let totalJobs;

            if (category_id) {
                  jobQuery = jobQuery.where("category_id").equals(category_id);
                  totalJobs = await PostJob.countDocuments({
                        category_id,
                        deleted_at: null,
                  });
            } else {
                  totalJobs = await PostJob.countDocuments({
                        deleted_at: null,
                  });
            }

            const paginatedJobs = await jobQuery.exec();

            const hasMore = startIndex + paginatedJobs.length < totalJobs;

            if (paginatedJobs.length === 0) {
                  return {
                        message: "Job Not Found",
                        status: true,
                  };
            }

            const jobsWithAdditionalInfo = await Promise.all(
                  paginatedJobs.map(async (job) => {
                        // Apply status is removed since there is no request object
                        const pic_name_url = await getSignedUrlS3(
                              job.user_id.pic
                        );
                        const updatedUser = job.user_id
                              ? { ...job.user_id._doc, pic: pic_name_url }
                              : null;

                        return {
                              ...job._doc,
                              user_id: updatedUser,
                        };
                  })
            );

            return {
                  page,
                  limit,
                  status: true,
                  data: jobsWithAdditionalInfo,
                  hasMore,
            };
      } catch (error) {
            return {
                  message: "Internal Server Error",
                  error: error.message,
                  status: false,
            };
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
      getAllJob,
      statusUpdate,
      searchJobPosts,
      getPaginatedPostJobsAdmin,
      JobAdminStatus,
      getPaginatedJobHome,
};
