import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(
	cors({
		origin: env.corsOrigin,
		credentials: true,
	}),
);

app.use(express.json());
app.use(cookieParser(env.cookieSecret));

app.use("/api", apiRouter);
app.use(errorHandler);
