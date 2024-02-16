const express = require("express");
const connectDB = require("./config/db.js");
const createSocketIO = require("./config/socket_io.js");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
// --------------------- Routes -------------------------------
const { userRoutes } = require("./routes/userRoutes.js");
const { chatRoutes } = require("./routes/chatRoutes.js");
const { messageRoutes } = require("./routes/messageRoutes.js");
const { categoryRoutes } = require("./routes/categoryRoutes.js");
const { videoRoutes } = require("./routes/videoRoutes.js");
const { reelRoutes } = require("./routes/reelRoutes.js");
const { companyDetails } = require("./routes/companydetailsRoutes.js");
const { jobRoutes } = require("./routes/jobRoutes.js");
const { myfriendRoutes } = require("./routes/myfrindsRoutes.js");
const { subscribeRoutes } = require("./routes/subscribeRoutes.js");
const { timelineRoutes } = require("./routes/timelineRoutes.js");
const { commanRoutes } = require("./routes/commanRoutes.js");
const { transactionRoutes } = require("./routes/transactionRoutes.js");
// --------------------- Routes -------------------------------
const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

connectDB();
const app = express();
app.use(cookieParser());
const __dirname1 = path.resolve();
app.use(express.static(path.join(__dirname1, "")));
app.use("/public", express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(express.json()); // to accept JSON data
app.use(cors());
app.use(
      cors({
            origin: "*", // Replace with your React app's origin
      })
);

// --------------------------Routes------------------------------

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/reel", reelRoutes);
app.use("/api/CompanyDetails", companyDetails);
app.use("/api/job", jobRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/myfriend", myfriendRoutes);
app.use("/api/subscribe", subscribeRoutes);
app.use("/api/comman", commanRoutes);
app.use("/api/transaction", transactionRoutes);
// --------------------------Routes------------------------------

// --------------------------deploymentssssss------------------------------

if (process.env.NODE_ENV == "production") {
      app.use(express.static(path.join(__dirname1, "/view")));

      app.get("*", (req, res) =>
            res.sendFile(path.resolve(__dirname1, "view", "index.html"))
      );
} else {
      app.get("/", (req, res) => {
            res.send("API is running..");
      });
}

// --------------------------deployment------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL;

const server = app.listen(PORT, () => {
      console.log(`Server running on PORT ${PORT}...`);
      console.log(`Base URL: ${BASE_URL}`);
});
const io = createSocketIO(server);
