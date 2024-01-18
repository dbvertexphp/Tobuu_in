const express = require("express");
const {
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
} = require("../controllers/videoControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");

const videoRoutes = express.Router();

videoRoutes.route("/uploadVideos").post(protect, uploadVideo);
videoRoutes.route("/updateVideoLike").post(protect, updateVideoLike);
videoRoutes.route("/addVideoComment").post(protect, addVideoComment);
videoRoutes.route("/deleteVideo").delete(protect, deleteVideo);
videoRoutes.route("/updateVideoViewCount").post(protect, updateVideoViewCount);
videoRoutes.route("/getVideoComments/:videoId").get(commonProtect, getVideoComments);
videoRoutes.route("/getPaginatedVideos/:page").get(commonProtect,getPaginatedVideos);
videoRoutes.route("/streamVideo/:videoId").get(streamVideo);
videoRoutes.route("/getVideosThumbnails/:limit").get(getVideosThumbnails);
videoRoutes.route("/getUserVideos/:user_id/:page").get(commonProtect, getUserVideos);
videoRoutes.route("/getMyVideos/:limit").get(protect, getMyVideos);

module.exports = { videoRoutes };
