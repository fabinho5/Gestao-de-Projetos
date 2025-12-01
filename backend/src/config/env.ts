import dotenv from 'dotenv';

// este ficheiro serve para carregar o env e gerir as variáveis de ambiente da aplicação para que nao esteja espalhado pelo codigo process.env
dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  
  if (value === undefined) {
    throw new Error(`env variables not defined: ${key}`);
  }
  
  return value;
}

export const env = {
  
  port: Number(getEnv('PORT', '3000')),
  
  databaseUrl: getEnv('DATABASE_URL'),
  
  jwtSecret: getEnv('JWT_SECRET', 'segredo_super_secreto_padrao'),
  
  nodeEnv: getEnv('NODE_ENV', 'development'),

  domain: getEnv('DOMAIN', 'localhost'),
  
  debugLevel: getEnv('DEBUG_LEVEL', 'info'),
};