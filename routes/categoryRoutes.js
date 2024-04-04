const express = require("express");
const {
      Createcategory,
      GetAllCategories,
      DeleteCategory,
      GetSingleCategoryByName,
      GetAllCategoriesAdmin,
      UpdateCategory,
      GetAllCategoriesAdminpage,
} = require("../controllers/categoryControllers.js");
const protect = require("../middleware/authMiddleware.js");

const categoryRoutes = express.Router();

categoryRoutes.route("/createCategory").post(protect, Createcategory);
categoryRoutes.route("/UpdateCategory").post(protect, UpdateCategory);
categoryRoutes.route("/").get(GetAllCategories);
categoryRoutes.route("/GetAllCategoriesAdmin").get(GetAllCategoriesAdmin);
categoryRoutes
      .route("/GetAllCategoriesAdminpage")
      .post(GetAllCategoriesAdminpage);
categoryRoutes.route("/GetCategoryByName").post(GetSingleCategoryByName);
categoryRoutes.route("/DeleteCategory").post(protect, DeleteCategory);

module.exports = { categoryRoutes };
