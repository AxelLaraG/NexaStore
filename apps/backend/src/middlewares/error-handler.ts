import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";

export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) {
	if (err instanceof AppError) {
		res.status(err.statusCode).json({
			ok: false,
			message: err.message,
		});
		return;
	}

	console.error("Unhandled error: ", err);
	res.status(500).json({
		ok: false,
		message: "Error interno del servidor",
	});
}
