import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  IconFile,
  IconDownload,
  IconTrash,
  IconRefresh,
  IconFileText,
  IconPhoto,
  IconFileSpreadsheet,
  IconCalendar,
  IconUser,
  IconAlertTriangle,
  IconClipboardList,
  IconEye,
} from "@tabler/icons-react";
import { FileText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  getArquivosByContratoId,
  downloadArquivoContrato,
  deleteArquivoContrato,
  getModeloRelatorioInfo,
  getRelatoriosFiscalizacao,
  getRelatoriosParaGestor,
  getDadosRelatorioFiscalizacao,
  getUrlPdfRelatorioSalvo,
  getUrlPdfVisualizarRelatorio,
  enviarRelatorioParaGestor,
  type ModeloRelatorioInfo,
  type RelatorioFiscalizacaoItem,
  type RelatorioFiscalizacaoFormData,
} from "@/lib/api";
import { FormularioFiscalizacaoModal } from "@/components/FormularioFiscalizacaoModal";

interface ContratoInfo {
  nr_contrato?: string;
  pae?: string;
  contratado_nome?: string;
  contratado_cnpj?: string;
  objeto?: string;
  data_inicio?: string;
  data_fim?: string;
  valor_global?: number | null;
  fiscal_nome?: string;
}

interface ContratoArquivosProps {
  contratoId: number;
  contrato?: ContratoInfo;
  className?: string;
}

type ArquivoContrato = {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  data_upload: string;
  uploadado_por_nome?: string;
  categoria: 'contratual' | 'relatorio';
};

