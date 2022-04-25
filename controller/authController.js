const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Email = require("./../utils/email");
const crypto = require("crypto");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_COOKIE_EXPIRES_IN,
  });
};

const cookieOptions = {
  expiresIn: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  httpOnly: false,
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
  }

  res.cookie("jwt", token, cookieOptions);

  // Removes the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  });

  const user = await User.findOne({ email: req.body.email });

  //   await new Email(newUser, url).sendWelcome();
  // 2) Generate the random reset token
  const verificationToken = user.createEmailVerificationToken();

  await user.save({ validateBeforeSave: false });

  try {
    // 3) Send it to user's email
    console.log(verificationToken);
    const resetURL = `http://localhost:4000/api/v1/users/emailVerifyLogin/${verificationToken}`;

    await new Email(user, resetURL).sendEmailVerification();

    res.status(200).json({
      status: "success",
      message: "Token sent to the email",
    });
  } catch (err) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an error sending this email.Try again later", 500)
    );
  }
});

exports.emailVerifiedLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  const correct = await user.correctPassword(password, user.password);

  if (!user || !correct) {
    return next(new AppError("Incorrect email or password", 401));
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.verificationToken)
    .digest("hex");

  const verifiedUser = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  // 2) If Token has not expired and there is user
  if (!verifiedUser) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.emailVerificationToken = undefined;

  user.emailVerificationExpires = undefined;

  user.isVerified = true;

  await user.save({ validateBeforeSave: false });

  //   if (!user.isVerified) {
  //     return next(new AppError("Email is not verified"));
  //   }

  createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  const correct = await user.correctPassword(password, user.password);

  if (!user || !correct) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (!user.isVerified) {
    return next(new AppError("Email is not verified", 400));
  }

  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Checking and Getting token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError("Your'e not logged in! Please log in to get access", 401)
    );
  }

  // 2) Verifying token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exist
  const freshUser = await User.findById(decoded.id);

  if (!freshUser) {
    next(new AppError("The token belonging to user doesn't longer exist", 401));
  }

  //4) Check if user changed password after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("user recently changed password! Please login again", 401)
    );
  }

  //5) Grant access to protected data
  req.user = freshUser;
  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return new AppError("There is no user with email address", 404);
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // 3) Send it to user's email
    const resetURL = `https://instablog-app.netlify.app/resetpassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to the email",
    });
  } catch (err) {
    user.createPasswordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending this email.Try again later", 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get the user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If Token has not expired and there is user
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.emailVerification = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  // 2) If Token has not expired and there is user
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.isVerified = Active;

  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const freshUser = await User.findOne({ email }).select("+password");

  const correct = await freshUser.correctPassword(password, user.password);

  if (!freshUser || !correct) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (!freshUser.isVerified) {
    return next(new AppError("Email is not verified"));
  }

  createSendToken(user, 200, res);
});

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: "success",
    data: {
      users,
    },
  });
});
