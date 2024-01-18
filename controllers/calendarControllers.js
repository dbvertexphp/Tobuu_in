const asyncHandler = require("express-async-handler");
const Calendar = require("../models/calendarModel.js");

const CreateCalendar = asyncHandler(async (req, res) => {
      const { time, date, price, type } = req.body;
      const user_id = req.user._id;

      try {
            // Check if entry with the same date and time exists
            const existingEntry = await Calendar.findOne({
                  user_id,
                  date,
                  time,
                  type,
            });

            if (existingEntry) {
                  // Update the existing entry
                  existingEntry.price = price;
                  await existingEntry.save();
                  res.json({
                        message: "Entry updated successfully",
                        status: true,
                  });
            } else {
                  // Create a new entry
                  await Calendar.create({ user_id, date, time, price, type });
                  res.json({
                        message: "Entry created successfully",
                        status: true,
                  });
            }
      } catch (error) {
            if (error.name === "ValidationError") {
                  // Handle Mongoose validation errors
                  res.status(200).json({
                        message: "Date is required when the type is Special",
                        status: false,
                  });
            } else {
                  console.error(
                        "Error updating/creating entry:",
                        error.message
                  );
                  res.status(500).json({
                        message: "Internal Server Error",
                        status: false,
                  });
            }
      }
});

const GetSpecialEntries = asyncHandler(async (req, res) => {
      const user_id = req.user._id;

      try {
            // Retrieve all entries with type "Special" for the given user_id
            const specialEntries = await Calendar.find({
                  user_id,
                  type: "Special",
            });

            res.json({ specialEntries });
      } catch (error) {
            console.error("Error retrieving special entries:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
      }
});

const GetNormalEntries = asyncHandler(async (req, res) => {
      const user_id = req.user._id;

      try {
            // Retrieve all entries with type "Special" for the given user_id
            const normalEntries = await Calendar.find({
                  user_id,
                  type: "Normal",
            });

            res.json({ normalEntries });
      } catch (error) {
            console.error("Error retrieving special entries:", error.message);
            res.status(500).json({ error: "Internal Server Error" });
      }
});

const FindPriceByDateTime = asyncHandler(async (req, res) => {
      const { date, time, user_id } = req.body;

      try {
            // Find entries with the specified user_id
            const userEntries = await Calendar.find({ user_id });

            // Check for entries with matching date and time
            const matchingEntry = userEntries.find(
                  (entry) => entry.date === date && entry.time === time
            );

            if (matchingEntry) {
                  return res.json({ data: matchingEntry, status: true });
            }

            // Check for entries with matching date but different time (considering only "Normal" type)
            const matchingDateEntry = userEntries.find(
                  (entry) => entry.time === time && entry.type === "Normal"
            );
            if (matchingDateEntry) {
                  // Include _id in the response
                  const { _id, ...rest } = matchingDateEntry.toObject(); // Extract _id
                  return res.json({ data: { _id, ...rest }, status: true });
            }

            // No matching entries found
            res.status(200).json({ message: "Entry not found", status: false });
      } catch (error) {
            console.error(
                  "Error finding price by date and time:",
                  error.message
            );
            res.status(500).json({ error: "Internal Server Error" });
      }
});

module.exports = {
      CreateCalendar,
      GetSpecialEntries,
      FindPriceByDateTime,
      GetNormalEntries,
};
