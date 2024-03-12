const mongoose = require("mongoose");
const dotenv = require("dotenv");
const asyncHandler = require("express-async-handler");
const { Video, VideoLike, VideoComment } = require("../models/videoModel.js");
const { getVideoThumbnailsHome } = require("./videoControllers.js");
const { getReelThumbnailsHome } = require("./reelControllers.js");
const { getPaginatedJobHome } = require("./jobControllers.js");
const { getPaginatedTimelineHome } = require("./timelineControllers.js");
const {
      companyDetailsModel,
      Report,
      ContactUs,
} = require("../models/companyDetailsModel.js");
const { Reel, ReelLike, ReelComment } = require("../models/reelsModel.js");
const {
      PostTimeline,
      PostTimelineLike,
      TimelineComment,
} = require("../models/posttimelineModel.js");
const path = require("path");
require("dotenv").config();
const baseURL = process.env.BASE_URL;

const Checklikestatus = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id; // Assuming user_id is extracted from the token header
            const { type, id } = req.body;

            let likeStatus = 0;
            switch (type) {
                  case "video":
                        const videoLike = await VideoLike.findOne({
                              video_id: id,
                              user_ids: user_id,
                        });
                        if (videoLike) {
                              likeStatus = 1;
                        }
                        break;
                  case "reel":
                        const reelLike = await ReelLike.findOne({
                              reel_id: id,
                              user_ids: user_id,
                        });
                        if (reelLike) {
                              likeStatus = 1;
                        }
                        break;
                  case "timeline":
                        const timelineLike = await PostTimelineLike.findOne({
                              post_timeline_id: id,
                              user_ids: user_id,
                        });
                        if (timelineLike) {
                              likeStatus = 1;
                        }
                        break;
                  default:
                        // Handle invalid type
                        return res.status(400).json({ error: "Invalid type" });
            }

            return res.json({ status: true, likeStatus });
      } catch (error) {
            console.error("Error checking like status:", error);
            return res.status(500).json({ error: "Internal server error" });
      }
});

const contactUs = asyncHandler(async (req, res) => {
      try {
            // Extract parameters from the request body
            const { name, email_id, mobile_number, message } = req.body;

            // Validate parameters (you may add more validation as needed)
            if (!name || !email_id || !mobile_number || !message) {
                  return res
                        .status(400)
                        .json({ error: "Missing required parameters" });
            }

            // Create a new ContactUs document
            contactUsEntry = await ContactUs.create({
                  name,
                  email_id,
                  mobile_number,
                  message,
            });

            // Save the ContactUs document to the database

            // Send a success response
            return res.json({
                  status: true,
                  message: "Contact form submitted successfully",
            });
      } catch (error) {
            console.error("Error processing contact form:", error);
            return res.status(500).json({ error: "Internal server error" });
      }
});

const report = asyncHandler(async (req, res) => {
      try {
            // Extract parameters from the request body
            // report_type =  video , timeline , reels
            const { report_type, type_id, title, description } = req.body;

            const user_id = req.user._id;
            // Validate parameters (you may add more validation as needed)
            if (
                  !user_id ||
                  !report_type ||
                  !type_id ||
                  !title ||
                  !description
            ) {
                  return res
                        .status(400)
                        .json({ error: "Missing required parameters" });
            }

            // Create a new Report document
            const reportEntry = await Report.create({
                  user_id,
                  report_type,
                  type_id,
                  title,
                  description,
            });

            // Send a success response
            return res.json({
                  status: true,
                  message: "Report submitted successfully",
                  data: reportEntry, // Optionally, you can send the created report data back to the client
            });
      } catch (error) {
            console.error("Error processing report:", error);
            return res.status(500).json({ error: "Internal server error" });
      }
});

