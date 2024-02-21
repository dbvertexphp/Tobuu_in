const express = require("express");
const {
      uploadVideo,
      getPaginatedVideos,
      getAllVideo,
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
      searchVideos,
      getPaginatedVideosAdmin,
      VideoAdminStatus,
      ViewCountAdd,
} = require("../controllers/videoControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");

const videoRoutes = express.Router();

videoRoutes.route("/uploadVideos").post(protect, uploadVideo);
videoRoutes.route("/searchVideos").post(searchVideos);
videoRoutes.route("/updateVideoLike").post(protect, updateVideoLike);
videoRoutes.route("/addVideoComment").post(protect, addVideoComment);
videoRoutes.route("/deleteVideo").delete(protect, deleteVideo);
videoRoutes.route("/updateVideoViewCount").post(protect, updateVideoViewCount);
videoRoutes
      .route("/getVideoComments/:videoId")
      .get(commonProtect, getVideoComments);
videoRoutes
      .route("/getPaginatedVideos/:page")
      .post(commonProtect, getPaginatedVideos);
videoRoutes.route("/getAllVideo/:page").post(commonProtect, getAllVideo);
videoRoutes.route("/streamVideo/:videoId").get(streamVideo);
videoRoutes.route("/getVideosThumbnails/:limit").post(getVideosThumbnails);
videoRoutes
      .route("/getUserVideos/:user_id/:page")
      .get(commonProtect, getUserVideos);
videoRoutes.route("/getMyVideos/:limit").get(protect, getMyVideos);
videoRoutes.route("/getVideoUploadUrlS3").get(protect, getVideoUploadUrlS3);
videoRoutes.route("/ViewCountAdd").post(protect, ViewCountAdd);

//---------------------- Admin -----------------------------//

videoRoutes
      .route("/getPaginatedVideosAdmin")
      .post(protect, getPaginatedVideosAdmin);
videoRoutes.route("/VideoAdminStatus").post(protect, VideoAdminStatus);

module.exports = { videoRoutes };
