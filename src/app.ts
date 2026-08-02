import express from "express";
import cors from "cors";
import type { ErrorRequestHandler } from "express";
import dataTypesRouter from "./routes/dataTypes";
import dataSetsRouter from "./routes/dataSets";
import scanRouter from "./routes/scan";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

 app.use("/api/datatypes", dataTypesRouter);
 app.use("/api/datasets",  dataSetsRouter);
 app.use("/api/scan",      scanRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = typeof err?.status === "number" && err.status < 500 ? err.status : 500;
  res.status(status).json({ error: status === 400 ? "Malformed request body" : "Internal server error" });
};

app.use(errorHandler);

export default app;
