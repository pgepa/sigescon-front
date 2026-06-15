import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  getContratos, getContratados, getStatus,
  getTermosAditivos, getArquivosByContratoId, downloadArquivoContrato, downloadArquivoAditivo,
  getContratoDetalhado,
  type Contrato, type Contratado, type Status, type TermoAditivo,
} from "@/lib/api";
import brasaoPara from "@/assets/logo.svg";

// ── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return d; }
}

function ordinal(n: number) {
  return `${n}º`;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ── tipos ────────────────────────────────────────────────────────────────────

type ArquivoItem = {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  data_upload: string;
};

// ── modal de detalhes ────────────────────────────────────────────────────────

function ModalDetalhes({
  contrato,
  onClose,
}: {
  contrato: Contrato;
  onClose: () => void;
}) {
  const [detalhes, setDetalhes] = useState<Contrato>(contrato);
  const [aditivos, setAditivos] = useState<TermoAditivo[]>([]);
  const [arquivos, setArquivos] = useState<ArquivoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getContratoDetalhado(contrato.id).catch(() => null),
      getTermosAditivos(contrato.id).catch(() => ({ data: [] })),
      getArquivosByContratoId(contrato.id).catch(() => ({ arquivos: [] })),
    ]).then(([detalhe, termos, arqs]) => {
      if (cancelled) return;
      if (detalhe) setDetalhes(detalhe);
      setAditivos((termos as any).data ?? []);
      setArquivos(
        ((arqs as any).arquivos ?? []).map((a: any) => ({
          id: a.id,
          nome: a.nome_arquivo ?? `Arquivo_${a.id}`,
          tipo: a.tipo_arquivo ?? "",
          tamanho: a.tamanho_bytes ?? 0,
          data_upload: a.created_at ?? "",
        }))
      );
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [contrato.id]);

  async function handleDownloadAditivo(aditivoNum: number, arquivoId: number) {
    const id = `dl-ad-${arquivoId}`;
    try {
      toast.loading("Preparando download…", { id });
      const blob = await downloadArquivoAditivo(arquivoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${ordinal(aditivoNum)}_termo_aditivo`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Download concluído!", { id });
    } catch {
      toast.error("Erro no download.", { id });
    }
  }

  async function handleDownload(arq: ArquivoItem) {
    try {
      toast.loading("Preparando download…", { id: `dl-${arq.id}` });
      const blob = await downloadArquivoContrato(contrato.id, arq.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = arq.nome;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Download concluído!", { id: `dl-${arq.id}` });
    } catch {
      toast.error("Erro no download.", { id: `dl-${arq.id}` });
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-[#1565C0] rounded-t-lg">
          <h2 className="text-white font-bold text-sm uppercase tracking-wide">
            Detalhes do Contrato
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Scroll body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 text-sm">

          {/* Número */}
          <div className="bg-gray-50 border border-gray-200 rounded px-4 py-2">
            <span className="font-semibold text-gray-700">Número do Contrato:</span>{" "}
            <span className="text-blue-800 font-bold">{detalhes.nr_contrato}</span>
          </div>

          {/* Linha 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="font-semibold text-gray-700">Fundamentação legal:</span>{" "}
              {detalhes.base_legal || detalhes.pae || "—"}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Fornecedor:</span>{" "}
              {detalhes.contratado_nome || "—"}
            </div>
          </div>

          {/* Objeto */}
          <div>
            <span className="font-semibold text-gray-700">Objeto:</span>{" "}
            <span className="text-gray-700">{detalhes.objeto || "—"}</span>
          </div>

          <hr />

          {/* Grid de dados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-xs">
            <div><span className="font-semibold">Valor Global:</span> {fmt(detalhes.valor_global)}</div>
            <div><span className="font-semibold">Modalidade:</span> {detalhes.modalidade_nome || "—"}</div>
            <div><span className="font-semibold">Situação:</span> {detalhes.status_nome || "—"}</div>
            <div><span className="font-semibold">Data Início:</span> {fmtData(detalhes.data_inicio)}</div>
            <div><span className="font-semibold">Data Fim:</span> {fmtData(detalhes.data_fim)}</div>
            <div><span className="font-semibold">Gestor:</span> {detalhes.gestor_nome || "—"}</div>
            <div><span className="font-semibold">Fiscal:</span> {detalhes.fiscal_nome || "—"}</div>
            <div><span className="font-semibold">Fiscal Suplente:</span> {detalhes.fiscal_substituto_nome || "—"}</div>
            <div><span className="font-semibold">DOE:</span> {detalhes.doe || "—"}</div>
            <div><span className="font-semibold">Data DOE:</span> {fmtData(detalhes.data_doe)}</div>
            <div><span className="font-semibold">PAE:</span> {detalhes.pae || "—"}</div>
            <div><span className="font-semibold">Termos Contratuais:</span> {detalhes.termos_contratuais || "—"}</div>
          </div>

          <hr />

          {/* Termos Aditivos */}
          <div>
            <h3 className="font-bold text-gray-700 mb-2 uppercase text-xs tracking-wider">
              Termos Aditivos ({aditivos.filter(a => a.ativo !== false).length})
            </h3>
            {loading ? (
              <p className="text-xs text-gray-400 italic">Carregando…</p>
            ) : aditivos.filter(a => a.ativo !== false).length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum termo aditivo cadastrado.</p>
            ) : (
              <div className="rounded border border-indigo-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-indigo-700">Nº</th>
                      <th className="text-left px-3 py-2 font-semibold text-indigo-700">Tipo</th>
                      <th className="text-left px-3 py-2 font-semibold text-indigo-700">Descrição</th>
                      <th className="text-left px-3 py-2 font-semibold text-indigo-700">Assinatura</th>
                      <th className="text-left px-3 py-2 font-semibold text-indigo-700">Publicação</th>
                      <th className="text-left px-3 py-2 font-semibold text-indigo-700">Nova Vigência</th>
                      <th className="text-center px-3 py-2 font-semibold text-indigo-700">Arquivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50 bg-white">
                    {[...aditivos]
                      .filter(a => a.ativo !== false)
                      .sort((a, b) => a.numero_aditivo - b.numero_aditivo)
                      .map((ad, idx) => (
                      <tr key={ad.id} className="hover:bg-indigo-50/30">
                        <td className="px-3 py-2 font-bold text-indigo-700">{ordinal(idx + 1)} Termo Aditivo</td>
                        <td className="px-3 py-2">{ad.tipo}</td>
                        <td className="px-3 py-2 max-w-[180px] truncate" title={ad.objeto}>{ad.objeto}</td>
                        <td className="px-3 py-2">{fmtData(ad.data_assinatura)}</td>
                        <td className="px-3 py-2">{fmtData(ad.data_publicacao)}</td>
                        <td className="px-3 py-2">{fmtData(ad.nova_data_fim)}</td>
                        <td className="px-3 py-2 text-center">
                          {ad.arquivo_id ? (
                            <button
                              onClick={() => handleDownloadAditivo(ad.numero_aditivo, ad.arquivo_id!)}
                              className="text-[#1565C0] hover:text-blue-800 transition-colors"
                              title={ad.arquivo_nome ?? "Baixar arquivo"}
                            >
                              ⬇
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <hr />

          {/* Arquivos */}
          <div>
            <h3 className="font-bold text-gray-700 mb-2 uppercase text-xs tracking-wider">
              Arquivos / Documentos ({arquivos.length})
            </h3>
            {loading ? (
              <p className="text-xs text-gray-400 italic">Carregando…</p>
            ) : arquivos.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum arquivo anexado.</p>
            ) : (
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-gray-700">Descrição do arquivo</th>
                      <th className="text-center px-4 py-2 font-semibold text-gray-700 w-24">Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {arquivos.map((arq, i) => (
                      <tr key={arq.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-2 text-center text-gray-700">{arq.nome}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleDownload(arq)}
                            className="text-[#1565C0] hover:text-blue-800 transition-colors"
                            title="Download"
                          >
                            ⬇
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-gray-200 hover:bg-gray-300 rounded"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── página principal ──────────────────────────────────────────────────────────

export default function RelatorioContratos() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusId, setStatusId] = useState("");
  const [contratadoId, setContratadoId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [statusList, setStatusList] = useState<Status[]>([]);
  const [contratadosList, setContratadosList] = useState<Contratado[]>([]);

  const [contratoModal, setContratoModal] = useState<Contrato | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);

  // Redireciona para login se não houver sessão ativa
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      navigate(`/login?redirect=${encodeURIComponent("/relatorio-contratos")}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    getStatus().then(setStatusList).catch(() => {});
    getContratados({ page: 1, per_page: 1000 })
      .then(r => setContratadosList(r.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, any> = { page, per_page: perPage };
      if (search) filters.search = search;
      if (statusId) filters.status_id = statusId;
      if (contratadoId) filters.contratado_id = contratadoId;
      if (dataInicio) filters.data_inicio = dataInicio;
      if (dataFim) filters.data_fim = dataFim;
      const r = await getContratos(filters);
      setTotalItems(r.total_items);
      setTotalPages(r.total_pages);

      // Enriquece com detalhes completos (valor_global, data_inicio, modalidade etc.)
      const detalhados = await Promise.all(
        r.data.map(c => getContratoDetalhado(c.id).catch(() => c))
      );
      setContratos(detalhados);
    } catch {
      toast.error("Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusId, contratadoId, dataInicio, dataFim]);

  useEffect(() => { load(); }, [load]);

  function exportCSV() {
    const header = ["#", "Nº Contrato", "Fiscal", "Fiscal Suplente", "Fundamentação Legal",
      "Contratado", "Objeto", "Valor Global", "Modalidade",
      "Data Início", "Data Fim", "Termos Contratuais", "Situação"];
    const rows = contratos.map((c, i) => [
      (page - 1) * perPage + i + 1, c.nr_contrato,
      c.fiscal_nome ?? "", c.fiscal_substituto_nome ?? "",
      c.base_legal ?? c.pae ?? "", c.contratado_nome ?? "",
      `"${(c.objeto ?? "").replace(/"/g, '""')}"`,
      c.valor_global != null ? c.valor_global.toFixed(2).replace(".", ",") : "",
      c.modalidade_nome ?? "", fmtData(c.data_inicio), fmtData(c.data_fim),
      c.termos_contratuais ?? "", c.status_nome ?? "",
    ]);
    const csv = [header, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `relatorio-contratos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  }

  function copiarTabela() {
    if (!tableRef.current) return;
    const range = document.createRange();
    range.selectNode(tableRef.current);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    document.execCommand("copy");
    window.getSelection()?.removeAllRanges();
    toast.success("Tabela copiada!");
  }

  const de = (page - 1) * perPage + 1;
  const ate = Math.min(page * perPage, totalItems);

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#relatorio-root) { display: none !important; }
          #relatorio-root { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {contratoModal && (
        <ModalDetalhes contrato={contratoModal} onClose={() => setContratoModal(null)} />
      )}

      <div id="relatorio-root" className="min-h-screen bg-white">

        {/* Cabeçalho institucional */}
        <header className="border-b border-gray-200 bg-white py-3 px-6">
          <div className="w-full flex items-center justify-between">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Procuradoria-Geral do
              </span>
              <span className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                Estado do Pará
              </span>
            </div>
            <div className="flex items-center gap-3">
              <img src={brasaoPara} alt="Brasão do Estado do Pará" className="h-14 w-auto" />
              <div className="flex flex-col leading-tight text-right">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Governo do</span>
                <span className="text-base font-bold text-gray-800 uppercase">Estado do Pará</span>
              </div>
            </div>
          </div>
        </header>

        {/* Barra azul */}
        <div className="bg-[#1565C0] text-white px-6 py-3">
          <div className="w-full">
            <h1 className="text-lg font-bold uppercase tracking-wider">
              Relatório de Contratos — SIGESCON
            </h1>
          </div>
        </div>

        <div className="w-full px-4 py-5">

          {/* Botões + busca */}
          <div className="no-print mb-4 flex flex-wrap items-start gap-3">
            <div className="flex flex-wrap gap-1">
              <button onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#e74c3c] hover:bg-[#c0392b] rounded">
                PDF / Imprimir
              </button>
              <button onClick={copiarTabela}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#7f8c8d] hover:bg-[#636e72] rounded">
                Copiar
              </button>
              <button onClick={exportCSV}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#27ae60] hover:bg-[#1e8449] rounded">
                CSV
              </button>
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-gray-600">Mostrar</span>
                <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="border border-gray-300 rounded px-2 py-1 text-xs">
                  {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs text-gray-600">registros</span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-gray-600">Procurar:</span>
              <input type="text" value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
                placeholder="Buscar…"
                className="border border-gray-300 rounded px-2 py-1 text-xs w-52 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <button onClick={() => { setSearch(searchInput); setPage(1); }}
                className="px-3 py-1.5 text-xs font-semibold bg-[#1565C0] text-white rounded hover:bg-[#1045A0]">
                Buscar
              </button>
            </div>
          </div>

          {/* Filtros avançados */}
          <div className="no-print mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded p-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase">Situação</label>
              <select value={statusId} onChange={e => { setStatusId(e.target.value); setPage(1); }}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs">
                <option value="">Todas</option>
                {statusList.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase">Contratado</label>
              <select value={contratadoId} onChange={e => { setContratadoId(e.target.value); setPage(1); }}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs">
                <option value="">Todos</option>
                {contratadosList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase">Data Início (a partir de)</label>
              <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(1); }}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase">Data Fim (até)</label>
              <input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(1); }}
                className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
          </div>

          {/* Tabela */}
          <div className="w-full border border-gray-200 rounded overflow-hidden">
            <table ref={tableRef} className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  {["#", "Nº do contrato", "Fiscal do contrato", "Fundamentação legal",
                    "Contratado", "Objeto", "Valor global", "Modalidade",
                    "Data início", "Data fim", "Termos Contratuais", "Situação", "Ações"
                  ].map(h => (
                    <th key={h}
                      className="text-left px-3 py-2 font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 last:border-r-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-10 text-gray-400">Carregando…</td></tr>
                ) : contratos.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-10 text-gray-400">Nenhum contrato encontrado.</td></tr>
                ) : (
                  contratos.map((c, idx) => {
                    const rowNum = (page - 1) * perPage + idx + 1;
                    return (
                      <tr key={c.id}
                        className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
                        <td className="px-3 py-2 text-gray-500 border-r border-gray-100">{rowNum}</td>
                        <td className="px-3 py-2 font-medium text-blue-800 border-r border-gray-100 whitespace-nowrap">{c.nr_contrato}</td>
                        <td className="px-3 py-2 border-r border-gray-100">
                          {c.fiscal_nome
                            ? <><span>{c.fiscal_nome} (Fiscal)</span>{c.fiscal_substituto_nome && <><br /><span className="text-gray-500">{c.fiscal_substituto_nome} (Suplente)</span></>}</>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-100 max-w-[180px]">{c.base_legal || c.pae || <span className="text-gray-400">—</span>}</td>
                        <td className="px-3 py-2 border-r border-gray-100 font-medium whitespace-nowrap">{c.contratado_nome || <span className="text-gray-400">—</span>}</td>
                        <td className="px-3 py-2 border-r border-gray-100 max-w-[240px]">
                          <span className="line-clamp-2">{c.objeto || "—"}</span>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-100 text-right tabular-nums whitespace-nowrap">{fmt(c.valor_global)}</td>
                        <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap">{c.modalidade_nome || <span className="text-gray-400">—</span>}</td>
                        <td className="px-3 py-2 border-r border-gray-100 tabular-nums whitespace-nowrap">{fmtData(c.data_inicio)}</td>
                        <td className="px-3 py-2 border-r border-gray-100 tabular-nums whitespace-nowrap">{fmtData(c.data_fim)}</td>
                        <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap">{c.termos_contratuais || <span className="text-gray-400">—</span>}</td>
                        <td className="px-3 py-2 border-r border-gray-100 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold
                            ${(c.status_nome ?? "").toLowerCase().includes("ativ") ? "bg-green-100 text-green-800" :
                              (c.status_nome ?? "").toLowerCase().includes("encerr") ? "bg-gray-200 text-gray-700" :
                              (c.status_nome ?? "").toLowerCase().includes("rescind") ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"}`}>
                            {c.status_nome || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 no-print">
                          <button
                            onClick={() => setContratoModal(c)}
                            className="px-3 py-1 text-[11px] font-semibold text-white bg-[#1565C0] hover:bg-[#1045A0] rounded"
                          >
                            Ações
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 no-print">
            <span className="text-xs text-gray-600">
              {loading ? "Carregando…" : `Exibindo ${de} a ${ate} de ${totalItems} registro(s)`}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(1)}
                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-100">«</button>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-100">‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-2 py-1 text-xs border rounded ${p === page ? "bg-[#1565C0] text-white border-[#1565C0]" : "border-gray-300 hover:bg-gray-100"}`}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-100">›</button>
              <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(totalPages)}
                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-100">»</button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
