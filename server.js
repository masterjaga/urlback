const dotenv = require("dotenv");
const app = require("./app");

dotenv.config({ path: "./config.env" });

const port = process.env.PORT || 4000;

const mongoose = require("mongoose");

const DB = process.env.DATABASE.replace(
  "<password>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    autoIndex: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("DB connection successful!!!");
  })
  .catch((err) => console.log(err));

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
