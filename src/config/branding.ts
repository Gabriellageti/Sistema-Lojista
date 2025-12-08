export interface BrandingConfig {
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

export const brandingConfig: BrandingConfig = {
  name: 'App Genérico - Assistência Técnica',
  shortName: 'App Genérico',
  description: 'Sistema de vendas e ordens de serviço offline-first para assistência técnica',
  keywords: ['assistência técnica', 'vendas', 'ordens de serviço', 'PWA', 'offline'],
  author: 'Equipe do Aplicativo',
  themeColor: '#3E3F93',
  backgroundColor: '#3E3F93',
  iconLarge: '/lovable-uploads/befabe7e-2681-4b08-abd2-02734a911a8f.png',
  iconSmall: '/lovable-uploads/befabe7e-2681-4b08-abd2-02734a911a8f.png',
};

export const brandingPlaceholders: Record<string, string> = {
  __BRAND_NAME__: brandingConfig.name,
  __BRAND_SHORT_NAME__: brandingConfig.shortName,
  __BRAND_DESCRIPTION__: brandingConfig.description,
  __BRAND_KEYWORDS__: brandingConfig.keywords.join(', '),
  __BRAND_AUTHOR__: brandingConfig.author,
  __BRAND_THEME_COLOR__: brandingConfig.themeColor,
  __BRAND_BACKGROUND_COLOR__: brandingConfig.backgroundColor,
  __BRAND_ICON_LARGE__: brandingConfig.iconLarge,
  __BRAND_ICON_SMALL__: brandingConfig.iconSmall,
};

export default brandingConfig;
