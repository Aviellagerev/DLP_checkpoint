import express from "express";
import cors from "cors";
import type { ErrorRequestHandler } from "express";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// app.use("/api/datatypes", dataTypesRouter);
// app.use("/api/datasets",  dataSetsRouter);
// app.use("/api/scan",      scanRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

export default app;
