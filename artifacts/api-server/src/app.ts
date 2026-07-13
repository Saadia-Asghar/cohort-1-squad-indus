import express from "express";
import cors from "cors";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app = express();

app.use((req, res, next) => {
  res.on("finish", () => {
    logger.info({ method: req.method, statusCode: res.statusCode, url: req.path }, "Request completed");
  });
  next();
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
