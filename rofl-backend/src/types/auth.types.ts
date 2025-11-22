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
