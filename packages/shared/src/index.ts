// Contratos compartidos entre Angular y Express (Cero datos sensibles)
export type RoleName = 'Super' | 'Enterprise' | 'Admin' | 'Vendedor';

export interface ApiStatusResponse {
  ok: boolean;
  message: string;
  timestamp: string;
}