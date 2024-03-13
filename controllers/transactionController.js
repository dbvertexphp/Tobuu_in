const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const asyncHandler = require("express-async-handler");
const Transaction = require("../models/transactionModel");
const { User } = require("../models/userModel.js");
const moment = require("moment-timezone");
const baseURL = process.env.BASE_URL;
const { createNotificationAdmin } = require("./notificationControllers.js");

const instance = new Razorpay({
      key_id: process.env.REZORPAY_KEY,
      key_secret: process.env.REZORPAY_SECRETKEY,
});

const checkout = asyncHandler(async (req, res) => {
      const options = {
            amount: Number(req.body.amount * 100),
            currency: "INR",
      };
      const order = await instance.orders.create(options);

      res.status(200).json({
            success: true,
            order,
      });
});

const WebhookGet = asyncHandler(async (req, res) => {
      const { event, payload } = req.body;
      try {
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
            const hmac = crypto.createHmac("sha256", secret);
            const webhookSignature = req.headers["x-razorpay-signature"];
            const generatedSignature = hmac
                  .update(JSON.stringify(req.body))
                  .digest("hex");

            if (webhookSignature === generatedSignature) {
                  const event = req.body;
                  const payment_status = event.event;
                  const payment_id = event.payload.payment.entity.id;
                  const orderId = event.payload.payment.entity.order_id;
                  const status = event.payload.payment.entity.status;
                  const amount = event.payload.payment.entity.amount;
                  const hireId = event.payload.payment.entity.notes.hireId;
                  const calendarid =
                        event.payload.payment.entity.notes.calendarid;
                  const userId = event.payload.payment.entity.notes.userId;
                  const method = event.payload.payment.entity.method;
                  const convertedAmount = amount / 100;

                  // Find a document with matching fields
                  const existingTransaction =
                        await Transaction.findOneAndUpdate(
                              {
                                    payment_id: payment_id,
                                    order_id: orderId,
                                    amount: convertedAmount,
                                    payment_method: method,
                                    user_id: userId,
                                    hire_id: hireId,
                                    calendar_id: calendarid,
                              },
                              {
                                    payment_status: payment_status,
                                    payment_send: "user_to_admin",
                                    payment_check_status: status,
                                    datetime: new Date(), // Update datetime field
                              },
                              { new: true, upsert: true } // Upsert: Create if not exists, new: Return updated document
                        );

                  const receiverdata = await User.findOne({
                        IsAdmin: "true",
                  });

                  const senderUser = await User.findOne({
                        _id: userId,
                  });
                  const hireUser = await User.findOne({
                        _id: hireId,
                  });
                  const Notificationmessage = `${senderUser.first_name} has paid you Rs ${convertedAmount} for hiring ${hireUser.first_name}`;
                  const type = "Transaction";
                  if (payment_status == "payment.captured") {
                        createNotificationAdmin(
                              senderUser._id,
                              receiverdata.id,
                              Notificationmessage,
                              type
                        );
                  }
            } else {
                  console.log("Invalid signature");
            }
      } catch (error) {
            console.error("Error verifying payment details:", error);
      }

      res.status(200).json({ message: "Webhook received", payload });
});
const getAlltransactionList = asyncHandler(async (req, res) => {
      const { page = 1, search = "" } = req.body;
      const perPage = 10;

      try {
            // Populate the fields to be searched
            const transactions = await Transaction.find({})
                  .populate({
                        path: "user_id",
                        select: "username",
                  })
                  .populate({
                        path: "hire_id",
                        select: "username",
                  })
                  .sort({ _id: -1 });

            // Convert UTC to IST and change format
            const formattedTransactions = transactions.map((transaction) => {
                  const date = new Date(transaction.datetime);
                  const ISTDate = date.toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        second: "numeric",
                        hour12: true,
                  });
                  return { ...transaction.toObject(), datetime: ISTDate };
            });

            // Filter transactions based on the search query
            const filteredTransactions = formattedTransactions.filter(
                  (transaction) => {
                        const { user_id, hire_id } = transaction;
                        const { username: userUsername } = user_id;
                        const { username: hireUsername } = hire_id;

                        return (
                              userUsername
                                    .toLowerCase()
                                    .includes(search.toLowerCase()) ||
                              hireUsername
                                    .toLowerCase()
                                    .includes(search.toLowerCase())
                        );
                  }
            );

            // Paginate the filtered transactions
            const totalCount = filteredTransactions.length;
            const totalPages = Math.ceil(totalCount / perPage);
            const paginatedTransactions = filteredTransactions.slice(
                  (page - 1) * perPage,
                  page * perPage
            );

            // Prepare pagination details
            const paginationDetails = {
                  current_page: parseInt(page),
                  data: paginatedTransactions,
                  first_page_url: `${baseURL}api/transactions?page=1`,
                  from: (page - 1) * perPage + 1,
                  last_page: totalPages,
                  last_page_url: `${baseURL}api/transactions?page=${totalPages}`,
                  links: [
                        {
                              url: null,
                              label: "&laquo; Previous",
                              active: false,
                        },
                        {
                              url: `${baseURL}api/transactions?page=${page}`,
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
                  path: `${baseURL}api/transactions`,
                  per_page: perPage,
                  prev_page_url: null,
                  to: (page - 1) * perPage + paginatedTransactions.length,
                  total: totalCount,
                  page: page.toString(),
                  total_rows: totalCount,
            };

            // Send response with pagination details
            res.json({
                  transactions: paginationDetails,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

const getAllUserTransactions = asyncHandler(async (req, res) => {
      const { page = 1, search = "", user_id } = req.body;
      const perPage = 10;

      try {
            // Populate the fields to be searched
            const transactions = await Transaction.find({ user_id })
                  .populate({
                        path: "user_id",
                        select: "username",
                  })
                  .populate({
                        path: "hire_id",
                        select: "username",
                  })
                  .sort({ _id: -1 });

            // Convert UTC to IST and change format
            const formattedTransactions = transactions.map((transaction) => {
                  const date = new Date(transaction.datetime);
                  const ISTDate = date.toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        second: "numeric",
                        hour12: true,
                  });
                  return { ...transaction.toObject(), datetime: ISTDate };
            });

            // Filter transactions based on the search query
            const filteredTransactions = formattedTransactions.filter(
                  (transaction) => {
                        const { user_id, hire_id } = transaction;
                        const { username: userUsername } = user_id;
                        const { username: hireUsername } = hire_id;

                        return (
                              userUsername
                                    .toLowerCase()
                                    .includes(search.toLowerCase()) ||
                              hireUsername
                                    .toLowerCase()
                                    .includes(search.toLowerCase())
                        );
                  }
            );

            // Paginate the filtered transactions
            const totalCount = filteredTransactions.length;
            const totalPages = Math.ceil(totalCount / perPage);
            const paginatedTransactions = filteredTransactions.slice(
                  (page - 1) * perPage,
                  page * perPage
            );

            // Prepare pagination details
            const paginationDetails = {
                  current_page: parseInt(page),
                  data: paginatedTransactions,
                  first_page_url: `${baseURL}api/transactions?page=1`,
                  from: (page - 1) * perPage + 1,
                  last_page: totalPages,
                  last_page_url: `${baseURL}api/transactions?page=${totalPages}`,
                  links: [
                        {
                              url: null,
                              label: "&laquo; Previous",
                              active: false,
                        },
                        {
                              url: `${baseURL}api/transactions?page=${page}`,
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
                  path: `${baseURL}api/transactions`,
                  per_page: perPage,
                  prev_page_url: null,
                  to: (page - 1) * perPage + paginatedTransactions.length,
                  total: totalCount,
                  page: page.toString(),
                  total_rows: totalCount,
            };

            // Send response with pagination details
            res.json({
                  transactions: paginationDetails,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({
                  message: "Internal Server Error",
                  status: false,
            });
      }
});

module.exports = {
      WebhookGet,
      checkout,
      getAlltransactionList,
      getAllUserTransactions,
};
