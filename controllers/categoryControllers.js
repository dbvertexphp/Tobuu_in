const asyncHandler = require("express-async-handler");
const Category = require("../models/categoryModel.js");
require("dotenv").config();
const baseURL = process.env.BASE_URL;

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

const UpdateCategory = asyncHandler(async (req, res) => {
      const { category_id, new_category_name } = req.body;
      const _id = category_id;
      try {
            // Check if category_id and new_category_name are provided
            if (!category_id || !new_category_name) {
                  return res.status(400).json({
                        message: "Please provide category ID and new category name.",
                        status: false,
                  });
            }

            // Find the category by ID and update its name
            const category = await Category.findByIdAndUpdate(
                  _id,
                  { category_name: new_category_name },
                  { new: true } // To return the updated category
            );

            if (!category) {
                  return res.status(404).json({
                        message: "Category not found.",
                        status: false,
                  });
            }

            // Return the updated category
            res.status(200).json({
                  category,
                  message: "Category updated successfully.",
                  status: true,
            });
      } catch (error) {
            console.error("Error updating category:", error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const GetAllCategories = asyncHandler(async (req, res) => {
      try {
            // Fetch all categories from the database
            const categories = await Category.find().sort({ category_name: 1 });

            if (!categories || categories.length === 0) {
                  return res.status(404).json({
                        message: "No categories found.",
                        status: false,
                  });
            }

            // Sort the categories alphabetically
            const sortedCategories = categories.sort((a, b) => {
                  // "All" category should be at the top
                  if (a.category_name.toLowerCase() === "all") return -1;
                  if (b.category_name.toLowerCase() === "all") return 1;

                  // "Other" category should be at the bottom
                  if (a.category_name.toLowerCase() === "other") return 1;
                  if (b.category_name.toLowerCase() === "other") return -1;

                  // Sort alphabetically for other categories
                  return a.category_name.localeCompare(b.category_name);
            });

            res.status(200).json(sortedCategories);
      } catch (error) {
            console.error("Error fetching categories:", error);
            res.status(500).json({
                  message: "Internal Server Error.",
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

const GetAllCategoriesAdmin = asyncHandler(async (req, res) => {
      try {
            // Fetch all categories from the database
            const categories = await Category.aggregate([
                  {
                        $project: {
                              category_name: 1,
                              createdAt: 1,
                              updatedAt: 1,
                              datetime: 1,
                              isOther: {
                                    $cond: [
                                          { $eq: ["$category_name", "Other"] },
                                          1,
                                          0,
                                    ],
                              },
                        },
                  },
                  { $sort: { isOther: 1, category_name: 1 } },
            ]);
            if (!categories || categories.length === 0) {
                  return res.status(404).json({
                        message: "No categories found.",
                        status: false,
                  });
            }

            // Map categories to remove the 'isOther' property
            const sanitizedCategories = categories.map((category) => {
                  const { isOther, ...rest } = category;
                  return rest;
            });

            // Filter out the "All" category from the categories array
            const filteredCategories = sanitizedCategories.filter(
                  (category) => category.category_name !== "All" // Replace this ID with the actual ID of "All" category
            );

            res.status(200).json(filteredCategories);
      } catch (error) {
            console.error("Error fetching categories:", error);
            res.status(500).json({
                  message: "Internal Server Error.",
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

const GetAllCategoriesAdminpage = asyncHandler(async (req, res) => {
      const { page = 1 } = req.body;
      const perPage = 10; // Number of documents to display per page

      // Calculate the number of documents to skip
      const skip = (page - 1) * perPage;

      try {
            // Fetch all categories from the database
            const categories = await Category.aggregate([
                  {
                        $project: {
                              category_name: 1,
                              createdAt: 1,
                              updatedAt: 1,
                              datetime: 1,
                              isOther: {
                                    $cond: [
                                          { $eq: ["$category_name", "Other"] },
                                          1,
                                          0,
                                    ],
                              },
                        },
                  },
                  { $sort: { isOther: 1, category_name: 1 } },
                  { $skip: skip }, // Skip documents based on pagination
                  { $limit: perPage }, // Limit the number of documents per page
            ]);

            if (!categories || categories.length === 0) {
                  return res.status(404).json({
                        message: "No categories found.",
                        status: false,
                  });
            }

            // Map categories to remove the 'isOther' property
            const sanitizedCategories = categories.map((category) => {
                  const { isOther, ...rest } = category;
                  return rest;
            });

            // Filter out the "All" category from the categories array
            const filteredCategories = sanitizedCategories.filter(
                  (category) => category.category_name !== "All" // Replace this ID with the actual ID of "All" category
            );

            const totalCount = await Category.countDocuments(); // Total count of documents
            const totalPages = Math.ceil(totalCount / perPage); // Total pages

            const paginationDetails = {
                  current_page: page,
                  data: filteredCategories,
                  total_pages: totalPages,
                  total_count: totalCount,
            };

            res.status(200).json(paginationDetails);
      } catch (error) {
            console.error("Error fetching categories:", error);
            res.status(500).json({
                  message: "Internal Server Error.",
                  status: false,
            });
      }
});

module.exports = {
      Createcategory,
      GetAllCategories,
      DeleteCategory,
      GetSingleCategoryByName,
      GetAllCategoriesAdmin,
      UpdateCategory,
      GetAllCategoriesAdminpage,
};
