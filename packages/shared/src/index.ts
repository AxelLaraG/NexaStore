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
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: RoleName;
  id_corp?: string | null;
  id_shop?: string | null;
  needs_device_binding?: boolean;
}