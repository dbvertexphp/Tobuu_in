const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Chat = require("../models/chatModel.js");
const dotenv = require("dotenv");
const { User } = require("../models/userModel.js");
const createSocketIO = require("../config/socket_io.js");
const io = createSocketIO();
const { getSignedUrlS3 } = require("../config/aws-s3.js");
require("dotenv").config();
const base_url = `${process.env.BASE_URL}`;

const accessChat = asyncHandler(async (req, res) => {
      const { userId } = req.body;

      if (!userId) {
            console.log("UserId param not sent with request");
            return res.sendStatus(400);
      }
      const isChat = await Chat.find({
            isGroupChat: false,
            $and: [
                  { users: { $elemMatch: { $eq: req.user._id } } },
                  { users: { $elemMatch: { $eq: userId } } },
            ],
      })
            .sort({ updatedAt: -1 }) // ascending order mein sort kiya gaya hai
            .populate("users", "-password")
            .populate("latestMessage");

      const populatedChat = await User.populate(isChat, {
            path: "latestMessage.sender",
            select: "pic first_name last_name",
      });

      if (populatedChat.length > 0 && populatedChat[0] !== null) {
            const chatWithBaseUrl = {
                  ...populatedChat[0].toObject(),
                  status: true,
            };
            if (chatWithBaseUrl.pic) {
                  const pic_name_url = await getSignedUrlS3(
                        chatWithBaseUrl.pic
                  );
                  chatWithBaseUrl.pic = pic_name_url;
            }
            if (chatWithBaseUrl.users && chatWithBaseUrl.users.length > 0) {
                  for (let user of chatWithBaseUrl.users) {
                        if (user.pic) {
                              const pic_name_url = await getSignedUrlS3(
                                    user.pic
                              );
                              user.pic = pic_name_url;
                        }
                  }
            }
            res.send(chatWithBaseUrl);
      } else {
            // If the chat doesn't exist, create a new chat
            const chatData = {
                  chatName: "sender",
                  isGroupChat: false,
                  users: [req.user._id, userId],
                  status: true, // Add the status field
            };

            try {
                  const createdChat = await Chat.create(chatData);
                  const fullChat = await Chat.findOne({
                        _id: createdChat._id,
                  }).populate("users", "-password");

                  // Send the created chat as a response
                  const chatWithBaseUrl = {
                        ...fullChat.toObject(),
                        status: true,
                  };

                  // Add BASE_URL to the pic field if it exists
                  if (chatWithBaseUrl.pic) {
                        chatWithBaseUrl.pic =
                              process.env.BASE_URL + chatWithBaseUrl.pic;
                  }

                  // Add BASE_URL to the pic field for each user in the users array
                  if (
                        chatWithBaseUrl.users &&
                        chatWithBaseUrl.users.length > 0
                  ) {
                        chatWithBaseUrl.users.forEach((user) => {
                              if (user.pic) {
                                    user.pic = process.env.BASE_URL + user.pic;
                              }
                        });
                  }

                  res.status(200).json(chatWithBaseUrl);
            } catch (error) {
                  res.status(500).json({ error: error.message, status: false });
            }
      }
});

const fetchChats = asyncHandler(async (req, res) => {
      try {
            const page = req.query.page || 1;
            const pageSize = 1000;
            const skip = (page - 1) * pageSize;

            const results = await Chat.find({
                  users: { $elemMatch: { $eq: req.user._id } },
                  latestMessage: { $ne: null }, // Null न होने वाले latestMessage के लिए फ़िल्टर करें
            })
                  .sort({ "latestMessage": -1 }) // latestMessage के तारीख के आधार पर सॉर्ट करें
                  .populate({
                        path: "users",
                        select: "first_name last_name pic _id",
                  })
                  .populate({
                        path: "latestMessage",
                  })
                  .skip(skip)
                  .limit(pageSize);

            const chatListWithBaseUrl = await Promise.all(
                  results.map(async (result) => {
                        const chatObject = result.toObject();

                        // Sirf aapke sath associated users ko include karein
                        chatObject.users = chatObject.users.filter(
                              (user) =>
                                    user._id.toString() !==
                                    req.user._id.toString()
                        );

                        // Agar koi user match karta hai aur chat me kam se kam ek user aur hai, toh hi is chatObject ko include karein
                        if (chatObject.users.length > 0) {
                              // प्रत्येक उपयोगकर्ता के लिए 'pic' पैरामीटर को 'base_url' के साथ जोड़ें
                              await Promise.all(
                                    chatObject.users.map(async (user) => {
                                          if (
                                                user.pic !== undefined &&
                                                user.pic !== null
                                          ) {
                                                const pic_name_url =
                                                      await getSignedUrlS3(
                                                            user.pic
                                                      );
                                                user.pic = pic_name_url;
                                          }
                                          return user;
                                    })
                              );

                              return chatObject;
                        }

                        return null;
                  })
            );

            // Null values ko filter karein
            const filteredChatList = chatListWithBaseUrl.filter(Boolean);
            return res.status(200).json({
                  chat_list: filteredChatList,
                  status: true,
            });
      } catch (error) {
            res.status(500).json({ error: error.message, status: false });
      }
});

