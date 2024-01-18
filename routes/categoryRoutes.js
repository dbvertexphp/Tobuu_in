const express = require("express");
const {
      Createcategory,
      GetAllCategories,
      DeleteCategory,
      GetSingleCategoryByName,
} = require("../controllers/categoryControllers.js");
const protect = require("../middleware/authMiddleware.js");

const categoryRoutes = express.Router();

categoryRoutes.route("/createCategory").post(protect, Createcategory);
categoryRoutes.route("/").get(GetAllCategories);
categoryRoutes.route("/GetCategoryByName").post(GetSingleCategoryByName);
categoryRoutes.route("/DeleteCategory").post(protect, DeleteCategory);

module.exports = { categoryRoutes };
