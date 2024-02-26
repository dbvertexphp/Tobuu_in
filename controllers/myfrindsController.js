const asyncHandler = require("express-async-handler");
const MyFriends = require("../models/myfrindsModel.js");
const { User } = require("../models/userModel.js");
const { createNotification } = require("./notificationControllers.js");
const { NotificationMessages } = require("../models/userModel.js");
const { getSignedUrlS3 } = require("../config/aws-s3.js");

const SendFriendRequest = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            const { friend_id } = req.body;

            // Ensure friend_id is provided
            if (!friend_id) {
                  return res.status(400).json({
                        status: false,
                        message: "Friend ID is required.",
                  });
            }

            // Check if the user exists
            let user = await User.findOne({ _id: user_id });

            // If the user does not exist, create a new user
            if (!user) {
                  res.status(200).json({
                        status: true,
                        message: "User Is Not Found",
                  });
            }

            // Find the MyFriends document for the user
            let myFriends = await MyFriends.findOne({ my_id: friend_id });

            // If the MyFriends document doesn't exist, create a new one
            if (!myFriends) {
                  myFriends = await MyFriends.create({
                        my_id: friend_id,
                        request_id: [],
                  });
            }

            // Check if friend_id is already in the friends list
            if (myFriends.request_id.includes(user_id)) {
                  return res.status(400).json({
                        status: false,
                        message: "Friend request already send.",
                  });
            }

            // Add friend_id to the friends list
            myFriends.request_id.push(user_id);

            // Save the updated MyFriends document
            await myFriends.save();

            message = `Sent Club Request`;
            type = "Friend_Request";
            createNotification(user_id, friend_id, message, type);

            res.status(200).json({
                  status: true,
                  message: "Friend request sent successfully",
            });
      } catch (error) {
            console.error("Error sending friend request:", error);
            res.status(500).json({
                  status: false,
                  message: "Internal Server Error",
            });
      }
});
const AcceptFriendRequest = asyncHandler(async (req, res) => {
      try {
            const { friend_id, status, notificetion_id } = req.body;
            const user_id = req.user._id;

            // Find the MyFriends document for the user
            let myFriends = await MyFriends.findOne({ my_id: user_id });

            // If the MyFriends document doesn't exist, return an error
            if (!myFriends) {
                  return res.status(400).json({
                        status: false,
                        message: "Friend request not found.",
                  });
            }

            // Check if friend_id is present in the request_id array
            const requestIndex = myFriends.request_id.findIndex(
                  (requestId) => requestId.toString() === friend_id.toString()
            );

            // Check if friend_id is present in the friend_id array
            const friendIndex = myFriends.friends_id.findIndex(
                  (friendId) => friendId.toString() === friend_id.toString()
            );

            if (notificetion_id) {
                  const _id = notificetion_id;
                  await NotificationMessages.findByIdAndUpdate(
                        _id,
                        {
                              $set: {
                                    type: "Request_Accept",
                                    message: "Accept Club Request",
                              },
                        },
                        { new: true }
                  );
            }

            // If status is 0, delete the friend request
            if (status === 0) {
                  // Remove friend_id from the request_id array if present
                  if (requestIndex !== -1) {
                        myFriends.request_id.splice(requestIndex, 1);
                  }

                  // Remove friend_id from the friends_id array if present
                  if (friendIndex !== -1) {
                        myFriends.friends_id.splice(friendIndex, 1);
                  }

                  // Save the updated MyFriends document
                  await myFriends.save();

                  return res.status(200).json({
                        status: true,
                        message: "Friend request deleted successfully",
                  });
            }

            // If status is 1, accept the friend request
            if (status === 1) {
                  // Check if friend_id is already in the friends_id array
                  if (friendIndex === -1) {
                        // Add friend_id to the friends_id array
                        myFriends.friends_id.push(friend_id);
                  }

                  // Remove friend_id from the request_id array if present
                  if (requestIndex !== -1) {
                        myFriends.request_id.splice(requestIndex, 1);
                  }

                  // Save the updated MyFriends document
                  await myFriends.save();
            }

            message = `Accept Club Request`;
            type = "Request_Accept";
            createNotification(user_id, friend_id, message, type);

            res.status(200).json({
                  status: true,
                  message: "Friend request processed successfully",
            });
      } catch (error) {
            console.error("Error processing friend request:", error);
            res.status(500).json({
                  status: false,
                  message: "Internal Server Error",
            });
      }
});

const getMyFriends = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            // Find the MyFriends document for the user
            const myFriends = await MyFriends.findOne({
                  my_id: user_id,
            }).populate({
                  path: "friends_id",
                  select: "first_name last_name pic _id",
            });

            if (!myFriends) {
                  return res.status(404).json({
                        status: false,
                        message: "MyFriends not found for the user",
                  });
            }

            const friends = await Promise.all(
                  myFriends.friends_id.map(async (friend) => {
                        const pic = await getSignedUrlS3(`${friend.pic}`); // Assuming pic is the path to the image
                        return {
                              first_name: friend.first_name,
                              last_name: friend.last_name,
                              pic: pic,
                              _id: friend._id,
                        };
                  })
            );

            if (friends.length === 0) {
                  return res.status(200).json({
                        status: false,
                        message: "No Friend Found",
                        friends: [],
                  });
            }

            // Send the list of friends in the response
            res.status(200).json({
                  status: true,
                  friends: friends,
            });
      } catch (error) {
            console.error("Error getting friends:", error);
            res.status(500).json({
                  status: false,
                  message: "Internal Server Error",
            });
      }
});

const getMyFriendsrequests = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            // Find the MyFriends document for the user
            const myFriends = await MyFriends.findOne({
                  my_id: user_id,
            }).populate({
                  path: "request_id",
                  select: "first_name last_name pic _id",
            });

            if (!myFriends) {
                  return res.status(404).json({
                        status: false,
                        message: "MyFriends not found for the user",
                  });
            }

            const friends = myFriends.request_id.map((friend) => {
                  return {
                        first_name: friend.first_name,
                        last_name: friend.last_name,
                        pic: `${friend.pic}`, // Assuming pic is the path to the image
                        _id: friend._id,
                  };
            });

            if (friends.length === 0) {
                  return res.status(200).json({
                        status: false,
                        message: "No Friend Found",
                        friends: [],
                  });
            }

            // Send the list of friends in the response
            res.status(200).json({
                  status: true,
                  friends: friends,
            });
      } catch (error) {
            console.error("Error getting friends:", error);
            res.status(500).json({
                  status: false,
                  message: "Internal Server Error",
            });
      }
});

module.exports = {
      SendFriendRequest,
      getMyFriends,
      AcceptFriendRequest,
      getMyFriendsrequests,
};
