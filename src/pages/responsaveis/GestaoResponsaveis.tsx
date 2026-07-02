import { useState, useEffect, useCallback } from "react";
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
import {
  IconSearch,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconUsers,
  IconFileText,
  IconUserCheck,
} from "@tabler/icons-react";

import {
  getRelatorioResponsaveis,
  getArquivosPortaria,
  downloadArquivoPortaria,
  getResponsaveisContrato,
  type RelatorioResponsaveisItem,
  type ArquivoPortaria,
  type ContratoResponsavel,
} from "@/lib/api";

function fmtData(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return format(new Date(d + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
}

// ── Modal de Histórico ──────────────────────────────────────────────────────

function ModalHistorico({
  contratoId,
  nrContrato,
  onClose,
}: {
  contratoId: number;
  nrContrato: string;
  onClose: () => void;
}) {
  const [responsaveis, setResponsaveis] = useState<ContratoResponsavel[]>([]);
  const [portarias, setPortarias] = useState<ArquivoPortaria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getResponsaveisContrato(contratoId).catch(() => ({
        responsaveis: [],
        total: 0,
        contrato_id: contratoId,
      })),
      getArquivosPortaria(contratoId).catch(() => ({
        arquivos_portaria: [],
        total_arquivos: 0,
        contrato_id: contratoId,
      })),
    ]).then(([resp, arqs]) => {
      if (cancelled) return;
      setResponsaveis(resp.responsaveis ?? []);
      setPortarias(arqs.arquivos_portaria ?? []);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [contratoId]);

  async function handleDownload(arq: ArquivoPortaria) {
    const id = `dl-port-${arq.id}`;
    try {
      toast.loading("Preparando download…", { id });
      const blob = await downloadArquivoPortaria(arq.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = arq.nome_arquivo;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download concluído!", { id });
    } catch {
      toast.error("Erro no download.", { id });
    }
  }

  const tipoLabel: Record<string, string> = {
    fiscal: "Fiscal",
    gestor: "Gestor",
    fiscal_substituto: "Fiscal Substituto",
  };

  const tipoColor: Record<string, string> = {
    fiscal: "bg-green-100 text-green-700",
    gestor: "bg-blue-100 text-blue-700",
    fiscal_substituto: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-[#1565C0] rounded-t-lg">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide">
            Histórico de Responsáveis — Contrato {nrContrato}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6 text-sm">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Carregando...</div>
          ) : (
            <>
              {/* Tabela de responsáveis */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <IconUsers className="w-4 h-4" />
                  Histórico de Designações ({responsaveis.length})
                </h3>
                {responsaveis.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Nenhum registro de responsável encontrado.</p>
                ) : (
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 font-medium">Tipo</th>
                          <th className="px-3 py-2 font-medium">Nome</th>
                          <th className="px-3 py-2 font-medium">Início</th>
                          <th className="px-3 py-2 font-medium">Fim</th>
                          <th className="px-3 py-2 font-medium">Portaria</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {responsaveis.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${tipoColor[r.tipo] ?? "bg-gray-100 text-gray-700"}`}>
                                {tipoLabel[r.tipo] ?? r.tipo}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium">{r.usuario_nome ?? "—"}</td>
                            <td className="px-3 py-2">{fmtData(r.data_inicio)}</td>
                            <td className="px-3 py-2">{r.data_fim ? fmtData(r.data_fim) : "—"}</td>
                            <td className="px-3 py-2">{r.portaria ?? "—"}</td>
                            <td className="px-3 py-2">
                              {r.data_fim ? (
                                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Encerrado</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Atual</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Arquivos de portaria */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <IconFileText className="w-4 h-4" />
                  Arquivos de Portaria ({portarias.length})
                </h3>
                {portarias.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Nenhum arquivo de portaria encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {portarias.map((arq) => (
                      <div key={arq.id} className="flex items-center justify-between border rounded px-3 py-2 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <IconFileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{arq.nome_arquivo}</p>
                            <p className="text-xs text-gray-400">
                              {arq.created_at ? fmtData(arq.created_at.split("T")[0] ?? arq.created_at.split(" ")[0]) : ""}
                              {arq.tamanho_bytes ? ` · ${(arq.tamanho_bytes / 1024).toFixed(0)} KB` : ""}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(arq)}>
                          <IconDownload className="w-4 h-4 mr-1" /> Baixar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ────────────────────────────────────────────────────────

export default function GestaoResponsaveis() {
  const [data, setData] = useState<RelatorioResponsaveisItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 15;

  const [searchContrato, setSearchContrato] = useState("");
  const [searchFiscal, setSearchFiscal] = useState("");
  const [searchGestor, setSearchGestor] = useState("");

  const [selectedContrato, setSelectedContrato] = useState<RelatorioResponsaveisItem | null>(null);

  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getRelatorioResponsaveis({
        page: currentPage,
        per_page: perPage,
        nr_contrato: searchContrato || undefined,
        fiscal_nome: searchFiscal || undefined,
        gestor_nome: searchGestor || undefined,
      });
      setData(response.data);
      setTotalPages(response.total_pages);
      setTotalItems(response.total_items);
    } catch (error: any) {
      console.error("Erro ao carregar relatório:", error);
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchContrato, searchFiscal, searchGestor]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const aplicarFiltros = () => {
    setCurrentPage(1);
    carregarDados();
  };

  const limparFiltros = () => {
    setSearchContrato("");
    setSearchFiscal("");
    setSearchGestor("");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconUserCheck className="w-7 h-7 text-blue-600" />
            Gestão de Responsáveis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Relatório de contratos com seus fiscais e gestores atuais
          </p>
        </div>
        <Button variant="outline" onClick={carregarDados} disabled={isLoading}>
          <IconRefresh className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
            <IconFileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Página Atual</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPage} de {totalPages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exibindo</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length} registros</div>
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
          <CardDescription>Buscar por contrato, fiscal ou gestor</CardDescription>
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">Fiscal</label>
              <Input
                placeholder="Nome do fiscal..."
                value={searchFiscal}
                onChange={(e) => setSearchFiscal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Gestor</label>
              <Input
                placeholder="Nome do gestor..."
                value={searchGestor}
                onChange={(e) => setSearchGestor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
              />
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
              Nenhum contrato encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700">Nº Contrato</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Objeto</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Gestor Atual</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Fiscal Atual</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Fiscal Substituto</th>
                    <th className="px-4 py-3 font-medium text-gray-700">Vigência</th>
                    <th className="px-4 py-3 font-medium text-gray-700 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((item) => (
                    <tr key={item.contrato_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-blue-700">{item.nr_contrato}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[250px] truncate" title={item.objeto}>
                        {item.objeto}
                      </td>
                      <td className="px-4 py-3">
                        {item.status_nome ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.status_nome === "Ativo" ? "bg-green-100 text-green-700" :
                            item.status_nome === "Encerrado" ? "bg-gray-100 text-gray-500" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {item.status_nome}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.gestor_atual_nome ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                            {item.gestor_atual_nome}
                          </span>
                        ) : (
                          <span className="text-gray-400">Sem gestor</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.fiscal_atual_nome ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                            {item.fiscal_atual_nome}
                          </span>
                        ) : (
                          <span className="text-gray-400">Sem fiscal</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.fiscal_substituto_atual_nome ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmtData(item.data_inicio)} a {fmtData(item.data_fim)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedContrato(item)}
                        >
                          <IconUsers className="w-4 h-4 mr-1" /> Histórico
                        </Button>
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
                Total: {totalItems} contratos
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

      {/* Modal de histórico */}
      {selectedContrato && (
        <ModalHistorico
          contratoId={selectedContrato.contrato_id}
          nrContrato={selectedContrato.nr_contrato}
          onClose={() => setSelectedContrato(null)}
        />
      )}
    </div>
  );
}
