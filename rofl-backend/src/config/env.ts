import { config } from 'dotenv';

config();

// Environment variables
export const env = {
    // Server
    PORT: parseInt(process.env.PORT || '3000', 10),
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    DB_PATH: process.env.DB_PATH || './data',

    // Alchemy Webhook
    ALCHEMY_SIGNING_KEY: process.env.ALCHEMY_SIGNING_KEY || '',
    VOID_CONTRACT_ADDRESS: process.env.VOID_CONTRACT_ADDRESS || '0x017669FB1b0d1A4ec1BaA8a9D6c62fdbf3E3c58a',
} as const;