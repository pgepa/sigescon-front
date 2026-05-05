import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    getDashboardAdminCompleto,
    getDashboardAdminPendenciasVencidasCompleto,
    getDashboardAdminContratosProximosVencimento,
    type DashboardAdminCompletoResponse,
    type DashboardAdminPendenciasVencidasResponse,
} from "@/lib/api";

// ─── Tipos locais ─────────────────────────────────────────────────────────────
type ContratosProximosVencimentoData = {
    contratos_proximos_vencimento: Array<{
        contrato_id: number;
        contrato_numero: string;
        contrato_objeto: string;
        data_fim: string;
        dias_para_vencer: number;
        contratado_nome: string;
        fiscal_nome: string;
        gestor_nome: string;
        status_nome: string;
        nivel_urgencia: "CRÍTICO" | "ALTO" | "MÉDIO" | "BAIXO";
    }>;
    estatisticas: {
        criticos_30_dias: number;
        altos_60_dias: number;
        medios_90_dias: number;
        total_proximos_vencimento: number;
    };
    total_contratos: number;
};

type AlertItem = {
    id: string;
    tipo: "critico" | "alerta" | "aviso" | "info";
    titulo: string;
    subtitulo: string;
    link?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatValor(valor: number): string {
    if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1).replace(".", ",")}M`;
    if (valor >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
    return valor.toFixed(0);
}

function buildAlerts(
    pendenciasData: DashboardAdminPendenciasVencidasResponse | null,
    vencimentoData: ContratosProximosVencimentoData | null,
    dashboardData: DashboardAdminCompletoResponse | null
): AlertItem[] {
    const alerts: AlertItem[] = [];

    // Pendências vencidas → vermelho
    if (pendenciasData?.pendencias_vencidas) {
        pendenciasData.pendencias_vencidas.slice(0, 3).forEach((p) => {
            alerts.push({
                id: `pend-${p.pendencia_id}`,
                tipo: "critico",
                titulo: `Contrato ${p.contrato_numero} — ${p.titulo}`,
                subtitulo: `Prazo excedido em ${p.dias_em_atraso} dia${p.dias_em_atraso !== 1 ? "s" : ""} · Fiscal: ${p.fiscal_nome}`,
                link: `/contratos/${p.contrato_id}`,
            });
        });
    }

    // Contratos críticos (≤ 30 dias) → laranja
    if (vencimentoData?.contratos_proximos_vencimento) {
        vencimentoData.contratos_proximos_vencimento
            .filter((c) => c.nivel_urgencia === "CRÍTICO")
            .slice(0, 3)
            .forEach((c) => {
                alerts.push({
                    id: `venc-${c.contrato_id}`,
                    tipo: "alerta",
                    titulo: `Contrato ${c.contrato_numero} — Vigência expira em ${c.dias_para_vencer} dias`,
                    subtitulo: `Renovação ou encerramento necessário · Gestor: ${c.gestor_nome}`,
                    link: `/contratos/${c.contrato_id}`,
                });
            });
    }

    // Relatórios aguardando análise → amarelo
    if (dashboardData?.contratos_com_relatorios_pendentes) {
        dashboardData.contratos_com_relatorios_pendentes.slice(0, 2).forEach((c) => {
            const dias = c.ultimo_relatorio_data
                ? Math.floor(
                      (Date.now() - new Date(c.ultimo_relatorio_data).getTime()) / 86_400_000
                  )
                : 0;
            alerts.push({
                id: `rel-${c.id}`,
                tipo: "aviso",
                titulo: `Contrato ${c.nr_contrato} — Relatório aguardando aprovação`,
                subtitulo: `Aguardando análise há ${dias} dia${dias !== 1 ? "s" : ""} · Fiscal: ${c.fiscal_nome}`,
                link: `/gestao-relatorios`,
            });
        });
    }

    return alerts;
}

// ─── Componentes menores ───────────────────────────────────────────────────────
function StatCard({
    label,
    value,
    color,
    onClick,
}: {
    label: string;
    value: string | number;
    color?: "orange" | "red" | "default";
    onClick?: () => void;
}) {
    const valueClass =
        color === "orange"
            ? "text-orange-500"
            : color === "red"
            ? "text-red-500"
            : "text-gray-900";

    return (
        <div
            className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm ${
                onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""
            }`}
            onClick={onClick}
        >
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${valueClass}`}>{value}</p>
        </div>
    );
}

function AlertIcon({ tipo }: { tipo: AlertItem["tipo"] }) {
    if (tipo === "critico") {
        return (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                !
            </span>
        );
    }
    if (tipo === "alerta") {
        return (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold">
                !
            </span>
        );
    }
    if (tipo === "aviso") {
        return (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-white text-xs font-bold">
                –
            </span>
        );
    }
    return (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold">
            i
        </span>
    );
}

// ─── Dashboard principal ───────────────────────────────────────────────────────
export default function AdminDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardAdminCompletoResponse | null>(null);
    const [pendenciasData, setPendenciasData] = useState<DashboardAdminPendenciasVencidasResponse | null>(null);
    const [vencimentoData, setVencimentoData] = useState<ContratosProximosVencimentoData | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [main, pend, venc] = await Promise.allSettled([
                getDashboardAdminCompleto(),
                getDashboardAdminPendenciasVencidasCompleto(),
                getDashboardAdminContratosProximosVencimento(90),
            ]);

            if (main.status === "fulfilled") setDashboardData(main.value);
            if (pend.status === "fulfilled") setPendenciasData(pend.value);
            if (venc.status === "fulfilled") setVencimentoData(venc.value as ContratosProximosVencimentoData);
        } catch {
            toast.error("Erro ao carregar dados do dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // ── Loading skeleton ────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-8 space-y-6 animate-pulse">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-28 bg-gray-100 rounded-xl" />
                    ))}
                </div>
                <div className="h-64 bg-gray-100 rounded-xl" />
            </div>
        );
    }

    const contadores = dashboardData?.contadores;
    const alerts = buildAlerts(pendenciasData, vencimentoData, dashboardData);

    // KPIs
    const contratosAtivos = contadores?.contratos_ativos ?? 0;
    const aVencer30 = vencimentoData?.estatisticas?.criticos_30_dias ?? contadores?.contratos_vencendo ?? 0;
    const valorTotal = contadores?.valor_total_contratos ?? 0;
    const pendenciasFiscais =
        pendenciasData?.total_pendencias_vencidas ??
        contadores?.contratos_com_pendencias ??
        0;

    return (
        <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Contratos ativos"
                    value={contratosAtivos}
                    onClick={() => navigate("/contratos")}
                />
                <StatCard
                    label="A vencer em 30 dias"
                    value={aVencer30}
                    color="orange"
                    onClick={() => navigate("/contratos?vencimento_90_dias=true")}
                />
                <StatCard
                    label="Valor total (R$)"
                    value={formatValor(valorTotal)}
                />
                <StatCard
                    label="Pendências fiscais"
                    value={pendenciasFiscais}
                    color={pendenciasFiscais > 0 ? "red" : "default"}
                    onClick={() => navigate("/gestao-de-pendencias")}
                />
            </div>

            {/* Alertas e Pendências */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-800">Alertas e pendências</h2>
                    {alerts.length > 0 && (
                        <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full">
                            {alerts.length} {alerts.length === 1 ? "item" : "itens"}
                        </span>
                    )}
                </div>

                {alerts.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-400 text-sm">
                        Nenhum alerta no momento. Tudo em dia!
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {alerts.map((alert) => (
                            <li
                                key={alert.id}
                                className={`flex items-start gap-3 px-6 py-4 ${
                                    alert.link
                                        ? "cursor-pointer hover:bg-gray-50 transition-colors"
                                        : ""
                                }`}
                                onClick={() => alert.link && navigate(alert.link)}
                            >
                                <div className="mt-0.5">
                                    <AlertIcon tipo={alert.tipo} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800 leading-snug">
                                        {alert.titulo}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{alert.subtitulo}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
