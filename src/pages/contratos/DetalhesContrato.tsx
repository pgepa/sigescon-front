import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  Trash2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getContratoDetalhado,
  getPendenciasByContratoId,
  cancelarPendencia,
  getTermosAditivos,
  downloadArquivoAditivo,
  type ContratoDetalhado,
  type TermoAditivo
} from "@/lib/api";
import { toast } from "sonner";
import { ContratoArquivos } from "@/components/ContratoArquivos";


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
    if (!dateString) return "Data não informada";

    try {
      // Tenta diferentes formatos de data
      let date: Date;

      // Se já é uma string ISO ou formato padrão
      if (dateString.includes('T') || dateString.includes('-')) {
        date = new Date(dateString);
      } else {
        // Se é um timestamp ou outro formato
        date = new Date(dateString);
      }

      // Verifica se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida recebida:', dateString);
        return "Data inválida";
      }

      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.warn('Erro ao formatar data:', dateString, error);
      return "Data inválida";
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
              <CardHeader>
                <CardTitle className="text-lg">Termos Aditivos ({aditivos.length})</CardTitle>
                <CardDescription>Termos aditivos relacionados ao contrato</CardDescription>
              </CardHeader>
              <CardContent>
                {aditivos.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Nenhum termo aditivo cadastrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Nº</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Descrição</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Assinatura</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Nova Vigência</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Acréscimo</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600">Supressão</th>
                          <th className="text-center px-3 py-2 font-medium text-gray-600">Arquivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...aditivos]
                          .sort((a, b) => a.numero_aditivo - b.numero_aditivo)
                          .map((ad, idx) => {
                            const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                            const expiradoFallback = ad.nova_data_fim ? new Date(ad.nova_data_fim + "T00:00:00") < hoje : false;
                            const inativoFallback = ad.ativo === false;
                            const expirado = ad.status ? ad.status === "Vencido" : expiradoFallback;
                            const inativo = ad.status ? ad.status === "Inativo" : inativoFallback;
                            const statusLabel = ad.status ?? (inativo ? "Inativo" : expirado ? "Vencido" : "Ativo");
                            const statusClasse = inativo
                              ? "bg-gray-200 text-gray-600"
                              : expirado
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700";
                            return (
                              <tr key={ad.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-semibold text-indigo-700">{idx + 1}º</td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${statusClasse}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-2">{ad.tipo}</td>
                                <td className="px-3 py-2 max-w-[220px] truncate" title={ad.objeto}>{ad.objeto}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{formatDate(ad.data_assinatura)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{ad.nova_data_fim ? formatDate(ad.nova_data_fim) : "—"}</td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">{ad.valor_acrescimo ? formatCurrency(ad.valor_acrescimo) : "—"}</td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">{ad.valor_supressao ? formatCurrency(ad.valor_supressao) : "—"}</td>
                                <td className="px-3 py-2 text-center">
                                  {ad.arquivo_id ? (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          const blob = await downloadArquivoAditivo(ad.arquivo_id!);
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement("a");
                                          a.href = url;
                                          a.download = ad.arquivo_nome ?? `${ad.numero_aditivo}o_termo_aditivo`;
                                          a.click();
                                          URL.revokeObjectURL(url);
                                        } catch {
                                          toast.error("Erro no download.");
                                        }
                                      }}
                                      className="text-indigo-500 hover:text-indigo-700"
                                      title={ad.arquivo_nome ?? "Baixar arquivo"}
                                    >
                                      ⬇
                                    </button>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
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
