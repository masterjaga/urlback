const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const app = express();

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controller/errorController");

const userRouter = require("./routes/userRoutes");
const urlShortnerRouter = require("./routes/urlShortnerRoutes");

// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Credentials", true);
//   res.header(
//     "Access-Control-Allow-Methods",
//     "GET,PUT,PATCH,POST,DELETE,OPTIONS"
//   );
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json"
//   );
//   next();
// });

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

app.options("*", cors());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hello from the server",
  });
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/urlShortner", urlShortnerRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
