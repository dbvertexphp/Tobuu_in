const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");
const {
      NotificationMessages,
      WebNotification,
      User,
} = require("../models/userModel.js");
const asyncHandler = require("express-async-handler");
const moment = require("moment-timezone");
admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
});

const sendFCMNotification = (registrationToken, title, body, imageUrl) => {
      const message = {
            notification: {
                  title,
                  body,
                  image: imageUrl, // Add the image URL here
            },
            token: registrationToken,
      };

      return admin.messaging().send(message);
};

const createNotification = async (
      sender_id,
      receiver_id,
      message,
      type,
      data = null
) => {
      try {
            // Find the receiver's FCM token from the websiteNotificationTokens table
            const websiteToken = await WebNotification.findOne({
                  user_id: receiver_id,
            });

            if (!websiteToken) {
                  console.error("Receiver's FCM token not found");
                  return; // Exit if FCM token not found
            }

            // Get receiver's information from the user table
            const receiverUser = await User.findById(receiver_id);

            if (!receiverUser) {
                  console.error("Receiver not found in the user table");
                  return; // Exit if receiver not found
            }

            const receiverName = `${receiverUser.first_name} ${receiverUser.last_name}`;

            // Get sender's information from the user table
            const senderUser = await User.findById(sender_id);

            if (!senderUser) {
                  console.error("Sender not found in the user table");
                  return; // Exit if sender not found
            }

            const senderName = `${senderUser.first_name} ${senderUser.last_name}`;

            // Construct title, body, and imageUrl
            const title = receiverName;
            const body = `${senderName} ${message}`;
            const imageUrl = `${senderUser.pic || "default-image.jpg"}`;

            const currentTime = moment().tz("Asia/Kolkata");
            const datetime = currentTime.format("DD-MM-YYYY HH:mm:ss");

            // Call sendFCMNotification with the constructed parameters
            await sendFCMNotification(
                  websiteToken.token,
                  title,
                  body,
                  imageUrl
            );

            // Optionally, save the notification to the database
            const newNotification = await NotificationMessages.create({
                  sender_id,
                  receiver_id,
                  message,
                  type,
                  datetime,
                  metadata: data,
            });

            //console.log("Notification sent and saved:", newNotification);
      } catch (error) {
            console.error("Error creating notification:", error.message);
      }
};

module.exports = { sendFCMNotification, createNotification };
