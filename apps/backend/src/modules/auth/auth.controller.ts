import type {
	CreateUserRequestDTO,
	CreateUserResponseDTO,
	LoginRequestDTO,
	LoginResponseDTO,
} from "@NexaStore/shared";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { createUser, loginUser } from "./auth.service.js";

export async function handleCreateUser(
	req: Request,
	res: Response<CreateUserResponseDTO>,
): Promise<void> {
	const dto = req.body as CreateUserRequestDTO;
	const userAgent = req.headers["user-agent"] || "Unknown";

	const { id_user } = await createUser(dto, userAgent);

	res.status(201).json({
		ok: true,
		message: "Usuario creado y asignado correctamente.",
		id_user,
	});
}

export async function handleLogin(
	req: Request,
	res: Response<LoginResponseDTO>,
): Promise<void> {
	const dto = req.body as LoginRequestDTO;
	const deviceShopCookie: string | undefined =
		req.signedCookies?.device_shop_id;
	const userAgent = req.headers["user-agent"] || "Unknown";

	const { user, token } = await loginUser(dto, { deviceShopCookie, userAgent });

	res.cookie("nexa_session", token, {
		httpOnly: true,
		secure: env.isProd,
		sameSite: "lax",
		maxAge: 12 * 60 * 60 * 1000,
	});

	res.status(200).json({
		ok: true,
		message: "Inicio de sesión exitoso.",
		user,
	});
}
