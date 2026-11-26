import dotenv from "dotenv";

dotenv.config();

export function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function requireNumberEnv(name: string): number {
	const raw = requireEnv(name);
	const parsed = Number(raw);
	if (Number.isNaN(parsed)) {
		throw new Error(
			`Environment variable ${name} must be a valid number, recived: "${raw}"`,
		);
	}
	return parsed;
}

export const env = {
	nodeEnv: requireEnv("NODE_ENV"),
	isProd: process.env.NODE_ENV === "production",
	port: requireNumberEnv("BE_PORT"),
	corsOrigin: requireEnv("CORS_ORIGIN"),
	jwtSecret: requireEnv("JWT_SECRET"),
	cookieSecret: requireEnv("COOKIE_SECRET"),
	db: {
		host: requireEnv("DB_HOST"),
		port: requireNumberEnv("DB_PORT"),
		user: requireEnv("DB_USER"),
		pass: requireEnv("DB_PASSWORD"),
		name: requireEnv("DB_NAME"),
	},
} as const;
