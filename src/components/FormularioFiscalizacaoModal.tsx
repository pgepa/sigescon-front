import { useState, useEffect } from "react";
import { api } from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Printer, Loader2, Save, FileText } from "lucide-react";

interface ContratoInfo {
  id?: number;
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

interface FormularioFiscalizacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato?: ContratoInfo;
  /** Se informado, o modal entra em modo edição (PATCH em vez de POST) */
  relatorioId?: number;
  /** Dados pré-preenchidos ao abrir para edição */
  dadosIniciais?: Partial<RespostasForm>;
}

interface RespostasForm {
  q1: string; q1_detalhe: string;
  q2: string; q2_detalhe: string;
  q3: string; q3_detalhe: string;
  q4: string; q4_detalhe: string;
  q5: string; q5_detalhe: string;
  q6: string; q6_detalhe: string;
  q7: string; q7_detalhe: string;
  q8: string; q8_detalhe: string;
  q9: string; q9_detalhe: string;
  q10: string; q10_detalhe: string;
  periodo_inicio: string;
  periodo_fim: string;
  data_assinatura: string;
}

const respostasIniciais: RespostasForm = {
  q1: "", q1_detalhe: "",
  q2: "", q2_detalhe: "",
  q3: "", q3_detalhe: "",
  q4: "", q4_detalhe: "",
  q5: "", q5_detalhe: "",
  q6: "", q6_detalhe: "",
  q7: "", q7_detalhe: "",
  q8: "", q8_detalhe: "",
  q9: "", q9_detalhe: "",
  q10: "", q10_detalhe: "",
  periodo_inicio: "",
  periodo_fim: "",
  data_assinatura: "",
};

function formatCurrency(value?: number | null) {
  if (!value) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateString?: string) {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch {
    return dateString;
  }
}

function RadioOpcoes({
  nome,
  opcoes,
  valor,
  onChange,
}: {
  nome: string;
  opcoes: { value: string; label: string }[];
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-6 flex-wrap">
      {opcoes.map((op) => (
        <label key={op.value} className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="radio"
            name={nome}
            value={op.value}
            checked={valor === op.value}
            onChange={() => onChange(op.value)}
            className="accent-blue-700 w-4 h-4"
          />
          {op.label}
        </label>
      ))}
    </div>
  );
}

function QuestaoSimNao({
  numero,
  texto,
  nota,
  campo,
  campoDetalhe,
  respostas,
  onChange,
  labelNao = "Se não, detalhe as inconformidades",
}: any) {
  const valor = respostas[campo] as string;

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className="bg-blue-800 text-white px-3 py-2 text-sm font-semibold">
        {numero}. {texto}
        {nota && <div className="text-xs font-normal text-blue-200 mt-0.5">{nota}</div>}
      </div>
      <div className="p-3 space-y-2 bg-white">
        <RadioOpcoes
          nome={`q${numero}`}
          opcoes={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]}
          valor={valor}
          onChange={(v) => onChange(campo, v)}
        />
        <div>
          <p className="text-xs text-gray-500 italic mb-1">{labelNao}</p>
          <Textarea
            value={respostas[campoDetalhe] as string}
            onChange={(e) => onChange(campoDetalhe, e.target.value)}
            placeholder="Descreva aqui..."
            className="min-h-[56px] text-sm"
            disabled={valor !== "nao"}
          />
        </div>
      </div>
    </div>
  );
}

function QuestaoSimNaoNA({
  numero,
  texto,
  nota,
  aviso,
  campo,
  campoDetalhe,
  respostas,
  onChange,
  labelNao = "Se não, descreva a situação",
}: any) {
  const valor = respostas[campo] as string;

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className="bg-blue-800 text-white px-3 py-2 text-sm font-semibold">
        {numero}. {texto}
        {nota && <div className="text-xs font-normal text-blue-200 mt-0.5">{nota}</div>}
      </div>
      {aviso && (
        <div className="bg-yellow-50 border-b border-gray-200 px-3 py-1.5 text-xs text-yellow-800 font-medium">
          {aviso}
        </div>
      )}
      <div className="p-3 space-y-2 bg-white">
        <RadioOpcoes
          nome={`q${numero}`}
          opcoes={[
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" },
            { value: "na", label: "Não se aplica" },
          ]}
          valor={valor}
          onChange={(v) => onChange(campo, v)}
        />
        <div>
          <p className="text-xs text-gray-500 italic mb-1">{labelNao}</p>
          <Textarea
            value={respostas[campoDetalhe] as string}
            onChange={(e) => onChange(campoDetalhe, e.target.value)}
            placeholder="Descreva aqui..."
            className="min-h-[56px] text-sm"
            disabled={valor !== "nao"}
          />
        </div>
      </div>
    </div>
  );
}

