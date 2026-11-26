import { type DbExecutor, pool } from "../../config/db.js";
import type { UserLoginRow } from "../../types/db.types.js";

interface InsertUserParams {
	id: string;
	idRole: number;
	finalStatus: number;
	isActive: boolean;
	email: string;
	phone_num: string | null;
	hashed_pass: string;
	name: string;
	lastn_1: string;
	lastn_2: string | null;
	birthdate: Date | null;
}

export async function existsUserByEmail(
	email: string,
	db: DbExecutor = pool,
): Promise<boolean> {
	const res = await db.query(
		`SELECT id FROM core.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
		[email.trim()],
	);
	return Boolean(res.rows[0]);
}

export async function findUserForLoginByEmail(
	email: string,
	db: DbExecutor = pool,
): Promise<UserLoginRow | null> {
	const res = await db.query<UserLoginRow>(
		`SELECT u.id, u.id_role, r.role AS role_name, u.id_status, u.is_active,
                        u.email, u.password, u.name, u.lastn_1
                        FROM core.users u
                        INNER JOIN catalogs.role_cat r ON u.id_role = r.id
                        WHERE LOWER(u.email) = LOWER($1)
                        LIMIT 1`,
		[email.trim()],
	);

	return res.rows[0] ?? null;
}

export async function findActiveSellerShopIds(
	userId: string,
	db: DbExecutor = pool,
): Promise<string[]> {
	const res = await db.query<{ id_shop: string }>(
		`SELECT id_shop FROM core.sh_sellers WHERE id_usr = $1 AND is_active = TRUE`,
		[userId],
	);

	return res.rows.map((row) => row.id_shop);
}

export async function findActiveAdminShopIds(
	userId: string,
	db: DbExecutor = pool,
): Promise<string[]> {
	const res = await db.query<{ id_shop: string }>(
		`SELECT id_shop FROM core.sh_admins WHERE id_usr = $1 AND is_active = TRUE`,
		[userId],
	);

	return res.rows.map((row) => row.id_shop);
}

export async function findMainActiveCorpId(
	userId: string,
	db: DbExecutor = pool,
): Promise<string | null> {
	const res = await db.query<{ id_corp: string }>(
		`SELECT id_corp FROM core.corps_owners WHERE id_usr = $1 AND is_active = TRUE ORDER BY is_main DESC LIMIT 1`,
		[userId],
	);

	return res.rows[0]?.id_corp ?? null;
}

export async function findShopIdsByCorp(
	corpId: string,
	db: DbExecutor = pool,
): Promise<string[]> {
	const res = await db.query<{ id: string }>(
		`SELECT id FROM core.shops WHERE id_corp = $1`,
		[corpId],
	);

	return res.rows.map((row) => row.id);
}

export async function insertUser(
	params: InsertUserParams,
	db: DbExecutor = pool,
): Promise<void> {
	await db.query(
		`INSERT INTO core.users (id, id_role, id_status, is_active, email, phone_num, password, name, lastn_1, lastn_2, cr_date, birthdate )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, $11);`,
		[
			params.id,
			params.idRole,
			params.finalStatus,
			params.isActive,
			params.email.trim().toLowerCase(),
			params.phone_num?.trim() || null,
			params.hashed_pass,
			params.name.trim(),
			params.lastn_1.trim(),
			params.lastn_2?.trim() || null,
			params.birthdate ?? null,
		],
	);
}

export async function assignSellerShops(
	userId: string,
	shopIds: string[],
	db: DbExecutor = pool,
): Promise<void> {
	for (const shopId of shopIds) {
		await db.query(
			`INSERT INTO core.sh_sellers (id_shop, id_usr, asign_at,is_active) VALUES ($1, $2, CURRENT_TIMESTAMP,TRUE)`,
			[shopId, userId],
		);
	}
}

export async function assignAdminShops(
	userId: string,
	shopIds: string[],
	isGen: boolean,
	db: DbExecutor = pool,
): Promise<void> {
	for (const shopId of shopIds) {
		await db.query(
			`INSERT INTO core.sh_admins (id_shop, id_usr, asign_at, is_gen, is_active) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, TRUE)`,
			[shopId, userId, isGen ?? true],
		);
	}
}

export async function assignCorpOwner(
	params: {
		userId: string;
		corpId: string;
		perc: number;
		isMain: boolean;
	},
	db: DbExecutor = pool,
): Promise<void> {
	await db.query(
		`INSERT INTO core.corps_owners (id_corp, id_usr, asign_at, perc, is_main, is_active) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, TRUE)`,
		[params.corpId, params.userId, params.perc ?? 100.0, params.isMain ?? true],
	);
}

export async function updateLastAccess(
	userId: string,
	db: DbExecutor = pool,
): Promise<void> {
	await db.query(
		`UPDATE core.users SET last_acc = CURRENT_TIMESTAMP WHERE id = $1`,
		[userId],
	);
}
