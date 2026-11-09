import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { CATALOG_IDs, pool } from "./config/db.js";
import type { ApiStatusResponse, LoginRequestDTO, AuthUsrSessionDTO, LoginResponseDTO } from "@NexaStore/shared";
import type { UserLoginRow } from "./types/db.types.js";
import bcrypt from "bcryptjs";
import { generateCalculateID } from "./utils/idGenerator.js";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.BE_PORT;
const JWT_SECRET = process.env.JWT_SECRET || "";

app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

app.get('/api/health', async (_req: Request, res: Response<ApiStatusResponse>) => {
    try {
        const dbResult = await pool.query('SELECT NOW() as now');
        const serverTime = dbResult.rows[0].now.toISOString() ?? new Date().toISOString();

        res.json({
            ok: true,
            message: 'API is healthy',
            timestamp: serverTime,
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            ok: false,
            message: 'API health check failed',
            timestamp: new Date().toISOString(),
        });
    }
});

app.post('/api/auth/login', async (req: Request, res: Response<LoginResponseDTO>) => {
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
            [email.trim()]
        );

        const user = userQuery.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({
                ok: false,
                message: "Correo o contraseña incorrectos."
            });
            return;
        }

        if (!user.is_active || user.id_status === CATALOG_IDs.USER_STATUS.BLOQUEADO || user.id_status === CATALOG_IDs.USER_STATUS.SUSPENDIDO) {
            res.status(403).json({
                ok: false,
                message: "La cuenta está suspendida o bloquada. Contacta con el administrador."
            });
            return;
        }

        let id_corp: string | null = null;
        let id_shop: string | null = null;
        let needs_device_binding = false;

        const deviceShopCookie: string | undefined = req.signedCookies?.device_shop_id;

        if (user.id_role === CATALOG_IDs.ROLES.SELLER) {
            const sellerShops = await pool.query<{ id_shop: string }>(
                `SELECT id_shop FROM core.sh_sellers WHER id_usr = $1 AND is_active = TRUE`,
                [user.id]
            );

            if (sellerShops.rowCount === 0) {
                res.status(403).json({
                    ok: false,
                    message: "No tienes ninguna tienda activa para trabajar."
                });
                return;
            }

            const matchedCookieShop = sellerShops.rows.find(
                (row) => row.id_shop === deviceShopCookie
            );

            if (matchedCookieShop) {
                id_shop = matchedCookieShop.id_shop;
            } else if (sellerShops.rowCount === 1) {
                id_shop = sellerShops.rows[0]!.id_shop;
            } else {
                res.status(403).json({
                    ok: false,
                    message: "Esta terminal no está viculada a una sucursal. Solicita a tu gerente o dueño vincular la caja."
                });
                return;
            }
        } else if (user.id_role === CATALOG_IDs.ROLES.ADMIN) {
            const adminShops = await pool.query<{ id_shop: string }>(
                `SELECT id_shop FROM core.sh_admins WHERE id_usr = $1 AND is_active = TRUE`,
                [user.id]
            );

            const matchedCookieShop = adminShops.rows.find(
                (row) => row.id_shop === deviceShopCookie
            );
            if (matchedCookieShop) {
                id_shop = matchedCookieShop.id_shop;
            } else if (adminShops.rowCount === 1) {
                id_shop = adminShops.rows[0]!.id_shop;
            } else if ((adminShops.rowCount ?? 0) > 1) {
                id_shop = adminShops.rows[0]!.id_shop;
                needs_device_binding = true;
            }
        } else if (user.id_role === CATALOG_IDs.ROLES.ENTERPRISE) {
            const corpQuery = await pool.query<{ id_corp: string }>(
                `SELECT id_corp FROM core.corps_owners WHER id_usr = $1 AND is_active = TRUE ORDER BY is_main DESC LIMIT 1`,
                [user.id]
            );

            id_corp = corpQuery.rows[0]?.id_corp ?? null;

            if (id_corp) {
                const shopsQuery = await pool.query<{ id: string }>(
                    `SELECT id FROM core.shops WHERE id_corp = $1`,
                    [id_corp]
                );

                const matchedCookieShop = shopsQuery.rows.find(
                    (row) => row.id === deviceShopCookie
                );

                if (matchedCookieShop) {
                    id_shop = matchedCookieShop.id;
                } else if (shopsQuery.rowCount === 1) {
                    id_shop = shopsQuery.rows[0]!.id
                } else if ((shopsQuery.rowCount ?? 0) > 1) {
                    needs_device_binding = !deviceShopCookie;
                }
            }
        }

        await pool.query(
            `UPDATE core.users SET last_acc = CURRENT_TIMESTAMP WHERE id = $1`,
            [user.id]
        );

        await pool.query(
            `INSERT INTO logs.auditorias (id, id_usr, table_name, transaction_type, user_agent)
             VALUES ($1, $2, 'core.USERS', 'LOGIN', $3)`,
            [generateCalculateID, user.id, req.headers["user-agent"] || "Unknown"]
        );

        const sessionUser: AuthUsrSessionDTO = {
            id: Number(user.id),
            email: user.email,
            name: user.name,
            lastName: user.lastn_1,
            role: user.role_name,
            id_corp: id_corp ? Number(id_corp) : null,
            id_shop: id_shop ? Number(id_shop) : null,
            needs_device_binding: needs_device_binding ? needs_device_binding : false
        }

        const token = jwt.sign(sessionUser, JWT_SECRET, { expiresIn: "12h" });

        res.cookie("nexa_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 12 * 60 * 60 * 1000
        });

        res.json({
            ok: true,
            message: "Inicio de sesión exitoso.",
            user: sessionUser
        });
    } catch (error) {
        console.error("Error en POST /api/auth/login: ", error);
        res.status(500).json({
            ok: false,
            message: "Error interno del servidor al iniciar sesión."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on  http://localhost:${PORT}`);
});