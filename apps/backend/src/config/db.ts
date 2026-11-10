import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	max: 10, // maximum number of clients in the pool
	idleTimeoutMillis: 30000, // close idle clients after 30 seconds
});

export const CATALOG_IDs = {
	ROLES: {
		SUPER: Number(process.env.ROLE_SUPER),
		ENTERPRISE: Number(process.env.ROLE_ENTERPRISE),
		ADMIN: Number(process.env.ROLE_ADMIN),
		SELLER: Number(process.env.ROLE_SELLER),
	},
	USER_STATUS: {
		ACTIVO: Number(process.env.USR_STAT_ACTIVO),
		SUSPENDIDO: Number(process.env.USR_STAT_SUSPENDIDO),
		BLOQUEADO: Number(process.env.USR_STAT_BLOQUEADO),
		PENDIENTE: Number(process.env.USR_STAT_PENDIENTE),
	},
	CORP_STATUS: {
		ACTIVO: Number(process.env.CORP_STAT_ACTIVA),
		PRUEBA: Number(process.env.CORP_STAT_PRUEBA),
		MOROSA: Number(process.env.CORP_STAT_MOROSA),
		CANCELADA: Number(process.env.CORP_STAT_CANCELADA),
	},
	SHOP_STATUS: {
		ADMIN: Number(process.env.SHOP_STAT_ADMIN),
		MANT: Number(process.env.SHOP_STAT_MANT),
		CERRADA: Number(process.env.SHOP_STAT_CERRADA),
		ELIMINADA: Number(process.env.SHOP_STAT_ELIMINADA),
	},
	PROD_STATUS: {
		INFO: Number(process.env.PROD_STAT_INFO),
		AGOTADO: Number(process.env.PROD_STAT_AGOTADO),
		ALMACENADO: Number(process.env.PROD_STAT_ALMACENADO),
		ELIMINADO: Number(process.env.PROD_STAT_ELIMINADO),
	},
} as const;
