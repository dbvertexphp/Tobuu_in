const asyncHandler = require("express-async-handler");
const { Hire, HireStatus } = require("../models/hireModel.js");
require("dotenv").config();
const { createNotification } = require("./notificationControllers.js");
const { getSignedUrlS3 } = require("../config/aws-s3.js");

const createHire = asyncHandler(async (req, res) => {
      const { hire_id, amount, calendar_id } = req.body;
      const user_id = req.user._id;
      try {
            message = `Sent Offer And Paid ${amount} To Admin`;
            type = "Payment";
            createNotification(user_id, hire_id, message, type);
            const newHire = await Hire.create({
                  user_id,
                  hire_id,
                  amount,
                  calendar_id,
            });

            res.status(201).json({
                  message: "Hire created successfully",
                  status: true,
                  hire: newHire,
            });
      } catch (error) {
            console.error("Error creating hire:", error.message);
            res.status(500).json({
                  error: "Internal Server Error",
                  status: false,
            });
      }
});

const getHireListByUserId = asyncHandler(async (req, res) => {
      const user_id = req.user._id;
      try {
            const hireList = await Hire.find({ user_id })
                  .populate({
                        path: "hire_id",
                        select: ["first_name", "last_name", "pic"],
                  })
                  .populate({
                        path: "work_status", // Ensure that "work_status" points to the correct field in the hire model
                        model: "HireStatus",
                        select: ["payment_status", "status_code"],
                  });

            // ...

            const processedHireList = await Promise.all(
                  hireList.map(async (hire) => {
                        const originalDatetime = hire.datetime;
                        const dateParts = originalDatetime.split(/[- :]/);
                        const datetimeObject = new Date(
                              Date.UTC(
                                    dateParts[2],
                                    dateParts[1] - 1,
                                    dateParts[0],
                                    dateParts[3],
                                    dateParts[4],
                                    dateParts[5]
                              )
                        );
                        const isValidDate = !isNaN(datetimeObject.getDate());
                        const formattedDate = isValidDate
                              ? `${datetimeObject
                                      .getDate()
                                      .toString()
                                      .padStart(2, "0")}-${(
                                      datetimeObject.getMonth() + 1
                                )
                                      .toString()
                                      .padStart(
                                            2,
                                            "0"
                                      )}-${datetimeObject.getFullYear()}`
                              : "Invalid Date Format";
                        const pic_name_url = await getSignedUrlS3(
                              hire.hire_id.pic
                        );
                        return {
                              hire_user_data: {
                                    _id: hire.hire_id._id,
                                    first_name: hire.hire_id.first_name,
                                    last_name: hire.hire_id.last_name,
                                    pic: pic_name_url,
                              },
                              _id: hire._id,
                              amount: hire.amount,
                              datetime: formattedDate,
                              calendar_id: hire.calendar_id,
                              work_status: {
                                    payment_status:
                                          hire.work_status?.payment_status,
                                    status_code: hire.work_status?.status_code,
                              },
                        };
                  })
            );

            // Calculate total amount
            const totalAmount = hireList.reduce(
                  (sum, hire) => sum + hire.amount,
                  0
            );
            if (processedHireList.length === 0) {
                  return res.json({
                        total_amount: totalAmount,
                        hire_list: processedHireList,
                        message: "Hire List Not Found",
                        status: false,
                  });
            }

            // Add total amount to the response
            const responseWithTotalAmount = {
                  total_amount: totalAmount,
                  hire_list: processedHireList,
                  message: "Hire List Found",
                  Status: true,
            };

            res.json(responseWithTotalAmount);
      } catch (error) {
            console.error("Error in getHireListByUserId:", error);
            res.status(500).json({
                  error: "Internal Server Error",
                  status: false,
            });
      }
});

const getHireByMe = asyncHandler(async (req, res) => {
      const hire_id = req.user._id;

      try {
            const hireList = await Hire.find({ hire_id })
                  .populate({
                        path: "user_id",
                        select: ["first_name", "last_name", "pic"],
                  })
                  .populate({
                        path: "work_status",
                        model: "HireStatus",
                        select: ["payment_status", "status_code"],
                  });

            // Process the URLs for profile pictures and status
            const processedHireList = await Promise.all(
                  hireList.map(async (hire) => {
                        const originalDatetime = hire.datetime;
                        const dateParts = originalDatetime.split(/[- :]/);
                        const datetimeObject = new Date(
                              Date.UTC(
                                    dateParts[2],
                                    dateParts[1] - 1,
                                    dateParts[0],
                                    dateParts[3],
                                    dateParts[4],
                                    dateParts[5]
                              )
                        );
                        const isValidDate = !isNaN(datetimeObject.getDate());
                        const formattedDate = isValidDate
                              ? `${datetimeObject
                                      .getDate()
                                      .toString()
                                      .padStart(2, "0")}-${(
                                      datetimeObject.getMonth() + 1
                                )
                                      .toString()
                                      .padStart(
                                            2,
                                            "0"
                                      )}-${datetimeObject.getFullYear()}`
                              : "Invalid Date Format";
                        const pic_name_url = await getSignedUrlS3(
                              hire.user_id.pic
                        );
                        return {
                              hire_user_data: {
                                    _id: hire.user_id._id,
                                    first_name: hire.user_id.first_name,
                                    last_name: hire.user_id.last_name,
                                    pic: pic_name_url,
                              },
                              _id: hire._id,
                              amount: hire.amount,
                              datetime: formattedDate,
                              calendar_id: hire.calendar_id,
                              work_status: {
                                    payment_status:
                                          hire.work_status?.payment_status,
                                    status_code: hire.work_status?.status_code,
                              },
                        };
                  })
            );

            // Calculate total amount
            const totalAmount = hireList.reduce(
                  (sum, hire) => sum + hire.amount,
                  0
            );

            // Add total amount to the response
            const responseWithTotalAmount = {
                  total_amount: totalAmount,
                  hire_list: processedHireList,
                  message: "No Hire List Found",
                  Status: true,
            };

            res.json(responseWithTotalAmount);
      } catch (error) {
            res.status(500).json({
                  error: "Internal Server Error",
                  status: false,
            });
      }
});

