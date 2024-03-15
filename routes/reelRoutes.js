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
      getAllReels,
      statusUpdate,
      getReelsUploadUrlS3,
      getReel_ByCategory,
      getMyReelsWebsite,
      getMyReel_ByCategory,
      getUserReelsWebsite,
      searchReels,
      getPaginatedReelsAdmin,
      ReelsAdminStatus,
      getPaginatedReelWebsite,
      ViewCountAdd,
      ReelViewUserList,
} = require("../controllers/reelControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");

const reelRoutes = express.Router();
reelRoutes.route("/uploadReel").post(protect, uploadReel);
reelRoutes.route("/ReelViewUserList").post(protect, ReelViewUserList);
reelRoutes.route("/searchReels").post(searchReels);
reelRoutes.route("/updateReelLike").post(protect, updateReelLike);
reelRoutes.route("/addReelComment").post(protect, addReelComment);
reelRoutes.route("/deleteReel").delete(protect, deleteReel);
reelRoutes.route("/updateReelViewCount").post(protect, updateReelViewCount);
reelRoutes
      .route("/getReelComments/:reelId")
      .get(commonProtect, getReelComments);
reelRoutes
      .route("/getPaginatedReel/:page")
      .post(commonProtect, getPaginatedReel);
reelRoutes
      .route("/getPaginatedReelWebsite/:page/:share_Id")
      .post(commonProtect, getPaginatedReelWebsite);
reelRoutes.route("/getReel_ByCategory").post(commonProtect, getReel_ByCategory);
reelRoutes.route("/streamReel/:reelId").get(streamReel);
reelRoutes.route("/getReelThumbnails/:limit").post(getReelThumbnails);
reelRoutes
      .route("/getUserReels/:user_id/:page")
      .get(commonProtect, getUserReels);
reelRoutes
      .route("/getUserReelsWebsite/")
      .post(commonProtect, getUserReelsWebsite);
reelRoutes.route("/getMyReels/:page").get(protect, getMyReels);
reelRoutes.route("/getMyReel_ByCategory").post(protect, getMyReel_ByCategory);
reelRoutes.route("/getMyReelsWebsite/:page").post(protect, getMyReelsWebsite);
reelRoutes.route("/getReelsUploadUrlS3").get(protect, getReelsUploadUrlS3);
reelRoutes.route("/getAllReels").post(protect, getAllReels);
reelRoutes.route("/statusUpdate").post(protect, statusUpdate);
reelRoutes.route("/ViewCountAdd").post(protect, ViewCountAdd);

//---------------------- Admin -----------------------------//

reelRoutes
      .route("/getPaginatedReelsAdmin")
      .post(protect, getPaginatedReelsAdmin);
reelRoutes.route("/ReelsAdminStatus").post(protect, ReelsAdminStatus);

module.exports = { reelRoutes };
