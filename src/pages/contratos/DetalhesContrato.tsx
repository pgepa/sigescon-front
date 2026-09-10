import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  Trash2,
  Plus,
  Pencil,
  X,
  Download,
  Upload,
  FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getContratoDetalhado,
  getPendenciasByContratoId,
  cancelarPendencia,
  getTermosAditivos,
  createTermoAditivo,
  updateTermoAditivo,
  deleteTermoAditivo,
  deleteTermoAditivoDefinitivamente,
  uploadArquivoAditivo,
  downloadArquivoAditivo,
  type ContratoDetalhado,
  type TermoAditivo,
  type TermoAditivoCreate,
  type TermoAditivoUpdate
} from "@/lib/api";
import { toast } from "sonner";
import { ContratoArquivos } from "@/components/ContratoArquivos";

const TIPOS_ADITIVO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Prazo", label: "Prazo" },
  { value: "Valor", label: "Valor" },
  { value: "Misto", label: "Misto (Valor + Prazo)" },
  { value: "Outros", label: "Outros" },
];

type CamposDescricaoAditivo = Pick<
  Partial<TermoAditivoCreate>,
  "tipo" | "data_assinatura" | "data_inicio" | "nova_data_fim" | "valor_acrescimo" | "valor_supressao"
>;

function gerarDescricaoAditivo(campos: CamposDescricaoAditivo): string {
  const { tipo, data_assinatura: dataAssinatura, data_inicio: dataInicio, nova_data_fim: novaDataFim, valor_acrescimo: valorAcrescimo, valor_supressao: valorSupressao } = campos;
  if (!tipo) return "";
  const fmt = (d: string) => { const [y, m, dia] = d.split("-"); return `${dia}/${m}/${y}`; };
  const fmtVal = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const descricaoValor = () => {
    const partes: string[] = [];
    if (valorAcrescimo != null) partes.push(`Acréscimo de R$ ${fmtVal(valorAcrescimo)}`);
    if (valorSupressao != null) partes.push(`Supressão de R$ ${fmtVal(valorSupressao)}`);
    return partes.length > 0 ? partes.join(" e ") : "Acréscimo de R$ —";
  };
  const descricaoVigencia = () => {
    const inicio = dataInicio ? fmt(dataInicio) : null;
    const fim = novaDataFim ? fmt(novaDataFim) : "—";
    return inicio ? `Nova vigência: ${inicio} a ${fim}` : `Nova data fim: ${fim}`;
  };
  if (tipo === "Prazo") {
    const assin = dataAssinatura ? fmt(dataAssinatura) : "—";
    return `Aditamento de prazo - Data de assinatura: ${assin} - ${descricaoVigencia()}`;
  }
  if (tipo === "Valor") {
    return `Aditamento de valor - ${descricaoValor()}`;
  }
  if (tipo === "Misto") {
    return `Aditamento de valor e prazo - ${descricaoValor()} - ${descricaoVigencia()}`;
  }
  if (tipo === "Outros") {
    const assin = dataAssinatura ? fmt(dataAssinatura) : "—";
    return `Outras alterações - Data de assinatura: ${assin}`;
  }
  return "";
}

