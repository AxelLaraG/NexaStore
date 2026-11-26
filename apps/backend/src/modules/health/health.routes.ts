import { Router } from "express";
import { checkHealth } from "./health.controller.js";

export const healthRouter = Router();

healthRouter.get("/", checkHealth);
