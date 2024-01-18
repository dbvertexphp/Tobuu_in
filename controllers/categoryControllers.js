const asyncHandler = require("express-async-handler");
const Category = require("../models/categoryModel.js");

const Createcategory = asyncHandler(async (req, res) => {
      const { category_name } = req.body;
      if (!category_name) {
            res.status(200).json({
                  message: "Please enter all the required fields.",
                  status: false,
            });
            return;
      }

      const category = await Category.create({
            category_name,
      });

      if (category) {
            res.status(201).json({
                  _id: category._id,
                  category_name: category.category_name,
                  status: true,
            });
      } else {
            res.status(200).json({
                  message: "Category Not Create.",
                  status: false,
            });
            return;
      }
});

const GetAllCategories = asyncHandler(async (req, res) => {
      const categories = await Category.find();

      if (categories) {
            res.status(200).json(categories);
      } else {
            res.status(404).json({
                  message: "No categories found.",
                  status: false,
            });
      }
});

const DeleteCategory = asyncHandler(async (req, res) => {
      const { categoryId } = req.body;

      const category = await Category.findById(categoryId);

      if (category) {
            await category.remove();
            res.status(200).json({
                  message: "Category deleted successfully.",
                  status: true,
            });
      } else {
            res.status(404).json({
                  message: "Category not found.",
                  status: false,
            });
      }
});

const GetSingleCategoryByName = asyncHandler(async (req, res) => {
      const { category_name } = req.body;

      const category = await Category.findOne({ category_name });

      if (category) {
            res.status(200).json({
                  category: category,
                  status: true,
            });
      } else {
            res.status(404).json({
                  message: `Category with name '${category_name}' not found.`,
                  status: false,
            });
      }
});

module.exports = {
      Createcategory,
      GetAllCategories,
      DeleteCategory,
      GetSingleCategoryByName,
};