function isDataValida(dataStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return false;
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  if (ano < 1900 || ano > 2100) return false;
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

function validarCamposAditivo(
  dados: Partial<TermoAditivoCreate> | undefined,
  arquivoPresente: boolean = true
): string | null {
  if (!dados) return "Preencha os campos do termo aditivo.";

  const faltando: string[] = [];
  if (!dados.tipo) faltando.push("Termo Aditivo");
  if (!dados.data_assinatura) faltando.push("Data Assinatura");
  if (!dados.data_publicacao) faltando.push("Data Publicação");
  if (!dados.pae || !dados.pae.trim()) faltando.push("PAE");
  if ((dados.tipo === "Prazo" || dados.tipo === "Misto") && !dados.data_inicio) faltando.push("Nova Data Início");
  if (!arquivoPresente) faltando.push("Arquivo do Termo Aditivo");
  if (!dados.objeto || !dados.objeto.trim()) faltando.push("Descrição");

  if (faltando.length > 0) {
    return `Preencha: ${faltando.join(", ")}.`;
  }

  const camposData: Array<[string, string | null | undefined]> = [
    ["Data Assinatura", dados.data_assinatura],
    ["Data Publicação", dados.data_publicacao],
    ["Nova Data Início", dados.data_inicio],
    ["Nova Data Fim", dados.nova_data_fim],
  ];
  for (const [nomeCampo, valor] of camposData) {
    if (valor && !isDataValida(valor)) {
      return `${nomeCampo} inválida. Use o formato DD/MM/AAAA com um ano de 4 dígitos.`;
    }
  }

  if (dados.tipo === "Prazo" || dados.tipo === "Misto") {
    if (!dados.nova_data_fim) {
      return "Preencha: Nova Data Fim.";
    }
    if (dados.data_inicio && dados.nova_data_fim && dados.nova_data_fim < dados.data_inicio) {
      return "Nova Data Fim não pode ser anterior à Nova Data Início.";
    }
  }

  if (dados.tipo === "Valor" || dados.tipo === "Misto") {
    const acrescimo = Number(dados.valor_acrescimo) || 0;
    const supressao = Number(dados.valor_supressao) || 0;
    if (acrescimo <= 0 && supressao <= 0) {
      return `Para aditivo ${dados.tipo}, preencha Valor Acréscimo ou Valor Supressão.`;
    }
  }

  return null;
}


type Pendencia = {
  id: number;
  titulo?: string;
  descricao: string;
  status_id: number;
  status_nome: string;
  data_criacao: string | null;
  prazo_entrega: string | null;
  created_at?: string; // Campo alternativo da API
  data_prazo?: string; // Campo alternativo da API
  em_atraso: boolean;
  dias_em_atraso?: number;
  urgencia?: string;
};

export default function DetalhesContrato() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { perfilAtivo } = useAuth();

  const [contrato, setContrato] = useState<ContratoDetalhado | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [aditivos, setAditivos] = useState<TermoAditivo[]>([]);
  const [loading, setLoading] = useState(true);

  const podeEditar = perfilAtivo?.nome === "Administrador";
  const isAdmin = perfilAtivo?.nome === "Administrador";
  const isGestor = perfilAtivo?.nome === "Gestor";
  const canManageAditivos = isAdmin || isGestor;

  // Estados para gerenciamento de termos aditivos
  const [mostrarFormAditivo, setMostrarFormAditivo] = useState(false);
  const [novoAditivo, setNovoAditivo] = useState<Partial<TermoAditivoCreate>>({});
  const [salvandoAditivo, setSalvandoAditivo] = useState(false);
  const [arquivoAditivo, setArquivoAditivo] = useState<File | null>(null);
  const [objetoManualNovo, setObjetoManualNovo] = useState(false);

  const [editandoAditivo, setEditandoAditivo] = useState<Record<number, Partial<TermoAditivoUpdate>>>({});
  const [salvandoEdicaoAditivo, setSalvandoEdicaoAditivo] = useState<Set<number>>(new Set());
  const [arquivoEdicaoAditivo, setArquivoEdicaoAditivo] = useState<Record<number, File | null>>({});
  const [objetoManualEdicao, setObjetoManualEdicao] = useState<Set<number>>(new Set());

  // Função para verificar se pode cancelar pendência
  const podeCancelarPendencia = (pendencia: Pendencia) => {
    // Só pode cancelar se for administrador e a pendência estiver "Pendente"
    return isAdmin && (pendencia.status_nome === "Pendente" || pendencia.status_nome === "pendente");
  };

  // Função para cancelar pendência
  const handleCancelarPendencia = async (pendencia: Pendencia) => {
    if (!podeCancelarPendencia(pendencia)) {
      toast.error("Esta pendência não pode ser cancelada");
      return;
    }

    setLoading(true);
    try {
      await cancelarPendencia(parseInt(id!), pendencia.id);

      // Remove a pendência da lista
      setPendencias(pendencias.filter(p => p.id !== pendencia.id));

      toast.success("Pendência cancelada com sucesso!");
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Erro ao cancelar pendência";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDetalhes = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Carregar detalhes do contrato
        const contratoResponse = await getContratoDetalhado(parseInt(id));
        setContrato(contratoResponse);


        // Carregar pendências
        try {
          const pendenciasResponse = await getPendenciasByContratoId(parseInt(id));
          console.log('📋 Pendências recebidas:', pendenciasResponse);

          if (Array.isArray(pendenciasResponse)) {
            // Log para debug das datas
            pendenciasResponse.forEach((p: any, idx: number) => {
              console.log(`📅 Pendência ${idx + 1}:`, {
                id: p.id,
                data_criacao: p.data_criacao,
                prazo_entrega: p.prazo_entrega,
                created_at: p.created_at,
                data_prazo: p.data_prazo
              });
            });

            setPendencias(pendenciasResponse as unknown as Pendencia[]);
          } else {
            setPendencias([]);
          }
        } catch (error) {
          console.log("Nenhuma pendência encontrada", error);
          setPendencias([]);
        }

        // Carregar termos aditivos
        try {
          const aditivosResponse = await getTermosAditivos(parseInt(id));
          setAditivos(aditivosResponse.data);
        } catch (error) {
          console.log("Nenhum termo aditivo encontrado", error);
          setAditivos([]);
        }


      } catch (error) {
        toast.error("Erro ao carregar detalhes do contrato");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetalhes();
  }, [id]);

  const formatCurrency = (value: number | null) => {
    if (!value) return "Não informado";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";

    try {
      if (dateString.includes("-")) {
        const partes = dateString.split("T")[0].split("-");
        if (partes.length === 3) {
          return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "—";
      return date.toLocaleDateString("pt-BR");
    } catch {
      return "—";
    }
  };

  const recarregarDados = async () => {
    if (!id) return;
    try {
      const [contratoResponse, aditivosResponse] = await Promise.all([
        getContratoDetalhado(parseInt(id)),
        getTermosAditivos(parseInt(id))
      ]);
      setContrato(contratoResponse);
      setAditivos(aditivosResponse.data);
    } catch (error) {
      console.error("Erro ao recarregar dados do contrato:", error);
    }
  };

  const handleSalvarAditivo = async () => {
    if (!id) return;
    const contratoId = parseInt(id);
    const erroValidacao = validarCamposAditivo(novoAditivo, !!arquivoAditivo);
    if (erroValidacao) {
      toast.error(erroValidacao);
      return;
    }
    setSalvandoAditivo(true);
    try {
      const criado = await createTermoAditivo(contratoId, novoAditivo as TermoAditivoCreate);
      if (arquivoAditivo) {
        try {
          await uploadArquivoAditivo(contratoId, criado.id, arquivoAditivo);
        } catch {
          toast.error("Termo aditivo criado, mas falha ao enviar o arquivo.");
        }
        setArquivoAditivo(null);
      }
      await recarregarDados();
      setNovoAditivo({});
      setMostrarFormAditivo(false);
      setObjetoManualNovo(false);
      toast.success(`${criado.numero_aditivo}º Termo Aditivo criado com sucesso!`);
    } catch {
      toast.error("Erro ao criar termo aditivo.");
    } finally {
      setSalvandoAditivo(false);
    }
  };

  const handleUploadArquivoAditivo = async (aditivoId: number, file: File) => {
    if (!id) return;
    const contratoId = parseInt(id);
    const toastId = `up-ad-${aditivoId}`;
    try {
      toast.loading("Enviando arquivo…", { id: toastId });
      await uploadArquivoAditivo(contratoId, aditivoId, file);
      await recarregarDados();
      toast.success("Arquivo anexado!", { id: toastId });
    } catch {
      toast.error("Erro ao enviar o arquivo.", { id: toastId });
    }
  };

  const handleDownloadAditivo = async (ad: TermoAditivo) => {
    if (!ad.arquivo_id) return;
    const toastId = `dl-ad-${ad.arquivo_id}`;
    try {
      toast.loading("Preparando download…", { id: toastId });
      const blob = await downloadArquivoAditivo(ad.arquivo_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ad.arquivo_nome ?? `${ad.numero_aditivo}o_termo_aditivo`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download concluído!", { id: toastId });
    } catch {
      toast.error("Erro ao fazer download do arquivo.", { id: toastId });
    }
  };

  const handleExcluirAditivo = async (aditivoId: number) => {
    if (!id) return;
    const contratoId = parseInt(id);
    try {
      await deleteTermoAditivo(contratoId, aditivoId);
      await recarregarDados();
      toast.success("Termo aditivo inativado.");
    } catch {
      toast.error("Erro ao inativar termo aditivo.");
    }
  };

  const handleExcluirAditivoDefinitivo = async (aditivoId: number) => {
    if (!id) return;
    const contratoId = parseInt(id);
    try {
      await deleteTermoAditivoDefinitivamente(contratoId, aditivoId);
      await recarregarDados();
      toast.success("Termo aditivo excluído definitivamente.");
    } catch {
      toast.error("Erro ao excluir termo aditivo definitivamente.");
    }
  };

  const handleAbrirEdicaoAditivo = (ad: TermoAditivo) => {
    setEditandoAditivo(prev => ({
      ...prev,
      [ad.id]: {
        tipo: ad.tipo,
        objeto: ad.objeto,
        data_assinatura: ad.data_assinatura,
        data_publicacao: ad.data_publicacao ?? undefined,
        data_inicio: ad.data_inicio ?? undefined,
        nova_data_fim: ad.nova_data_fim ?? undefined,
        valor_acrescimo: ad.valor_acrescimo ?? undefined,
        valor_supressao: ad.valor_supressao ?? undefined,
        pae: ad.pae ?? undefined,
      }
    }));
    const textoAutomatico = gerarDescricaoAditivo({
      tipo: ad.tipo,
      data_assinatura: ad.data_assinatura,
      data_inicio: ad.data_inicio,
      nova_data_fim: ad.nova_data_fim,
      valor_acrescimo: ad.valor_acrescimo,
      valor_supressao: ad.valor_supressao,
    });
    setObjetoManualEdicao(prev => {
      const n = new Set(prev);
      if (ad.objeto !== textoAutomatico) n.add(ad.id); else n.delete(ad.id);
      return n;
    });
  };

  const handleSalvarEdicaoAditivo = async (aditivoId: number) => {
    if (!id) return;
    const contratoId = parseInt(id);
    const dados = editandoAditivo[aditivoId];
    const aditivoExistente = aditivos.find(a => a.id === aditivoId);
    const temArquivo = !!(arquivoEdicaoAditivo[aditivoId] || aditivoExistente?.arquivo_id);
    const erroValidacao = validarCamposAditivo(dados, temArquivo);
    if (erroValidacao) {
      toast.error(erroValidacao);
      return;
    }
    setSalvandoEdicaoAditivo(prev => new Set(prev).add(aditivoId));
    try {
      await updateTermoAditivo(contratoId, aditivoId, dados);
      const arquivo = arquivoEdicaoAditivo[aditivoId];
      if (arquivo) {
        try {
          await uploadArquivoAditivo(contratoId, aditivoId, arquivo);
        } catch {
          toast.error("Termo aditivo atualizado, mas falha ao enviar o arquivo.");
        }
        setArquivoEdicaoAditivo(prev => { const n = { ...prev }; delete n[aditivoId]; return n; });
      }
      await recarregarDados();
      setEditandoAditivo(prev => { const n = { ...prev }; delete n[aditivoId]; return n; });
      setObjetoManualEdicao(prev => { const n = new Set(prev); n.delete(aditivoId); return n; });
      toast.success("Termo aditivo atualizado com sucesso!");
    } catch {
      toast.error("Erro ao atualizar termo aditivo.");
    } finally {
      setSalvandoEdicaoAditivo(prev => { const n = new Set(prev); n.delete(aditivoId); return n; });
    }
  };

  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo': return 'bg-green-500';
      case 'vencido': return 'bg-red-500';
      case 'suspenso': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };


  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <Button variant="outline" onClick={() => navigate('/contratos')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Contrato não encontrado</h2>
            <p className="text-gray-600">O contrato solicitado não foi encontrado ou você não tem permissão para visualizá-lo.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Botão Voltar */}
        <div className="flex justify-start">
          <Button variant="outline" onClick={() => navigate('/contratos')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Título e Status */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Contrato {contrato.nr_contrato}</h1>
            <p className="text-gray-600 mt-1">{contrato.objeto}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(contrato.status_nome || '')} text-white`}>
              {contrato.status_nome}
            </Badge>
            {podeEditar && (
              <Button onClick={() => navigate(`/contratos/editar/${contrato.id}`)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Informações Compactas */}
      <div className="space-y-4">
        <Card>
          <CardContent className="py-4 px-5">
            {/* Linha 1: dados principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Contratado</p>
                <p className="font-semibold text-gray-800 mt-0.5">{contrato.contratado_nome || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Modalidade</p>
                <p className="font-semibold text-gray-800 mt-0.5">{contrato.modalidade_nome || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Vigência Original</p>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {formatDate(contrato.data_inicio)} → {formatDate(contrato.data_fim_original ?? contrato.data_fim)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Valor Global</p>
                <p className="font-semibold text-green-600 mt-0.5">{formatCurrency(contrato.valor_global)}</p>
              </div>
            </div>

            <hr className="my-3 border-gray-100" />

            {/* Linha 2: pessoas e PAE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Gestor</p>
                <p className="font-semibold text-gray-800 mt-0.5">{contrato.gestor_nome || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fiscal</p>
                <p className="font-semibold text-gray-800 mt-0.5">{contrato.fiscal_nome || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fiscal Substituto</p>
                <p className="font-semibold text-gray-800 mt-0.5">{contrato.fiscal_substituto_nome || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">PAE</p>
                <p className="font-semibold text-gray-800 mt-0.5">{(contrato as any).pae || "—"}</p>
              </div>
            </div>

            <hr className="my-3 border-gray-100" />

            {/* Linha 3: dados legais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Base Legal</p>
                <p className="font-semibold text-gray-800 mt-0.5">{(contrato as any).base_legal || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">DOE / Data DOE</p>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {(contrato as any).doe || "—"}
                  {(contrato as any).data_doe && ` · ${formatDate((contrato as any).data_doe)}`}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Garantia</p>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {(contrato as any).garantia ? formatDate((contrato as any).garantia) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Valor Anual</p>
                <p className="font-semibold text-green-600 mt-0.5">{formatCurrency(contrato.valor_anual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gerenciamento de Arquivos, Pendências e Termos Aditivos */}
        <Tabs defaultValue="arquivos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="arquivos">📁 Arquivos</TabsTrigger>
            <TabsTrigger value="pendencias">⚠️ Pendências</TabsTrigger>
            <TabsTrigger value="aditivos">📄 Termos Aditivos</TabsTrigger>
          </TabsList>

          <TabsContent value="arquivos" className="space-y-4">
            <ContratoArquivos
              contratoId={parseInt(id!)}
              contrato={{
                nr_contrato: contrato.nr_contrato,
                pae: (contrato as any).pae,
                contratado_nome: contrato.contratado_nome,
                contratado_cnpj: contrato.contratado?.cnpj,
                objeto: contrato.objeto,
                data_inicio: contrato.data_inicio,
                data_fim: contrato.data_fim,
                valor_global: contrato.valor_global,
                fiscal_nome: contrato.fiscal_nome,
              }}
            />
          </TabsContent>

          <TabsContent value="pendencias" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pendências ({pendencias.length})</CardTitle>
                <CardDescription>Pendências relacionadas ao contrato</CardDescription>
              </CardHeader>
              <CardContent>
                {pendencias.length > 0 ? (
                  <div className="space-y-3">
                    {pendencias.map((pendencia) => (
                      <div key={pendencia.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{pendencia.titulo || `Pendência #${pendencia.id}`}</h4>
                          <div className="flex gap-1">
                            <Badge className={`${pendencia.em_atraso ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                              {pendencia.status_nome || 'Pendente'}
                            </Badge>
                            {pendencia.em_atraso && pendencia.dias_em_atraso && (
                              <Badge className="bg-red-600 text-white">
                                {pendencia.dias_em_atraso} dias atraso
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{pendencia.descricao}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <div>
                            <span>Criada em: {formatDate(pendencia.data_criacao || pendencia.created_at)}</span>
                            <br />
                            <span>Prazo: {formatDate(pendencia.prazo_entrega || pendencia.data_prazo)}</span>
                          </div>
                          {isAdmin && podeCancelarPendencia(pendencia) && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Cancelar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Cancelar Pendência</DialogTitle>
                                  <DialogDescription>
                                    Tem certeza que deseja cancelar esta pendência? Esta ação não pode ser desfeita.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                                    <p className="text-sm text-yellow-800">
                                      <strong>Pendência:</strong> {pendencia.titulo || `Pendência #${pendencia.id}`}
                                    </p>
                                    <p className="text-sm text-yellow-800 mt-1">
                                      <strong>Descrição:</strong> {pendencia.descricao}
                                    </p>
                                    <p className="text-sm text-yellow-800 mt-1">
                                      <strong>Status:</strong> {pendencia.status_nome || 'Pendente'}
                                    </p>
                                    <p className="text-sm text-yellow-800 mt-1">
                                      <strong>Prazo:</strong> {formatDate(pendencia.prazo_entrega || pendencia.data_prazo)}
                                    </p>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <DialogTrigger asChild>
                                      <Button type="button" variant="outline">Não, manter</Button>
                                    </DialogTrigger>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      disabled={loading}
                                      onClick={() => handleCancelarPendencia(pendencia)}
                                    >
                                      {loading ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                          Cancelando...
                                        </>
                                      ) : (
                                        <>
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Sim, cancelar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhuma pendência encontrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aditivos" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Termos Aditivos ({aditivos.length})</CardTitle>
                  <CardDescription>Termos aditivos relacionados ao contrato</CardDescription>
                </div>
                {canManageAditivos && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    onClick={() => {
                      const novoEstado = !mostrarFormAditivo;
                      setMostrarFormAditivo(novoEstado);
                      if (novoEstado) {
                        setNovoAditivo({});
                        setArquivoAditivo(null);
                        setObjetoManualNovo(false);
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo Aditivo
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {/* Formulário inline para Novo Aditivo */}
                {mostrarFormAditivo && (() => {
                  const tipoAtual = novoAditivo.tipo;
                  const isPrazo = tipoAtual === "Prazo";
                  const isValor = tipoAtual === "Valor";
                  const isMisto = tipoAtual === "Misto";

                  return (
                    <div className="mb-4 p-4 bg-white rounded-md border border-indigo-200 grid grid-cols-2 gap-3 md:grid-cols-4">
                      {/* Termo Aditivo (Tipo) * */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">Termo Aditivo *</label>
                        <Select
                          onValueChange={v => {
                            const tipo = v as TermoAditivoCreate["tipo"];
                            const curr = novoAditivo;
                            const manual = objetoManualNovo;
                            const atualizado: Partial<TermoAditivoCreate> = {
                              ...curr,
                              tipo,
                              data_inicio: (tipo === "Prazo" || tipo === "Misto") ? curr.data_inicio : null,
                              nova_data_fim: (tipo === "Prazo" || tipo === "Misto") ? curr.nova_data_fim : null,
                              valor_acrescimo: (tipo === "Valor" || tipo === "Misto") ? curr.valor_acrescimo : null,
                              valor_supressao: (tipo === "Valor" || tipo === "Misto") ? curr.valor_supressao : null,
                            };
                            atualizado.objeto = manual ? curr.objeto : gerarDescricaoAditivo(atualizado);
                            setNovoAditivo(atualizado);
                          }}
                          value={tipoAtual ?? ""}
                        >
                          <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {TIPOS_ADITIVO_OPTIONS.map(({ value, label }) => (
                              <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Data Assinatura * */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">Data Assinatura *</label>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={novoAditivo.data_assinatura ?? ""}
                          onChange={e => {
                            const data_assinatura = e.target.value;
                            const curr = novoAditivo;
                            const manual = objetoManualNovo;
                            setNovoAditivo({
                              ...curr,
                              data_assinatura,
                              objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, data_assinatura })
                            });
                          }}
                        />
                      </div>

                      {/* Data Publicação * */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">Data Publicação *</label>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={novoAditivo.data_publicacao ?? ""}
                          onChange={e => setNovoAditivo({ ...novoAditivo, data_publicacao: e.target.value || null })}
                        />
                      </div>

                      {/* PAE * */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">PAE *</label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Ex: 2025/123456"
                          value={novoAditivo.pae ?? ""}
                          onChange={e => setNovoAditivo({ ...novoAditivo, pae: e.target.value || null })}
                        />
                      </div>

                      {/* --- LINHA DA NATUREZA DO TERMO ADITIVO --- */}

                      {/* Nova Data Início * (Prazo ou Misto) */}
                      {(isPrazo || isMisto) && (
                        <div className={`flex flex-col gap-1 ${isMisto ? "col-span-1 md:col-span-1" : "col-span-1 md:col-span-2"}`}>
                          <label className="text-xs font-medium text-gray-600">Nova Data Início *</label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={novoAditivo.data_inicio ?? ""}
                            onChange={e => {
                              const data_inicio = e.target.value || null;
                              const curr = novoAditivo;
                              const manual = objetoManualNovo;
                              setNovoAditivo({
                                ...curr,
                                data_inicio,
                                objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, data_inicio })
                              });
                            }}
                          />
                        </div>
                      )}

                      {/* Nova Data Fim * (Prazo ou Misto) */}
                      {(isPrazo || isMisto) && (
                        <div className={`flex flex-col gap-1 ${isMisto ? "col-span-1 md:col-span-1" : "col-span-1 md:col-span-2"}`}>
                          <label className="text-xs font-medium text-gray-600">Nova Data Fim *</label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={novoAditivo.nova_data_fim ?? ""}
                            onChange={e => {
                              const nova_data_fim = e.target.value || null;
                              const curr = novoAditivo;
                              const manual = objetoManualNovo;
                              setNovoAditivo({
                                ...curr,
                                nova_data_fim,
                                objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, nova_data_fim })
                              });
                            }}
                          />
                        </div>
                      )}

                      {/* Valor Acréscimo e Valor Supressão * (Valor ou Misto) */}
                      {(isValor || isMisto) && (
                        <>
                          <div className={`flex flex-col gap-1 ${isMisto ? "col-span-1 md:col-span-1" : "col-span-1 md:col-span-2"}`}>
                            <label className="text-xs font-medium text-gray-600">Valor Acréscimo (R$) *</label>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              placeholder="0,00"
                              value={novoAditivo.valor_acrescimo ?? ""}
                              onChange={e => {
                                const valor_acrescimo = e.target.value ? parseFloat(e.target.value) : null;
                                const curr = novoAditivo;
                                const tipo = curr.tipo ?? "Valor";
                                setNovoAditivo({
                                  ...curr,
                                  tipo,
                                  valor_acrescimo,
                                  objeto: gerarDescricaoAditivo({ ...curr, tipo, valor_acrescimo })
                                });
                              }}
                            />
                          </div>
                          <div className={`flex flex-col gap-1 ${isMisto ? "col-span-1 md:col-span-1" : "col-span-1 md:col-span-2"}`}>
                            <label className="text-xs font-medium text-gray-600">Valor Supressão (R$) *</label>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              placeholder="0,00"
                              value={novoAditivo.valor_supressao ?? ""}
                              onChange={e => {
                                const valor_supressao = e.target.value ? parseFloat(e.target.value) : null;
                                const curr = novoAditivo;
                                const tipo = curr.tipo ?? "Valor";
                                setNovoAditivo({
                                  ...curr,
                                  tipo,
                                  valor_supressao,
                                  objeto: gerarDescricaoAditivo({ ...curr, tipo, valor_supressao })
                                });
                              }}
                            />
                          </div>
                        </>
                      )}

                      {/* --- LINHA DE ARQUIVO E DESCRIÇÃO --- */}

                      {/* Arquivo do Termo Aditivo * */}
                      <div className="col-span-2 md:col-span-1 md:col-start-1 flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">Arquivo do Termo Aditivo *</label>
                        <label className={`flex items-center gap-2 cursor-pointer h-8 px-2 border border-dashed rounded text-xs transition-colors ${arquivoAditivo ? "border-emerald-500 text-emerald-700 bg-emerald-50/50" : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"}`}>
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate">
                            {arquivoAditivo?.name ?? "Selecionar arquivo (PDF, DOC…)"}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.odt,.xls,.xlsx"
                            onChange={e => {
                              const f = e.target.files?.[0] ?? null;
                              setArquivoAditivo(f);
                            }}
                          />
                        </label>
                      </div>

                      {/* Descrição do Termo Aditivo * */}
                      <div className="col-span-2 md:col-span-3 flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-600">Descrição do Termo Aditivo *</label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="Preenchido automaticamente conforme o tipo..."
                          value={novoAditivo.objeto ?? ""}
                          onChange={e => {
                            setObjetoManualNovo(true);
                            setNovoAditivo({ ...novoAditivo, objeto: e.target.value });
                          }}
                        />
                      </div>

                      {/* Linha — botões */}
                      <div className="col-span-2 md:col-span-4 flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          className="h-8 text-xs px-6 bg-indigo-600 hover:bg-indigo-700"
                          onClick={handleSalvarAditivo}
                          disabled={salvandoAditivo}
                        >
                          {salvandoAditivo ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => {
                            setMostrarFormAditivo(false);
                            setObjetoManualNovo(false);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {aditivos.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhum termo aditivo cadastrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Nº</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Status</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Tipo</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Descrição</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Assinatura</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Publicação</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Nova Data Início</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Nova Vigência</th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-700">Acréscimo</th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-700">Supressão</th>
                          <th className="text-center px-3 py-2 font-semibold text-gray-700">Arquivo</th>
                          {canManageAditivos && <th className="text-center px-3 py-2 font-semibold text-gray-700">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...aditivos]
                          .sort((a, b) => a.numero_aditivo - b.numero_aditivo)
                          .map((ad, idx) => {
                            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                            const expiradoFallback = ad.nova_data_fim ? new Date(ad.nova_data_fim + "T00:00:00") < hoje : false;
                            const inativoFallback = ad.ativo === false;
                            const inativo = ad.status ? ad.status === "Inativo" : inativoFallback;
                            const aguardando = ad.status === "Aguardando Vigência";
                            const vigente = ad.status ? ad.status === "Ativo" : (!expiradoFallback && !inativoFallback && !aguardando);
                            const expirado = ad.status ? ad.status === "Vencido" : (expiradoFallback && !inativo && !aguardando);
                            const statusLabel = ad.status ?? (inativo ? "Inativo" : aguardando ? "Aguardando Vigência" : expirado ? "Vencido" : "Ativo");
                            const statusClasse = inativo
                              ? "bg-gray-200 text-gray-600"
                              : aguardando
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : expirado
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700";

                            return (
                              <React.Fragment key={ad.id}>
                                <tr className={(vigente || aguardando) ? "hover:bg-gray-50" : "bg-gray-50/50 opacity-75"}>
                                  <td className="px-3 py-2 font-semibold text-indigo-700">{idx + 1}º</td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${statusClasse}`}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className={`text-xs px-1.5 py-0 border ${(vigente || aguardando) ? "bg-indigo-100 text-indigo-800 border-indigo-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                      {ad.tipo}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 max-w-[220px] truncate" title={ad.objeto}>{ad.objeto}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(ad.data_assinatura)}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{ad.data_publicacao ? formatDate(ad.data_publicacao) : "—"}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{ad.data_inicio ? formatDate(ad.data_inicio) : "—"}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">{ad.nova_data_fim ? formatDate(ad.nova_data_fim) : (contrato?.data_fim ? formatDate(contrato.data_fim) : "—")}</td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">{ad.valor_acrescimo ? formatCurrency(ad.valor_acrescimo) : "—"}</td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">{ad.valor_supressao ? formatCurrency(ad.valor_supressao) : "—"}</td>
                                  <td className="px-3 py-2 text-center">
                                    {ad.arquivo_id ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadAditivo(ad)}
                                        className="text-indigo-500 hover:text-indigo-700 inline-flex items-center justify-center"
                                        title={ad.arquivo_nome ?? "Baixar arquivo"}
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </button>
                                    ) : canManageAditivos ? (
                                      <>
                                        <label
                                          htmlFor={`upload-aditivo-detalhe-${ad.id}`}
                                          className="cursor-pointer inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
                                          title="Anexar arquivo do termo aditivo"
                                        >
                                          <Upload className="h-3.5 w-3.5" />
                                        </label>
                                        <input
                                          id={`upload-aditivo-detalhe-${ad.id}`}
                                          type="file"
                                          className="hidden"
                                          accept=".pdf,.doc,.docx,.odt,.xls,.xlsx"
                                          onChange={e => {
                                            const f = e.target.files?.[0];
                                            if (f) handleUploadArquivoAditivo(ad.id, f);
                                            e.target.value = "";
                                          }}
                                        />
                                      </>
                                    ) : (
                                      <span className="text-gray-300">—</span>
                                    )}
                                  </td>
                                  {canManageAditivos && (
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleAbrirEdicaoAditivo(ad)}
                                          className="text-indigo-400 hover:text-indigo-600 transition-colors"
                                          title="Editar"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        {(vigente || aguardando) && (
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <button
                                                type="button"
                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                title="Inativar"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Inativar {ad.numero_aditivo}º Aditivo?</AlertDialogTitle>
                                                <AlertDialogDescription>O termo aditivo será inativado e permanecerá visível na lista.</AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                  className="bg-red-600 hover:bg-red-700"
                                                  onClick={() => handleExcluirAditivo(ad.id)}
                                                >
                                                  Inativar
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        )}
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <button
                                              type="button"
                                              className="text-red-600 hover:text-red-800 transition-colors"
                                              title="Excluir definitivamente"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Excluir {ad.numero_aditivo}º Aditivo definitivamente?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Essa ação remove o termo aditivo do banco de dados de vez — diferente de "Inativar", não tem como desfazer.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                className="bg-red-600 hover:bg-red-700"
                                                onClick={() => handleExcluirAditivoDefinitivo(ad.id)}
                                              >
                                                Excluir definitivamente
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                                {editandoAditivo[ad.id] !== undefined && (() => {
                                  const tipoAtual = editandoAditivo[ad.id]?.tipo;
                                  const isPrazo = tipoAtual === "Prazo";
                                  const isValor = tipoAtual === "Valor";
                                  const isMisto = tipoAtual === "Misto";

                                  return (
                                    <tr className="bg-indigo-50/40">
                                      <td colSpan={canManageAditivos ? 12 : 11} className="px-3 py-3">
                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                          {/* Termo Aditivo (Tipo) * */}
                                          <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">Termo Aditivo *</label>
                                            <Select
                                              onValueChange={v => {
                                                const tipo = v as TermoAditivoCreate["tipo"];
                                                const curr = editandoAditivo[ad.id] ?? {};
                                                const manual = objetoManualEdicao.has(ad.id);
                                                const atualizado: Partial<TermoAditivoUpdate> = {
                                                  ...curr,
                                                  tipo,
                                                  data_inicio: (tipo === "Prazo" || tipo === "Misto") ? curr.data_inicio : null,
                                                  nova_data_fim: (tipo === "Prazo" || tipo === "Misto") ? curr.nova_data_fim : null,
                                                  valor_acrescimo: (tipo === "Valor" || tipo === "Misto") ? curr.valor_acrescimo : null,
                                                  valor_supressao: (tipo === "Valor" || tipo === "Misto") ? curr.valor_supressao : null,
                                                };
                                                atualizado.objeto = manual ? curr.objeto : gerarDescricaoAditivo(atualizado);
                                                setEditandoAditivo(prev => ({
                                                  ...prev,
                                                  [ad.id]: atualizado
                                                }));
                                              }}
                                              value={tipoAtual ?? ""}
                                            >
                                              <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                              <SelectContent>
                                                {TIPOS_ADITIVO_OPTIONS.map(({ value, label }) => (
                                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>

                                          {/* Data Assinatura * */}
                                          <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">Data Assinatura *</label>
                                            <Input
                                              type="date"
                                              className="h-8 text-xs"
                                              value={editandoAditivo[ad.id]?.data_assinatura ?? ""}
                                              onChange={e => {
                                                const data_assinatura = e.target.value;
                                                const curr = editandoAditivo[ad.id] ?? {};
                                                const manual = objetoManualEdicao.has(ad.id);
                                                setEditandoAditivo(prev => ({
                                                  ...prev,
                                                  [ad.id]: {
                                                    ...prev[ad.id],
                                                    data_assinatura,
                                                    objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, data_assinatura })
                                                  }
                                                }));
                                              }}
                                            />
                                          </div>

                                          {/* Data Publicação * */}
                                          <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">Data Publicação *</label>
                                            <Input
                                              type="date"
                                              className="h-8 text-xs"
                                              value={editandoAditivo[ad.id]?.data_publicacao ?? ""}
                                              onChange={e => setEditandoAditivo(prev => ({ ...prev, [ad.id]: { ...prev[ad.id], data_publicacao: e.target.value || null } }))}
                                            />
                                          </div>

                                          {/* PAE * */}
                                          <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">PAE *</label>
                                            <Input
                                              className="h-8 text-xs"
                                              placeholder="Ex: 2025/123456"
                                              value={editandoAditivo[ad.id]?.pae ?? ""}
                                              onChange={e => setEditandoAditivo(prev => ({ ...prev, [ad.id]: { ...prev[ad.id], pae: e.target.value || null } }))}
                                            />
                                          </div>

                                          {/* --- LINHA DA NATUREZA DO TERMO ADITIVO --- */}

                                          {/* Nova Data Início * (Prazo ou Misto) */}
                                          {(isPrazo || isMisto) && (
                                            <div className={`flex flex-col gap-1 ${isMisto ? "col-span-1 md:col-span-1" : "col-span-1 md:col-span-2"}`}>
                                              <label className="text-xs font-medium text-gray-600">Nova Data Início *</label>
                                              <Input
                                                type="date"
                                                className="h-8 text-xs"
                                                value={editandoAditivo[ad.id]?.data_inicio ?? ""}
                                                onChange={e => {
                                                  const data_inicio = e.target.value || null;
                                                  const curr = editandoAditivo[ad.id] ?? {};
                                                  const manual = objetoManualEdicao.has(ad.id);
                                                  setEditandoAditivo(prev => ({
                                                    ...prev,
                                                    [ad.id]: {
                                                      ...prev[ad.id],
                                                      data_inicio,
                                                      objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, data_inicio })
                                                    }
                                                  }));
                                                }}
                                              />
                                            </div>
                                          )}

                                          {/* Nova Data Fim * (Prazo ou Misto) */}
                                          {(isPrazo || isMisto) && (
                                            <div className={`flex flex-col gap-1 ${isMisto ? "col-span-1 md:col-span-1" : "col-span-1 md:col-span-2"}`}>
                                              <label className="text-xs font-medium text-gray-600">Nova Data Fim *</label>
                                              <Input
                                                type="date"
                                                className="h-8 text-xs"
                                                value={editandoAditivo[ad.id]?.nova_data_fim ?? ""}
                                                onChange={e => {
                                                  const nova_data_fim = e.target.value || null;
                                                  const curr = editandoAditivo[ad.id] ?? {};
                                                  const manual = objetoManualEdicao.has(ad.id);
                                                  setEditandoAditivo(prev => ({
                                                    ...prev,
                                                    [ad.id]: {
                                                      ...prev[ad.id],
                                                      nova_data_fim,
                                                      objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, nova_data_fim })
                                                    }
                                                  }));
                                                }}
                                              />
                                            </div>
                                          )}

                                          {/* Valor Acréscimo e Valor Supressão * (Valor ou Misto) */}
                                          {(isValor || isMisto) && (
                                            <>
                                              <div className={`flex flex-col gap-1 ${isMisto ? "col-span-1 md:col-span-1" : "col-span-1 md:col-span-2"}`}>
                                                <label className="text-xs font-medium text-gray-600">Valor Acréscimo (R$) *</label>
                                                <Input
                                                  type="number"
                                                  className="h-8 text-xs"
                                                  placeholder="0,00"
                                                  value={editandoAditivo[ad.id]?.valor_acrescimo ?? ""}
                                                  onChange={e => {
                                                    const valor_acrescimo = e.target.value ? parseFloat(e.target.value) : null;
                                                    const curr = editandoAditivo[ad.id] ?? {};
                                                    const tipo = curr.tipo ?? "Valor";
                                                    setEditandoAditivo(prev => ({
                                                      ...prev,
                                                      [ad.id]: {
                                                        ...prev[ad.id],
                                                        tipo,
                                                        valor_acrescimo,
                                                        objeto: gerarDescricaoAditivo({ ...curr, tipo, valor_acrescimo })
                                                      }
                                                    }));
                                                  }}
                                                />
                                              </div>
                                              <div className={`flex flex-col gap-1 ${isMisto ? "col-span-1 md:col-span-1" : "col-span-1 md:col-span-2"}`}>
                                                <label className="text-xs font-medium text-gray-600">Valor Supressão (R$) *</label>
                                                <Input
                                                  type="number"
                                                  className="h-8 text-xs"
                                                  placeholder="0,00"
                                                  value={editandoAditivo[ad.id]?.valor_supressao ?? ""}
                                                  onChange={e => {
                                                    const valor_supressao = e.target.value ? parseFloat(e.target.value) : null;
                                                    const curr = editandoAditivo[ad.id] ?? {};
                                                    const tipo = curr.tipo ?? "Valor";
                                                    setEditandoAditivo(prev => ({
                                                      ...prev,
                                                      [ad.id]: {
                                                        ...prev[ad.id],
                                                        tipo,
                                                        valor_supressao,
                                                        objeto: gerarDescricaoAditivo({ ...curr, tipo, valor_supressao })
                                                      }
                                                    }));
                                                  }}
                                                />
                                              </div>
                                            </>
                                          )}

                                          {/* --- LINHA DE ARQUIVO E DESCRIÇÃO --- */}

                                          {/* Arquivo do Termo Aditivo * */}
                                          <div className="col-span-2 md:col-span-1 md:col-start-1 flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">Arquivo do Termo Aditivo *</label>
                                            <label className={`flex items-center gap-2 cursor-pointer h-8 px-2 border border-dashed rounded text-xs transition-colors ${arquivoEdicaoAditivo[ad.id] || ad.arquivo_id ? "border-emerald-500 text-emerald-700 bg-emerald-50/50" : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"}`}>
                                              <FileText className="w-4 h-4 shrink-0" />
                                              <span className="truncate">
                                                {arquivoEdicaoAditivo[ad.id]?.name ?? (ad.arquivo_nome ? `Atual: ${ad.arquivo_nome}` : "Selecionar arquivo (PDF, DOC…)")}
                                              </span>
                                              <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.odt,.xls,.xlsx"
                                                onChange={e => {
                                                  const f = e.target.files?.[0] ?? null;
                                                  setArquivoEdicaoAditivo(prev => ({ ...prev, [ad.id]: f }));
                                                }}
                                              />
                                            </label>
                                          </div>

                                          {/* Descrição do Termo Aditivo * */}
                                          <div className="col-span-2 md:col-span-3 flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">Descrição do Termo Aditivo *</label>
                                            <Input
                                              className="h-8 text-xs"
                                              placeholder="Preenchido automaticamente conforme o tipo..."
                                              value={editandoAditivo[ad.id]?.objeto ?? ""}
                                              onChange={e => {
                                                setObjetoManualEdicao(prev => new Set(prev).add(ad.id));
                                                setEditandoAditivo(prev => ({
                                                  ...prev,
                                                  [ad.id]: { ...prev[ad.id], objeto: e.target.value }
                                                }));
                                              }}
                                            />
                                          </div>

                                          {/* Linha — botões */}
                                          <div className="col-span-2 md:col-span-4 flex items-center gap-2 justify-end">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-8 text-xs"
                                              onClick={() => {
                                                setEditandoAditivo(prev => { const n = { ...prev }; delete n[ad.id]; return n; });
                                                setObjetoManualEdicao(prev => { const n = new Set(prev); n.delete(ad.id); return n; });
                                              }}
                                            >
                                              Cancelar
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                                              disabled={salvandoEdicaoAditivo.has(ad.id)}
                                              onClick={() => handleSalvarEdicaoAditivo(ad.id)}
                                            >
                                              {salvandoEdicaoAditivo.has(ad.id) ? "Salvando..." : "Salvar"}
                                            </Button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })()}
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
