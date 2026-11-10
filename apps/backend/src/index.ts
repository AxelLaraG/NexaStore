import type {
	ApiStatusResponse,
	AuthUsrSessionDTO,
	CreateUserRequestDTO,
	CreateUserResponseDTO,
	LoginRequestDTO,
	LoginResponseDTO,
} from "@NexaStore/shared";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { CATALOG_IDs, pool } from "./config/db.js";
import type { UserLoginRow } from "./types/db.types.js";
import { generateCalculateID } from "./utils/idGenerator.js";

const app = express();
const PORT = process.env.BE_PORT;
const JWT_SECRET = process.env.JWT_SECRET || "";

app.use(
	cors({
		origin: "http://localhost:4200",
		credentials: true,
	}),
);
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

app.get(
	"/api/health",
	async (_req: Request, res: Response<ApiStatusResponse>) => {
		try {
			const dbResult = await pool.query("SELECT NOW() as now");
			const serverTime =
				dbResult.rows[0].now.toISOString() ?? new Date().toISOString();

			res.json({
				ok: true,
				message: "API is healthy",
				timestamp: serverTime,
			});
		} catch (error) {
			console.error("Health check failed:", error);
			res.status(500).json({
				ok: false,
				message: "API health check failed",
				timestamp: new Date().toISOString(),
			});
		}
	},
);

