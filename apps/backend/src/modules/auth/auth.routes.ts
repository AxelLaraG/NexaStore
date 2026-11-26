import { Router } from "express";
import { handleCreateUser, handleLogin } from "./auth.controller.js";
import { validateCreateUser, validateLogin } from "./auth.validator.js";

export const authRouter = Router();

authRouter.post("/createUser", validateCreateUser, handleCreateUser);
authRouter.post("/login", validateLogin, handleLogin);
