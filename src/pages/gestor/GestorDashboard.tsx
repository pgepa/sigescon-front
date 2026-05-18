import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  IconFileText,
  IconAlertTriangle,
  IconRefresh,
  IconClock,
  IconCheck,
  IconUser,
  IconCalendar,
  IconChevronRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  getDashboardGestorCompleto,
  type DashboardGestorCompletoResponse
} from "@/lib/api";

export function GestorDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardGestorCompletoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardGestorCompleto();
      setDashboardData(data);
    } catch (error) {
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
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded-lg" />
            <div className="h-48 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-4">
        <div className="text-center py-10">
          <IconAlertTriangle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-3">Erro ao carregar dashboard</p>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <IconRefresh className="w-4 h-4 mr-1" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const { contadores, pendencias } = dashboardData;
  const totalPendencias = pendencias.estatisticas.vencidas + pendencias.estatisticas.pendentes;

  return (
    <div className="p-4 space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-800">Dashboard Gestor</h1>
          <p className="text-xs text-blue-500 mt-0.5">Contratos, pendências e desempenho da equipe</p>
        </div>
        <Button
          onClick={loadDashboardData}
          variant="outline"
          size="sm"
          className="border-blue-200 text-blue-600 hover:bg-blue-50 text-xs h-8"
        >
          <IconRefresh className="h-3.5 w-3.5 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Cards de métricas - 4 em linha */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-blue-100 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-blue-600 font-medium">Contratos</span>
            <IconFileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-800">{contadores.contratos_sob_gestao}</div>
          <div className="text-xs text-gray-500 mt-0.5">{contadores.contratos_ativos_sob_gestao} ativos</div>
        </div>

        <div className="bg-white border border-red-100 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-red-600 font-medium">Com Pendências</span>
            <IconAlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-700">{totalPendencias}</div>
          <div className="text-xs text-gray-500 mt-0.5">aguardando ação</div>
        </div>

        <div className="bg-white border border-orange-100 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-orange-600 font-medium">Vencidas</span>
            <IconClock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-700">{pendencias.estatisticas.vencidas}</div>
          <div className="text-xs text-gray-500 mt-0.5">em atraso</div>
        </div>

        <div className="bg-white border border-yellow-100 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-yellow-600 font-medium">Ativas</span>
            <IconClock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-700">{pendencias.estatisticas.pendentes}</div>
          <div className="text-xs text-gray-500 mt-0.5">no prazo</div>
        </div>
      </div>

      {/* Listas de pendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pendências Vencidas */}
        <div className="bg-white border border-red-100 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-100 bg-red-50">
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">Pendências Vencidas</span>
              <span className="bg-red-200 text-red-800 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {pendencias.estatisticas.vencidas}
              </span>
            </div>
          </div>

          <div className="p-3">
            {!pendencias.pendencias_vencidas || pendencias.pendencias_vencidas.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <IconCheck className="w-6 h-6 mx-auto mb-1.5 text-green-400" />
                <p className="text-xs">Nenhuma pendência vencida</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pendencias.pendencias_vencidas.slice(0, 5).map((pendencia) => {
                  const dataPrazo = (pendencia as any).data_prazo || pendencia.prazo_entrega;
                  const diasAtraso = dataPrazo
                    ? Math.ceil((new Date().getTime() - new Date(dataPrazo).getTime()) / 86400000)
                    : null;

                  return (
                    <div key={pendencia.pendencia_id} className="flex items-start justify-between gap-2 p-2.5 rounded-md bg-red-50 border border-red-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-red-900 truncate">{pendencia.contrato_numero}</span>
                          {pendencia.urgencia && (
                            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              pendencia.urgencia === 'CRÍTICA' ? 'bg-red-600 text-white' :
                              pendencia.urgencia === 'ALTA' ? 'bg-orange-500 text-white' :
                              'bg-yellow-500 text-white'
                            }`}>
                              {pendencia.urgencia}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-red-700 truncate">
                          {(pendencia as any).descricao || pendencia.pendencia_titulo || 'Sem descrição'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-red-500">
                          <span className="flex items-center gap-0.5">
                            <IconUser className="w-3 h-3" />
                            {pendencia.fiscal_nome}
                          </span>
                          {diasAtraso && diasAtraso > 0 && (
                            <span className="flex items-center gap-0.5 text-red-600 font-medium">
                              <IconClock className="w-3 h-3" />
                              {diasAtraso}d atraso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {pendencias.pendencias_vencidas.length > 5 && (
                  <button
                    onClick={() => navigate("/pendencias")}
                    className="w-full flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-800 py-1.5 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Ver todas ({pendencias.pendencias_vencidas.length})
                    <IconChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pendências Ativas */}
        <div className="bg-white border border-yellow-100 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-yellow-100 bg-yellow-50">
            <div className="flex items-center gap-2">
              <IconClock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">Pendências Ativas</span>
              <span className="bg-yellow-200 text-yellow-800 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {pendencias.estatisticas.pendentes}
              </span>
            </div>
          </div>

          <div className="p-3">
            {!pendencias.pendencias_pendentes || pendencias.pendencias_pendentes.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <IconCheck className="w-6 h-6 mx-auto mb-1.5 text-green-400" />
                <p className="text-xs">Nenhuma pendência ativa</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pendencias.pendencias_pendentes.slice(0, 5).map((pendencia) => {
                  const dataPrazo = (pendencia as any).data_prazo || pendencia.prazo_entrega;
                  let diasRestantes: number | null = null;
                  let prazoFormatado = "Data inválida";

                  if (dataPrazo) {
                    try {
                      const prazo = new Date(dataPrazo);
                      diasRestantes = Math.ceil((prazo.getTime() - new Date().getTime()) / 86400000);
                      prazoFormatado = prazo.toLocaleDateString("pt-BR");
                    } catch {}
                  }

                  return (
                    <div key={pendencia.pendencia_id} className="flex items-start justify-between gap-2 p-2.5 rounded-md bg-yellow-50 border border-yellow-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-yellow-900 truncate">{pendencia.contrato_numero}</span>
                          {diasRestantes !== null && (
                            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              diasRestantes <= 0 ? 'bg-red-100 text-red-700' :
                              diasRestantes <= 3 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {diasRestantes <= 0 ? 'Vence hoje' : `${diasRestantes}d restantes`}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-yellow-700 truncate">
                          {(pendencia as any).descricao || pendencia.pendencia_titulo || 'Sem descrição'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-yellow-600">
                          <span className="flex items-center gap-0.5">
                            <IconUser className="w-3 h-3" />
                            {pendencia.fiscal_nome}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <IconCalendar className="w-3 h-3" />
                            {prazoFormatado}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {pendencias.pendencias_pendentes.length > 5 && (
                  <button
                    onClick={() => navigate("/pendencias")}
                    className="w-full flex items-center justify-center gap-1 text-xs text-yellow-600 hover:text-yellow-800 py-1.5 border border-yellow-200 rounded-md hover:bg-yellow-50 transition-colors"
                  >
                    Ver todas ({pendencias.pendencias_pendentes.length})
                    <IconChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
