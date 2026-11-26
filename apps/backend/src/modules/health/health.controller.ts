import type { ApiStatusResponse } from "@NexaStore/shared";
import type { Request, Response } from "express";
import { pool } from "../../config/db.js";

export async function checkHealth(
	_req: Request,
	res: Response<ApiStatusResponse>,
): Promise<void> {
	try {
		const dbResult = await pool.query<{ now: Date }>("SELECT NOW() as now");
		const serverTime =
			dbResult.rows[0]?.now.toISOString() ?? new Date().toISOString();

		res.json({
			ok: true,
			message: "API is Healthy",
			timestamp: serverTime,
		});
	} catch (e) {
		console.error("Health check failed: ", e);
		res.status(500).json({
			ok: false,
			message: "API health check failed",
			timestamp: new Date().toISOString(),
		});
	}
}
