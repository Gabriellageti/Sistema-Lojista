// Sistema Lojista - Settings Page

import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Trash2, Store, FileText, Eye, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useSettings } from '@/hooks/useSettings';
import { useReceiptConfig } from '@/hooks/useReceiptConfig';
import { StoreSettings, ReceiptConfig } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { generateReceiptPDF } from '@/services/PDFService';
import { useTheme } from 'next-themes';

const Settings = () => {
  const { settings, loading: settingsLoading, saveSettings } = useSettings();
  const { config: receiptConfig, loading: receiptLoading, saveReceiptConfig } = useReceiptConfig();
  const [localSettings, setLocalSettings] = useState<StoreSettings>(settings);
  const [localReceiptConfig, setLocalReceiptConfig] = useState<ReceiptConfig>(receiptConfig);

  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setLocalSettings(settings);
    setLocalReceiptConfig(receiptConfig);
  }, [settings, receiptConfig]);

  const handleSave = async () => {
    await saveSettings(localSettings);
    await saveReceiptConfig(localReceiptConfig);
    
    // Apply theme after saving
    setTheme(localSettings.theme);
    
    toast({
      title: "Configurações salvas",
      description: "As configurações foram atualizadas com sucesso.",
    });
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setLocalSettings(prev => ({ ...prev, theme: newTheme }));
    setTheme(newTheme);
  };

  const handlePreviewPDF = () => {
    const now = new Date();
    const demoData = {
      id: 'DEMO-001',
      dataHora: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      itens: [
        { descricao: 'Capa Samsung Galaxy A54', qtde: 1, total: 25.00 },
        { descricao: 'Película de Vidro iPhone 15', qtde: 1, total: 15.00 }
      ],
      subtotal: 40.00,
      formaPagamento: 'pix'
    };

    console.log('Gerando PDF de demonstração com dados:', demoData);
    console.log('Configuração do recibo:', localReceiptConfig);
    
    const pdfUrl = generateReceiptPDF('venda', demoData, localReceiptConfig);
    if (!pdfUrl) {
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar o PDF de demonstração.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "PDF gerado",
        description: "O recibo de demonstração foi aberto em uma nova aba.",
      });
    }
  };

  const handleClearData = () => {
    if (confirm('Deseja realmente apagar todos os dados? Esta ação não pode ser desfeita.')) {
      // This would need to be implemented with proper Supabase data clearing
      toast({
        title: "Funcionalidade indisponível",
        description: "A limpeza de dados será implementada em uma próxima versão.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Configurações</h1>
        <p className="text-muted-foreground">Personalize o Sistema Lojista para seu negócio</p>
      </div>

      {/* Store Information */}
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Informações da Loja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="storeName">Nome da Loja</Label>
            <Input
              id="storeName"
              value={localSettings.storeName}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, storeName: e.target.value }))}
              placeholder="Digite o nome da sua loja"
            />
          </div>
          
          <div>
            <Label htmlFor="storePhone">Telefone</Label>
            <Input
              id="storePhone"
              value={localSettings.storePhone}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, storePhone: e.target.value }))}
              placeholder="(11) 99999-9999"
            />
          </div>
        </CardContent>
      </Card>

      {/* Print Settings */}
      <Card className="hs-card">
        <CardHeader>
          <CardTitle>Configurações de Impressão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="paperWidth">Largura do Papel (mm)</Label>
            <select
              id="paperWidth"
              value={localSettings.paperWidth}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, paperWidth: parseInt(e.target.value) as 58 | 80 | 85 }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value={58}>58mm</option>
              <option value={80}>80mm</option>
              <option value={85}>85mm</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione a largura da bobina da sua impressora térmica
            </p>
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Configurações do App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoSuggestion">Autosugestão</Label>
              <p className="text-xs text-muted-foreground">
                Sugere descrições já utilizadas durante o preenchimento
              </p>
            </div>
            <Switch
              id="autoSuggestion"
              checked={localSettings.autoSuggestion}
              onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, autoSuggestion: checked }))}
            />
          </div>

          <div>
            <Label htmlFor="theme">Tema</Label>
            <select
              id="theme"
              value={localSettings.theme}
              onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-2"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </div>

          <div>
            <Label htmlFor="currency">Moeda</Label>
            <select
              id="currency"
              value={localSettings.currency}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-2"
            >
              <option value="BRL">Real Brasileiro (R$)</option>
              <option value="USD">Dólar Americano ($)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Configuration */}
      <Card className="hs-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Configurações de Recibo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nomeLoja">Nome da Loja</Label>
              <Input
                id="nomeLoja"
                value={localReceiptConfig.nomeLoja}
                onChange={(e) => setLocalReceiptConfig(prev => ({ ...prev, nomeLoja: e.target.value }))}
                placeholder="Nome que aparecerá no recibo"
              />
            </div>
            
            <div>
              <Label htmlFor="telefoneLoja">Telefone</Label>
              <Input
                id="telefoneLoja"
                value={localReceiptConfig.telefoneLoja}
                onChange={(e) => setLocalReceiptConfig(prev => ({ ...prev, telefoneLoja: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="cnpjLoja">CNPJ</Label>
              <Input
                id="cnpjLoja"
                value={localReceiptConfig.cnpjLoja}
                onChange={(e) => setLocalReceiptConfig(prev => ({ ...prev, cnpjLoja: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <Label htmlFor="instagramLoja">Instagram (sem @)</Label>
              <Input
                id="instagramLoja"
                value={localReceiptConfig.instagramLoja}
                onChange={(e) => setLocalReceiptConfig(prev => ({ ...prev, instagramLoja: e.target.value }))}
                placeholder="helpsmart"
              />
            </div>

            <div>
              <Label htmlFor="larguraBobina">Largura da Bobina</Label>
              <select
                id="larguraBobina"
                value={localReceiptConfig.larguraBobina}
                onChange={(e) => setLocalReceiptConfig(prev => ({ ...prev, larguraBobina: parseInt(e.target.value) as 58 | 80 | 85 }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value={58}>58mm</option>
                <option value={80}>80mm</option>
                <option value={85}>85mm</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="enderecoLoja">Endereço</Label>
            <Input
              id="enderecoLoja"
              value={localReceiptConfig.enderecoLoja}
              onChange={(e) => setLocalReceiptConfig(prev => ({ ...prev, enderecoLoja: e.target.value }))}
              placeholder="Rua das Flores, 123 - Centro"
            />
          </div>

          <div>
            <Label htmlFor="mensagemAgradecimento">Mensagem de Agradecimento</Label>
            <Input
              id="mensagemAgradecimento"
              value={localReceiptConfig.mensagemAgradecimento}
              onChange={(e) => setLocalReceiptConfig(prev => ({ ...prev, mensagemAgradecimento: e.target.value }))}
              placeholder="Obrigado pela preferência!"
            />
          </div>

          <div>
            <Label htmlFor="politicaGarantia">Política de Garantia</Label>
            <Textarea
              id="politicaGarantia"
              value={localReceiptConfig.politicaGarantia}
              onChange={(e) => setLocalReceiptConfig(prev => ({ ...prev, politicaGarantia: e.target.value }))}
              placeholder="Descreva sua política de garantia..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePreviewPDF} variant="outline" className="flex-1">
              <Eye className="w-4 h-4 mr-2" />
              Pré-visualizar Recibo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="hs-card border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Gerenciamento de Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-destructive/5 rounded-lg">
            <h4 className="font-semibold text-destructive mb-2">Limpar Todos os Dados</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Esta ação irá apagar todos os lançamentos, ordens de serviço e configurações. 
              Dados demo serão recarregados após a limpeza.
            </p>
            <Button
              variant="destructive"
              onClick={handleClearData}
              className="w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" className="w-full md:w-auto">
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default Settings;