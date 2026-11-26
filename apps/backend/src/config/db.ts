import pg, { type Pool, type PoolClient } from "pg";
import { env } from "./env.js";

export type DbExecutor = Pool | PoolClient;

export const pool = new pg.Pool({
	host: env.db.host,
	port: env.db.port,
	user: env.db.user,
	password: env.db.pass,
	database: env.db.name,
	max: 10, // maximum number of clients in the pool
	idleTimeoutMillis: 30000, // close idle clients after 30 seconds
});
