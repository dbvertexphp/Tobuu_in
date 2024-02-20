const express = require("express");
const crypto = require("crypto-js");
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

      console.log("event:", event);
      console.log("payload:", payload);

      res.status(200).json({ message: "Webhook received", payload });
      try {
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
            const hmac = crypto.createHmac("sha256", secret);
            const webhookSignature = req.headers["x-razorpay-signature"];
            const generatedSignature = hmac
                  .update(JSON.stringify(req.body))
                  .digest("hex");

            if (webhookSignature === generatedSignature) {
                  // Signature is valid, handle the event
                  const event = req.body;
                  const orderId = event.payload.payment.entity.order_id;
                  const courseId = event.payload.payment.entity.notes.courseId;

                  const paymentId = event.payload.payment.entity._id;
                  const method = event.payload.payment.entity.method;
                  const time = event.payload.payment.entity.created_at;
                  const bank = event.payload.payment.entity.bank;
                  const description = event.payload.payment.entity.description;
                  let status = "";

                  if (event === "payment.captured") {
                        // Condition for captured payment
                        status = "captured";
                        await handleSuccessfulPayment(
                              req.student,
                              courseId,
                              orderId
                        );
                        console.log(`Order ${orderId} captured successfully`);
                  } else if (event === "payment.authorized") {
                        // Condition for authorized payment
                        status = "authorized";
                        console.log("Payment Authorization");
                  } else if (event === "order.paid") {
                        // Condition for successful payment
                        status = "successful";
                        await handleSuccessfulPayment(req.student, courseId);
                        console.log("Payment Done");
                  } else if (event === "payment.failed") {
                        // Condition for failed payment
                        status = "failed";
                        console.log("Payment failed");
                  }

                  // Update order fields in the database
                  await updateOrderFields(
                        orderId,
                        status,
                        paymentId,
                        method,
                        time,
                        bank,
                        description
                  );

                  res.status(200).send("Webhook received successfully");
            } else {
                  res.status(400).send("Invalid signature");
            }
      } catch (error) {
            console.error("Error verifying payment details:", error);
            res.status(500).send({
                  error: error.message || "Internal Server Error",
            });
      }
});

module.exports = {
      WebhookGet,
      checkout,
};
