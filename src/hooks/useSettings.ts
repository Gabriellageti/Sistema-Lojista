import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StoreSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { defaultStoreSettings } from '@/config/defaults';

export const useSettings = () => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load settings
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const mappedSettings: StoreSettings = {
          storeName: data.store_name,
          storePhone: data.store_phone || '',
          theme: data.theme as 'light' | 'dark',
          currency: data.currency,
          paperWidth: data.paper_width as 58 | 80 | 85,
          autoSuggestion: data.auto_suggestion,
        };
        setSettings(mappedSettings);
        setSettingsId(data.id);
      } else {
        // Create default settings if none exist
        await saveSettings(defaultStoreSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(defaultStoreSettings);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações, usando padrões",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async (newSettings: StoreSettings) => {
    try {
      const settingsData: Record<string, any> = {
        store_name: newSettings.storeName,
        store_phone: newSettings.storePhone || null,
        theme: newSettings.theme,
        currency: newSettings.currency,
        paper_width: newSettings.paperWidth,
        auto_suggestion: newSettings.autoSuggestion,
      };

      if (settingsId) {
        settingsData.id = settingsId;
      }

      const { data, error } = await supabase
        .from('store_settings')
        .upsert(settingsData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const mappedSettings: StoreSettings = {
          storeName: data.store_name,
          storePhone: data.store_phone || '',
          theme: data.theme as 'light' | 'dark',
          currency: data.currency,
          paperWidth: data.paper_width as 58 | 80 | 85,
          autoSuggestion: data.auto_suggestion,
        };

        setSettings(mappedSettings);
        setSettingsId(data.id);
      } else {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive",
      });
    }
  };

  // Get settings
  const getSettings = () => settings || defaultStoreSettings;

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings: settings || defaultStoreSettings,
    loading,
    saveSettings,
    getSettings,
    reload: loadSettings,
  };
};