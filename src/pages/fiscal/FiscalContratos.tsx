import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  IconFileText,
  IconAlertTriangle,
  IconUpload,
  IconEye,
  IconRefresh,
  IconCalendar,
  IconUser,
  IconClock,
  IconCheck,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getDashboardFiscalCompleto,
  submitRelatorio,
  type DashboardFiscalCompletoResponse,
} from "@/lib/api";

type PendenciaFiscal = {
  contrato_id: number;
  contrato_numero: string;
  contrato_objeto: string;
  pendencia_id: number;
  pendencia_titulo: string;
  pendencia_descricao: string;
  data_criacao: string;
  prazo_entrega: string | null;
  dias_restantes: number | null;
  em_atraso: boolean;
};

export function FiscalContratos() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] =
    useState<DashboardFiscalCompletoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPendencia, setSelectedPendencia] =
    useState<PendenciaFiscal | null>(null);
  const [relatorioModalOpen, setRelatorioModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data para envio de relatório
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [observacoes, setObservacoes] = useState("");

  // Carregar dados do dashboard fiscal
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log("🔍 Carregando contratos e pendências do fiscal...");
      const data = await getDashboardFiscalCompleto();
      setDashboardData(data);
      console.log("✅ Dados do fiscal carregados:", data);
    } catch (error) {
      console.error("❌ Erro ao carregar dados do fiscal:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filtrar pendências por termo de busca
  const pendenciasFiltradas =
    dashboardData?.minhas_pendencias?.filter(
      (pendencia) =>
        pendencia.contrato_numero
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        pendencia.contrato_objeto
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        pendencia.pendencia_titulo
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    ) || [];

  // Função para enviar relatório
  const handleEnviarRelatorio = async () => {
    if (!selectedPendencia || !arquivo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(
        "📤 Enviando relatório para pendência:",
        selectedPendencia.pendencia_id,
      );

      // Usar data atual como mês de competência
      const dataAtual = new Date();
      const mesCompetenciaAtual = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, "0")}-01`;

      await submitRelatorio(selectedPendencia.contrato_id, {
        arquivo,
        mes_competencia: mesCompetenciaAtual,
        observacoes_fiscal: observacoes,
        pendencia_id: selectedPendencia.pendencia_id,
      });

      toast.success("Relatório enviado com sucesso!");

      // Fechar modal e limpar form
      setRelatorioModalOpen(false);
      setSelectedPendencia(null);
      setArquivo(null);
      setObservacoes("");

      // Recarregar dados
      loadDashboardData();
    } catch (error: any) {
      console.error("❌ Erro ao enviar relatório:", error);
      toast.error(error.message || "Erro ao enviar relatório");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getBadgeVariant = (pendencia: PendenciaFiscal) => {
    if (pendencia.em_atraso) return "destructive";
    if (pendencia.dias_restantes !== null && pendencia.dias_restantes <= 7)
      return "secondary";
    return "default";
  };

  const getBadgeText = (pendencia: PendenciaFiscal) => {
    if (pendencia.em_atraso) return "EM ATRASO";
    if (pendencia.dias_restantes !== null && pendencia.dias_restantes <= 7)
      return "PRÓXIMO DO PRAZO";
    return "PENDENTE";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-green-800">
            Meus Contratos com Pendências
          </h1>
          <p className="text-green-600 mt-1">
            Contratos sob fiscalização e suas pendências
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadDashboardData}
            variant="outline"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            <IconRefresh className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total de Pendências
            </CardTitle>
            <IconFileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {pendenciasFiltradas.length}
            </div>
            <p className="text-xs text-blue-600 mt-1">Pendências ativas</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              Em Atraso
            </CardTitle>
            <IconAlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              {pendenciasFiltradas.filter((p) => p.em_atraso).length}
            </div>
            <p className="text-xs text-red-600 mt-1">Requerem ação urgente</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">
              Próximas do Prazo
            </CardTitle>
            <IconClock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">
              {
                pendenciasFiltradas.filter(
                  (p) =>
                    !p.em_atraso &&
                    p.dias_restantes !== null &&
                    p.dias_restantes <= 7,
                ).length
              }
            </div>
            <p className="text-xs text-yellow-600 mt-1">Próximas 7 dias</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Contratos Únicos
            </CardTitle>
            <IconUser className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              {new Set(pendenciasFiltradas.map((p) => p.contrato_id)).size}
            </div>
            <p className="text-xs text-green-600 mt-1">Sob fiscalização</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFileText className="w-5 h-5" />
            Buscar Pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por contrato, objeto ou pendência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pendências */}
      <Card>
        <CardHeader>
          <CardTitle>Pendências dos Meus Contratos</CardTitle>
        </CardHeader>
        <CardContent>
          {pendenciasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <IconCheck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma pendência encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendenciasFiltradas.map((pendencia) => (
                <Card
                  key={`${pendencia.contrato_id}-${pendencia.pendencia_id}`}
                  className="border-green-100 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">
                            {pendencia.contrato_numero}
                          </h4>
                          <Badge variant={getBadgeVariant(pendencia)}>
                            {getBadgeText(pendencia)}
                          </Badge>
                        </div>
                        <p
                          className="text-gray-600 mb-3"
                          title={pendencia.contrato_objeto}
                        >
                          {pendencia.contrato_objeto}
                        </p>

                        <div className="bg-blue-50 p-3 rounded-lg mb-3">
                          <h5 className="font-medium text-blue-800 mb-1">
                            {pendencia.pendencia_titulo}
                          </h5>
                          <p className="text-sm text-blue-700">
                            {pendencia.pendencia_descricao}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <IconCalendar className="w-4 h-4 text-purple-600" />
                              <span className="font-medium">Criada em:</span>
                              <span>{formatDate(pendencia.data_criacao)}</span>
                            </div>
                            {pendencia.prazo_entrega && (
                              <div className="flex items-center gap-2 mb-1">
                                <IconClock className="w-4 h-4 text-orange-600" />
                                <span className="font-medium">Prazo:</span>
                                <span
                                  className={
                                    pendencia.em_atraso
                                      ? "text-red-600 font-medium"
                                      : ""
                                  }
                                >
                                  {formatDate(pendencia.prazo_entrega)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            {pendencia.dias_restantes !== null && (
                              <div className="flex items-center gap-2 mb-1">
                                <IconAlertTriangle className="w-4 h-4 text-yellow-600" />
                                <span className="font-medium">
                                  {pendencia.em_atraso
                                    ? "Dias em atraso:"
                                    : "Dias restantes:"}
                                </span>
                                <span
                                  className={
                                    pendencia.em_atraso
                                      ? "text-red-600 font-bold"
                                      : "text-green-600"
                                  }
                                >
                                  {Math.abs(pendencia.dias_restantes)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() =>
                            navigate(`/contratos/${pendencia.contrato_id}`)
                          }
                          size="sm"
                          variant="outline"
                        >
                          <IconEye className="w-4 h-4 mr-1" />
                          Ver Contrato
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Envio de Relatório */}
      <Dialog open={relatorioModalOpen} onOpenChange={setRelatorioModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Relatório</DialogTitle>
            <DialogDescription>
              {selectedPendencia && (
                <>
                  Contrato: {selectedPendencia.contrato_numero}
                  <br />
                  Pendência: {selectedPendencia.pendencia_titulo}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="arquivo">Arquivo do Relatório *</Label>
              <Input
                id="arquivo"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                required
              />
              <p className="text-xs text-gray-500">
                Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações sobre o relatório (opcional)..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRelatorioModalOpen(false);
                setSelectedPendencia(null);
                setArquivo(null);
                setObservacoes("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEnviarRelatorio}
              disabled={isSubmitting || !arquivo}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <IconUpload className="w-4 h-4 mr-2" />
                  Enviar Relatório
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FiscalContratos;