export function ContratoArquivos({ contratoId, contrato, className }: ContratoArquivosProps) {
  const { perfilAtivo } = useAuth();
  const [arquivosContratuais, setArquivosContratuais] = useState<ArquivoContrato[]>([]);
  const [relatoriosFiscalizacao, setRelatoriosFiscalizacao] = useState<RelatorioFiscalizacaoItem[]>([]);
  const [filtroMes, setFiltroMes] = useState<string>("");
  const [editandoRelatorio, setEditandoRelatorio] = useState<{
    id: number;
    dados: RelatorioFiscalizacaoFormData;
  } | null>(null);
  const [carregandoEdicao, setCarregandoEdicao] = useState<number | null>(null);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    arquivo: ArquivoContrato | null;
  }>({ open: false, arquivo: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [modeloRelatorio, setModeloRelatorio] = useState<ModeloRelatorioInfo | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);

  // Verificar se o usuário pode excluir arquivos (apenas admin)
  const canDelete = perfilAtivo?.nome === 'Administrador';

  // Carregar arquivos contratuais (apenas arquivos do contrato, não relatórios)
  const loadArquivosContratuais = async () => {
    try {
      console.log("🔍 Carregando arquivos contratuais do contrato:", contratoId);
      const response = await getArquivosByContratoId(contratoId);

      // Filtrar apenas arquivos contratuais (não relatórios)
      const arquivosFormatados: ArquivoContrato[] = response.arquivos.map(arquivo => ({
        id: arquivo.id,
        nome: arquivo.nome_arquivo || `Arquivo_${arquivo.id}`,
        tipo: arquivo.tipo_arquivo || getFileExtension(arquivo.nome_arquivo || ''),
        tamanho: arquivo.tamanho_bytes || 0,
        data_upload: arquivo.created_at,
        uploadado_por_nome: 'Administrador', // Arquivos contratuais são sempre do admin
        categoria: 'contratual' as const
      }));

      setArquivosContratuais(arquivosFormatados);
      console.log("✅ Arquivos contratuais carregados:", arquivosFormatados);
    } catch (error) {
      console.error("❌ Erro ao carregar arquivos contratuais:", error);
      setArquivosContratuais([]);
    }
  };

  // Carregar todos os dados
  const loadModeloRelatorio = async () => {
    try {
      const modelo = await getModeloRelatorioInfo();
      setModeloRelatorio(modelo);
      console.log("✅ Modelo de relatório carregado:", modelo);
    } catch (error) {
      console.error("❌ Erro ao carregar modelo de relatório:", error);
      // Não mostra toast de erro, apenas não exibe o botão
    }
  };

  const boolParaOpcao = (v: boolean | null): string => {
    if (v === true) return "sim";
    if (v === false) return "nao";
    return "";
  };

  const dbParaRespostas = (d: RelatorioFiscalizacaoFormData) => ({
    periodo_inicio: d.periodo_inicio?.slice(0, 10) || "",
    periodo_fim: d.periodo_fim?.slice(0, 10) || "",
    data_assinatura: d.data_relatorio?.slice(0, 10) || "",
    q1: boolParaOpcao(d.execucao_objeto_sim), q1_detalhe: d.execucao_objeto_detalhes || "",
    q2: boolParaOpcao(d.prazo_execucao_sim), q2_detalhe: d.prazo_execucao_detalhes || "",
    q3: boolParaOpcao(d.nivel_qualidade_sim), q3_detalhe: d.nivel_qualidade_detalhes || "",
    q4: boolParaOpcao(d.medicoes_servicos_sim), q4_detalhe: d.medicoes_servicos_detalhes || "",
    q5: boolParaOpcao(d.ocorrencias_sim), q5_detalhe: d.ocorrencias_detalhes || "",
    q6: boolParaOpcao(d.documentos_habilitacao_sim), q6_detalhe: d.documentos_habilitacao_detalhes || "",
    q7: boolParaOpcao(d.subcontratacao_sim), q7_detalhe: d.subcontratacao_detalhes || "",
    q8: d.obrigacoes_empregados_resposta || "", q8_detalhe: d.obrigacoes_empregados_detalhes || "",
    q9: d.garantias_contratuais_resposta || "", q9_detalhe: d.garantias_contratuais_detalhes || "",
    q10: boolParaOpcao(d.execucao_satisfatoria_sim), q10_detalhe: d.execucao_satisfatoria_detalhes || "",
  });

  const handleAbrirEdicao = async (relatorioId: number) => {
    setCarregandoEdicao(relatorioId);
    try {
      const dados = await getDadosRelatorioFiscalizacao(relatorioId);
      setEditandoRelatorio({ id: relatorioId, dados });
      setFormularioAberto(true);
    } catch {
      toast.error("Erro ao carregar dados do rascunho.");
    } finally {
      setCarregandoEdicao(null);
    }
  };

  const ehFiscal = perfilAtivo?.nome === "Fiscal";
  const ehGestor = perfilAtivo?.nome === "Gestor" || perfilAtivo?.nome === "Administrador";

  const handleEnviarParaGestor = async (relatorioId: number) => {
    setEnviando(relatorioId);
    try {
      await enviarRelatorioParaGestor(relatorioId);
      toast.success("Relatório enviado ao gestor com sucesso.");
      await loadRelatoriosFiscalizacao();
    } catch {
      toast.error("Erro ao enviar relatório. Tente novamente.");
    } finally {
      setEnviando(null);
    }
  };

  const loadRelatoriosFiscalizacao = async () => {
    console.log(`[Relatórios] perfil=${perfilAtivo?.nome} ehGestor=${ehGestor} contratoId=${contratoId}`);
    const data = ehGestor
      ? await getRelatoriosParaGestor(contratoId)
      : await getRelatoriosFiscalizacao(contratoId);
    console.log(`[Relatórios] retornados:`, data.length, data.map(r => r.status));
    setRelatoriosFiscalizacao(data);
  };

  const loadArquivos = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadArquivosContratuais(),
        loadModeloRelatorio(),
        loadRelatoriosFiscalizacao(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArquivos();
  // perfilAtivo?.nome garante que o endpoint correto é chamado após o perfil ser carregado
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratoId, perfilAtivo?.nome]);

  // Meses disponíveis para o filtro (derivado dos dados carregados)
  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    relatoriosFiscalizacao.forEach((r) => {
      const ref = r.periodo_inicio || r.created_at;
      if (ref) set.add(ref.slice(0, 7)); // "YYYY-MM"
    });
    return Array.from(set).sort().reverse();
  }, [relatoriosFiscalizacao]);

  const relatoriosFiltrados = useMemo(() => {
    if (!filtroMes) return relatoriosFiscalizacao;
    return relatoriosFiscalizacao.filter((r) => {
      const ref = r.periodo_inicio || r.created_at;
      return ref?.startsWith(filtroMes);
    });
  }, [relatoriosFiscalizacao, filtroMes]);

  // Função para obter extensão do arquivo
  const getFileExtension = (nomeArquivo: string): string => {
    const parts = nomeArquivo.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  // Função para obter ícone do arquivo
  const getFileIcon = (tipo: string, tamanho: number = 20) => {
    const iconProps = { size: tamanho, className: "text-gray-600" };

    switch (tipo.toLowerCase()) {
      case 'pdf':
        return <IconFileText {...iconProps} className="text-red-600" />;
      case 'doc':
      case 'docx':
        return <IconFileText {...iconProps} className="text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <IconFileSpreadsheet {...iconProps} className="text-green-600" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <IconPhoto {...iconProps} className="text-purple-600" />;
      default:
        return <IconFile {...iconProps} />;
    }
  };


  // Função para formatar data
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',

    });
  };

  // Função para download de arquivo
  const handleDownload = async (arquivo: ArquivoContrato) => {
    try {
      console.log("📥 Fazendo download do arquivo:", {
        nome: arquivo.nome,
        id: arquivo.id,
        categoria: arquivo.categoria,
        contratoId
      });
      
      toast.loading("Preparando download...", { id: `download-${arquivo.id}` });

      const blob = await downloadArquivoContrato(contratoId, arquivo.id);

      // Criar URL temporária para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = arquivo.nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download realizado com sucesso!", { id: `download-${arquivo.id}` });
    } catch (error: any) {
      console.error("❌ Erro no download:", error);
      toast.error("Erro ao fazer download do arquivo", { id: `download-${arquivo.id}` });
    }
  };

  // Função para excluir arquivo
  const handleDelete = async (arquivo: ArquivoContrato) => {
    setIsDeleting(true);
    try {
      console.log("🗑️ Excluindo arquivo:", arquivo.nome);
      await deleteArquivoContrato(contratoId, arquivo.id);

      if (arquivo.categoria === 'contratual') {
        setArquivosContratuais(prev => prev.filter((a: ArquivoContrato) => a.id !== arquivo.id));
      }

      toast.success("Arquivo excluído com sucesso!");
      setDeleteDialog({ open: false, arquivo: null });
    } catch (error: any) {
      console.error("❌ Erro ao excluir arquivo:", error);

      // Tratamento específico para diferentes tipos de erro
      if (error.message?.includes("Arquivos de relatórios fiscais não podem ser excluídos")) {
        toast.error(
          "Arquivos de relatórios fiscais não podem ser excluídos pois estão vinculados a pendências.",
          { duration: 6000 }
        );
      } else if (error.message?.includes("vinculado a") && error.message?.includes("relatório")) {
        toast.error(
          "Este arquivo contratual não pode ser excluído porque está sendo usado por relatórios fiscais. " +
          "Remova ou substitua os relatórios primeiro.",
          { duration: 6000 }
        );
      } else {
        toast.error("Erro ao excluir arquivo");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFile className="w-5 h-5" />
            Arquivos do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Formulário de Fiscalização */}
      <div className="bg-gradient-to-r from-blue-50 to-slate-50 border-2 border-blue-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-700 text-white p-2 rounded-lg">
              <IconClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 flex items-center gap-2">
                Preencher Relatório Fiscal
                <Badge className="bg-blue-700 text-white text-xs">Padrão do Sistema</Badge>
              </p>
              <p className="text-sm text-blue-700 mt-0.5">
                {modeloRelatorio?.nome_original || "Formulário de Fiscalização — Lei nº 14.133/2021"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Preencha diretamente no sistema e salve como rascunho, relatório ou PDF
              </p>
            </div>
          </div>
          <Button
            onClick={() => setFormularioAberto(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white shadow-sm shrink-0"
            size="sm"
          >
            <IconClipboardList className="w-4 h-4 mr-2" />
            Preencher Formulário
          </Button>
        </div>
      </div>

      <FormularioFiscalizacaoModal
        open={formularioAberto}
        onOpenChange={(aberto) => {
          setFormularioAberto(aberto);
          if (!aberto) {
            setEditandoRelatorio(null);
            loadRelatoriosFiscalizacao(); // Atualiza lista após fechar
          }
        }}
        contrato={contrato}
        contratoId={contratoId}
        relatorioId={editandoRelatorio?.id}
        dadosIniciais={editandoRelatorio ? dbParaRespostas(editandoRelatorio.dados) : undefined}
      />

      {/* Arquivos Contratuais */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconFileText className="w-5 h-5 text-blue-600" />
                Arquivos Contratuais
                <Badge variant="secondary">{arquivosContratuais.length}</Badge>
              </CardTitle>
              <CardDescription>
                Documentos oficiais do contrato (edital, contrato assinado, aditivos, etc.)
              </CardDescription>
            </div>
            <Button onClick={loadArquivos} variant="outline" size="sm">
              <IconRefresh className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {arquivosContratuais.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <IconFileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum arquivo contratual encontrado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Data Upload</TableHead>
                    <TableHead>Enviado por</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arquivosContratuais.map((arquivo) => (
                    <TableRow key={arquivo.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(arquivo.tipo)}
                          <div>
                            <p className="font-medium">{arquivo.nome}</p>
                            <Badge variant="outline" className="text-xs">
                              Contratual
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <IconCalendar className="w-3 h-3" />
                          {formatDate(arquivo.data_upload)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <IconUser className="w-3 h-3" />
                          {arquivo.uploadado_por_nome || 'Sistema'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(arquivo)}
                          >
                            <IconDownload className="w-4 h-4" />
                          </Button>
                          {canDelete && arquivo.categoria === 'contratual' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteDialog({ open: true, arquivo })}
                              className="text-red-600 hover:text-red-700"
                              title="Excluir arquivo contratual"
                            >
                              <IconTrash className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Relatórios de Fiscalização */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                Relatórios de Fiscalização
                <Badge variant="secondary">{relatoriosFiltrados.length}</Badge>
              </CardTitle>
              <CardDescription>
                Relatórios preenchidos pelo fiscal via formulário do sistema
              </CardDescription>
            </div>
            {mesesDisponiveis.length > 0 && (
              <div className="flex items-center gap-2">
                <IconCalendar className="w-4 h-4 text-gray-500" />
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os meses</option>
                  {mesesDisponiveis.map((mes) => {
                    const [ano, m] = mes.split("-");
                    const label = new Date(Number(ano), Number(m) - 1).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    });
                    return (
                      <option key={mes} value={mes}>
                        {label.charAt(0).toUpperCase() + label.slice(1)}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {relatoriosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>
                {filtroMes
                  ? "Nenhum relatório encontrado para o mês selecionado"
                  : "Nenhum relatório de fiscalização salvo ainda"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Data do Relatório</TableHead>
                    <TableHead>Salvo em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatoriosFiltrados.map((rel) => {
                    const fmtDate = (d: string | null) =>
                      d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
                    const periodo =
                      rel.periodo_inicio && rel.periodo_fim
                        ? `${fmtDate(rel.periodo_inicio)} → ${fmtDate(rel.periodo_fim)}`
                        : "—";

                    return (
                      <TableRow key={rel.id}>
                        <TableCell className="font-medium">{periodo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <IconCalendar className="w-3 h-3" />
                            {fmtDate(rel.data_relatorio)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {rel.created_at
                            ? new Date(rel.created_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-2">

                            {/* === EDIÇÃO DE RASCUNHO — disponível para quem visualiza o rascunho (fiscal ou gestor/admin) === */}
                            {rel.status === "rascunho" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs gap-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                                disabled={carregandoEdicao === rel.id || enviando === rel.id}
                                onClick={() => handleAbrirEdicao(rel.id)}
                              >
                                {carregandoEdicao === rel.id
                                  ? <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                  : <>✏️ Editar</>}
                              </Button>
                            )}

                            {/* === AÇÕES DO FISCAL === */}
                            {ehFiscal && rel.status === "rascunho" && (
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={enviando === rel.id || carregandoEdicao === rel.id}
                                onClick={() => handleEnviarParaGestor(rel.id)}
                              >
                                {enviando === rel.id
                                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <>📤 Enviar</>}
                              </Button>
                            )}
                            {ehFiscal && rel.status === "nao_conforme" && (
                              <span
                                className="text-xs text-red-600 italic self-center max-w-[200px] truncate"
                                title={rel.gestor_observacao ?? "Retornado pelo gestor"}
                              >
                                {rel.gestor_observacao ? `Obs: ${rel.gestor_observacao}` : "Retornado pelo gestor"}
                              </span>
                            )}

                            <a
                              href={getUrlPdfVisualizarRelatorio(rel.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Visualizar relatório em PDF"
                            >
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                                <IconEye className="w-3.5 h-3.5" />
                                Visualizar
                              </Button>
                            </a>

                            <a
                              href={getUrlPdfRelatorioSalvo(rel.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Baixar relatório em PDF"
                            >
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                                <IconDownload className="w-3.5 h-3.5" />
                                Baixar
                              </Button>
                            </a>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, arquivo: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="w-5 h-5 text-red-600" />
              Excluir Arquivo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será permanentemente removido do contrato.
              {deleteDialog.arquivo && (
                <>
                  <br /><br />
                  <strong>Arquivo:</strong> {deleteDialog.arquivo.nome}
                  <br />
                  <strong>Tipo:</strong> {deleteDialog.arquivo.categoria === 'contratual' ? 'Contratual' : 'Relatório'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.arquivo) {
                  handleDelete(deleteDialog.arquivo);
                }
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <IconTrash className="w-4 h-4 mr-2" />
                  Excluir Arquivo
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}