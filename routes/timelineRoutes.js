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
      getUserTimeline,
      getAllTimeline,
      statusUpdate,
      searchPostsOnTimeline,
      getPaginatedPostTimelinesAdmin,
      TimelineAdminStatus,
      ViewCountAdd,
} = require("../controllers/timelineControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");

const timelineRoutes = express.Router();
timelineRoutes.route("/uploadPostTimeline").post(protect, uploadPostTimeline);
timelineRoutes.route("/searchPostsOnTimeline").post(searchPostsOnTimeline);
timelineRoutes.route("/addTimelineComment").post(protect, addTimelineComment);
timelineRoutes.route("/ViewCountAdd").post(protect, ViewCountAdd);
timelineRoutes.route("/Timelinedelete").delete(protect, Timelinedelete);
timelineRoutes
      .route("/updateTimelineViewCount")
      .post(protect, updateTimelineViewCount);
timelineRoutes
      .route("/getTimelineComments/:timelineId")
      .get(commonProtect, getTimelineComments);
timelineRoutes
      .route("/getPaginatedTimeline/:page")
      .post(commonProtect, getPaginatedTimeline);
timelineRoutes
      .route("/updatePostTimelineLike")
      .post(protect, updatePostTimelineLike);
timelineRoutes
      .route("/getUserTimeline/:user_id/:page")
      .get(commonProtect, getUserTimeline);
timelineRoutes.route("/getMyTimeline/:page").get(protect, getMyTimeline);
timelineRoutes.route("/getAllTimeline").post(protect, getAllTimeline);
timelineRoutes.route("/statusUpdate").post(protect, statusUpdate);

//---------------------- Admin -----------------------------//

timelineRoutes
      .route("/getPaginatedPostTimelinesAdmin")
      .post(protect, getPaginatedPostTimelinesAdmin);
timelineRoutes.route("/TimelineAdminStatus").post(protect, TimelineAdminStatus);
module.exports = { timelineRoutes };
