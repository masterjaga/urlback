const express = require("express");
const router = express.Router();

const urlShortnerController = require("./../controller/urlShortnerController");
// const authController = require("./../controller/authController");

router.post("/createUrl", urlShortnerController.createShortUrl);
router.get("/getAllUrls", urlShortnerController.getAllUrls);
router.get("/getShortUrl/:id", urlShortnerController.redirectUrl);

module.exports = router;
