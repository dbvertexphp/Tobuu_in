const mongoose = require("mongoose");
const dotenv = require("dotenv");
const asyncHandler = require("express-async-handler");
const { Video, VideoLike, VideoComment } = require("../models/videoModel.js");
const companyDetailsModel = require("../models/companyDetailsModel.js");
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
            contactUsEntry = await companyDetailsModel.ContactUs.create({
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

const getAllContact = asyncHandler(async (req, res) => {
      const { page = 1, search = "" } = req.body;
      const perPage = 2; // You can adjust this according to your requirements
  
      // Build the query based on search
      const query = search
          ? {
              $or: [
                  { message: { $regex: search, $options: "i" } },
              ],
          }
          : {};
  
      try {
          const reels = await companyDetailsModel.ContactUs.find(query)
              .skip((page - 1) * perPage)
              .limit(perPage);
              
  
          const totalCount = await companyDetailsModel.ContactUs.countDocuments(query);
          const totalPages = Math.ceil(totalCount / perPage);
  
          
          const transformedReels = reels.map((reel) => {
              let transformedReel = { ...reel.toObject() }; // Convert Mongoose document to plain JavaScript object
  
  
              return { user: transformedReel};
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

module.exports = {
      Checklikestatus,
      contactUs,
      getAllContact,
};
