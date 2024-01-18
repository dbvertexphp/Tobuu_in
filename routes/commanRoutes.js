const express = require("express");
const { Checklikestatus,contactUs } = require("../controllers/commanControllers.js");
const protect = require("../middleware/authMiddleware.js");

const commanRoutes = express.Router();
commanRoutes.route("/Checklikestatus").post(protect, Checklikestatus);
commanRoutes.route("/contactUs").post(contactUs);
module.exports = { commanRoutes };
