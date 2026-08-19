import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  IconSearch,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconFileText,
  IconFilePlus,
  IconEye,
} from "@tabler/icons-react";

import {
  getRelatorioTermosAditivos,
  downloadArquivoAditivo,
  type TermoAditivoRelatorioItem,
} from "@/lib/api";

function fmtData(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return format(new Date(d + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
}

function fmtMoeda(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_BADGE: Record<string, string> = {
  Ativo: "bg-green-100 text-green-700 border-green-200",
  Vencido: "bg-amber-100 text-amber-700 border-amber-200",
  Inativo: "bg-gray-200 text-gray-600 border-gray-300",
};

const TIPO_BADGE: Record<string, string> = {
  Prazo: "bg-blue-100 text-blue-700 border-blue-200",
  Valor: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Misto: "bg-purple-100 text-purple-700 border-purple-200",
  Objeto: "bg-teal-100 text-teal-700 border-teal-200",
  Outros: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function GestaoTermosAditivos() {
  const navigate = useNavigate();
  const [data, setData] = useState<TermoAditivoRelatorioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 15;

  const [searchContrato, setSearchContrato] = useState("");
  const [tipo, setTipo] = useState("");
  const [statusCalc, setStatusCalc] = useState("");

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getRelatorioTermosAditivos({
        page: currentPage,
        per_page: perPage,
        nr_contrato: searchContrato || undefined,
        tipo: tipo || undefined,
        status_calc: statusCalc || undefined,
      });
      setData(response.data);
      setTotalPages(response.total_pages);
      setTotalItems(response.total_items);
    } catch (error: any) {
      console.error("Erro ao carregar termos aditivos:", error);
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchContrato, tipo, statusCalc]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const aplicarFiltros = () => {
    setCurrentPage(1);
    carregarDados();
  };

  const limparFiltros = () => {
    setSearchContrato("");
    setTipo("");
    setStatusCalc("");
    setCurrentPage(1);
  };

  async function handleDownload(item: TermoAditivoRelatorioItem) {
    if (!item.arquivo_id) return;
    const id = `dl-aditivo-${item.id}`;
    try {
      toast.loading("Preparando download…", { id });
      const blob = await downloadArquivoAditivo(item.arquivo_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.arquivo_nome ?? `${item.numero_aditivo}o_termo_aditivo`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download concluído!", { id });
    } catch {
      toast.error("Erro no download.", { id });
    }
  }

  const totalAtivos = data.filter(d => d.status_calc === "Ativo").length;
  const totalVencidos = data.filter(d => d.status_calc === "Vencido").length;
  const totalInativos = data.filter(d => d.status_calc === "Inativo").length;

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconFilePlus className="w-7 h-7 text-indigo-600" />
            Gestão de Termos Aditivos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todos os termos aditivos de todos os contratos, num só lugar
          </p>
        </div>
        <Button variant="outline" onClick={carregarDados} disabled={isLoading}>
          <IconRefresh className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Aditivos</CardTitle>
            <IconFileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Ativos (nesta página)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{totalAtivos}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Vencidos (nesta página)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">{totalVencidos}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Inativos (nesta página)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-700">{totalInativos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IconSearch className="w-4 h-4" />
            Filtros
          </CardTitle>
          <CardDescription>Buscar por contrato, tipo ou status do aditivo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nº Contrato</label>
              <Input
                placeholder="Buscar por número..."
                value={searchContrato}
                onChange={(e) => setSearchContrato(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => { setTipo(e.target.value); setCurrentPage(1); }}
                className="w-full h-9 border border-gray-300 rounded-md px-3 text-sm"
              >
                <option value="">Todos</option>
                <option value="Prazo">Prazo</option>
                <option value="Valor">Valor</option>
                <option value="Misto">Misto (Valor + Prazo)</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <select
                value={statusCalc}
                onChange={(e) => { setStatusCalc(e.target.value); setCurrentPage(1); }}
                className="w-full h-9 border border-gray-300 rounded-md px-3 text-sm"
              >
                <option value="">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Vencido">Vencido</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={aplicarFiltros}>
              <IconSearch className="w-4 h-4 mr-2" /> Buscar
            </Button>
            <Button variant="outline" onClick={limparFiltros}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-16 text-gray-500">Carregando...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              Nenhum termo aditivo encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">Nº Contrato</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Contratado</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-center">Aditivo</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Tipo</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Descrição</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Assinatura</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Nova Vigência</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Acréscimo</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-right">Supressão</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-blue-700">{item.nr_contrato}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate" title={item.contratado_nome ?? ""}>
                        {item.contratado_nome ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-indigo-700">
                        {item.numero_aditivo}º
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs border ${TIPO_BADGE[item.tipo] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                          {item.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate" title={item.objeto}>
                        {item.objeto}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtData(item.data_assinatura)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtData(item.nova_data_fim)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600 whitespace-nowrap">
                        {fmtMoeda(item.valor_acrescimo)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600 whitespace-nowrap">
                        {fmtMoeda(item.valor_supressao)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_BADGE[item.status_calc]}`}>
                          {item.status_calc}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {item.arquivo_id && (
                            <button
                              onClick={() => handleDownload(item)}
                              className="text-indigo-500 hover:text-indigo-700 transition-colors"
                              title={item.arquivo_nome ?? "Baixar arquivo"}
                            >
                              <IconDownload className="w-4 h-4" />
                            </button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/contratos/${item.contrato_id}`)}
                            title="Ver contrato"
                          >
                            <IconEye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-gray-500">
                Total: {totalItems} termos aditivos
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <IconChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <IconChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
