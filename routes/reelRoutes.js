const express = require("express");
const {
      uploadReel,
      getPaginatedReel,
      streamReel,
      updateReelLike,
      addReelComment,
      updateReelViewCount,
      getReelComments,
      deleteReel,
      getReelThumbnails,
      getMyReels,
      getUserReels,
      getReelsUploadUrlS3
} = require("../controllers/reelControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");

const reelRoutes = express.Router();
reelRoutes.route("/uploadReel").post(protect, uploadReel);
reelRoutes.route("/updateReelLike").post(protect, updateReelLike);
reelRoutes.route("/addReelComment").post(protect, addReelComment);
reelRoutes.route("/deleteReel").delete(protect, deleteReel);
reelRoutes.route("/updateReelViewCount").post(protect, updateReelViewCount);
reelRoutes.route("/getReelComments/:reelId").get(commonProtect, getReelComments);
reelRoutes.route("/getPaginatedReel/:page").get(commonProtect,getPaginatedReel);
reelRoutes.route("/streamReel/:reelId").get(streamReel);
reelRoutes.route("/getReelThumbnails/:limit").get(getReelThumbnails);
reelRoutes.route("/getUserReels/:user_id/:page").get(commonProtect,getUserReels);
reelRoutes.route("/getMyReels").get(protect, getMyReels);
reelRoutes.route("/getReelsUploadUrlS3").get(protect, getReelsUploadUrlS3);

module.exports = { reelRoutes };
