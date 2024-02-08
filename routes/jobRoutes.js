const express = require("express");
const {
      uploadPostJob,
      getPaginatedJob,
      appliedPostJob,
      getAppliedJobs,
      getAppliedUsers,
      getMyJobs,
      updateJobStatus,
      getAllJob,
      statusUpdate,
} = require("../controllers/jobControllers.js");
const protect = require("../middleware/authMiddleware.js");
const commonProtect = require("../middleware/comman_authMiddleware.js");

const jobRoutes = express.Router();
jobRoutes.route("/uploadPostJob").post(protect, uploadPostJob);
jobRoutes.route("/appliedPostJob").post(protect, appliedPostJob);
jobRoutes.route("/updateJobStatus").post(protect, updateJobStatus);
jobRoutes.route("/getAppliedJobs").post(protect, getAppliedJobs);
jobRoutes.route("/getAppliedUsers/:job_id").get(protect, getAppliedUsers);
jobRoutes.route("/getMyJobs/:page").get(protect, getMyJobs);
jobRoutes.route("/getPaginatedJob/:page").get(commonProtect, getPaginatedJob);
jobRoutes.route("/getAllJob").post(protect,getAllJob);
jobRoutes.route("/statusUpdate").post(protect,statusUpdate);


module.exports = { jobRoutes };
