import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  IconClipboardList,
  IconFileText,
  IconUpload,
  IconRefresh,
  IconEye,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDashboardFiscalCompleto,
  type DashboardFiscalCompletoResponse,
} from "@/lib/api";

export function FiscalDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] =
    useState<DashboardFiscalCompletoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados do dashboard
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log("🔍 Carregando dashboard completo do fiscal...");
      const data = await getDashboardFiscalCompleto();
      setDashboardData(data);
      console.log("✅ Dashboard fiscal carregado:", data);
    } catch (error) {
      console.error("❌ Erro ao carregar dashboard fiscal:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <IconAlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            Erro ao carregar dashboard
          </h3>
          <Button onClick={loadDashboardData} variant="outline">
            <IconRefresh className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const { contadores } = dashboardData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-800">
            Dashboard Fiscal
          </h1>
          <p className="text-green-600 mt-1">
            Gerencie suas fiscalizações e envie relatórios
          </p>
        </div>
        <Button
          onClick={loadDashboardData}
          variant="outline"
          className="border-green-200 text-green-700 hover:bg-green-50"
        >
          <IconRefresh className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Dashboard Principal */}
        <Card className="border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium text-blue-700">
              Resumo das Atividades
            </CardTitle>
            <IconClipboardList className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Pendências Ativas:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-800">
                    {contadores.minhas_pendencias || 0}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => navigate("/enviar-relatorio")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <IconUpload className="w-4 h-4 mr-1" />
                    Enviar Relatório
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Em Atraso:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-red-800">
                    {contadores.pendencias_em_atraso || 0}
                  </span>
                  {(contadores.pendencias_em_atraso || 0) > 0 && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      URGENTE
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Contratos Ativos:</span>
                <span className="text-2xl font-bold text-green-800">
                  {contadores.contratos_ativos || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Meus Contratos */}
        <Card
          className="border-green-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => navigate("/fiscal/contratos")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium text-green-700">
              Meus Contratos com Pendências
            </CardTitle>
            <IconFileText className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800 mb-4">
              {contadores.contratos_ativos || 0}
            </div>
            <p className="text-sm text-green-600 mb-4">
              Contratos sob fiscalização onde posso responder pendências
              individualmente
            </p>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <IconEye className="w-4 h-4 mr-2" />
              Ver Contratos e Pendências
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
