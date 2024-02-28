// protect.js

const asyncHandler = require("express-async-handler");
const { User } = require("../models/userModel.js");
const jwt = require("jsonwebtoken");
const {
      isTokenBlacklisted,
      blacklistToken,
} = require("../config/generateToken.js"); // Correct import

const protect = asyncHandler(async (req, res, next) => {
      let token;

      try {
            if (
                  req.headers.authorization &&
                  req.headers.authorization.startsWith("Bearer")
            ) {
                  token = req.headers.authorization.split(" ")[1];
                  // Check if the token is blacklisted
                  if (isTokenBlacklisted(token)) {
                        return res.status(200).json({
                              message: "Token is expired or invalid",
                              status: false,
                              expired: true,
                        });
                  }

                  // Decode token id
                  const decoded = jwt.verify(token, process.env.JWT_SECRET);
                  const user = await User.findById(decoded.id).select(
                        "-password"
                  );

                  // Check if user has deleted_at field set
                  if (user && user.deleted_at !== null) {
                        blacklistToken(token);
                        return res.status(401).json({
                              message: "Not authorized, user account has been Deactive By Admin ",
                              status: false,
                        });
                  }

                  req.user = user;
                  next();
            }
      } catch (error) {
            console.error("Protect middleware error:", error.message);
            res.status(401).json({
                  message: "Not authorized, token failed",
                  status: false,
            });
      }

      if (!token) {
            res.status(401).json({
                  message: "Not authorized, no token",
                  status: false,
            });
      }
});

module.exports = protect;
