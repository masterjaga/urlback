const authController = require("../controller/authController");
const express = require("express");
const router = express.Router();

router.get("/getAllUsers", authController.getAllUsers);

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post(
  "/emailVerifyLogin/:verificationToken",
  authController.emailVerifiedLogin
);

router.patch("/resetPassword", authController.resetPassword);

router.post("/forgotPassword", authController.forgotPassword);

module.exports = router;
