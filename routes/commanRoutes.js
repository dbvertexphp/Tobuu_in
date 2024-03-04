const express = require("express");
const {
      Checklikestatus,
      contactUs,
      report,
      getAllContact,
      getAllReports,
      HomePage,
} = require("../controllers/commanControllers.js");
const protect = require("../middleware/authMiddleware.js");

const commanRoutes = express.Router();
commanRoutes.route("/Checklikestatus").post(protect, Checklikestatus);
commanRoutes.route("/report").post(protect, report);
commanRoutes.route("/contactUs").post(contactUs);
commanRoutes.route("/HomePage").post(HomePage);
commanRoutes.route("/getAllContact").post(protect, getAllContact);
commanRoutes.route("/getAllReports").post(protect, getAllReports);
module.exports = { commanRoutes };
