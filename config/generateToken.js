const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

dotenv.config();

// generateToken.js

const blacklist = [];

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const blacklistToken = (token) => {
  blacklist.push(token);
};

const isTokenBlacklisted = (token) => {
  return blacklist.includes(token);
};

module.exports = { generateToken, blacklistToken, isTokenBlacklisted };

