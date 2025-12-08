import { ReceiptConfig, StoreSettings } from '@/types';

const env = import.meta.env || {};

const normalizePaperWidth = (value: unknown, fallback: 80): 58 | 80 | 85 => {
  const parsed = Number(value);
  if (parsed === 58 || parsed === 80 || parsed === 85) return parsed;
  return fallback;
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
};

export const storagePrefix = (env.VITE_STORAGE_PREFIX as string) || 'store_app';

export const defaultStoreSettings: StoreSettings = {
  storeName: (env.VITE_DEFAULT_STORE_NAME as string) || 'Sua loja',
  storePhone: (env.VITE_DEFAULT_STORE_PHONE as string) || '',
  theme: ((env.VITE_DEFAULT_THEME as 'light' | 'dark') || 'light') as 'light' | 'dark',
  currency: (env.VITE_DEFAULT_CURRENCY as string) || 'BRL',
  paperWidth: normalizePaperWidth(env.VITE_DEFAULT_PAPER_WIDTH, 80),
  autoSuggestion: normalizeBoolean(env.VITE_DEFAULT_AUTO_SUGGESTION, true),
};

export const defaultReceiptConfig: ReceiptConfig = {
  nomeLoja: (env.VITE_DEFAULT_RECEIPT_NAME as string) || defaultStoreSettings.storeName,
  enderecoLoja: (env.VITE_DEFAULT_RECEIPT_ADDRESS as string) || '',
  telefoneLoja: (env.VITE_DEFAULT_RECEIPT_PHONE as string) || defaultStoreSettings.storePhone,
  cnpjLoja: (env.VITE_DEFAULT_RECEIPT_TAX_ID as string) || '',
  instagramLoja: (env.VITE_DEFAULT_RECEIPT_INSTAGRAM as string) || '',
  larguraBobina: normalizePaperWidth(env.VITE_DEFAULT_RECEIPT_WIDTH, defaultStoreSettings.paperWidth),
  mensagemAgradecimento: (env.VITE_DEFAULT_RECEIPT_THANKS as string) || 'Obrigado pela preferência!',
  politicaGarantia:
    (env.VITE_DEFAULT_RECEIPT_POLICY as string) ||
    'Produtos com defeito devem ser apresentados com nota fiscal e embalagem original no prazo de 90 dias.',
};
