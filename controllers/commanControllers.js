const mongoose = require("mongoose");
const dotenv = require("dotenv");
const asyncHandler = require("express-async-handler");
const { Video, VideoLike, VideoComment } = require("../models/videoModel.js");
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

module.exports = {
      Checklikestatus,
      contactUs,
      report,
};
