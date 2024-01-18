
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

// Company Details Model
const AboutUs = mongoose.model("AboutUs", aboutUsSchema);
const TermsConditions = mongoose.model("TermsConditions", termsConditionsSchema);
const PrivacyPolicy = mongoose.model("PrivacyPolicy", privacyPolicySchema);
const ContactUs = mongoose.model('ContactUs', contactUsSchema);

module.exports = {
  AboutUs,
  TermsConditions,
  PrivacyPolicy,
  ContactUs,
};
