const express = require("express");
const { NotificationListAdmin } = require("../controllers/adminControllers");
const protect = require("../middleware/authMiddleware.js");

const adminRoutes = express.Router();
adminRoutes
      .route("/NotificationListAdmin/:limit")
      .get(protect, NotificationListAdmin);
module.exports = { adminRoutes };
