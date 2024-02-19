const mongoose = require("mongoose");
// Schema for About Us
const aboutUsSchema = new mongoose.Schema({
      content: {
            type: String,
            required: true,
      },
});

// Schema for Terms & Conditions
const termsConditionsSchema = new mongoose.Schema({
      content: {
            type: String,
            required: true,
      },
});

// Schema for Privacy Policy
const privacyPolicySchema = new mongoose.Schema({
      content: {
            type: String,
            required: true,
      },
});

const contactUsSchema = new mongoose.Schema({
      name: {
            type: String,
            required: true,
      },
      email_id: {
            type: String,
            required: true,
      },
      mobile_number: {
            type: String,
            required: true,
      },
      message: {
            type: String,
            required: true,
      },
      timestamp: {
            type: Date,
            default: Date.now,
      },
});

const reportSchema = new mongoose.Schema(
      {
            user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            report_type: {
                  type: String,
                  required: true,
            },
            type_id: {
                  type: String,
                  required: true,
            },
            title: {
                  type: String,
                  required: true,
            },
            description: {
                  type: String,
                  required: true,
            },
      },
      { timestamps: true }
);

// Company Details Model
const AboutUs = mongoose.model("AboutUs", aboutUsSchema);
const TermsConditions = mongoose.model(
      "TermsConditions",
      termsConditionsSchema
);
const PrivacyPolicy = mongoose.model("PrivacyPolicy", privacyPolicySchema);
const ContactUs = mongoose.model("ContactUs", contactUsSchema);
const Report = mongoose.model("Report", reportSchema);

module.exports = {
      AboutUs,
      TermsConditions,
      PrivacyPolicy,
      ContactUs,
      Report,
};
