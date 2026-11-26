import type { CreateUserRequestDTO, LoginRequestDTO } from "@NexaStore/shared";
import type { NextFunction, Request, Response } from "express";
import { CATALOG_IDs } from "../../config/catalogs.js";
import { AppError } from "../../errors/app-error.js";

export function validateCreateUser(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	const body = (req.body ?? {}) as Partial<CreateUserRequestDTO>;

	if (
		!body.id_role ||
		!body.name ||
		!body.password ||
		!body.email ||
		!body.lastn_1
	) {
		throw new AppError("Datos incompletos para crear al usuario.", 400);
	}

	if (
		(body.id_role === CATALOG_IDs.ROLES.ADMIN ||
			body.id_role === CATALOG_IDs.ROLES.SELLER) &&
		(!body.id_shops || body.id_shops.length === 0)
	) {
		throw new AppError("Datos incompletos para crear al usuario.", 400);
	}

	if (body.id_role === CATALOG_IDs.ROLES.ENTERPRISE && !body.id_corp) {
		throw new AppError("Datos incompletos para crear al usuario.", 400);
	}
	next();
}

export function validateLogin(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	const { email, password } = (req.body ?? {}) as Partial<LoginRequestDTO>;

	if (!email || !password) {
		throw new AppError("Debes proporcionar correo y contraseña.", 400);
	}

	next();
}
