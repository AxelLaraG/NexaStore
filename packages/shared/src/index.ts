// Contratos compartidos entre Angular y Express (Cero datos sensibles)
export type RoleName = "Super" | "Enterprise" | "Admin" | "Vendedor";

export interface ApiStatusResponse {
	ok: boolean;
	message: string;
	timestamp: string;
}

export interface LoginRequestDTO {
	email: string;
	password: string;
}

export interface LoginResponseDTO {
	ok: boolean;
	message: string;
	user?: AuthUsrSessionDTO;
}

export interface CreateUserRequestDTO {
	id_role: number;
	id_status?: number;
	id_shops?: number[];
	is_gen?: boolean;
	id_corp?: number;
	perc?: number;
	is_main?: boolean;
	email: string;
	phone_num?: string;
	password: string;
	name: string;
	lastn_1: string;
	lastn_2?: string;
	birthdate?: Date;
}

export interface CreateUserResponseDTO {
	ok: boolean;
	message: string;
	id_user?: string;
}

export interface AuthUsrSessionDTO {
	id: string;
	email: string;
	name: string;
	lastName: string;
	role: RoleName;
	id_corp?: string | null;
	id_shop?: string | null;
	needs_device_binding?: boolean;
}
