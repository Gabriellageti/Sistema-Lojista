import type { BrandingConfig } from '@/contexts/BrandingProvider';

const defaultPalette = {
  primary: '240 44% 40%',
  primaryForeground: '0 0% 100%',
  secondary: '44 89% 58%',
  secondaryForeground: '240 44% 40%',
};

export const defaultBrandingConfig: BrandingConfig = {
  storeName: import.meta.env.VITE_STORE_NAME || 'Help Smart',
  slogan: import.meta.env.VITE_STORE_SLOGAN || 'Assistência Técnica',
  logoUrl: import.meta.env.VITE_STORE_LOGO || '/lovable-uploads/befabe7e-2681-4b08-abd2-02734a911a8f.png',
  palette: {
    primary: import.meta.env.VITE_BRAND_PRIMARY || defaultPalette.primary,
    primaryForeground: import.meta.env.VITE_BRAND_PRIMARY_FOREGROUND || defaultPalette.primaryForeground,
    secondary: import.meta.env.VITE_BRAND_SECONDARY || defaultPalette.secondary,
    secondaryForeground: import.meta.env.VITE_BRAND_SECONDARY_FOREGROUND || defaultPalette.secondaryForeground,
  },
};
