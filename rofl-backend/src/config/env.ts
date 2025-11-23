import { config } from 'dotenv';

config();

// Environment variables
export const env = {
    // Server
    PORT: parseInt(process.env.PORT || '3000', 10),
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    DB_PATH: process.env.DB_PATH || './data',
    IS_TEE: process.env.IS_TEE || 'false',
    // Alchemy Webhook
    ALCHEMY_SIGNING_KEY: process.env.ALCHEMY_SIGNING_KEY || '',
    VOID_CONTRACT_ADDRESS: process.env.VOID_CONTRACT_ADDRESS || '0xf975849d035a69682cE8802FEFD88Aa35bff9b0D',
} as const;