// nao quero que o codigo esta todo espalhado, prints e ques por isso criei este ficheiro
// caso queiram printar alguma coisa, usem sempre o logger. error, warn, info, debug para diferentes niveis de log

import { env } from '../config/env.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// as keyof typeof foi para corrigir o erro de typescript
const currentConfiguredLevel = levels[env.debugLevel as keyof typeof levels] || levels.info;

export const Logger = {
  
// nivel mais alto, sempre mostra
  error: (message: string, error?: any) => {
    if (currentConfiguredLevel >= levels.error) {
      console.error(`[ERROR]: ${message}`, error || '');
    }
  },
// nivel medio
  warn: (message: string) => {
    if (currentConfiguredLevel >= levels.warn) {
      console.warn(`[WARN]:  ${message}`);
    }
  },
// nivel baixo
  info: (message: string) => {
    if (currentConfiguredLevel >= levels.info) {
      console.log(`[INFO]:  ${message}`);
    }
  },
// so usar para msg de debug
  debug: (message: string, data?: any) => {
    if (currentConfiguredLevel >= levels.debug) {
      // O JSON.stringify serve para formatar objetos ou arrays de forma bonita
      console.log(`[DEBUG]: ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  },
};