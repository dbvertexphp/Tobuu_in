const express = require("express");
const {
      Checklikestatus,
      contactUs,
      report,
} = require("../controllers/commanControllers.js");
const protect = require("../middleware/authMiddleware.js");

const commanRoutes = express.Router();
commanRoutes.route("/Checklikestatus").post(protect, Checklikestatus);
commanRoutes.route("/report").post(protect, report);
commanRoutes.route("/contactUs").post(contactUs);
module.exports = { commanRoutes };
