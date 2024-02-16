const express = require("express");
const Razorpay = require("razorpay");
const asyncHandler = require("express-async-handler");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

function convertIsoToUnix(isoString) {
      const date = new Date(isoString);
      return Math.floor(date.getTime() / 1000); // Unix timestamp mein seconds mein convert
}

const CreatePaymentUrl = asyncHandler(async (req, res) => {
      const instance = new Razorpay({
            key_id: process.env.REZORPAY_KEY,
            key_secret: process.env.REZORPAY_SECRETKEY,
      });

      const unixTimestamp = moment().add(20, "minutes").toISOString();
      const expireBy = convertIsoToUnix(unixTimestamp);
      const referenceId = uuidv4();

      const options = {
            amount: 10000,
            currency: "INR",
            accept_partial: false,
            first_min_partial_amount: 0,
            expire_by: expireBy,
            reference_id: referenceId,
            description: "Payment for policy no #23456",
            customer: {
                  name: "Gaurav Kumar",
                  contact: "+919000090000",
                  email: "gaurav.kumar@example.com",
            },
            notify: {
                  sms: true,
                  email: true,
            },
            reminder_enable: true,
            notes: {
                  policy_name: "Jeevan Bima",
            },
            callback_url: "https://example-callback-url.com/",
            callback_method: "get",
      };

      try {
            const response = await instance.paymentLink.create(options);

            res.status(201).json({
                  Payment_link: response,
                  status: true,
            });
      } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
      }
});

const WebhookGet = asyncHandler(async (req, res) => {
      const { event, payload } = req.body;

      // Verify webhook signature
      const { secret } = payload;
      const expectedSignature = razorpay.webhooks.generateSignature(
            JSON.stringify(payload),
            secret
      );

      if (expectedSignature === req.headers["x-razorpay-signature"]) {
            // Signature verification successful
            if (event === "payment.authorized") {
                  // Handle payment authorized event
                  console.log("Payment authorized:", payload);
            } else if (event === "payment.captured") {
                  // Handle payment captured event
                  console.log("Payment captured:", payload);
            }

            res.status(200).send("Webhook received successfully");
      } else {
            // Signature verification failed
            res.status(400).send("Invalid webhook signature");
      }
});
module.exports = {
      CreatePaymentUrl,
      WebhookGet,
};
