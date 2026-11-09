// Contratos compartidos entre Angular y Express (Cero datos sensibles)
export type RoleName = 'Super' | 'Enterprise' | 'Admin' | 'Vendedor';

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

export interface AuthUsrSessionDTO {
  id: number;
  email: string;
  name: string;
  lastName: string;
  role: RoleName;
  id_corp?: number | null;
  id_shop?: number | null;
  needs_device_binding?: boolean;
}