const asyncHandler = require("express-async-handler");
const {
      AdminNotificationMessages,
} = require("../models/adminnotificationsmodel.js");
const moment = require("moment-timezone");
const { User } = require("../models/userModel.js");
const baseURL = process.env.BASE_URL;

const NotificationListAdmin = asyncHandler(async (req, res) => {
      try {
            const user_id = req.user._id;
            const page = req.query.page || 1;
            const pageSize = 10;

            const notifications = await AdminNotificationMessages.find({
                  receiver_id: user_id,
            })
                  .sort({ _id: -1 })
                  .skip((page - 1) * pageSize)
                  .limit(pageSize);

            if (!notifications || notifications.length === 0) {
                  return res
                        .status(200)
                        .json({ status: false, notifications: [] });
            }

            await Promise.all(
                  notifications.map(async (notification) => {
                        await AdminNotificationMessages.findByIdAndUpdate(
                              notification._id,
                              { readstatus: true }
                        );
                  })
            );

            const notificationList = await Promise.all(
                  notifications.map(async (notification) => {
                        const senderDetails = await User.findById(
                              notification.sender_id
                        );

                        const sender = {
                              _id: senderDetails._id,
                              first_name: senderDetails.first_name,
                              last_name: senderDetails.last_name,
                              pic: `${senderDetails.pic}`,
                        };

                        const notificationWithSender = {
                              _id: notification._id,
                              sender,
                              message: notification.message,
                              metadata: notification.metadata,
                              type: notification.type,
                              time: NotificationTimer(notification.datetime),
                              date: notification.datetime.split(" ")[0],
                        };

                        return notificationWithSender;
                  })
            );

            // Paginate notifications
            const totalCount = await AdminNotificationMessages.countDocuments({
                  receiver_id: user_id,
            });
            const totalPages = Math.ceil(totalCount / pageSize);

            res.status(200).json({
                  status: true,
                  notifications: notificationList,
                  total: totalCount,
                  totalPages: totalPages,
                  currentPage: page,
                  per_page: pageSize,
                  first_page_url: `${baseURL}api/notificationListAdmin?page=1`,
                  last_page_url: `${baseURL}api/notificationListAdmin?page=${totalPages}`,
                  prev_page_url:
                        page > 1
                              ? `${baseURL}api/notificationListAdmin?page=${
                                      page - 1
                                }`
                              : null,
                  next_page_url:
                        page < totalPages
                              ? `${baseURL}api/notificationListAdmin?page=${
                                      page + 1
                                }`
                              : null,
            });
      } catch (error) {
            console.error("Error getting notification list:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
      }
});

const NotificationTimer = (databaseTime) => {
      try {
            if (!databaseTime) {
                  return "Invalid time";
            }

            // Calculate current time in IST timezone
            const currentTime = moment().tz("Asia/Kolkata");

            // Parse the time strings using moment
            const databaseMoment = moment.tz(
                  databaseTime,
                  "DD-MM-YYYY HH:mm:ss",
                  "Asia/Kolkata"
            );

            // Calculate the difference between the two times
            const differenceInMilliseconds = currentTime.diff(databaseMoment);

            // Convert the difference to seconds, minutes, hours, and days
            const duration = moment.duration(differenceInMilliseconds);
            const seconds = duration.seconds();
            const minutes = duration.minutes();
            const hours = duration.hours();
            const days = duration.days();

            // Construct the time difference string
            let timeDifference = "";
            if (days > 0) {
                  timeDifference += `${days} days `;
            } else if (hours > 0) {
                  timeDifference += `${hours} hours `;
            } else if (minutes > 0) {
                  timeDifference += `${minutes} minutes `;
            } else if (seconds > 0) {
                  timeDifference += `${seconds} seconds`;
            }

            // Return the time difference string
            return timeDifference.trim() === ""
                  ? "Just now"
                  : timeDifference.trim();
      } catch (error) {
            console.error("Error calculating time difference:", error.message);
            return "Invalid time format";
      }
};

module.exports = {
      NotificationListAdmin,
};
