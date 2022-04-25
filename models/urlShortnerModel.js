const mongoose = require("mongoose");
const shortId = require("shortid");

const urlShortnerSchema = new mongoose.Schema({
  fullUrl: {
    type: String,
    required: true,
  },
  shortUrl: {
    type: String,
    required: true,
    default: shortId.generate,
  },
  clicks: {
    type: Number,
    required: true,
    default: 0,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
});

urlShortnerSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "_id firstName lastName email",
  });
  next();
});

const urlShortner = mongoose.model("urlShortner", urlShortnerSchema);
module.exports = urlShortner;