app.post(
	"/api/auth/createUser",
	async (req: Request, res: Response<CreateUserResponseDTO>) => {
		const {
			id_role,
			id_status,
			id_shops,
			is_gen,
			id_corp,
			perc,
			is_main,
			email,
			phone_num,
			password,
			name,
			lastn_1,
			lastn_2,
			birthdate,
		} = req.body as CreateUserRequestDTO;

		if (!id_role || !name || !password || !email || !lastn_1) {
			res.status(400).json({
				ok: false,
				message: "Datos incompletos para crear al usuario.",
			});
			return;
		}

		if (
			(id_role === CATALOG_IDs.ROLES.ADMIN ||
				id_role === CATALOG_IDs.ROLES.SELLER) &&
			(!id_shops || id_shops.length === 0)
		) {
			res.status(400).json({
				ok: false,
				message: "Datos incompletos para crear al usuario.",
			});
			return;
		}

		if (id_role === CATALOG_IDs.ROLES.ENTERPRISE && !id_corp) {
			res.status(400).json({
				ok: false,
				message: "Datos incompletos para crear al usuario.",
			});
			return;
		}

		const client = await pool.connect();

		try {
			const emailQuery = await pool.query<{ id_user: string }>(
				`SELECT id FROM core.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
				[email.trim()],
			);

			if (emailQuery.rows[0]) {
				res.status(400).json({
					ok: false,
					message: "El correo ya está en uso.",
				});
				return;
			}

			await client.query("BEGIN");

			const newUserId = generateCalculateID();
			const hashedPass = await bcrypt.hash(password, 10);
			const finalStatus = id_status ?? CATALOG_IDs.USER_STATUS.ACTIVO;
			const isActive = finalStatus === CATALOG_IDs.USER_STATUS.ACTIVO;

			await client.query(
				`INSERT INTO core.users (id, id_role, id_status, is_active, email, phone_num, password, name, lastn_1, lastn_2, cr_date, birthdate )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, $11);`,
				[
					newUserId,
					id_role,
					finalStatus,
					isActive,
					email.trim().toLowerCase(),
					phone_num?.trim() || null,
					hashedPass,
					name.trim(),
					lastn_1.trim(),
					lastn_2?.trim() || null,
					birthdate ?? null,
				],
			);

			if (id_role === CATALOG_IDs.ROLES.SELLER && id_shops) {
				for (const shopId of id_shops) {
					await client.query(
						`INSERT INTO core.sh_sellers (id_shop, id_usr, asign_at,is_active) VALUES ($1, $2, CURRENT_TIMESTAMP,TRUE)`,
						[shopId, newUserId],
					);
				}
			} else if (id_role === CATALOG_IDs.ROLES.ENTERPRISE && id_corp) {
				await client.query(
					`INSERT INTO core.corps_owners (id_corp, id_usr, asign_at, perc, is_main, is_active) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, TRUE)`,
					[id_corp, newUserId, perc ?? 100.0, is_main ?? true],
				);
			} else if (id_role === CATALOG_IDs.ROLES.ADMIN && id_shops) {
				for (const shopId of id_shops) {
					await client.query(
						`INSERT INTO core.sh_admins (id_shop, id_usr, asign_at, is_gen, is_active) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, TRUE)`,
						[shopId, newUserId, is_gen ?? true],
					);
				}
			}

			await client.query(
				`INSERT INTO logs.auditorias (id, id_usr, table_name, transaction_type, user_agent) VALUES ($1, $2, 'core.USERS', 'INSERT', $3)`,
				[
					generateCalculateID(),
					newUserId,
					req.headers["user-agent"] || "Unknown",
				],
			);

			await client.query("COMMIT");

			res.status(201).json({
				ok: true,
				message: "Usuario creado y asignado correctamente.",
				id_user: newUserId,
			});
		} catch (error) {
			console.error("Error en POST /api/auth/createUser: ", error);
			res.status(500).json({
				ok: false,
				message: "Error interno del servidor al crear usuario.",
			});
		} finally {
			client.release();
		}
	},
);

app.post(
	"/api/auth/login",
	async (req: Request, res: Response<LoginResponseDTO>) => {
		try {
			const { email, password } = req.body as LoginRequestDTO;
			if (!email || !password) {
				res.status(400).json({
					ok: false,
					message: "Debes proporcionar correo y contraseña.",
				});
				return;
			}

			const userQuery = await pool.query<UserLoginRow>(
				`SELECT u.id, u.id_role, r.role AS role_name, u.id_status, u.is_active,
                    u.email, u.password, u.name, u.lastn_1
					FROM core.users u
					INNER JOIN catalogs.role_cat r ON u.id_role = r.id
					WHERE LOWER(u.email) = LOWER($1)
					LIMIT 1`,
				[email.trim()],
			);

			const user = userQuery.rows[0];

			if (!user || !(await bcrypt.compare(password, user.password))) {
				res.status(401).json({
					ok: false,
					message: "Correo o contraseña incorrectos.",
				});
				return;
			}

			if (
				!user.is_active ||
				user.id_status === CATALOG_IDs.USER_STATUS.BLOQUEADO ||
				user.id_status === CATALOG_IDs.USER_STATUS.SUSPENDIDO
			) {
				res.status(403).json({
					ok: false,
					message:
						"La cuenta está suspendida o bloquada. Contacta con el administrador.",
				});
				return;
			}

			let id_corp: string | null = null;
			let id_shop: string | null = null;
			let needs_device_binding = false;

			const deviceShopCookie: string | undefined =
				req.signedCookies?.device_shop_id;

			if (user.id_role === CATALOG_IDs.ROLES.SELLER) {
				const sellerShops = await pool.query<{ id_shop: string }>(
					`SELECT id_shop FROM core.sh_sellers WHERE id_usr = $1 AND is_active = TRUE`,
					[user.id],
				);

				if (sellerShops.rowCount === 0) {
					res.status(403).json({
						ok: false,
						message: "No tienes ninguna tienda activa para trabajar.",
					});
					return;
				}

				const matchedCookieShop = sellerShops.rows.find(
					(row) => row.id_shop === deviceShopCookie,
				);

				if (matchedCookieShop) {
					id_shop = matchedCookieShop.id_shop;
				} else if (sellerShops.rowCount === 1 && sellerShops.rows[0]) {
					id_shop = sellerShops.rows[0]?.id_shop;
				} else {
					res.status(403).json({
						ok: false,
						message:
							"Esta terminal no está viculada a una sucursal. Solicita a tu gerente o dueño vincular la caja.",
					});
					return;
				}
			} else if (user.id_role === CATALOG_IDs.ROLES.ADMIN) {
				const adminShops = await pool.query<{ id_shop: string }>(
					`SELECT id_shop FROM core.sh_admins WHERE id_usr = $1 AND is_active = TRUE`,
					[user.id],
				);

				const matchedCookieShop = adminShops.rows.find(
					(row) => row.id_shop === deviceShopCookie,
				);
				if (matchedCookieShop) {
					id_shop = matchedCookieShop.id_shop;
				} else if (adminShops.rowCount === 1 && adminShops.rows[0]) {
					id_shop = adminShops.rows[0]?.id_shop;
				} else if ((adminShops.rowCount ?? 0) > 1 && adminShops.rows[0]) {
					id_shop = adminShops.rows[0]?.id_shop;
					needs_device_binding = true;
				}
			} else if (user.id_role === CATALOG_IDs.ROLES.ENTERPRISE) {
				const corpQuery = await pool.query<{ id_corp: string }>(
					`SELECT id_corp FROM core.corps_owners WHERE id_usr = $1 AND is_active = TRUE ORDER BY is_main DESC LIMIT 1`,
					[user.id],
				);

				id_corp = corpQuery.rows[0]?.id_corp ?? null;

				if (id_corp) {
					const shopsQuery = await pool.query<{ id: string }>(
						`SELECT id FROM core.shops WHERE id_corp = $1`,
						[id_corp],
					);

					const matchedCookieShop = shopsQuery.rows.find(
						(row) => row.id === deviceShopCookie,
					);

					if (matchedCookieShop) {
						id_shop = matchedCookieShop.id;
					} else if (shopsQuery.rowCount === 1 && shopsQuery.rows[0]) {
						id_shop = shopsQuery.rows[0]?.id;
					} else if ((shopsQuery.rowCount ?? 0) > 1) {
						needs_device_binding = !deviceShopCookie;
					}
				}
			}

			await pool.query(
				`UPDATE core.users SET last_acc = CURRENT_TIMESTAMP WHERE id = $1`,
				[user.id],
			);

			await pool.query(
				`INSERT INTO logs.auditorias (id, id_usr, table_name, transaction_type, user_agent)
             VALUES ($1, $2, 'core.USERS', 'LOGIN', $3)`,
				[
					generateCalculateID(),
					user.id,
					req.headers["user-agent"] || "Unknown",
				],
			);

			const sessionUser: AuthUsrSessionDTO = {
				id: user.id,
				email: user.email,
				name: user.name,
				lastName: user.lastn_1,
				role: user.role_name,
				id_corp: id_corp ? id_corp : null,
				id_shop: id_shop ? id_shop : null,
				needs_device_binding: needs_device_binding
					? needs_device_binding
					: false,
			};

			const token = jwt.sign(sessionUser, JWT_SECRET, { expiresIn: "12h" });

			res.cookie("nexa_session", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 12 * 60 * 60 * 1000,
			});

			res.json({
				ok: true,
				message: "Inicio de sesión exitoso.",
				user: sessionUser,
			});
		} catch (error) {
			console.error("Error en POST /api/auth/login: ", error);
			res.status(500).json({
				ok: false,
				message: "Error interno del servidor al iniciar sesión.",
			});
		}
	},
);

app.listen(PORT, () => {
	console.log(`Backend server is running on  http://localhost:${PORT}`);
});
