import type { BrandingConfig as StoreBrandingConfig } from '@/contexts/BrandingProvider';

const defaultPalette = {
  primary: '240 44% 40%',
  primaryForeground: '0 0% 100%',
  secondary: '44 89% 58%',
  secondaryForeground: '240 44% 40%',
};

const STORE_NAME = import.meta.env.VITE_STORE_NAME || 'Help Smart';
const STORE_SLOGAN = import.meta.env.VITE_STORE_SLOGAN || 'Assistência Técnica';
const STORE_LOGO =
  import.meta.env.VITE_STORE_LOGO ||
  '/lovable-uploads/befabe7e-2681-4b08-abd2-02734a911a8f.png';

// Config usada pelo BrandingProvider (UI / tema)
export const defaultBrandingConfig: StoreBrandingConfig = {
  storeName: STORE_NAME,
  slogan: STORE_SLOGAN,
  logoUrl: STORE_LOGO,
  palette: {
    primary: import.meta.env.VITE_BRAND_PRIMARY || defaultPalette.primary,
    primaryForeground:
      import.meta.env.VITE_BRAND_PRIMARY_FOREGROUND || defaultPalette.primaryForeground,
    secondary: import.meta.env.VITE_BRAND_SECONDARY || defaultPalette.secondary,
    secondaryForeground:
      import.meta.env.VITE_BRAND_SECONDARY_FOREGROUND || defaultPalette.secondaryForeground,
  },
};

// Config usada para manifest / meta tags / placeholders
export interface ManifestBrandingConfig {
  name: string;
  shortName: string;
  description: string;
  keywords: string[];
  author: string;
  themeColor: string;
  backgroundColor: string;
  iconLarge: string;
  iconSmall: string;
}

export const brandingConfig: ManifestBrandingConfig = {
  name: `${STORE_NAME} - ${STORE_SLOGAN}`,
  shortName: STORE_NAME,
  description:
    'Sistema de vendas e ordens de serviço offline-first para assistência técnica',
  keywords: ['assistência técnica', 'vendas', 'ordens de serviço', 'PWA', 'offline'],
  author: 'Equipe do Aplicativo',
  themeColor: '#3E3F93',
  backgroundColor: '#3E3F93',
  iconLarge: STORE_LOGO,
  iconSmall: STORE_LOGO,
};

export const brandingPlaceholders: Record<string, string> = {
  __BRAND_NAME__: brandingConfig.name,
  __BRAND_SHORT_NAME__: brandingConfig.shortName,
  __BRAND_DESCRIPTION__: brandingConfig.description,
  __BRAND_KEYWORDS__: brandingConfig.keywords.join(', '),
  __BRAND_AUTHOR__: brandingConfig.author,
  __BRAND_THEME_COLOR__: brandingConfig.themeColor,
  __BRAND_BACKGROUND_COLOR__: brandingConfig.backgroundColor,
  __BRAND_ICON_LARGE__:
