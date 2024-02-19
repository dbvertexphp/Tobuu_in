const express = require("express");
const Razorpay = require("razorpay");
const asyncHandler = require("express-async-handler");

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

      if (event === "payment.authorized") {
            // Handle payment authorized event and log payment details
            console.log("Payment authorized:", payload);
      } else if (event === "payment.captured") {
            // Handle payment captured event and log payment details
            console.log("Payment captured:", payload);
      }

      res.status(200).send("Webhook received successfully");
});

module.exports = {
      WebhookGet,
      checkout,
};
