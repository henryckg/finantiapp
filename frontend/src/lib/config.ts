const env: ImportMetaEnv = import.meta.env ?? ({} as ImportMetaEnv);

const rawDemo = env.PUBLIC_DEMO;

export const IS_DEMO = rawDemo === undefined || rawDemo === '' ? true : rawDemo === 'true';

export const API_URL = (env.PUBLIC_API_URL ?? '').replace(/\/$/, '');

export const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@finanzas.app',
  name: 'Usuario Demo',
};

export const DB_NAME = 'finanzas';
export const DB_VERSION = 1;
