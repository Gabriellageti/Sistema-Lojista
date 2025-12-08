import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReceiptConfig } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useReceiptConfig = () => {
  const [config, setConfig] = useState<ReceiptConfig | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Default config
  const defaultConfig: ReceiptConfig = {
    nomeLoja: 'Help Smart',
    enderecoLoja: '',
    telefoneLoja: '',
    cnpjLoja: '57.550.258/0001-89',
    instagramLoja: '',
    larguraBobina: 80 as const,
    mensagemAgradecimento: 'Obrigado pela preferência!',
    politicaGarantia: 'Produtos com defeito devem ser apresentados com nota fiscal e embalagem original no prazo de 90 dias.',
  };

  // Load config
  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('receipt_config')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const mappedConfig: ReceiptConfig = {
          nomeLoja: data.nome_loja,
          enderecoLoja: data.endereco_loja || '',
          telefoneLoja: data.telefone_loja || '',
          cnpjLoja: data.cnpj_loja || '57.550.258/0001-89',
          instagramLoja: data.instagram_loja || '',
          larguraBobina: data.largura_bobina as 58 | 80 | 85,
          mensagemAgradecimento: data.mensagem_agradecimento || 'Obrigado pela preferência!',
          politicaGarantia: data.politica_garantia || 'Produtos com defeito devem ser apresentados com nota fiscal e embalagem original no prazo de 90 dias.',
        };
        setConfig(mappedConfig);
        setConfigId(data.id);
      } else {
        // Create default config if none exists
        await saveReceiptConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading receipt config:', error);
      setConfig(defaultConfig);
      toast({
        title: "Erro",
        description: "Erro ao carregar configuração de recibo, usando padrões",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save config
  const saveReceiptConfig = async (newConfig: ReceiptConfig) => {
    try {
      const configData: Record<string, any> = {
        nome_loja: newConfig.nomeLoja,
        endereco_loja: newConfig.enderecoLoja || null,
        telefone_loja: newConfig.telefoneLoja || null,
        cnpj_loja: newConfig.cnpjLoja || '57.550.258/0001-89',
        instagram_loja: newConfig.instagramLoja || null,
        largura_bobina: newConfig.larguraBobina,
        mensagem_agradecimento: newConfig.mensagemAgradecimento || null,
        politica_garantia: newConfig.politicaGarantia || null,
      };

      if (configId) {
        configData.id = configId;
      }

      const { data, error } = await supabase
        .from('receipt_config')
        .upsert(configData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const mappedConfig: ReceiptConfig = {
          nomeLoja: data.nome_loja,
          enderecoLoja: data.endereco_loja || '',
          telefoneLoja: data.telefone_loja || '',
          cnpjLoja: data.cnpj_loja || '57.550.258/0001-89',
          instagramLoja: data.instagram_loja || '',
          larguraBobina: data.largura_bobina as 58 | 80 | 85,
          mensagemAgradecimento: data.mensagem_agradecimento || 'Obrigado pela preferência!',
          politicaGarantia: data.politica_garantia || 'Produtos com defeito devem ser apresentados com nota fiscal e embalagem original no prazo de 90 dias.',
        };

        setConfig(mappedConfig);
        setConfigId(data.id);
      } else {
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Error saving receipt config:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração de recibo",
        variant: "destructive",
      });
    }
  };

  // Get config
  const getReceiptConfig = () => config || defaultConfig;

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config: config || defaultConfig,
    loading,
    saveReceiptConfig,
    getReceiptConfig,
    reload: loadConfig,
  };
};