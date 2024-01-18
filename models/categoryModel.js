const mongoose = require("mongoose");
const moment = require("moment-timezone");

const categorySchema = mongoose.Schema({
      category_name: { type: String, required: true },
      datetime: {
            type: String,
            default: moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss"),
      },
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
