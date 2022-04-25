const urlShortner = require("./../models/urlShortnerModel");
const catchAsync = require("./../utils/catchAsync");

exports.createShortUrl = catchAsync(async (req, res, next) => {
  const shortUrl = await urlShortner.create({
    fullUrl: req.body.fullUrl,
    user: req.body.userId,
  });
  res.status(201).json({
    status: "success",
    data: {
      shortUrl,
    },
  });
});

exports.getAllUrls = catchAsync(async (req, res, next) => {
  const urls = await urlShortner.find();
  res.status(201).json({
    status: "success",
    data: {
      urls,
    },
  });
});

exports.redirectUrl = catchAsync(async (req, res, next) => {
  const _id = req.params.id;

  const fullUrl = await urlShortner.findById({ _id });
  //   if(fullUrl === null) return res.status(404);
  fullUrl.clicks++;
  fullUrl.save();

  res.status(201).json({
    status: "success",
    data: fullUrl,
  });
});
