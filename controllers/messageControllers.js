const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel.js");
const Message = require("../models/messageModel.js");
const { User } = require("../models/userModel.js");
const moment = require("moment-timezone");
const moments = require("moment");
const { getSignedUrlS3 } = require("../config/aws-s3.js");
require("dotenv").config();

const allMessages = asyncHandler(async (req, res) => {
      try {
            // Fetch the chat information using chatId
            const chat = await Chat.findById(req.params.chatId).populate(
                  "users",
                  "pic first_name last_name"
            );

            if (!chat) {
                  return res.json({
                        messages: "Chat not found",
                        status: false,
                  });
            }

            // Find the user in the chat whose ID doesn't match req.user._id
            const otherUser = chat.users.find(
                  (user) => user._id.toString() !== req.user._id.toString()
            );

            // Find the correct user ID from blockedUsers array
            const blockedUserId = chat.blockedUsers.find(
                  (userId) => userId !== req.user._id.toString()
            );
            const getSignedUrl_picsender = await getSignedUrlS3(otherUser.pic);
            // Create the header_user_data object with correct blocked user ID
            const headerUserData = {
                  _id: otherUser ? otherUser._id : null,
                  pic: otherUser ? getSignedUrl_picsender : null,
                  first_name: otherUser ? otherUser.first_name : null,
                  last_name: otherUser ? otherUser.last_name : null,
                  blockStatus: {
                        _id: blockedUserId ? blockedUserId : null,
                        Blocked: blockedUserId ? "Yes" : "No",
                  },
            };

            // Fetch messages related to the chat
            const messages = await Message.find({ chat: req.params.chatId })
                  .populate("sender", "pic first_name last_name")
                  .populate("chat");

            if (messages.length > 0) {
                  // Use Promise.all to asynchronously generate signed URLs for all senders
                  const signedUrlPromises = messages.map(async (message) => {
                        const getSignedUrl_picsender = await getSignedUrlS3(
                              message.sender.pic
                        );

                        // Update readBy field based on conditions
                        if (
                              message.sender._id.toString() !==
                                    req.user._id.toString() &&
                              message.sender._id.toString() !== blockedUserId
                        ) {
                              // Update readBy if sender ID is different from current user and blocked user
                              message.readBy = true;
                              // Save the updated message to the database
                              await message.save();
                        }

                        return {
                              ...message.toObject(),
                              sender: {
                                    ...message.sender.toObject(),
                                    pic: getSignedUrl_picsender,
                              },
                              dateLabel: formatDateLabel(message.datetime),
                        };
                  });

                  const messagesWithBaseUrl = await Promise.all(
                        signedUrlPromises
                  );

                  res.json({
                        messages: messagesWithBaseUrl,
                        status: true,
                        header_user_data: headerUserData,
                  });
            } else {
                  res.json({
                        messages: [],
                        status: true,
                        header_user_data: headerUserData,
                  });
            }
      } catch (error) {
            res.status(500).json({ error: error.message, status: false });
      }
});

const sendMessage = asyncHandler(async (req, res) => {
      const { content, chatId } = req.body;

      if (!content || !chatId) {
            console.log("Invalid data passed into request");
            return res.sendStatus(200);
      }

      // Check if the sender is blocked
      const chat = await Chat.findById(chatId);

      if (!chat || chat.blockedUsers.length > 0) {
            console.log(
                  "Blocked users found or chat not found. Message not saved."
            );
            return res.sendStatus(500);
      }

      const currentTime = moment().tz("Asia/Kolkata");
      const datetime = currentTime.format("DD-MM-YYYY hh:mm:ss");

      const newMessage = {
            sender: req.user._id,
            content: content,
            chat: chatId,
            datetime: datetime,
      };

      try {
            let message = await Message.create(newMessage);

            message = await message
                  .populate("sender", "pic first_name last_name")
                  .execPopulate();
            message = await message.populate("chat").execPopulate();
            message = await User.populate(message, {
                  path: "chat.users",
                  select: "pic first_name last_name",
            });

            // Add BASE_URL to the pic field in the message response for each user
            for (const user of message.chat.users) {
                  // Check if the URL is already complete
                  if (!user.pic.startsWith("http")) {
                        const getSignedUrl_pic = await getSignedUrlS3(user.pic);
                        user.pic = getSignedUrl_pic;
                  }
            }
            const getSignedUrl_picsender = await getSignedUrlS3(
                  message.sender.pic
            );
            // Add BASE_URL to the pic field in the sender response
            message.sender.pic = getSignedUrl_picsender;
            message.dateLabel = "Today";

            await Chat.findByIdAndUpdate(req.body.chatId, {
                  latestMessage: message,
                  updatedAt: moments().format("DD-MM-YYYY HH:mm:ss"), // Update the updatedAt field
            });

            res.json({
                  ...message.toObject(),
                  dateLabel: "Today",
            });
      } catch (error) {
            res.status(500).json({ error: error.message, status: false });
      }
});

const formatDateLabel = (datetime) => {
      const [datePart, timePart] = datetime.split(" ");
      const [day, month, year] = datePart.split("-");
      const [hours, minutes, seconds] = timePart.split(":");

      const messageDate = new Date(
            Date.UTC(year, month - 1, day, hours, minutes, seconds)
      );
      const currentDate = new Date();

      // Convert currentDate to UTC
      const currentUTCDate = new Date(
            Date.UTC(
                  currentDate.getUTCFullYear(),
                  currentDate.getUTCMonth(),
                  currentDate.getUTCDate(),
                  currentDate.getUTCHours(),
                  currentDate.getUTCMinutes(),
                  currentDate.getUTCSeconds()
            )
      );

      // Check if the message date is today
      if (
            messageDate.getUTCDate() === currentUTCDate.getUTCDate() &&
            messageDate.getUTCMonth() === currentUTCDate.getUTCMonth() &&
            messageDate.getUTCFullYear() === currentUTCDate.getUTCFullYear()
      ) {
            return "Today";
      }

      // Check if the message date is yesterday
      const yesterday = new Date(currentUTCDate);
      yesterday.setUTCDate(currentUTCDate.getUTCDate() - 1);
      if (
            messageDate.getUTCDate() === yesterday.getUTCDate() &&
            messageDate.getUTCMonth() === yesterday.getUTCMonth() &&
            messageDate.getUTCFullYear() === yesterday.getUTCFullYear()
      ) {
            return "Yesterday";
      }

      // Format other dates
      const formattedDay = messageDate.getUTCDate();
      const formattedMonth = new Intl.DateTimeFormat("en", {
            month: "short",
      }).format(messageDate);
      const formattedYear = messageDate.getUTCFullYear(); // Extract last two digits

      return `${formattedDay}-${formattedMonth}-${formattedYear}`;
};

const UpdateMessagesRead = asyncHandler(async (req, res) => {
      const { messagesId } = req.body;

      // Find the user by mobile number
      const user = await Message.findOne({ messagesId });

      // Update the user's otp field with the new OTP
      const result = await Message.updateOne(
            { _id: messagesId },
            { $set: { readBy: true } }
      );

      // Send the new OTP to the user (you can implement this logic)

      res.json({
            message: "Read Message successfully.",
            status: true,
      });
});

module.exports = { allMessages, sendMessage, UpdateMessagesRead };
