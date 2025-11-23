export interface JwtPayload {
  wallet: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  address: string;
  message: string;
  signature: string;
}

export interface LoginResponse {
  token: string;
  wallet: string;
}

export interface MeResponse {
  wallet: string;
  required_secrets: string[];
}
