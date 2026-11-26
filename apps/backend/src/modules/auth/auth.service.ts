import type {
	AuthUsrSessionDTO,
	CreateUserRequestDTO,
	LoginRequestDTO,
} from "@NexaStore/shared";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CATALOG_IDs } from "../../config/catalogs.js";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import type { UserLoginRow } from "../../types/db.types.js";
import { generateCalculateID } from "../../utils/idGenerator.js";
import { createAuditLog } from "../audit/audit.repository.js";
import {
	assignAdminShops,
	assignCorpOwner,
	assignSellerShops,
	existsUserByEmail,
	findActiveAdminShopIds,
	findActiveSellerShopIds,
	findMainActiveCorpId,
	findShopIdsByCorp,
	findUserForLoginByEmail,
	insertUser,
	updateLastAccess,
} from "./auth.repository.js";

interface UserLoginContext {
	id_corp: string | null;
	id_shop: string | null;
	needs_device_binding: boolean;
}

export async function createUser(
	dto: CreateUserRequestDTO,
	userAgent: string,
): Promise<{ id_user: string }> {
	if (await existsUserByEmail(dto.email)) {
		throw new AppError("El correo ya está en uso.", 400);
	}

	const newUserId = generateCalculateID();
	const hashedPass = await bcrypt.hash(dto.password, 10);
	const finalStatus = dto.id_status ?? CATALOG_IDs.USER_STATUS.ACTIVO;
	const isActive = finalStatus === CATALOG_IDs.USER_STATUS.ACTIVO;

	const client = await pool.connect();

	try {
		await client.query("BEGIN");
		await insertUser(
			{
				id: newUserId,
				idRole: dto.id_role,
				finalStatus: finalStatus,
				isActive: isActive,
				email: dto.email,
				phone_num: dto.phone_num ?? null,
				hashed_pass: hashedPass,
				name: dto.name,
				lastn_1: dto.lastn_1,
				lastn_2: dto.lastn_2 ?? null,
				birthdate: dto.birthdate ?? null,
			},
			client,
		);

		if (dto.id_role === CATALOG_IDs.ROLES.SELLER) {
			if (!dto.id_shops || dto.id_shops.length === 0) {
				throw new AppError("Datos incompletos para crear al usuario.", 400);
			} else {
				await assignSellerShops(newUserId, dto.id_shops, client);
			}
		} else if (dto.id_role === CATALOG_IDs.ROLES.ADMIN) {
			if (!dto.id_shops || dto.id_shops.length === 0) {
				throw new AppError("Datos incompletos para crear al usuario.", 400);
			} else {
				await assignAdminShops(
					newUserId,
					dto.id_shops,
					dto.is_gen ?? true,
					client,
				);
			}
		} else if (dto.id_role === CATALOG_IDs.ROLES.ENTERPRISE) {
			if (!dto.id_corp) {
				throw new AppError("Datos incompletos para crear al usuario.", 400);
			} else {
				await assignCorpOwner(
					{
						userId: newUserId,
						corpId: dto.id_corp,
						perc: dto.perc ?? 100.0,
						isMain: dto.is_main ?? true,
					},
					client,
				);
			}
		}

		await createAuditLog(
			{
				userId: newUserId,
				tableName: "core.USERS",
				transactionType: "INSERT",
				userAgent: userAgent,
			},
			client,
		);

		await client.query("COMMIT");

		return { id_user: newUserId };
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

async function resolveUserContext(
	user: UserLoginRow,
	deviceShopCookie: string | undefined,
): Promise<UserLoginContext> {
	let id_corp: string | null = null;
	let id_shop: string | null = null;
	let needs_device_binding = false;

	if (user.id_role === CATALOG_IDs.ROLES.SELLER) {
		const shopsIds = await findActiveSellerShopIds(user.id);

		if (shopsIds.length === 0) {
			throw new AppError("No tienes tiendas activas para trabajar.", 403);
		}

		if (deviceShopCookie && shopsIds.includes(deviceShopCookie)) {
			id_shop = deviceShopCookie;
		} else if (shopsIds.length === 1 && shopsIds[0]) {
			id_shop = shopsIds[0];
		} else {
			throw new AppError(
				"Esta terminal no está vinculada a una sucursal. Solicita a tu gerente o dueño vincular la caja.",
				403,
			);
		}
	} else if (user.id_role === CATALOG_IDs.ROLES.ADMIN) {
		const shopsIds = await findActiveAdminShopIds(user.id);

		if (shopsIds.length === 0) {
			throw new AppError("No tienes ninguna tienda activa para trabajar", 403);
		}

		if (deviceShopCookie && shopsIds.includes(deviceShopCookie)) {
			id_shop = deviceShopCookie;
		} else if (shopsIds.length === 1 && shopsIds[0]) {
			id_shop = shopsIds[0];
		} else if (shopsIds.length > 1 && shopsIds[0]) {
			id_shop = shopsIds[0];
			needs_device_binding = true;
		}
	} else if (user.id_role === CATALOG_IDs.ROLES.ENTERPRISE) {
		id_corp = await findMainActiveCorpId(user.id);

		if (id_corp) {
			const shopsIds = await findShopIdsByCorp(id_corp);
			if (deviceShopCookie && shopsIds.includes(deviceShopCookie)) {
				id_shop = deviceShopCookie;
			} else if (shopsIds.length === 1 && shopsIds[0]) {
				id_shop = shopsIds[0];
			} else if (shopsIds.length > 1) {
				needs_device_binding = !deviceShopCookie;
			}
		}
	}

	return { id_corp, id_shop, needs_device_binding };
}

export async function loginUser(
	dto: LoginRequestDTO,
	context: {
		deviceShopCookie: string | undefined;
		userAgent: string;
	},
): Promise<{ user: AuthUsrSessionDTO; token: string }> {
	const user = await findUserForLoginByEmail(dto.email);

	if (!user || !(await bcrypt.compare(dto.password, user.password))) {
		throw new AppError("Correo o contraseña incorrectos.", 401);
	}

	if (
		!user.is_active ||
		user.id_status === CATALOG_IDs.USER_STATUS.BLOQUEADO ||
		user.id_status === CATALOG_IDs.USER_STATUS.SUSPENDIDO
	) {
		throw new AppError(
			"La cuenta está suspendida o bloqueada. Contacte con el administrador.",
			403,
		);
	}

	const { id_corp, id_shop, needs_device_binding } = await resolveUserContext(
		user,
		context.deviceShopCookie,
	);

	await updateLastAccess(user.id);
	await createAuditLog({
		userId: user.id,
		tableName: "core.USERS",
		transactionType: "LOGIN",
		userAgent: context.userAgent,
	});

	const sessionUser: AuthUsrSessionDTO = {
		id: user.id,
		email: user.email,
		name: user.name,
		lastName: user.lastn_1,
		role: user.role_name,
		id_corp: id_corp ? id_corp : null,
		id_shop: id_shop ? id_shop : null,
		needs_device_binding: needs_device_binding ? needs_device_binding : false,
	};

	const token = jwt.sign(sessionUser, env.jwtSecret, {
		expiresIn: "12h",
	});

	return { user: sessionUser, token: token };
}
