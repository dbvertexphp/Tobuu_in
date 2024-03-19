const asyncHandler = require("express-async-handler");
const { Hire, HireStatus } = require("../models/hireModel.js");
require("dotenv").config();
const { createNotification } = require("./notificationControllers.js");
const { getSignedUrlS3 } = require("../config/aws-s3.js");
const baseURL = process.env.BASE_URL;

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
                  .sort({ _id: -1 })
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
                  .sort({ _id: -1 })
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
      const { page = 1, search = "" } = req.body;
      const perPage = 10;

      try {
            // Populate the fields to be searched
            const hires = await Hire.find({})
                  .populate({
                        path: "work_status",
                        select: "payment_status status_code",
                  })
                  .populate({
                        path: "user_id",
                        select: "username",
                  })
                  .populate({
                        path: "hire_id",
                        select: "username",
                  });

            // Filter hires based on the search query
            const filteredHires = hires.filter((hire) => {
                  const { work_status, user_id, hire_id } = hire;
                  const { payment_status, status_code } = work_status;
                  const { username: userUsername } = user_id;
                  const { username: hireUsername } = hire_id;

                  return (
                        payment_status
                              .toLowerCase()
                              .includes(search.toLowerCase()) ||
                        status_code
                              .toLowerCase()
                              .includes(search.toLowerCase()) ||
                        userUsername
                              .toLowerCase()
                              .includes(search.toLowerCase()) ||
                        hireUsername
                              .toLowerCase()
                              .includes(search.toLowerCase())
                  );
            });

            // Paginate the filtered hires
            const totalCount = filteredHires.length;
            const totalPages = Math.ceil(totalCount / perPage);
            const paginatedHires = filteredHires.slice(
                  (page - 1) * perPage,
                  page * perPage
            );

            // Prepare pagination details
            const paginationDetails = {
                  current_page: parseInt(page),
                  data: paginatedHires,
                  first_page_url: `${baseURL}api/hires?page=1`,
                  from: (page - 1) * perPage + 1,
                  last_page: totalPages,
                  last_page_url: `${baseURL}api/hires?page=${totalPages}`,
                  links: [
                        {
                              url: null,
                              label: "&laquo; Previous",
                              active: false,
                        },
                        {
                              url: `${baseURL}api/hires?page=${page}`,
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
                  path: `${baseURL}api/hires`,
                  per_page: perPage,
                  prev_page_url: null,
                  to: (page - 1) * perPage + paginatedHires.length,
                  total: totalCount,
            };

            // Send response with pagination details
            res.json({
                  Hires: paginationDetails,
                  page: page.toString(),
                  total_rows: totalCount,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const HirePaymentUpdateStatus = asyncHandler(async (req, res) => {
      const { hireId } = req.body; // Assuming you pass the hireId in the request body

      try {
            // Find the hire record by its hireId
            const hire = await Hire.findById(hireId);

            if (!hire) {
                  return res
                        .status(404)
                        .json({ message: "Hire record not found" });
            }

            // Toggle the Payment_status between "Paid" and "Unpaid"
            hire.Payment_status =
                  hire.Payment_status === "Paid" ? "Unpaid" : "Paid";

            // Save the updated hire record
            await hire.save();

            return res.status(200).json({
                  message: "Payment status updated successfully",
                  hire: hire, // Optionally, you can return the updated hire record
            });
      } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal Server Error" });
      }
});

module.exports = {
      createHire,
      getHireListByUserId,
      updateHireStatus,
      getAllHireList,
      getHireByMe,
      HirePaymentUpdateStatus,
};
