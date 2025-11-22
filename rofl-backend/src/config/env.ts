import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Environment variables
export const env = {
    // Server
    PORT: parseInt(process.env.PORT || '3000', 10),

} as const;

// Validate required environment variables
export const validateEnv = (): void => {
    const requiredEnvVars = ['DATABASE_URL', 'JWKS_ENDPOINT'];

    const missingEnvVars = requiredEnvVars.filter(envVar => !env[envVar as keyof typeof env]);

    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
};
