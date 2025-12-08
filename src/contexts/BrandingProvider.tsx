import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { defaultBrandingConfig } from '@/config/branding';

export type BrandingPalette = {
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
};

export type BrandingConfig = {
  storeName: string;
  slogan: string;
  logoUrl?: string;
  palette?: BrandingPalette;
};

const BrandingContext = createContext<BrandingConfig | null>(null);

const updateBrandingVariables = (palette?: BrandingPalette) => {
  if (!palette) return;

  const root = document.documentElement;
  if (palette.primary) root.style.setProperty('--brand-primary', palette.primary);
  if (palette.primaryForeground)
    root.style.setProperty('--brand-primary-foreground', palette.primaryForeground);
  if (palette.secondary) root.style.setProperty('--brand-secondary', palette.secondary);
  if (palette.secondaryForeground)
    root.style.setProperty('--brand-secondary-foreground', palette.secondaryForeground);
};

export const BrandingProvider = ({ children, config }: { children: ReactNode; config?: BrandingConfig }) => {
  const mergedConfig = useMemo(() => {
    return {
      ...defaultBrandingConfig,
      ...config,
      palette: {
        ...defaultBrandingConfig.palette,
        ...config?.palette,
      },
    } satisfies BrandingConfig;
  }, [config]);

  useEffect(() => {
    updateBrandingVariables(mergedConfig.palette);
  }, [mergedConfig.palette]);

  return <BrandingContext.Provider value={mergedConfig}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within a BrandingProvider');
  return context;
};
