const asyncHandler = require("express-async-handler");
const { User } = require("../models/userModel.js");
const jwt = require("jsonwebtoken");
const {
      isTokenBlacklisted,
      blacklistToken,
} = require("../config/generateToken.js"); // Correct import

const commonProtect = asyncHandler(async (req, res, next) => {
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
                  req.user = await User.findById(decoded.id).select(
                        "-password"
                  );
                  if (req.user && req.user.deleted_at !== null) {
                        blacklistToken(token);
                        return res.status(200).json({
                              message: "Not authorized, user account has been Deactive By Admin ",
                              status: false,
                        });
                  }

                  next();
            }
      } catch (error) {
            console.error("Common Protect middleware error:", error.message);
            res.status(401).json({
                  message: "Not authorized, token failed",
                  status: false,
            });
      }

      if (!token) {
            next();
      }
});

module.exports = commonProtect;
