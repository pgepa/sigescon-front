import { useState, useEffect } from "react";
import React from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, SquareX, Upload, Trash2, ChevronDown, Search, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Constantes para arquivo (igual ao NovoContrato)
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet'
];

const ACCEPT_STRING = ALLOWED_FILE_TYPES.join(',');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB por arquivo
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

import {
    getContratoDetalhado,
    updateContrato,
    getArquivosByContratoId,
    deleteArquivoContrato,
    getContratados,
    getModalidades,
    getStatus
} from '@/lib/api';

// Schema de validação (inalterado)
const contractSchema = z.object({
    nr_contrato: z.string().min(1, "Número do contrato é obrigatório"),
    objeto: z.string().min(1, "Objeto é obrigatório"),
    data_inicio: z.string().min(1, "Data de início é obrigatória"),
    data_fim: z.string().min(1, "Data de fim é obrigatória"),
    contratado_id: z.string().min(1, "Contratado é obrigatório"),
    modalidade_id: z.string().min(1, "Modalidade é obrigatória"),
    status_id: z.string().min(1, "Status é obrigatório"),
    gestor_id: z.string().optional(),
    fiscal_id: z.string().optional(),
    fiscal_substituto_id: z.string().optional(),
    valor_anual: z.string().optional().refine(
        (val) => !val || val === "" || parseFloat(val) >= 0,
        "Valor anual não pode ser negativo"
    ),
    valor_global: z.string().optional().refine(
        (val) => !val || val === "" || parseFloat(val) >= 0,
        "Valor global não pode ser negativo"
    ),
    base_legal: z.string().optional(),
    termos_contratuais: z.string().optional(),
    pae: z.string().optional(),
    doe: z.string().optional(),
    data_doe: z.string().optional(),
    garantia: z.string().optional(),
    portaria_fiscal: z.string().optional(),
    nr_adesao_ata: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

// Componente SearchableSelect
interface SearchableSelectProps {
    options: Array<{ id: number | string; nome: string }>;
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
}

function SearchableSelect({ options, value, onValueChange, placeholder }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredOptions, setFilteredOptions] = useState(options);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const filtered = options.filter(option =>
            option.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOptions(filtered);
    }, [searchTerm, options]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const selectedOption = options.find(option => option.id.toString() === value);

    const handleSelect = (optionValue: string) => {
        onValueChange(optionValue);
        setIsOpen(false);
        setSearchTerm("");
    };

    const clearSearch = () => {
        setSearchTerm("");
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Display button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-left bg-white border border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors hover:border-blue-400"
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-blue-900'}`}>
                    {selectedOption ? selectedOption.nome : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-blue-200 rounded-lg shadow-xl">
                    {/* Search input */}
                    <div className="p-3 border-b border-blue-100 bg-blue-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-9 pr-8 py-2 text-sm border border-blue-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options list - altura exata para 10 linhas (40px cada = 400px) */}
                    <div className="h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(option.id.toString())}
                                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors border-b border-blue-50 last:border-b-0 ${
                                        value === option.id.toString()
                                            ? 'bg-blue-100 text-blue-900 font-medium'
                                            : 'text-gray-700 hover:text-blue-900'
                                    }`}
                                >
                                    {option.nome}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                Nenhum item encontrado
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function EditarContrato() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Estados para arquivos
    const [existingFiles, setExistingFiles] = useState<{ id: number; nome_arquivo: string; data_upload?: string }[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [fileWasDeleted, setFileWasDeleted] = useState(false);
    const [selectedPortariaFile, setSelectedPortariaFile] = useState<File | null>(null);
    const [selectedAtaFile, setSelectedAtaFile] = useState<File | null>(null);

    // Função para calcular tamanho total dos arquivos
    const getTotalFileSize = (files: File[]) => {
        return files.reduce((total, file) => total + file.size, 0);
    };

    // Estados para formulário
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estados para os dropdowns (inalterado)
    const [contratados, setContratados] = useState<any[]>([]);
    const [modalidades, setModalidades] = useState<any[]>([]);
    const [statusList, setStatusList] = useState<any[]>([]);
    const [usuariosGestores, setUsuariosGestores] = useState<any[]>([]);
    const [usuariosFiscais, setUsuariosFiscais] = useState<any[]>([]);

    // Estados para controlar os valores dos selects customizados
    const [selectedContratado, setSelectedContratado] = useState("");
    const [selectedGestor, setSelectedGestor] = useState("");
    const [selectedFiscal, setSelectedFiscal] = useState("");
    const [selectedFiscalSubstituto, setSelectedFiscalSubstituto] = useState("");
    const [selectedModalidade, setSelectedModalidade] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, dirtyFields, isDirty },
        reset,
    } = useForm<ContractFormData>({
        resolver: zodResolver(contractSchema),
    });

    useEffect(() => {
        async function loadContractData() {
            setIsLoading(true);
            try {
                // Carrega dados dos dropdowns e contrato em paralelo usando as funções da API
                const [contratados, modalidades, statusList, contractData] = await Promise.all([
                    getContratados({ page: 1, per_page: 100 }),
                    getModalidades(),
                    getStatus(),
                    getContratoDetalhado(Number(id))
                ]);

                setContratados(contratados.data || contratados);
                setModalidades(modalidades);
                setStatusList(statusList);

                // Carregar usuários filtrados por perfil com limite maior
                const [usuariosGestoresResponse, usuariosFiscaisResponse] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/usuarios?perfil=Gestor&per_page=100`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    }),
                    fetch(`${import.meta.env.VITE_API_URL}/usuarios?perfil=Fiscal&per_page=100`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    })
                ]);

                const [usuariosGestoresData, usuariosFiscaisData] = await Promise.all([
                    usuariosGestoresResponse.json(),
                    usuariosFiscaisResponse.json()
                ]);

                const gestoresArray = Array.isArray(usuariosGestoresData) ? usuariosGestoresData : usuariosGestoresData.data || [];
                const fiscaisArray = Array.isArray(usuariosFiscaisData) ? usuariosFiscaisData : usuariosFiscaisData.data || [];

                setUsuariosGestores(gestoresArray.filter((item: any) => item.ativo !== false));
                setUsuariosFiscais(fiscaisArray.filter((item: any) => item.ativo !== false));
                
                // Constrói apenas os campos esperados pelo formulário, com os tipos corretos
                const formattedData: ContractFormData = {
                    nr_contrato: contractData.nr_contrato ?? "",
                    objeto: contractData.objeto ?? "",
                    data_inicio: contractData.data_inicio ? new Date(contractData.data_inicio).toISOString().split('T')[0] : "",
                    data_fim: contractData.data_fim ? new Date(contractData.data_fim).toISOString().split('T')[0] : "",
                    contratado_id: String(contractData.contratado_id ?? ""),
                    modalidade_id: String(contractData.modalidade_id ?? ""),
                    status_id: String(contractData.status_id ?? ""),
                    gestor_id: String(contractData.gestor_id ?? ""),
                    fiscal_id: String(contractData.fiscal_id ?? ""),
                    fiscal_substituto_id: contractData.fiscal_substituto_id != null ? String(contractData.fiscal_substituto_id) : undefined,
                    valor_anual: contractData.valor_anual != null ? String(contractData.valor_anual) : undefined,
                    valor_global: contractData.valor_global != null ? String(contractData.valor_global) : undefined,
                    // Alguns campos podem não estar tipados em Contrato; acessar com cast seguro
                    base_legal: (contractData as any)?.base_legal ?? undefined,
                    termos_contratuais: (contractData as any)?.termos_contratuais ?? undefined,
                    pae: contractData.pae ?? undefined,
                    doe: contractData.doe ?? undefined,
                    data_doe: contractData.data_doe ? new Date(contractData.data_doe).toISOString().split('T')[0] : undefined,
                    garantia: (contractData as any)?.garantia ? new Date((contractData as any).garantia).toISOString().split('T')[0] : undefined,
                    portaria_fiscal: (contractData as any)?.portaria_fiscal ?? undefined,
                    nr_adesao_ata: (contractData as any)?.nr_adesao_ata ?? undefined,
                };

                reset(formattedData as Partial<ContractFormData>);

                // Inicializar estados dos selects customizados
                setSelectedContratado(String(contractData.contratado_id ?? ""));
                setSelectedGestor(String(contractData.gestor_id ?? ""));
                setSelectedFiscal(String(contractData.fiscal_id ?? ""));
                setSelectedFiscalSubstituto(contractData.fiscal_substituto_id != null ? String(contractData.fiscal_substituto_id) : "");
                setSelectedModalidade(String(contractData.modalidade_id ?? ""));
                setSelectedStatus(String(contractData.status_id ?? ""));

                // Carrega arquivos do contrato
                const filesResponse = await getArquivosByContratoId(Number(id));
                setExistingFiles(filesResponse.arquivos.map(arquivo => ({
                    id: arquivo.id,
                    nome_arquivo: arquivo.nome_arquivo,
                    data_upload: arquivo.created_at
                })));

            } catch (err: any) {
                console.error("Erro ao carregar dados:", err);
                toast.error(err.message || "Falha ao carregar os dados do contrato.");
                navigate("/contratos");
            } finally {
                setIsLoading(false);
            }
        }
        loadContractData();
    }, [id, navigate, reset]);

    // **FUNÇÃO onSubmit ATUALIZADA PARA USAR A API**
    async function onSubmit(data: ContractFormData) {
        const hasFormChanges = Object.keys(dirtyFields).length > 0;
        const hasNewFiles = newFiles.length > 0;

        if (!hasFormChanges && !hasNewFiles && !fileWasDeleted) {
            toast.info("Nenhuma alteração foi realizada para salvar.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Salvando alterações...");

        try {
            const formData = new FormData();

            // Adiciona apenas os campos que foram modificados
            Object.keys(data).forEach(keyStr => {
                const key = keyStr as keyof ContractFormData;
                if (dirtyFields[key]) {
                    const value = data[key];
                    if (value !== undefined && value !== null && value !== '') {
                        formData.append(key, String(value));
                    }
                }
            });

            // Adicionar arquivo da portaria se selecionado
            if (selectedPortariaFile) {
                formData.append("documento_portaria", selectedPortariaFile);
            }

            // Adicionar arquivo da ata de registro de preço se selecionado
            if (selectedAtaFile) {
                formData.append("documento_ata_registro", selectedAtaFile);
            }

            // Adiciona múltiplos arquivos (mesmo padrão do NovoContrato)
            newFiles.forEach(file => {
                formData.append("documento_contrato", file);
            });

            // Log dos dados enviados no FormData (sem conteúdo binário)
            const formDataEntries: any = {};
            formData.forEach((value, key) => {
                if (key === 'documento_contrato') {
                    if (!formDataEntries[key]) formDataEntries[key] = [];
                    formDataEntries[key].push(`[FILE: ${(value as File).name}]`);
                } else {
                    formDataEntries[key] = value;
                }
            });
            console.log('Editando contrato - FormData (obj):', formDataEntries);
            try { console.log('Editando contrato - FormData (json):', JSON.stringify(formDataEntries, null, 2)); } catch {}

            // Usa a função da API que já tem autenticação
            const updated = await updateContrato(Number(id), formData);
            console.log('Resposta do PATCH /contratos/{id}:', updated);

            let successMessage = "Contrato atualizado com sucesso!";
            if (!hasFormChanges && !hasNewFiles && fileWasDeleted) {
                successMessage = "Arquivo removido com sucesso!";
            } else if (!hasFormChanges && hasNewFiles) {
                successMessage = "Novos arquivos adicionados com sucesso!";
            }

            toast.success(successMessage, { id: toastId });
            // Recarrega detalhes e arquivos para refletir alterações antes de sair
            try {
                const refreshed = await getContratoDetalhado(Number(id));
                // Atualiza o formulário com os dados retornados pelo backend
                const refreshedFormatted: Partial<ContractFormData> = {
                    nr_contrato: refreshed.nr_contrato ?? '',
                    objeto: refreshed.objeto ?? '',
                    data_inicio: refreshed.data_inicio ? new Date(refreshed.data_inicio).toISOString().split('T')[0] : '',
                    data_fim: refreshed.data_fim ? new Date(refreshed.data_fim).toISOString().split('T')[0] : '',
                    contratado_id: String(refreshed.contratado_id ?? ''),
                    modalidade_id: String(refreshed.modalidade_id ?? ''),
                    status_id: String(refreshed.status_id ?? ''),
                    gestor_id: String(refreshed.gestor_id ?? ''),
                    fiscal_id: String(refreshed.fiscal_id ?? ''),
                    fiscal_substituto_id: refreshed.fiscal_substituto_id != null ? String(refreshed.fiscal_substituto_id) : undefined,
                    valor_anual: refreshed.valor_anual != null ? String(refreshed.valor_anual) : undefined,
                    valor_global: refreshed.valor_global != null ? String(refreshed.valor_global) : undefined,
                    base_legal: (refreshed as any)?.base_legal ?? undefined,
                    termos_contratuais: (refreshed as any)?.termos_contratuais ?? undefined,
                    pae: refreshed.pae ?? undefined,
                    doe: refreshed.doe ?? undefined,
                    data_doe: refreshed.data_doe ? new Date(refreshed.data_doe).toISOString().split('T')[0] : undefined,
                    garantia: (refreshed as any)?.garantia ? new Date((refreshed as any).garantia).toISOString().split('T')[0] : undefined,
                    portaria_fiscal: (refreshed as any)?.portaria_fiscal ?? undefined,
                    nr_adesao_ata: (refreshed as any)?.nr_adesao_ata ?? undefined,
                };
                reset(refreshedFormatted);

                // Atualizar estados dos selects customizados
                setSelectedContratado(String(refreshed.contratado_id ?? ""));
                setSelectedGestor(String(refreshed.gestor_id ?? ""));
                setSelectedFiscal(String(refreshed.fiscal_id ?? ""));
                setSelectedFiscalSubstituto(refreshed.fiscal_substituto_id != null ? String(refreshed.fiscal_substituto_id) : "");
                setSelectedModalidade(String(refreshed.modalidade_id ?? ""));
                setSelectedStatus(String(refreshed.status_id ?? ""));

                const updatedFilesResponse = await getArquivosByContratoId(Number(id));
                setExistingFiles(updatedFilesResponse.arquivos.map(arquivo => ({
                    id: arquivo.id,
                    nome_arquivo: arquivo.nome_arquivo,
                    data_upload: arquivo.created_at
                })));
            } catch {}
            navigate("/contratos");
            
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Erro ao atualizar contrato", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    }

    // **FUNÇÃO handleDeleteExistingFile ATUALIZADA PARA USAR A API**
    const handleDeleteExistingFile = (fileId: number) => {
        const proceedWithDelete = async () => {
            const toastId = toast.loading("Excluindo arquivo...");
            try {
                // Usa a função da API que já tem autenticação
                await deleteArquivoContrato(Number(id), fileId);
                
                setExistingFiles(prev => prev.filter(file => file.id !== fileId));
                setFileWasDeleted(true);
                toast.success("Arquivo excluído com sucesso!", { id: toastId });
            } catch (err: any) {
                console.error("Erro ao deletar arquivo:", err);
                toast.error(err.message || "Falha ao excluir o arquivo.", { id: toastId });
            }
        };

        toast.warning("Tem certeza que deseja excluir este arquivo?", {
            action: {
                label: "Excluir",
                onClick: () => proceedWithDelete(),
            },
            cancel: {
                label: "Cancelar",
                onClick: () => {}
            },
            duration: 10000,
        });
    };

    const handleCancel = () => {
        const hasChanges = isDirty || newFiles.length > 0 || fileWasDeleted;
        if (hasChanges) {
            toast("Você possui alterações não salvas.", {
                description: "Deseja realmente sair e descartá-las?",
                action: {
                    label: "Sair e Descartar",
                    onClick: () => navigate('/contratos'),
                },
                cancel: {
                    label: "Continuar Editando",
                    onClick: () => {}
                }
            });
        } else {
            navigate('/contratos');
        }
    };
    
    // Funções de manipulação de múltiplos arquivos (igual ao NovoContrato)
    const handleAddNewFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        console.log("Arquivos selecionados:", files);
        
        if (files && files.length > 0) {
            const newFilesArray = Array.from(files);
            const invalidFiles: string[] = [];
            const largeFiles: string[] = [];
            const validFiles: File[] = [];

            newFilesArray.forEach(file => {
                console.log("Processando arquivo:", {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    sizeInMB: (file.size / 1024 / 1024).toFixed(2)
                });

                // Verificar tamanho individual do arquivo
                if (file.size > MAX_FILE_SIZE) {
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    largeFiles.push(`${file.name} (${sizeMB} MB)`);
                    return;
                }

                // Verificar tipo de arquivo
                if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                    invalidFiles.push(file.name);
                    return;
                }

                validFiles.push(file);
            });

            // Verificar tamanho total com arquivos existentes + novos arquivos válidos
            const currentTotalSize = getTotalFileSize(newFiles);
            const newTotalSize = currentTotalSize + getTotalFileSize(validFiles);

            if (newTotalSize > MAX_TOTAL_SIZE) {
                const totalMB = (newTotalSize / 1024 / 1024).toFixed(2);
                toast.error(`Tamanho total excede o limite de 50MB (atual: ${totalMB} MB). Remova alguns arquivos.`);
                event.target.value = '';
                return;
            }

            // Mostrar erros se houver
            if (invalidFiles.length > 0) {
                toast.error(`Arquivos com formato inválido: ${invalidFiles.join(', ')}`);
            }
            if (largeFiles.length > 0) {
                toast.error(`Arquivos muito grandes (máx. 10MB): ${largeFiles.join(', ')}`);
            }

            // Adicionar arquivos válidos
            if (validFiles.length > 0) {
                setNewFiles(prev => [...prev, ...validFiles]);
                toast.success(`${validFiles.length} arquivo(s) adicionado(s) com sucesso!`);
                console.log("Arquivos válidos adicionados:", validFiles.map(f => f.name));
            }

            // Limpar o input
            event.target.value = '';
        }
    };

    const handleRemoveNewFile = (indexToRemove: number) => {
        const fileToRemove = newFiles[indexToRemove];
        console.log("Removendo arquivo:", fileToRemove?.name);
        
        setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        toast.info(`Arquivo "${fileToRemove?.name}" removido`);
    };

    const handleClearAllNewFiles = () => {
        console.log("Removendo todos os novos arquivos");
        setNewFiles([]);
        toast.info("Todos os novos arquivos foram removidos");
    };

    if (isLoading) {
        return <div className="p-6 text-center">Carregando dados do contrato...</div>;
    }

    return (
        <div className="w-full mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Editar Contrato</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white shadow-md rounded-2xl p-6">

                {/* Campos ocultos para react-hook-form */}
                <input {...register("contratado_id")} type="hidden" />
                <input {...register("gestor_id")} type="hidden" />
                <input {...register("fiscal_id")} type="hidden" />
                <input {...register("fiscal_substituto_id")} type="hidden" />
                <input {...register("modalidade_id")} type="hidden" />
                <input {...register("status_id")} type="hidden" />

                {/* --- CAMPOS DO FORMULÁRIO (inalterados) --- */}
                <div className="col-span-1">
                    <label className="font-medium">Número do contrato</label>
                    <input type="text" {...register("nr_contrato")} className="mt-1 border rounded-lg p-2 w-full" />
                    {errors.nr_contrato && <p className="text-red-500 text-sm">{errors.nr_contrato.message}</p>}
                </div>
                <div className="col-span-1">
                    <label className="font-medium">PAE</label>
                    <input type="text" {...register("pae")} className="mt-1 border rounded-lg p-2 w-full" />
                </div>
                <div className="col-span-1">
                    <label className="font-medium">DOE</label>
                    <input type="text" {...register("doe")} className="mt-1 border rounded-lg p-2 w-full" />
                </div>
                <div className="col-span-1">
                    <label className="font-medium">Data DOE</label>
                    <input type="date" {...register("data_doe")} className="mt-1 border rounded-lg p-2 w-full" />
                </div>
                <div className="col-span-1">
                    <label className="font-medium">Garantia</label>
                    <input type="date" {...register("garantia")} className="mt-1 border rounded-lg p-2 w-full" />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                    <label className="font-medium">Objeto</label>
                    <textarea {...register("objeto")} className="mt-1 border rounded-lg p-2 w-full h-20" />
                    {errors.objeto && <p className="text-red-500 text-sm">{errors.objeto.message}</p>}
                </div>

                {/* Nº Adesão Ata de Registro de Preço */}
                <div className="md:col-span-1 lg:col-span-2">
                    <label className="font-medium">Nº Adesão Ata de Registro de Preço</label>
                    <div className="mt-1 flex gap-2">
                        <input
                            type="text"
                            {...register("nr_adesao_ata")}
                            className="border rounded-lg p-2 flex-1"
                            placeholder="Ex: ATA nº 001/2025"
                        />
                        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap">
                            <Upload size={16} />
                            {selectedAtaFile ? "Trocar" : "Upload"}
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                                            toast.error("Tipo de arquivo não permitido");
                                            e.target.value = '';
                                            return;
                                        }
                                        if (file.size > MAX_FILE_SIZE) {
                                            toast.error("Arquivo muito grande (máx. 10MB)");
                                            e.target.value = '';
                                            return;
                                        }
                                        setSelectedAtaFile(file);
                                        toast.success(`Arquivo "${file.name}" selecionado`);
                                    }
                                    e.target.value = '';
                                }}
                                accept={ACCEPT_STRING}
                            />
                        </label>
                    </div>
                    {selectedAtaFile && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2">
                            <span className="truncate flex-1">{selectedAtaFile.name}</span>
                            <button type="button" onClick={() => { setSelectedAtaFile(null); toast.info("Arquivo removido"); }} className="text-red-500 hover:text-red-700">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="md:col-span-1 lg:col-span-2">
                    <label className="font-medium">Contratado *</label>
                    <div className="mt-1">
                        <SearchableSelect
                            options={contratados}
                            value={selectedContratado}
                            onValueChange={(value) => {
                                setSelectedContratado(value);
                                setValue("contratado_id", value, { shouldDirty: true });
                            }}
                            placeholder="Selecione um contratado"
                        />
                    </div>
                    {errors.contratado_id && <p className="text-red-500 text-sm">{errors.contratado_id.message}</p>}
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                    <label className="font-medium">Gestor</label>
                    <div className="mt-1">
                        <SearchableSelect
                            options={usuariosGestores}
                            value={selectedGestor}
                            onValueChange={(value) => {
                                setSelectedGestor(value);
                                setValue("gestor_id", value, { shouldDirty: true });
                            }}
                            placeholder="Selecione um gestor"
                        />
                    </div>
                    {errors.gestor_id && <p className="text-red-500 text-sm">{errors.gestor_id.message}</p>}
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                    <label className="font-medium">Fiscal</label>
                    <div className="mt-1">
                        <SearchableSelect
                            options={usuariosFiscais}
                            value={selectedFiscal}
                            onValueChange={(value) => {
                                setSelectedFiscal(value);
                                setValue("fiscal_id", value, { shouldDirty: true });
                            }}
                            placeholder="Selecione um fiscal"
                        />
                    </div>
                    {errors.fiscal_id && <p className="text-red-500 text-sm">{errors.fiscal_id.message}</p>}
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                    <label className="font-medium">Fiscal Substituto</label>
                    <div className="mt-1">
                        <SearchableSelect
                            options={usuariosFiscais}
                            value={selectedFiscalSubstituto}
                            onValueChange={(value) => {
                                setSelectedFiscalSubstituto(value);
                                setValue("fiscal_substituto_id", value, { shouldDirty: true });
                            }}
                            placeholder="Selecione um fiscal substituto"
                        />
                    </div>
                </div>

                {/* Portaria de Designação do Fiscal */}
                <div className="md:col-span-1 lg:col-span-2">
                    <label className="font-medium">Portaria de Designação do Fiscal</label>
                    <div className="mt-1 flex gap-2">
                        <input
                            type="text"
                            {...register("portaria_fiscal")}
                            className="border rounded-lg p-2 flex-1"
                            placeholder="Ex: Portaria nº 123/2025"
                        />
                        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap">
                            <Upload size={16} />
                            {selectedPortariaFile ? "Trocar" : "Upload"}
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                                            toast.error("Tipo de arquivo não permitido");
                                            e.target.value = '';
                                            return;
                                        }
                                        if (file.size > MAX_FILE_SIZE) {
                                            toast.error("Arquivo muito grande (máx. 10MB)");
                                            e.target.value = '';
                                            return;
                                        }
                                        setSelectedPortariaFile(file);
                                        toast.success(`Arquivo "${file.name}" selecionado`);
                                    }
                                    e.target.value = '';
                                }}
                                accept={ACCEPT_STRING}
                            />
                        </label>
                    </div>
                    {selectedPortariaFile && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded p-2">
                            <span className="truncate flex-1">{selectedPortariaFile.name}</span>
                            <button type="button" onClick={() => { setSelectedPortariaFile(null); toast.info("Arquivo removido"); }} className="text-red-500 hover:text-red-700">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="font-medium">Data Início</label>
                    <input type="date" {...register("data_inicio")} className="mt-1 border rounded-lg p-2 w-full" />
                    {errors.data_inicio && <p className="text-red-500 text-sm">{errors.data_inicio.message}</p>}
                </div>
                <div>
                    <label className="font-medium">Data Fim</label>
                    <input type="date" {...register("data_fim")} className="mt-1 border rounded-lg p-2 w-full" />
                    {errors.data_fim && <p className="text-red-500 text-sm">{errors.data_fim.message}</p>}
                </div>
                <div>
                    <label className="font-medium">Modalidade *</label>
                    <div className="mt-1">
                        <SearchableSelect
                            options={modalidades}
                            value={selectedModalidade}
                            onValueChange={(value) => {
                                setSelectedModalidade(value);
                                setValue("modalidade_id", value, { shouldDirty: true });
                            }}
                            placeholder="Selecione uma modalidade"
                        />
                    </div>
                    {errors.modalidade_id && <p className="text-red-500 text-sm">{errors.modalidade_id.message}</p>}
                </div>
                <div>
                    <label className="font-medium">Status *</label>
                    <div className="mt-1">
                        <SearchableSelect
                            options={statusList}
                            value={selectedStatus}
                            onValueChange={(value) => {
                                setSelectedStatus(value);
                                setValue("status_id", value, { shouldDirty: true });
                            }}
                            placeholder="Selecione um status"
                        />
                    </div>
                    {errors.status_id && <p className="text-red-500 text-sm">{errors.status_id.message}</p>}
                </div>
                <div>
                    <label className="font-medium">Valor Anual</label>
                    <input type="number" step="0.01" min="0" {...register("valor_anual")} className="mt-1 border rounded-lg p-2 w-full" />
                </div>
                <div>
                    <label className="font-medium">Valor Global</label>
                    <input type="number" step="0.01" min="0" {...register("valor_global")} className="mt-1 border rounded-lg p-2 w-full" />
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                    <label className="font-medium">Base Legal</label>
                    <input type="text" {...register("base_legal")} className="mt-1 border rounded-lg p-2 w-full" />
                </div>

                <div className="lg:col-span-4">
                    <label className="font-medium">Termos Contratuais</label>
                    <textarea {...register("termos_contratuais")} className="mt-1 border rounded-lg p-2 w-full h-20" />
                </div>

                {/* --- GERENCIAMENTO DE ARQUIVOS (atualizado) --- */}
                <div className="lg:col-span-4">
                    <label className="block font-medium mb-2">Documentos do Contrato</label>
                    
                    {/* Arquivos existentes */}
                    {existingFiles.length > 0 && (
                        <div className="mb-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-medium text-blue-700">
                                    Arquivos atuais ({existingFiles.length})
                                </h4>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                                {existingFiles.map((file) => (
                                    <div key={file.id} className="p-3 bg-white rounded-lg border flex justify-between items-center">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                                <p className="text-sm font-medium text-gray-900 truncate" title={file.nome_arquivo}>
                                                    {file.nome_arquivo}
                                                </p>
                                            </div>
                                            {file.data_upload && (
                                                <p className="text-xs text-gray-500">
                                                    Enviado em: {new Date(file.data_upload).toLocaleDateString('pt-BR')}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteExistingFile(file.id)}
                                            className="ml-3 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded flex-shrink-0"
                                            aria-label={`Excluir ${file.nome_arquivo}`}
                                            title="Excluir arquivo"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Interface de upload para múltiplos arquivos */}
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        {newFiles.length > 0 ? (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-medium text-gray-700">
                                        Novos arquivos ({newFiles.length})
                                    </h4>
                                    <div className="flex gap-2">
                                        <span className="text-xs text-gray-500">
                                            Total: {(getTotalFileSize(newFiles) / 1024 / 1024).toFixed(2)} MB / 50 MB
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleClearAllNewFiles}
                                            className="text-xs text-red-500 hover:text-red-700 underline"
                                        >
                                            Remover todos
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {newFiles.map((file, index) => (
                                        <div key={`${file.name}-${index}`} className="p-3 bg-white rounded-lg border flex justify-between items-center">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                                    <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                                        {file.name}
                                                    </p>
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-500">
                                                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                    <span>{file.type || 'Tipo desconhecido'}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveNewFile(index)}
                                                className="ml-3 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded flex-shrink-0"
                                                aria-label={`Remover ${file.name}`}
                                                title="Remover arquivo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 mb-1">Nenhum novo arquivo selecionado</p>
                                <p className="text-xs text-gray-500">Selecione um ou múltiplos arquivos</p>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 w-full transition-colors">
                                <Upload size={18} />
                                {newFiles.length > 0 ? "Adicionar Mais Arquivos" : "Selecionar Arquivos"}
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleAddNewFiles}
                                    accept={ACCEPT_STRING}
                                />
                            </label>
                            <div className="mt-3 text-center">
                                <p className="text-xs text-gray-500">
                                    Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX, TXT, ODT, ODS
                                </p>
                                <div className="flex justify-center gap-4 mt-1 text-xs text-gray-400">
                                    <span>Máx. 10MB por arquivo</span>
                                    <span>•</span>
                                    <span>Total máximo: 50MB</span>
                                </div>
                                {newFiles.length > 0 && (
                                    <div className="mt-2 text-xs">
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div 
                                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                                style={{ width: `${Math.min((getTotalFileSize(newFiles) / MAX_TOTAL_SIZE) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-green-600 mt-1">
                                            ✓ {newFiles.length} arquivo(s) pronto(s) para upload
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* **BOTÕES DE AÇÃO ATUALIZADOS** */}
                <div className="flex gap-4 justify-center col-span-4 mt-4">
                    <Button 
                        type="submit" 
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow flex items-center gap-2"
                        disabled={isSubmitting}
                    >
                        <Save className="h-5 w-5" />
                        {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                    <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        <SquareX className="h-5 w-5" /> 
                        Cancelar
                    </Button>
                </div>
            </form>
        </div>
    );
}