const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const asyncHandler = require("express-async-handler");
const Transaction = require("../models/transactionModel");
const moment = require("moment-timezone");

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
            } else {
                  console.log("Invalid signature");
            }
      } catch (error) {
            console.error("Error verifying payment details:", error);
      }

      res.status(200).json({ message: "Webhook received", payload });
});

module.exports = {
      WebhookGet,
      checkout,
};