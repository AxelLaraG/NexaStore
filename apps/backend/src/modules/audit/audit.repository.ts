import { type DbExecutor, pool } from "../../config/db.js";
import { generateCalculateID } from "../../utils/idGenerator.js";

interface CreateAuditLogParams {
	userId: string;
	tableName: string;
	transactionType: string;
	userAgent: string;
}

export async function createAuditLog(
	params: CreateAuditLogParams,
	db: DbExecutor = pool,
): Promise<void> {
	await db.query(
		`INSERT INTO logs.auditorias (id, id_usr, table_name, transaction_type, user_agent) VALUES ($1, $2, $3, $4, $5)`,
		[
			generateCalculateID(),
			params.userId,
			params.tableName,
			params.transactionType,
			params.userAgent,
		],
	);
}