export function FormularioFiscalizacaoModal({
  open,
  onOpenChange,
  contrato,
  relatorioId,
  dadosIniciais,
}: FormularioFiscalizacaoModalProps) {

  const [respostas, setRespostas] = useState<RespostasForm>(respostasIniciais);
  const [isSalvandoRascunho, setIsSalvandoRascunho] = useState(false);
  const [isSalvando, setIsSalvando] = useState(false);
  const [isGerandoPdf, setIsGerandoPdf] = useState(false);

  // Pré-preenche o formulário quando aberto em modo edição
  useEffect(() => {
    if (open && dadosIniciais) {
      setRespostas({ ...respostasIniciais, ...dadosIniciais });
    } else if (!open) {
      setRespostas(respostasIniciais);
    }
  }, [open, relatorioId]);

  const handleChange = (campo: keyof RespostasForm, valor: string) => {
    setRespostas((prev) => ({ ...prev, [campo]: valor }));
  };

  const buildPayloadBase = () => ({
    execucao_objeto_sim: respostas.q1 === "sim",
    execucao_objeto_detalhes: respostas.q1_detalhe,
    prazo_execucao_sim: respostas.q2 === "sim",
    prazo_execucao_detalhes: respostas.q2_detalhe,
    nivel_qualidade_sim: respostas.q3 === "sim",
    nivel_qualidade_detalhes: respostas.q3_detalhe,
    medicoes_servicos_sim: respostas.q4 === "sim",
    medicoes_servicos_detalhes: respostas.q4_detalhe,
    ocorrencias_sim: respostas.q5 === "sim",
    ocorrencias_detalhes: respostas.q5_detalhe,
    documentos_habilitacao_sim: respostas.q6 === "sim",
    documentos_habilitacao_detalhes: respostas.q6_detalhe,
    subcontratacao_sim: respostas.q7 === "sim",
    subcontratacao_detalhes: respostas.q7_detalhe,
    obrigacoes_empregados_resposta: respostas.q8,
    obrigacoes_empregados_detalhes: respostas.q8_detalhe,
    garantias_contratuais_resposta: respostas.q9,
    garantias_contratuais_detalhes: respostas.q9_detalhe,
    execucao_satisfatoria_sim: respostas.q10 === "sim",
    execucao_satisfatoria_detalhes: respostas.q10_detalhe,
  });

  const handleSalvar = async (status: "rascunho" | "finalizado") => {
    if (!relatorioId && !contrato?.nr_contrato) {
      alert("Erro: Não foi possível identificar o contrato.");
      return;
    }

    if (status === "finalizado" && (!respostas.periodo_inicio || !respostas.periodo_fim || !respostas.data_assinatura)) {
      alert("Por favor, preencha as datas do período de fiscalização e da assinatura.");
      return;
    }

    const setter = status === "rascunho" ? setIsSalvandoRascunho : setIsSalvando;
    setter(true);

    try {
      const payload = {
        status,
        ...(respostas.periodo_inicio ? { periodo_inicio: respostas.periodo_inicio } : {}),
        ...(respostas.periodo_fim ? { periodo_fim: respostas.periodo_fim } : {}),
        ...(respostas.data_assinatura ? { data_relatorio: respostas.data_assinatura } : {}),
        ...buildPayloadBase(),
      };

      if (relatorioId) {
        // Modo edição — atualiza registro existente
        await api.patch(`/relatorios/${relatorioId}`, payload);
      } else {
        // Modo criação — cria novo registro
        await api.post(`/relatorios/salvar/${encodeURIComponent(contrato!.nr_contrato!)}`, payload);
      }

      alert(status === "rascunho" ? "Rascunho salvo com sucesso!" : "Relatório salvo com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert("Ocorreu um erro ao salvar. Verifique se o servidor está rodando.");
    } finally {
      setter(false);
    }
  };

  const handleGerarPdf = async () => {
    if (!contrato?.nr_contrato) {
      alert("Erro: Não foi possível identificar o número do contrato.");
      return;
    }

    if (!respostas.periodo_inicio || !respostas.periodo_fim || !respostas.data_assinatura) {
      alert("Por favor, preencha as datas do período de fiscalização e da assinatura.");
      return;
    }

    setIsGerandoPdf(true);

    try {
      const payload = {
        periodo_inicio: respostas.periodo_inicio,
        periodo_fim: respostas.periodo_fim,
        data_relatorio: respostas.data_assinatura,
        ...buildPayloadBase(),
      };

      const response = await api.post(
        `/relatorios/gerar-pdf/${encodeURIComponent(contrato.nr_contrato)}`,
        payload,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const nomeContrato = contrato.nr_contrato?.replace("/", "-") || contrato.id;
      link.setAttribute("download", `Fiscalizacao_Contrato_${nomeContrato}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error: any) {
      if (error.response && error.response.status === 422 && error.response.data instanceof Blob) {
        const erroTexto = await error.response.data.text();
        console.error("ERRO DE VALIDAÇÃO DO FASTAPI:", erroTexto);
        alert("Erro 422: Olhe o Console (F12) para ver qual campo o backend recusou.");
      } else {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique se o servidor está rodando.");
      }
    } finally {
      setIsGerandoPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formulário de Fiscalização de Contrato — Lei nº 14.133/2021</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Cabeçalho do contrato */}
          <div className="border-2 border-gray-700 rounded overflow-hidden">
            <div className="bg-blue-900 text-white text-center font-bold text-sm py-1.5">
              FORMULÁRIO DE FISCALIZAÇÃO DE CONTRATO — LEI Nº 14.133/2021
            </div>
            <div className="divide-y divide-gray-200">
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-2"><span className="font-semibold">Número do Contrato:</span> {contrato?.nr_contrato || ""}</div>
                <div className="p-2"><span className="font-semibold">Processo Administrativo:</span> {contrato?.pae || ""}</div>
              </div>
              <div className="p-2"><span className="font-semibold">Empresa Contratada:</span> {contrato?.contratado_nome || ""}</div>
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-2"><span className="font-semibold">CNPJ:</span> {contrato?.contratado_cnpj || ""}</div>
                <div className="p-2"><span className="font-semibold">Objeto Contratual:</span> {contrato?.objeto || ""}</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-2"><span className="font-semibold">Vigência (Início):</span> {formatDate(contrato?.data_inicio)}</div>
                <div className="p-2"><span className="font-semibold">Vigência (Término):</span> {formatDate(contrato?.data_fim)}</div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="p-2"><span className="font-semibold">Valor Global:</span> {formatCurrency(contrato?.valor_global)}</div>
                <div className="p-2"><span className="font-semibold">Fiscal do Contrato:</span> {contrato?.fiscal_nome || ""}</div>
              </div>
              <div className="p-2 flex items-center gap-2 flex-wrap">
                <span className="font-semibold">Período de Fiscalização:</span>
                <span>De</span>
                <input
                  type="date"
                  value={respostas.periodo_inicio}
                  onChange={(e) => handleChange("periodo_inicio", e.target.value)}
                  className="border border-gray-400 rounded px-1.5 py-0.5 text-sm"
                />
                <span>a</span>
                <input
                  type="date"
                  value={respostas.periodo_fim}
                  onChange={(e) => handleChange("periodo_fim", e.target.value)}
                  className="border border-gray-400 rounded px-1.5 py-0.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Seção 1: Fiscalização Técnica */}
          <div className="border-2 border-gray-700 rounded overflow-hidden">
            <div className="bg-blue-900 text-white text-center font-bold py-1.5 text-sm">
              FISCALIZAÇÃO TÉCNICA (EXECUÇÃO DO OBJETO)
            </div>
            <div className="p-3 space-y-3">
              <QuestaoSimNao numero={1} texto="A execução do objeto está em conformidade com o Termo de Referência, Projeto Básico ou Especificações?" campo="q1" campoDetalhe="q1_detalhe" respostas={respostas} onChange={handleChange} />
              <QuestaoSimNao numero={2} texto="O prazo de execução/entrega está sendo cumprido?" campo="q2" campoDetalhe="q2_detalhe" respostas={respostas} onChange={handleChange} />
              <QuestaoSimNao numero={3} texto="O nível de qualidade dos serviços/produtos atende aos padrões exigidos?" campo="q3" campoDetalhe="q3_detalhe" respostas={respostas} onChange={handleChange} />
              <QuestaoSimNao numero={4} texto="As medições de serviços ou entregas de produtos correspondem ao que foi realizado/entregue?" campo="q4" campoDetalhe="q4_detalhe" respostas={respostas} onChange={handleChange} />
              <QuestaoSimNao numero={5} texto="Houve ocorrências ou necessidade de correções na execução?" campo="q5" campoDetalhe="q5_detalhe" respostas={respostas} onChange={handleChange} />
            </div>
          </div>

          {/* Seção 2: Fiscalização Documental */}
          <div className="border-2 border-gray-700 rounded overflow-hidden">
            <div className="bg-blue-900 text-white text-center font-bold py-1.5 text-sm">
              FISCALIZAÇÃO DOCUMENTAL E DE REGULARIDADE
            </div>
            <div className="p-3 space-y-3">
              <QuestaoSimNao numero={6} texto="A empresa contratada apresentou e manteve atualizadas todas as certidões e documentos de habilitação (fiscal, trabalhista, previdenciária, FGTS)?" nota="(Conforme Art. 136 da Lei nº 14.133/21)" campo="q6" campoDetalhe="q6_detalhe" respostas={respostas} onChange={handleChange} />
              <QuestaoSimNao numero={7} texto="Há indícios de subcontratação sem a prévia autorização da Administração Pública?" nota="(Conforme Art. 122 da Lei nº 14.133/21)" campo="q7" campoDetalhe="q7_detalhe" respostas={respostas} onChange={handleChange} />
              <QuestaoSimNaoNA numero={8} texto="A empresa cumpriu com as obrigações trabalhistas, sociais e previdenciárias de seus empregados?" nota="(Conforme Art. 117 da Lei nº 14.133/21)" aviso="* PREENCHER SOMENTE QUANDO FOR CONTRATO DE MÃO-DE-OBRA TERCEIRIZADA" campo="q8" campoDetalhe="q8_detalhe" respostas={respostas} onChange={handleChange} labelNao="Se não, especifique a irregularidade" />
              <QuestaoSimNaoNA numero={9} texto="As garantias contratuais (se houver) foram mantidas válidas e atualizadas?" nota="(Conforme Art. 96 da Lei nº 14.133/21)" campo="q9" campoDetalhe="q9_detalhe" respostas={respostas} onChange={handleChange} />
            </div>
          </div>

          {/* Seção 3: Parecer */}
          <div className="border-2 border-gray-700 rounded overflow-hidden">
            <div className="bg-blue-900 text-white text-center font-bold py-1.5 text-sm">
              PARECER E RECOMENDAÇÕES DO FISCAL
            </div>
            <div className="p-3">
              <QuestaoSimNao numero={10} texto="O contrato está sendo executado de forma satisfatória no período fiscalizado?" campo="q10" campoDetalhe="q10_detalhe" respostas={respostas} onChange={handleChange} labelNao="Se não, descreva a situação" />
            </div>
          </div>

          {/* Data e assinatura */}
          <div className="border border-gray-300 rounded p-3 flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-sm">Data:</span>
            <input
              type="date"
              value={respostas.data_assinatura}
              onChange={(e) => handleChange("data_assinatura", e.target.value)}
              className="border border-gray-400 rounded px-2 py-1 text-sm"
            />
            <Separator orientation="vertical" className="h-6 mx-2" />
            <div className="flex-1 text-center text-xs text-gray-400 border-b border-gray-400 pb-5 pt-1 min-w-[180px]">
              Assinatura do Fiscal do Contrato
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-between pt-2 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setRespostas(respostasIniciais)}
            disabled={isSalvandoRascunho || isSalvando || isGerandoPdf}
          >
            Limpar formulário
          </Button>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSalvandoRascunho || isSalvando || isGerandoPdf}
            >
              Fechar
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSalvar("rascunho")}
              disabled={isSalvandoRascunho || isSalvando || isGerandoPdf}
              className="border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              {isSalvandoRascunho ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Salvar Rascunho</>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSalvar("finalizado")}
              disabled={isSalvandoRascunho || isSalvando || isGerandoPdf}
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              {isSalvando ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" />Salvar Relatório</>
              )}
            </Button>

            <Button
              onClick={handleGerarPdf}
              disabled={isSalvandoRascunho || isSalvando || isGerandoPdf}
              className="bg-blue-800 hover:bg-blue-900 text-white"
            >
              {isGerandoPdf ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando PDF...</>
              ) : (
                <><Printer className="w-4 h-4 mr-2" />Gerar PDF</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}