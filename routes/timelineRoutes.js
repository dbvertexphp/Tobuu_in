const express = require("express");
const {
  uploadPostTimeline,
  getPaginatedTimeline,
  updatePostTimelineLike,
  addTimelineComment,
  updateTimelineViewCount,
  getTimelineComments,
  Timelinedelete,
  getMyTimeline,
  getUserTimeline
} = require("../controllers/timelineControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");

const timelineRoutes = express.Router();
timelineRoutes.route("/uploadPostTimeline").post(protect, uploadPostTimeline);
timelineRoutes.route("/addTimelineComment").post(protect, addTimelineComment);
timelineRoutes.route("/Timelinedelete").delete(protect, Timelinedelete);
timelineRoutes.route("/updateTimelineViewCount").post(protect, updateTimelineViewCount);
timelineRoutes.route("/getTimelineComments/:timelineId").get(commonProtect,getTimelineComments);
timelineRoutes.route('/getPaginatedTimeline/:page').get(commonProtect,getPaginatedTimeline);
timelineRoutes.route("/updatePostTimelineLike").post(protect, updatePostTimelineLike);
timelineRoutes.route("/getUserTimeline/:user_id/:page").get(commonProtect,getUserTimeline);
timelineRoutes.route("/getMyTimeline").get(protect, getMyTimeline);


module.exports = { timelineRoutes };
