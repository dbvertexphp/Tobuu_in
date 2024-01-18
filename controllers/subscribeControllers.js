const asyncHandler = require("express-async-handler");
const Subscribes = require("../models/subscribeModel.js");
const { User } = require("../models/userModel.js");

const SubscribeRequest = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            const { subscriber_id } = req.body;

            // Ensure subscriber_id is provided
            if (!subscriber_id) {
                  return res.status(400).json({
                        status: false,
                        message: "Subscriber ID is required.",
                  });
            }

            // Check if the user exists
            let user = await User.findOne({ _id: user_id });

            // If the user does not exist, create a new user
            if (!user) {
                  user = await User.create({ _id: user_id });
            }

            let subscribes = await Subscribes.findOne({ my_id: subscriber_id });

            // If the Subscribes document doesn't exist, create a new one
            if (!subscribes) {
                  subscribes = await Subscribes.create({
                        my_id: subscriber_id,
                        subscriber_id: [], // This should be the array you are checking later
                  });
            }

            // Check if subscriber_id is already in the friends list
            if (subscribes.subscriber_id.includes(user_id)) {
                  return res.status(400).json({
                        status: false,
                        message: "Subscribe request already sent.",
                  });
            }

            // Add subscriber_id to the friends list
            subscribes.subscriber_id.push(user_id);

            // Save the updated Subscribes document
            await subscribes.save();

            res.status(200).json({
                  status: true,
                  message: "Subscribe request sent successfully",
            });
      } catch (error) {
            console.error("Error sending friend request:", error);
            res.status(500).json({
                  status: false,
                  message: "Internal Server Error",
            });
      }
});

const UnsubscribeRequest = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            const { subscriber_id } = req.body;

            // Ensure subscriber_id is provided
            if (!subscriber_id) {
                  return res.status(400).json({
                        status: false,
                        message: "Subscriber ID is required.",
                  });
            }

            // Find the Subscribes document for the user
            let subscribes = await Subscribes.findOne({ my_id: subscriber_id });

            // If the Subscribes document doesn't exist, return an error
            if (!subscribes) {
                  return res.status(400).json({
                        status: false,
                        message: "User is not subscribed to anyone.",
                  });
            }

            // Check if subscriber_id is in the subscribers list
            const subscriberIndex = subscribes.subscriber_id.indexOf(user_id);
            if (subscriberIndex === -1) {
                  return res.status(400).json({
                        status: false,
                        message: "User is not subscribed to this subscriber.",
                  });
            }

            // Remove subscriber_id from the subscribers list
            subscribes.subscriber_id.splice(subscriberIndex, 1);

            // Save the updated Subscribes document
            await subscribes.save();

            res.status(200).json({
                  status: true,
                  message: "Unsubscribe request processed successfully",
            });
      } catch (error) {
            console.error("Error processing unsubscribe request:", error);
            res.status(500).json({
                  status: false,
                  message: "Internal Server Error",
            });
      }
});

const getSubscribes = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;

            // Find the Subscribes document for the user
            const subscribes = await Subscribes.findOne({
                  my_id: user_id,
            }).populate({
                  path: "subscriber_id",
                  select: "first_name last_name pic _id",
            });

            if (!subscribes) {
                  return res.status(404).json({
                        status: false,
                        message: "Subscribes not found for the user",
                        data: [],
                  });
            }

            const friends = subscribes.subscriber_id.map((friend) => {
                  return {
                        first_name: friend.first_name,
                        last_name: friend.last_name,
                        pic: `${process.env.BASE_URL}${friend.pic}`, // Assuming pic is the path to the image
                        _id: friend._id,
                  };
            });

            if (friends.length === 0) {
                  return res.status(200).json({
                        status: true,
                        message: "No Subscribers Found",
                  });
            }

            res.status(200).json({ status: true, data: friends });
      } catch (error) {
            console.error("Error getting friends:", error);
            res.status(500).json({
                  status: false,
                  message: "Internal Server Error",
            });
      }
});

const getSubscriptionRequest = asyncHandler(async (req, res) => {
      try {
            const user_id = "656b273cf8bf2551086f3b31";

            // Subscribes documents dhoondhe jismein subscriber_id array mein user_id hai
            const subscribesList = await Subscribes.find({
                  subscriber_id: user_id,
            }).populate({
                  path: "my_id",
                  select: "first_name last_name pic _id",
            });

            // Agar documents nahi milte ya subscriber_id array khali hai, toh "No subscribers Found" message bheje
            if (!subscribesList || subscribesList.length === 0) {
                  return res.status(200).json({
                        status: true,
                        message: "No subscribers Found",
                        data: [],
                  });
            }

            // user_id mila toh uske corresponding my_id ka data nikale
            const userDataList = subscribesList.map((subscribes) => {
                  return {
                        pic: `${process.env.BASE_URL}${subscribes.my_id.pic}`, // Assuming pic is the path to the image
                        _id: subscribes.my_id._id,
                        first_name: subscribes.my_id.first_name,
                        last_name: subscribes.my_id.last_name,
                  };
            });

            res.status(200).json({ status: true, data: userDataList });
      } catch (error) {
            console.error("Subscription requests lene mein error:", error);
            res.status(500).json({
                  status: false,
                  message: "Internal Server Error",
            });
      }
});

module.exports = {
      SubscribeRequest,
      getSubscribes,
      UnsubscribeRequest,
      getSubscriptionRequest,
};