const updateHireStatus = asyncHandler(async (req, res) => {
      const { _id, status } = req.body;

      try {
            // Check if the hire entry with the provided _id exists
            const existingHire = await Hire.findById(_id);

            if (!existingHire) {
                  return res.status(200).json({
                        message: "Hire entry not found",
                        status: false,
                  });
            }

            // Find the corresponding HireStatus entry based on the provided status
            const hireStatus = await HireStatus.findOne({
                  status_code: status,
            });

            if (!hireStatus) {
                  return res.status(200).json({
                        message: "Hire status not found",
                        status: false,
                  });
            }

            // Update the status
            existingHire.work_status = hireStatus._id;

            // Save the updated hire entry
            await existingHire.save();

            if (status == "2") {
                  type = "Completed";
                  message = `Completed The Work`;
                  sender_id = existingHire.user_id;
                  receiver_id = existingHire.hire_id;
                  createNotification(sender_id, receiver_id, message, type);
            }

            res.json({
                  message: "Hire status updated successfully",
                  status: true,
                  updatedHire: {
                        hire_id: existingHire.hire_id,
                        amount: existingHire.amount,
                        work_status: existingHire.status,
                        datetime: existingHire.datetime,
                        calendar_id: existingHire.calendar_id,
                  },
            });
      } catch (error) {
            console.error("Error updating hire status:", error.message);
            res.status(500).json({
                  error: "Internal Server Error",
                  status: false,
            });
      }
});

const getAllHireList = asyncHandler(async (req, res) => {
      const { page = 1, perPage = 10, search = "" } = req.body;

      console.log("Received Search Term:", search);

      const regexSearch = new RegExp(search, "i");
      const query = search
            ? {
                    $or: [
                          {
                                "user_id.first_name": {
                                      $regex: search,
                                      $options: "i",
                                },
                          },
                          {
                                "user_id.last_name": {
                                      $regex: search,
                                      $options: "i",
                                },
                          },
                          {
                                "hire_id.first_name": {
                                      $regex: search,
                                      $options: "i",
                                },
                          },
                          {
                                "hire_id.last_name": {
                                      $regex: search,
                                      $options: "i",
                                },
                          },
                    ],
              }
            : {};

      console.log("Constructed Query:", query);

      try {
            const hireList = await Hire.find(query)
                  .populate([
                        {
                              path: "user_id",
                              select: ["first_name", "last_name", "pic"],
                        },
                        {
                              path: "hire_id",
                              select: ["first_name", "last_name", "pic"],
                        },
                        {
                              path: "work_status",
                              select: ["payment_status", "status_code"],
                        },
                  ])
                  .skip((page - 1) * perPage)
                  .limit(perPage);

            const totalCount = await Hire.countDocuments(query);
            const totalPages = Math.ceil(totalCount / perPage);

            // Process the URLs for profile pictures
            const processedHireList = hireList.map((hire) => {
                  return {
                        user_data: {
                              user_id: hire.user_id._id,
                              first_name: hire.user_id.first_name,
                              last_name: hire.user_id.last_name,
                              pic: hire.user_id.pic,
                        },
                        hire_user_data: {
                              hire_id: hire.hire_id._id,
                              first_name: hire.hire_id.first_name,
                              last_name: hire.hire_id.last_name,
                              pic: hire.hire_id.pic,
                        },
                        work_status: {
                              payment_status: hire.status.payment_status,
                              status_code: hire.status.status_code,
                        },
                        amount: hire.amount,
                        datetime: hire.datetime,
                        calendar_id: hire.calendar_id,
                  };
            });

            const paginationDetails = {
                  current_page: parseInt(page),
                  data: processedHireList,
                  first_page_url: `${process.env.BASE_URL}api/hireList?page=1`,
                  from: (page - 1) * perPage + 1,
                  last_page: totalPages,
                  last_page_url: `${process.env.BASE_URL}api/hireList?page=${totalPages}`,
                  links: [
                        {
                              url: null,
                              label: "&laquo; Previous",
                              active: false,
                        },
                        {
                              url: `${process.env.BASE_URL}api/hireList?page=${page}`,
                              label: page.toString(),
                              active: true,
                        },
                        {
                              url: null,
                              label: "Next &raquo;",
                              active: false,
                        },
                  ],
                  next_page_url: null,
                  path: `${process.env.BASE_URL}api/hireList`,
                  per_page: perPage,
                  prev_page_url: null,
                  to: (page - 1) * perPage + processedHireList.length,
                  total: totalCount,
            };

            res.json({
                  HireList: paginationDetails,
                  page: page.toString(),
                  total_rows: totalCount,
            });
      } catch (error) {
            console.error("Error getting all hire entries:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
      }
});

module.exports = {
      createHire,
      getHireListByUserId,
      updateHireStatus,
      getAllHireList,
      getHireByMe,
};
