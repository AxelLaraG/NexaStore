import { requireNumberEnv } from "./env.js";

export const CATALOG_IDs = {
	ROLES: {
		SUPER: requireNumberEnv("ROLE_SUPER"),
		ENTERPRISE: requireNumberEnv("ROLE_ENTERPRISE"),
		ADMIN: requireNumberEnv("ROLE_ADMIN"),
		SELLER: requireNumberEnv("ROLE_SELLER"),
	},
	USER_STATUS: {
		ACTIVO: requireNumberEnv("USR_STAT_ACTIVO"),
		SUSPENDIDO: requireNumberEnv("USR_STAT_SUSPENDIDO"),
		BLOQUEADO: requireNumberEnv("USR_STAT_BLOQUEADO"),
		PENDIENTE: requireNumberEnv("USR_STAT_PENDIENTE"),
	},
	CORP_STATUS: {
		ACTIVO: requireNumberEnv("CORP_STAT_ACTIVA"),
		PRUEBA: requireNumberEnv("CORP_STAT_PRUEBA"),
		MOROSA: requireNumberEnv("CORP_STAT_MOROSA"),
		CANCELADA: requireNumberEnv("CORP_STAT_CANCELADA"),
	},
	SHOP_STATUS: {
		ADMIN: requireNumberEnv("SHOP_STAT_ADMIN"),
		MANT: requireNumberEnv("SHOP_STAT_MANT"),
		CERRADA: requireNumberEnv("SHOP_STAT_CERRADA"),
		ELIMINADA: requireNumberEnv("SHOP_STAT_ELIMINADA"),
	},
	PROD_STATUS: {
		INFO: requireNumberEnv("PROD_STAT_INFO"),
		AGOTADO: requireNumberEnv("PROD_STAT_AGOTADO"),
		ALMACENADO: requireNumberEnv("PROD_STAT_ALMACENADO"),
		ELIMINADO: requireNumberEnv("PROD_STAT_ELIMINADO"),
	},
} as const;