const getAllContact = asyncHandler(async (req, res) => {
      const { page = 1, search = "" } = req.body;
      const perPage = 10; // You can adjust this according to your requirements

      // Build the query based on search
      const query = search
            ? {
                    $or: [
                          { message: { $regex: search, $options: "i" } },
                          { name: { $regex: search, $options: "i" } },
                          { email_id: { $regex: search, $options: "i" } },
                          { mobile_number: { $regex: search, $options: "i" } },
                    ],
              }
            : {};

      try {
            const reels = await ContactUs.find(query)
                  .skip((page - 1) * perPage)
                  .limit(perPage);

            const totalCount = await ContactUs.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            const transformedReels = reels.map((reel) => {
                  let transformedReel = { ...reel.toObject() }; // Convert Mongoose document to plain JavaScript object

                  return { user: transformedReel };
            });

            const paginationDetails = {
                  current_page: parseInt(page),
                  data: transformedReels,
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
                  to: (page - 1) * perPage + transformedReels.length,
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

const getAllReports = asyncHandler(async (req, res) => {
      const { page = 1, search = "" } = req.body;
      const perPage = 10; // You can adjust this according to your requirements

      try {
            let query = {};

            if (search) {
                  query = {
                        $or: [
                              { title: { $regex: search, $options: "i" } },
                              {
                                    description: {
                                          $regex: search,
                                          $options: "i",
                                    },
                              },
                              // Add other fields you want to search here
                        ],
                  };
            }

            const reports = await Report.find(query)
                  .skip((page - 1) * perPage)
                  .limit(perPage)
                  .populate({
                        path: "user_id",
                        select: "_id username", // Select only necessary fields from user_id
                  })
                  .lean(); // Convert documents to plain JavaScript objects for modification

            const totalCount = await Report.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            // Iterate through reports and populate type_id fields
            for (let report of reports) {
                  if (report.report_type === "video") {
                        // Populate data from Video table
                        const videoData = await Video.findById(
                              report.type_id
                        ).populate("user_id", "_id username");
                        report.type_id = videoData
                              ? {
                                      _id: videoData._id,
                                      title: videoData.title,
                                      deleted_at: videoData.deleted_at,
                                      user_id: {
                                            _id: videoData.user_id._id,
                                            username: videoData.user_id
                                                  .username,
                                      },
                                }
                              : null;
                  } else if (report.report_type === "reels") {
                        // Populate data from Reel table
                        const reelData = await Reel.findById(
                              report.type_id
                        ).populate("user_id", "_id username");
                        report.type_id = reelData
                              ? {
                                      _id: reelData._id,
                                      title: reelData.title,
                                      share_Id: reelData.share_Id,
                                      deleted_at: reelData.deleted_at,
                                      user_id: {
                                            _id: reelData.user_id._id,
                                            username: reelData.user_id.username,
                                      },
                                }
                              : null;
                  } else if (report.report_type === "timeline") {
                        // Populate data from Timeline table
                        const timelineData = await PostTimeline.findById(
                              report.type_id
                        ).populate("user_id", "_id username");
                        report.type_id = timelineData
                              ? {
                                      _id: timelineData._id,
                                      title: timelineData.title,
                                      deleted_at: timelineData.deleted_at,
                                      user_id: {
                                            _id: timelineData.user_id._id,
                                            username: timelineData.user_id
                                                  .username,
                                      },
                                }
                              : null;
                  }
            }

            const paginationDetails = {
                  current_page: parseInt(page),
                  data: reports,
                  first_page_url: `${baseURL}api/reports?page=1`,
                  from: (page - 1) * perPage + 1,
                  last_page: totalPages,
                  last_page_url: `${baseURL}api/reports?page=${totalPages}`,
                  per_page: perPage,
                  next_page_url: null,
                  path: `${baseURL}api/users`,
                  per_page: perPage,
                  prev_page_url: null,
                  to: (page - 1) * perPage + reports.length,
                  total: totalCount,
                  // Include pagination links here
            };

            res.json({
                  Reports: paginationDetails,
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
const HomePage = asyncHandler(async (req, res) => {
      const category_id = req.body.category_id;
      try {
            const videoList = await getVideoThumbnailsHome(category_id);
            const ReelsList = await getReelThumbnailsHome(category_id);
            const JobList = await getPaginatedJobHome(category_id);
            const TimelineList = await getPaginatedTimelineHome(category_id);
            res.status(200).json({
                  videoList: videoList,
                  reelsList: ReelsList,
                  jobList: JobList,
                  timelineList: TimelineList,
            });
      } catch (error) {
            console.error("Error in HomePage:", error);
            res.status(500).json({
                  message: "Internal Server Error.",
                  status: false,
            });
      }
});
module.exports = {
      Checklikestatus,
      contactUs,
      report,
      getAllContact,
      getAllReports,
      HomePage,
};