const blockUser = asyncHandler(async (req, res) => {
      const { chatId, userId, status } = req.body;
      // Check if the provided chatId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res
                  .status(400)
                  .json({ status: false, message: "Invalid chatId" });
      }

      // Check if the provided userId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res
                  .status(400)
                  .json({ status: false, message: "Invalid userId" });
      }

      // Find the chat with the given _id
      const chat = await Chat.findById(chatId);

      // Check if the chat exists
      if (!chat) {
            return res
                  .status(404)
                  .json({ status: false, message: "Chat not found" });
      }

      // Check if the provided userId is part of the chat
      if (!chat.users.includes(userId)) {
            return res.status(400).json({
                  status: false,
                  message: "User not part of the chat",
            });
      }

      // Check if the user is already blocked
      if (status === 1 && !chat.blockedUsers.includes(userId)) {
            // Block the user
            chat.blockedUsers.push(userId);
      } else if (status === 0) {
            // Unblock the user
            chat.blockedUsers = chat.blockedUsers.filter(
                  (blockedId) => blockedId.toString() !== userId.toString()
            );
      }

      // Save the updated chat document
      const updatedChat = await chat.save();

      // Send the updated chat as a response
      const chatWithBaseUrl = {
            ...updatedChat.toObject(),
            status: true,
      };

      // Add BASE_URL to the pic field if it exists
      if (chatWithBaseUrl.pic) {
            chatWithBaseUrl.pic = process.env.BASE_URL + chatWithBaseUrl.pic;
      }

      // Add BASE_URL to the pic field for each user in the users array
      if (chatWithBaseUrl.users && chatWithBaseUrl.users.length > 0) {
            chatWithBaseUrl.users.forEach((user) => {
                  if (user.pic) {
                        user.pic = process.env.BASE_URL + user.pic;
                  }
            });
      }

      res.status(200).json(chatWithBaseUrl);
});

const blockUserList = asyncHandler(async (req, res) => {
      const userId = req.user._id;
      try {
            // User ke saare chats nikalein
            const userChats = await Chat.find({
                  users: userId,
            });

            const blockedUsersDetails = [];

            for (const userChat of userChats) {
                  const blockedUsers = userChat.blockedUsers;

                  // Yadi current user ki ID blocked users mein nahi hai, to details fetch karein
                  if (!blockedUsers.includes(userId)) {
                        const usersDetails = await User.find({
                              _id: { $in: blockedUsers },
                        });

                        // Response ke liye details ko transform karein
                        for (const user of usersDetails) {
                              const pic_name_url = await getSignedUrlS3(
                                    user.pic
                              );
                              const chatId = userChats.find((chat) =>
                                    chat.blockedUsers.includes(user._id)
                              )._id;

                              blockedUsersDetails.push({
                                    pic: pic_name_url,
                                    first_name: user.first_name,
                                    last_name: user.last_name,
                                    _id: user._id,
                                    ChatId: chatId,
                              });
                        }
                  }
            }

            // Response ko transform karein
            const transformedResponse = {
                  status: true,
                  blockedUsers: blockedUsersDetails,
            };

            // Client ko response bhejein
            res.status(200).json(transformedResponse);
      } catch (error) {
            // Agar koi error aata hai, to use handle karein
            res.status(500).json({ status: false, message: error.message });
      }
});

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
      if (!req.body.users || !req.body.name) {
            return res
                  .status(200)
                  .send({ message: "Please Fill all the feilds" });
      }

      var users = JSON.parse(req.body.users);

      if (users.length < 2) {
            return res
                  .status(200)
                  .send("More than 2 users are required to form a group chat");
      }

      users.push(req.user);

      try {
            const groupChat = await Chat.create({
                  chatName: req.body.name,
                  users: users,
                  isGroupChat: true,
                  groupAdmin: req.user,
            });

            const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
                  .populate("users", "-password")
                  .populate("groupAdmin", "-password");

            res.status(200).json(fullGroupChat);
      } catch (error) {
            res.status(200);
            throw new Error(error.message);
      }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
      const { chatId, chatName } = req.body;

      const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            {
                  chatName: chatName,
            },
            {
                  new: true,
            }
      )
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

      if (!updatedChat) {
            res.status(404);
            throw new Error("Chat Not Found");
      } else {
            res.json(updatedChat);
      }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
      const { chatId, userId } = req.body;

      // check if the requester is admin

      const removed = await Chat.findByIdAndUpdate(
            chatId,
            {
                  $pull: { users: userId },
            },
            {
                  new: true,
            }
      )
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

      if (!removed) {
            res.status(404);
            throw new Error("Chat Not Found");
      } else {
            res.json(removed);
      }
});

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
const addToGroup = asyncHandler(async (req, res) => {
      const { chatId, userId } = req.body;

      // check if the requester is admin

      const added = await Chat.findByIdAndUpdate(
            chatId,
            {
                  $push: { users: userId },
            },
            {
                  new: true,
            }
      )
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

      if (!added) {
            res.status(404);
            throw new Error("Chat Not Found");
      } else {
            res.json(added);
      }
});

module.exports = {
      addToGroup,
      removeFromGroup,
      renameGroup,
      createGroupChat,
      fetchChats,
      accessChat,
      blockUser,
      blockUserList,
};
