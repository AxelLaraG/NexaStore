import type { RoleName } from "@NexaStore/shared";

export interface UserRow {
	id: string;
	id_role: number;
	id_status: number;
	is_active: boolean;
	email: string;
	phone_num: string | null;
	password: string;
	name: string;
	lastn_1: string;
	lastn_2: string | null;
	cr_date: Date;
	prof_pic: string | null;
	last_acc: Date | null;
	birthdate: Date | null;
}

export interface UserLoginRow
	extends Pick<
		UserRow,
		| "id"
		| "id_role"
		| "id_status"
		| "is_active"
		| "email"
		| "password"
		| "name"
		| "lastn_1"
	> {
	role_name: RoleName;
}
