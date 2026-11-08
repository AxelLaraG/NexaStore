import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pool } from "./config/db.js";
import type { ApiStatusResponse } from "@NexaStore/shared";

const app = express();
const PORT = process.env.BE_PORT;

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

app.listen(PORT, () => {
    console.log(`Backend server is running on  http://localhost:${PORT}`);
});