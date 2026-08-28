import * as React from "react";
import {
    IconChevronLeft,
    IconChevronRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircleCheckFilled,
    IconClockHour4,
    IconDotsVertical,
    IconExclamationCircle,
    IconPlus,
    IconSearch,
    IconX,
    IconFileText,
    IconTarget,
    IconFolder,
    IconCalendar,
    IconSettings,
    IconUser,
    IconUserCheck,
    IconChevronDown,
    IconPencil,
    IconDownload,
    IconUpload,
    IconTrash,
} from "@tabler/icons-react";
import {
    type ColumnDef,
    type ColumnFiltersState,
    getCoreRowModel,
    type SortingState,
    type Table as TanstackTable,
    useReactTable,
} from "@tanstack/react-table";
import { jwtDecode } from "jwt-decode";
import { PlusCircle } from "lucide-react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

// Importar as funções da API
import {
    getContratos,
    deleteContrato,
    createPendencia,
    getContratados,
    getStatus,
    getUsers,
    logout,
    getPendenciasAutomaticasPreview,
    criarPendenciasAutomaticas as criarPendenciasAutomaticasAPI,
    getTermosAditivos,
    createTermoAditivo,
    updateTermoAditivo,
    deleteTermoAditivo,
    deleteTermoAditivoDefinitivamente,
    uploadArquivoAditivo,
    //downloadArquivoContrato,
    downloadArquivoAditivo,
    type Contratado,
    type Status,
    type User,
    type Perfil,
    type TermoAditivo,
    type TermoAditivoCreate,
    type TermoAditivoUpdate,
} from "@/lib/api";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// Tipos corrigidos baseados na API real
// ============================================================================

// Tipo para listagem de contratos (GET /contratos)
type ContratoList = {
    id: number;
    nr_contrato: string;
    objeto: string;
    data_fim: string;
    contratado_nome: string | null;
    status_nome: string | null;
    total_aditivos: number;
};



type NewPendenciaPayload = {
    descricao: string;
    data_prazo: string;
    status_pendencia_id: number;
    criado_por_usuario_id: number;
};

type PaginationMeta = {
    total_items: number;
    total_pages: number;
    current_page: number;
    per_page: number;
};

// ============================================================================
// Funções Auxiliares
// ============================================================================
const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const getCurrentUserId = (): number | null => {
    try {
        const token = localStorage.getItem("authToken");
        if (!token) return null;
        const decoded: { sub: string } = jwtDecode(token);
        return parseInt(decoded.sub, 10);
    } catch (error) {
        console.error("Failed to decode token:", error);
        toast.error("Sessão inválida ou expirada. Faça login novamente.");
        return null;
    }
};

const convertToContratoList = (contrato: any): ContratoList => {
    return {
        id: contrato.id,
        nr_contrato: contrato.nr_contrato,
        objeto: contrato.objeto,
        data_fim: contrato.data_fim,
        contratado_nome: contrato.contratado_nome ?? null,
        status_nome: contrato.status_nome ?? null,
        total_aditivos: contrato.total_aditivos ?? 0,
    };
};

// ============================================================================
// Componente SearchableSelect para Filtros
// ============================================================================
interface SearchableSelectProps {
    options: Array<{ id: number | string; nome: string }>;
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    name: string;
    required?: boolean;
}

function SearchableSelect({ options, value, onValueChange, placeholder }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filteredOptions, setFilteredOptions] = React.useState(options);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const filtered = options.filter(option =>
            option.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOptions(filtered);
    }, [searchTerm, options]);

    // Fechar dropdown ao clicar fora
    React.useEffect(() => {
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
                className="w-full flex items-center justify-between px-3 py-2 text-left bg-white border border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors hover:border-blue-400 h-9"
            >
                <span className={`block truncate text-sm ${!selectedOption ? 'text-gray-500' : 'text-blue-900'}`}>
                    {selectedOption ? selectedOption.nome : placeholder}
                </span>
                <IconChevronDown className={`h-4 w-4 text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-blue-200 rounded-lg shadow-xl">
                    {/* Search input */}
                    <div className="p-2 border-b border-blue-100 bg-blue-50/50">
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-9 pr-8 py-1.5 text-sm border border-blue-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
                                autoFocus
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600"
                                >
                                    <IconX className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options list - altura para 10 linhas */}
                    <div className="max-h-64 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            <>
                                {/* Opção "Todos" */}
                                <button
                                    type="button"
                                    onClick={() => handleSelect("all")}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b border-blue-50 ${
                                        value === "all"
                                            ? 'bg-blue-100 text-blue-900 font-medium'
                                            : 'text-gray-700 hover:text-blue-900'
                                    }`}
                                >
                                    Todos
                                </button>
                                {filteredOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleSelect(option.id.toString())}
                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b border-blue-50 last:border-b-0 ${
                                            value === option.id.toString()
                                                ? 'bg-blue-100 text-blue-900 font-medium'
                                                : 'text-gray-700 hover:text-blue-900'
                                        }`}
                                    >
                                        {option.nome}
                                    </button>
                                ))}
                            </>
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                <IconSearch className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                                Nenhum item encontrado
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Componentes
// ============================================================================
function ContratosFilters({
    table,
    statusList,
    usuarios,
    perfilAtivo,
    pageDescription,
    searchParams,
}: {
    table: TanstackTable<ContratoList>;
    statusList: Status[];
    usuarios: User[];
    perfilAtivo: Perfil | null;
    pageDescription: string;
    searchParams: URLSearchParams;
}) {
    const isAdmin = perfilAtivo?.nome === "Administrador";
    const [filters, setFilters] = React.useState({
        objeto: "",
        nr_contrato: "",
        pae: "",
        contratado_nome: "",
        ano: "",
        status_id: "",
        gestor_id: "",
        fiscal_id: "",
        vencimento_30_dias: false,
        vencimento_60_dias: false,
        vencimento_90_dias: false,
        tem_garantia: false,
        garantia_prazo_dias: "",
    });

    React.useEffect(() => {
        // Sincronizar filtros atuais com o estado local
        const currentFilters = {
            objeto: (table.getColumn("objeto")?.getFilterValue() as string) ?? "",
            nr_contrato: (table.getColumn("nr_contrato")?.getFilterValue() as string) ?? "",
            pae: (table.getColumn("pae")?.getFilterValue() as string) ?? "",
            contratado_nome: (table.getColumn("contratado_nome")?.getFilterValue() as string) ?? "",
            ano: (table.getColumn("ano")?.getFilterValue() as string) ?? "",
            status_id: (table.getColumn("status_id")?.getFilterValue() as string) ?? "",
            gestor_id: (table.getColumn("gestor_id")?.getFilterValue() as string) ?? "",
            fiscal_id: (table.getColumn("fiscal_id")?.getFilterValue() as string) ?? "",
            vencimento_30_dias: (table.getColumn("vencimento_30_dias")?.getFilterValue() as boolean) ?? false,
            vencimento_60_dias: (table.getColumn("vencimento_60_dias")?.getFilterValue() as boolean) ?? false,
            vencimento_90_dias: (table.getColumn("vencimento_90_dias")?.getFilterValue() as boolean) ?? false,
            tem_garantia: (table.getColumn("tem_garantia")?.getFilterValue() as boolean) ?? false,
            garantia_prazo_dias: (table.getColumn("garantia_prazo_dias")?.getFilterValue() as string) ?? "",
        };
        setFilters(currentFilters);
    }, [table]);

    // Aplicar filtros da URL automaticamente
    React.useEffect(() => {
        if (searchParams.get('vencimento_90_dias') === 'true') {
            console.log('🔗 Aplicando filtro de vencimento 90 dias da URL no ContratosFilters');
            
            // Atualizar estado dos filtros
            setFilters(prev => ({
                ...prev,
                vencimento_90_dias: true
            }));
            
            // Aplicar na tabela
            table.getColumn('vencimento_90_dias')?.setFilterValue(true);
        }
    }, [searchParams, table]);

    const handleApplyFilters = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Aplicar filtros à tabela
        table.getColumn("objeto")?.setFilterValue(filters.objeto || undefined);
        table.getColumn("nr_contrato")?.setFilterValue(filters.nr_contrato || undefined);
        table.getColumn("pae")?.setFilterValue(filters.pae || undefined);
        table.getColumn("contratado_nome")?.setFilterValue(filters.contratado_nome || undefined);
        table.getColumn("ano")?.setFilterValue(filters.ano || undefined);
        table.getColumn("status_id")?.setFilterValue(filters.status_id === "all" ? undefined : filters.status_id || undefined);
        table.getColumn("gestor_id")?.setFilterValue(filters.gestor_id === "all" ? undefined : filters.gestor_id || undefined);
        table.getColumn("fiscal_id")?.setFilterValue(filters.fiscal_id === "all" ? undefined : filters.fiscal_id || undefined);
        table.getColumn("vencimento_30_dias")?.setFilterValue(filters.vencimento_30_dias || undefined);
        table.getColumn("vencimento_60_dias")?.setFilterValue(filters.vencimento_60_dias || undefined);
        table.getColumn("vencimento_90_dias")?.setFilterValue(filters.vencimento_90_dias || undefined);
        table.getColumn("tem_garantia")?.setFilterValue(filters.tem_garantia || undefined);
        table.getColumn("garantia_prazo_dias")?.setFilterValue(filters.garantia_prazo_dias === "all" ? undefined : filters.garantia_prazo_dias || undefined);
    };

    const handleClearFilters = () => {
        setFilters({
            objeto: "",
            nr_contrato: "",
            pae: "",
            contratado_nome: "",
            ano: "",
            status_id: "",
            gestor_id: "",
            fiscal_id: "",
            vencimento_30_dias: false,
            vencimento_60_dias: false,
            vencimento_90_dias: false,
            tem_garantia: false,
            garantia_prazo_dias: "",
        });
        table.resetColumnFilters();
    };

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleVencimentoFilterChange = (key: 'vencimento_30_dias' | 'vencimento_60_dias' | 'vencimento_90_dias', checked: boolean) => {
        const newFilters = { ...filters, [key]: checked };
        setFilters(newFilters);
        
        console.log(`🔍 Filtro ${key} ${checked ? 'ativado' : 'desativado'}`);
        
        // Aplicar filtro diretamente na tabela para disparar busca na API
        table.getColumn(key)?.setFilterValue(checked || undefined);
    };

    return (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-slate-50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-100/70 to-blue-50/70 border-b border-blue-200">
                <CardTitle className="text-blue-900 flex items-center gap-2 text-lg">
                    <IconSearch className="h-5 w-5 text-blue-700" />
                    Filtros de Contratos
                </CardTitle>
                <CardDescription className="text-blue-700/80">
                    {pageDescription}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleApplyFilters} className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="nrContrato" className="text-blue-800 text-sm font-medium flex items-center gap-2">
                            <IconFileText className="h-4 w-4" />
                            Número do Contrato
                        </Label>
                        <Input
                            id="nrContrato"
                            placeholder="Ex: 99/2025"
                            value={filters.nr_contrato}
                            onChange={(e) => handleFilterChange("nr_contrato", e.target.value)}
                            className="border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="objeto" className="text-blue-800 text-sm font-medium flex items-center gap-2">
                            <IconTarget className="h-4 w-4" />
                            Objeto do Contrato
                        </Label>
                        <Input
                            id="objeto"
                            placeholder="Pesquisar no objeto..."
                            value={filters.objeto}
                            onChange={(e) => handleFilterChange("objeto", e.target.value)}
                            className="border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="pae" className="text-blue-800 text-sm font-medium flex items-center gap-2">
                            <IconFolder className="h-4 w-4" />
                            Nº (PAE)
                        </Label>
                        <Input
                            id="pae"
                            placeholder="Ex: 2025/123456"
                            value={filters.pae}
                            onChange={(e) => handleFilterChange("pae", e.target.value)}
                            className="border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="contratado_nome" className="text-blue-800 text-sm font-medium flex items-center gap-2">
                            <IconUser className="h-4 w-4" />
                            Empresa / Contratado
                        </Label>
                        <Input
                            id="contratado_nome"
                            placeholder="Pesquisar empresa..."
                            value={filters.contratado_nome}
                            onChange={(e) => handleFilterChange("contratado_nome", e.target.value)}
                            className="border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="ano" className="text-blue-800 text-sm font-medium flex items-center gap-2">
                            <IconCalendar className="h-4 w-4" />
                            Ano Início
                        </Label>
                        <Input
                            id="ano"
                            type="number"
                            placeholder="Ex: 2024"
                            value={filters.ano}
                            onChange={(e) => handleFilterChange("ano", e.target.value)}
                            className="border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 h-9"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-blue-800 text-sm font-medium flex items-center gap-2">
                            <IconSettings className="h-4 w-4" />
                            Status
                        </Label>
                        <Select
                            value={filters.status_id}
                            onValueChange={(value) => handleFilterChange("status_id", value)}
                        >
                            <SelectTrigger className="border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 h-9">
                                <SelectValue placeholder="Escolha um status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                {(statusList || []).map((status) => (
                                    <SelectItem key={status.id} value={String(status.id)}>
                                        {status.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Mostrar filtros de Gestor e Fiscal apenas para Administradores */}
                    {isAdmin && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-blue-800 text-sm font-medium flex items-center gap-2">
                                    <IconUser className="h-4 w-4" />
                                    Gestor
                                </Label>
                                <SearchableSelect
                                    options={usuarios || []}
                                    value={filters.gestor_id}
                                    onValueChange={(value) => handleFilterChange("gestor_id", value)}
                                    placeholder="Escolha um gestor"
                                    name="gestor_id"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-blue-800 text-sm font-medium flex items-center gap-2">
                                    <IconUserCheck className="h-4 w-4" />
                                    Fiscal
                                </Label>
                                <SearchableSelect
                                    options={usuarios || []}
                                    value={filters.fiscal_id}
                                    onValueChange={(value) => handleFilterChange("fiscal_id", value)}
                                    placeholder="Escolha um fiscal"
                                    name="fiscal_id"
                                />
                            </div>
                        </>
                    )}

                    {/* Filtros Especiais - Vencimento e Garantia lado a lado */}
                    <div className="space-y-3 md:col-span-2 lg:col-span-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {/* Filtros de Vencimento */}
                            <div className="bg-blue-50/70 rounded-lg p-3 border border-blue-200">
                                <Label className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
                                    <IconClockHour4 className="h-4 w-4" />
                                    Filtrar por Vencimento
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center space-x-1 px-2 py-1.5 bg-white rounded-md border border-blue-200 text-xs">
                                        <Checkbox
                                            id="vencimento_30_dias"
                                            checked={filters.vencimento_30_dias}
                                            onCheckedChange={(checked) => handleVencimentoFilterChange('vencimento_30_dias', checked as boolean)}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-3 w-3"
                                        />
                                        <label
                                            htmlFor="vencimento_30_dias"
                                            className="font-medium text-blue-800 cursor-pointer"
                                        >
                                            ≤30 dias
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-1 px-2 py-1.5 bg-white rounded-md border border-blue-200 text-xs">
                                        <Checkbox
                                            id="vencimento_60_dias"
                                            checked={filters.vencimento_60_dias}
                                            onCheckedChange={(checked) => handleVencimentoFilterChange('vencimento_60_dias', checked as boolean)}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-3 w-3"
                                        />
                                        <label
                                            htmlFor="vencimento_60_dias"
                                            className="font-medium text-blue-800 cursor-pointer"
                                        >
                                            ≤60 dias
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-1 px-2 py-1.5 bg-white rounded-md border border-blue-200 text-xs">
                                        <Checkbox
                                            id="vencimento_90_dias"
                                            checked={filters.vencimento_90_dias}
                                            onCheckedChange={(checked) => handleVencimentoFilterChange('vencimento_90_dias', checked as boolean)}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-3 w-3"
                                        />
                                        <label
                                            htmlFor="vencimento_90_dias"
                                            className="font-medium text-blue-800 cursor-pointer"
                                        >
                                            ≤90 dias
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Filtros de Garantia */}
                            <div className="bg-blue-50/70 rounded-lg p-3 border border-blue-200">
                                <Label className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
                                    <IconCircleCheckFilled className="h-4 w-4" />
                                    Filtrar por Garantia
                                </Label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center space-x-1 px-2 py-1.5 bg-white rounded-md border border-blue-200">
                                        <Checkbox
                                            id="tem_garantia"
                                            checked={filters.tem_garantia}
                                            onCheckedChange={(checked) => {
                                                setFilters(prev => ({ ...prev, tem_garantia: checked as boolean }));
                                                table.getColumn("tem_garantia")?.setFilterValue(checked || undefined);
                                            }}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-3 w-3"
                                        />
                                        <label
                                            htmlFor="tem_garantia"
                                            className="text-xs font-medium text-blue-800 cursor-pointer"
                                        >
                                            Com Garantia
                                        </label>
                                    </div>
                                    {filters.tem_garantia && (
                                        <div className="flex items-center space-x-1">
                                            <Label className="text-xs font-medium text-blue-700">Prazo:</Label>
                                            <Select
                                                value={filters.garantia_prazo_dias}
                                                onValueChange={(value) => {
                                                    setFilters(prev => ({ ...prev, garantia_prazo_dias: value }));
                                                    table.getColumn("garantia_prazo_dias")?.setFilterValue(value === "all" ? undefined : value || undefined);
                                                }}
                                            >
                                                <SelectTrigger className="w-28 h-7 text-xs border-blue-300 focus:border-blue-500 focus:ring-blue-500/20">
                                                    <SelectValue placeholder="Prazo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Todos</SelectItem>
                                                    <SelectItem value="30">≤30 dias</SelectItem>
                                                    <SelectItem value="60">≤60 dias</SelectItem>
                                                    <SelectItem value="90">≤90 dias</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-blue-600 text-center">
                            Filtros cumulativos no vencimento • Garantia pode ser combinada com outros filtros
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 self-end md:flex-row lg:col-span-4 justify-end">
                        <Button
                            type="submit"
                            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                        >
                            <IconSearch className="mr-2 h-4 w-4" /> Pesquisar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleClearFilters}
                            variant="outline"
                            className="w-full md:w-auto border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                            <IconX className="mr-2 h-4 w-4" /> Limpar
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

function CriarPendenciaDialog({
    contratoId,
    contratoNumero,
    onPendenciaCriada,
    children,
}: {
    contratoId: number;
    contratoNumero: string;
    onPendenciaCriada: () => void;
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<"manual" | "automatica">("manual");

    // Estados para pendência manual
    const [descricao, setDescricao] = React.useState("");
    const [dataPrazo, setDataPrazo] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Estados para pendências automáticas
    const [descricaoBase, setDescricaoBase] = React.useState("Relatório fiscal periódico do contrato.");
    const [preview, setPreview] = React.useState<any>(null);
    const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
    const [isCriandoAutomaticas, setIsCriandoAutomaticas] = React.useState(false);

    const navigate = useNavigate();

    // Resetar estados ao abrir/fechar o modal
    React.useEffect(() => {
        if (!isOpen) {
            setActiveTab("manual");
            setDescricao("");
            setDataPrazo("");
            setDescricaoBase("Relatório fiscal periódico do contrato.");
            setPreview(null);
        }
    }, [isOpen]);

    const handleSubmitManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descricao.trim() || !dataPrazo) {
            toast.error("Por favor, preencha a descrição e a data prazo.");
            return;
        }

        const adminId = getCurrentUserId();
        if (!adminId) {
            toast.error("Não foi possível identificar o usuário. Faça o login novamente.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Criando pendência...");

        try {
            const payload: NewPendenciaPayload = {
                descricao: descricao.trim(),
                data_prazo: dataPrazo,
                status_pendencia_id: 1,
                criado_por_usuario_id: adminId,
            };

            await createPendencia(contratoId, payload);

            toast.success("Pendência criada com sucesso!", { id: toastId });
            onPendenciaCriada();
            setDescricao("");
            setDataPrazo("");
            setIsOpen(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";

            if (errorMessage.includes("401") || errorMessage.includes("não autorizado")) {
                toast.error("Sessão expirada", {
                    description: "Por favor, faça o login novamente.",
                });
                await logout();
                navigate("/login", { replace: true });
            } else {
                toast.error("Erro ao criar pendência", {
                    description: errorMessage,
                    id: toastId,
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const calcularPendenciasAutomaticas = async () => {
        setIsLoadingPreview(true);
        const toastId = toast.loading("Calculando pendências...");

        try {
            const previewData = await getPendenciasAutomaticasPreview(contratoId);
            setPreview(previewData);
            toast.success(`${previewData.total_pendencias} pendências calculadas!`, { id: toastId });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";

            if (errorMessage.includes("401") || errorMessage.includes("não autorizado")) {
                toast.error("Sessão expirada", {
                    description: "Por favor, faça o login novamente.",
                });
                await logout();
                navigate("/login", { replace: true });
            } else {
                toast.error("Erro ao calcular pendências", {
                    description: errorMessage,
                    id: toastId,
                });
            }
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleCriarPendenciasAutomaticas = async () => {
        if (!preview) {
            toast.error("Calcule as pendências primeiro");
            return;
        }

        setIsCriandoAutomaticas(true);
        const toastId = toast.loading(`Criando ${preview.total_pendencias} pendências...`);

        try {
            await criarPendenciasAutomaticasAPI(contratoId, descricaoBase);

            toast.success(`${preview.total_pendencias} pendências criadas com sucesso!`, { id: toastId });
            onPendenciaCriada();
            setIsOpen(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";

            if (errorMessage.includes("401") || errorMessage.includes("não autorizado")) {
                toast.error("Sessão expirada", {
                    description: "Por favor, faça o login novamente.",
                });
                await logout();
                navigate("/login", { replace: true });
            } else {
                toast.error("Erro ao criar pendências", {
                    description: errorMessage,
                    id: toastId,
                });
            }
        } finally {
            setIsCriandoAutomaticas(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent
                className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Criar Nova Pendência</DialogTitle>
                    <DialogDescription>
                        Para o contrato: <strong>{contratoNumero}</strong>
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "automatica")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual</TabsTrigger>
                        <TabsTrigger value="automatica">Automática</TabsTrigger>
                    </TabsList>

                    {/* TAB MANUAL */}
                    <TabsContent value="manual" className="space-y-4">
                        <form onSubmit={handleSubmitManual} className="space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-2">
                                <Label htmlFor="descricao">Descrição da Pendência</Label>
                                <Textarea
                                    id="descricao"
                                    placeholder="Ex: Relatório do 1º trimestre"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="data_prazo">Data Prazo</Label>
                                <Input
                                    id="data_prazo"
                                    type="date"
                                    className="mt-1 w-full"
                                    value={dataPrazo}
                                    onChange={(e) => setDataPrazo(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={isSubmitting}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {isSubmitting ? "Salvando..." : "Salvar Pendência"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    {/* TAB AUTOMÁTICA */}
                    <TabsContent value="automatica" className="space-y-4">
                        <div className="space-y-4">
                            {/* Descrição Base */}
                            <div className="space-y-2">
                                <Label htmlFor="descricaoBase">Descrição Base</Label>
                                <Textarea
                                    id="descricaoBase"
                                    placeholder="Descrição que será usada em todas as pendências"
                                    value={descricaoBase}
                                    onChange={(e) => setDescricaoBase(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    rows={2}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Esta descrição será aplicada a todas as pendências criadas automaticamente
                                </p>
                            </div>

                            {/* Botão Calcular */}
                            {!preview && (
                                <Button
                                    type="button"
                                    onClick={calcularPendenciasAutomaticas}
                                    disabled={isLoadingPreview}
                                    className="w-full"
                                >
                                    {isLoadingPreview ? "Calculando..." : "Calcular Pendências Automáticas"}
                                </Button>
                            )}

                            {/* Preview das Pendências */}
                            {preview && (
                                <div className="space-y-4">
                                    {/* Resumo */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-blue-900 mb-2">Resumo</h4>
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-blue-700">Total de pendências:</span>
                                                <span className="ml-2 font-semibold text-blue-900">{preview.total_pendencias}</span>
                                            </div>
                                            <div>
                                                <span className="text-blue-700">Intervalo:</span>
                                                <span className="ml-2 font-semibold text-blue-900">{preview.intervalo_dias} dias</span>
                                            </div>
                                            <div>
                                                <span className="text-blue-700">Data início:</span>
                                                <span className="ml-2 font-semibold text-blue-900">
                                                    {format(new Date(preview.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-blue-700">Data fim:</span>
                                                <span className="ml-2 font-semibold text-blue-900">
                                                    {format(new Date(preview.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabela de Pendências */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="max-h-96 overflow-y-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Nº</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Título</th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Data Prazo</th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">Dias desde início</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {preview.pendencias.map((pend: any) => (
                                                        <tr key={pend.numero} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 text-sm">{pend.numero}</td>
                                                            <td className="px-4 py-2 text-sm font-medium">{pend.titulo}</td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {format(new Date(pend.data_prazo), 'dd/MM/yyyy', { locale: ptBR })}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-right text-gray-600">
                                                                {pend.dias_desde_inicio} dias
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Botões de Ação */}
                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setPreview(null)}
                                            disabled={isCriandoAutomaticas}
                                        >
                                            Recalcular
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleCriarPendenciasAutomaticas}
                                            disabled={isCriandoAutomaticas}
                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                        >
                                            {isCriandoAutomaticas ? "Criando..." : `Criar ${preview.total_pendencias} Pendências`}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}


const columns: ColumnDef<ContratoList>[] = [
    { accessorKey: "objeto" },
    { accessorKey: "nr_contrato" },
    { accessorKey: "pae" },
    { accessorKey: "contratado_nome" },
    { accessorKey: "ano" },
    { accessorKey: "status_id" },
    { accessorKey: "gestor_id" },
    { accessorKey: "fiscal_id" },
    { accessorKey: "data_fim" },
    { accessorKey: "total_aditivos" },
    // Colunas virtuais para filtros de vencimento
    { accessorKey: "vencimento_30_dias" },
    { accessorKey: "vencimento_60_dias" },
    { accessorKey: "vencimento_90_dias" },
    // Colunas virtuais para filtros de garantia
    { accessorKey: "tem_garantia" },
    { accessorKey: "garantia_prazo_dias" },
];

const TIPOS_ADITIVO_OPTIONS: Array<{ value: TermoAditivoCreate["tipo"]; label: string }> = [
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
    return "";
}

// Verifica se uma data no formato do <input type="date"> (YYYY-MM-DD) é uma data real e
// plausível — pega tanto formatos corrompidos (ano com dígitos a mais) quanto datas
// inexistentes (ex.: 30/02).
function isDataValida(dataStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return false;
    const [ano, mes, dia] = dataStr.split("-").map(Number);
    if (ano < 1900 || ano > 2100) return false;
    const d = new Date(ano, mes - 1, dia);
    return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

// Valida os campos de um termo aditivo (criação ou edição) e retorna a mensagem de erro
// listando apenas o que de fato está faltando, ou null se estiver tudo certo.
function validarCamposAditivo(dados: Partial<TermoAditivoCreate> | undefined): string | null {
    if (!dados) return "Preencha os campos do termo aditivo.";

    const faltando: string[] = [];
    if (!dados.tipo) faltando.push("Termo Aditivo");
    if (!dados.objeto) faltando.push("Descrição");
    if (!dados.data_assinatura) faltando.push("Data Assinatura");
    if (faltando.length > 0) {
        return `Preencha: ${faltando.join(", ")}.`;
    }

    const camposData: Array<[string, string | null | undefined]> = [
        ["Data Assinatura", dados.data_assinatura],
        ["Data Início", dados.data_inicio],
        ["Nova Data Fim", dados.nova_data_fim],
        ["Data Publicação", dados.data_publicacao],
    ];
    for (const [nomeCampo, valor] of camposData) {
        if (valor && !isDataValida(valor)) {
            return `${nomeCampo} inválida. Use o formato DD/MM/AAAA com um ano de 4 dígitos.`;
        }
    }

    if (dados.tipo === "Misto" || dados.tipo === "Prazo") {
        const faltandoData: string[] = [];
        if (!dados.data_inicio) faltandoData.push("Data Início");
        if (!dados.nova_data_fim) faltandoData.push("Nova Data Fim");
        if (faltandoData.length > 0) {
            return `Preencha: ${faltandoData.join(", ")}.`;
        }
    }

    if ((dados.tipo === "Misto" || dados.tipo === "Valor") && !dados.valor_acrescimo && !dados.valor_supressao) {
        return `Para aditivo ${dados.tipo}, preencha Valor Acréscimo ou Valor Supressão.`;
    }

    // Prazo e Valor são mutuamente exclusivos quanto ao que alteram — se precisar dos dois,
    // o tipo correto é Misto. Isso evita um aditivo "Prazo" carregando valor, ou um
    // "Valor" carregando data, o que tornaria o tipo Misto redundante.
    if (dados.tipo === "Prazo" && (dados.valor_acrescimo || dados.valor_supressao)) {
        return "Aditivo de Prazo não pode ter Valor Acréscimo ou Valor Supressão preenchido. Use o tipo Misto.";
    }
    if (dados.tipo === "Valor" && (dados.data_inicio || dados.nova_data_fim)) {
        return "Aditivo de Valor não pode ter Data Início ou Nova Data Fim preenchido. Use o tipo Misto.";
    }

    // Data Início e Nova Data Fim representam uma mudança de vigência e não fazem
    // sentido preenchidas parcialmente — se uma foi informada, a outra também precisa ser
    // (em Misto/Prazo isso já é garantido acima; aqui cobre o caso de Valor com só uma data).
    if (!!dados.data_inicio !== !!dados.nova_data_fim) {
        return "Preencha: Data Início e Nova Data Fim juntos, ou deixe os dois em branco.";
    }

    if (dados.data_inicio && dados.nova_data_fim && dados.nova_data_fim < dados.data_inicio) {
        return "Nova Data Fim não pode ser anterior à Data Início.";
    }

    return null;
}

export function ContratosDataTable() {
    const { user, perfilAtivo } = useAuth();
    const [searchParams] = useSearchParams();
    const [contratos, setContratos] = React.useState<ContratoList[]>([]);
    const [contratados, setContratados] = React.useState<Contratado[]>([]);
    const [statusList, setStatusList] = React.useState<Status[]>([]);
    const [usuarios, setUsuarios] = React.useState<User[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Determinar permissões baseadas no perfil
    const isAdmin = perfilAtivo?.nome === "Administrador";
    const isGestor = perfilAtivo?.nome === "Gestor";
    const isFiscal = perfilAtivo?.nome === "Fiscal";
    const canManageContratos = isAdmin; // Apenas admin pode criar/editar/excluir
    const canManageAditivos = isAdmin || isGestor; // Admin e Gestor podem gerenciar termos aditivos
    
    // Título dinâmico baseado no perfil
    const getPageTitle = () => {
        if (isFiscal) return "Fiscalização";
        if (isGestor) return "Gestão";
        return "";
    };
    
    const getPageDescription = () => {
        if (isFiscal) return "Contratos sob sua responsabilidade de fiscalização";
        if (isGestor) return "Contratos sob sua responsabilidade de gestão";
        return "Gerenciamento completo de contratos do sistema";
    };

    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: "data_fim", desc: true },
    ]);
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 12,
    });
    const [paginationMeta, setPaginationMeta] = React.useState<PaginationMeta | null>(null);
    const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
    const [aditivosMap, setAditivosMap] = React.useState<Record<number, TermoAditivo[]>>({});
    const [aditivosLoading, setAditivosLoading] = React.useState<Set<number>>(new Set());
    const [novoAditivo, setNovoAditivo] = React.useState<Record<number, Partial<TermoAditivoCreate>>>({});
    const [salvandoAditivo, setSalvandoAditivo] = React.useState<Set<number>>(new Set());
    const [mostrarFormAditivo, setMostrarFormAditivo] = React.useState<Set<number>>(new Set());
    const [editandoAditivo, setEditandoAditivo] = React.useState<Record<number, Partial<TermoAditivoUpdate>>>({});
    const [salvandoEdicaoAditivo, setSalvandoEdicaoAditivo] = React.useState<Set<number>>(new Set());
    const [arquivoAditivo, setArquivoAditivo] = React.useState<Record<number, File | null>>({});
    const [arquivoEdicaoAditivo, setArquivoEdicaoAditivo] = React.useState<Record<number, File | null>>({});
    // Uma vez que o usuário edita a descrição diretamente (ou ela já veio customizada do banco),
    // ela para de ser sobrescrita automaticamente pelas mudanças dos outros campos
    const [objetoManualNovo, setObjetoManualNovo] = React.useState<Set<number>>(new Set());
    const [objetoManualEdicao, setObjetoManualEdicao] = React.useState<Set<number>>(new Set());

    const toggleExpandRow = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const expandindo = !expandedRows.has(id);
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); return next; }
            next.add(id);
            return next;
        });
        // Sempre re-busca ao expandir para garantir dados atualizados
        if (expandindo) {
            setAditivosLoading(prev => new Set(prev).add(id));
            try {
                const res = await getTermosAditivos(id);
                setAditivosMap(prev => ({ ...prev, [id]: res.data }));
            } catch {
                setAditivosMap(prev => ({ ...prev, [id]: [] }));
            } finally {
                setAditivosLoading(prev => { const n = new Set(prev); n.delete(id); return n; });
            }
        }
    };

    const handleSalvarAditivo = async (contratoId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const dados = novoAditivo[contratoId];
        const erroValidacao = validarCamposAditivo(dados);
        if (erroValidacao) {
            toast.error(erroValidacao);
            return;
        }
        setSalvandoAditivo(prev => new Set(prev).add(contratoId));
        try {
            const criado = await createTermoAditivo(contratoId, dados as TermoAditivoCreate);
            const arquivo = arquivoAditivo[contratoId];
            if (arquivo) {
                try {
                    await uploadArquivoAditivo(contratoId, criado.id, arquivo);
                } catch {
                    toast.error("Termo aditivo criado, mas falha ao enviar o arquivo.");
                }
                setArquivoAditivo(prev => { const n = { ...prev }; delete n[contratoId]; return n; });
            }
            // Recarrega do servidor para obter arquivo_id atualizado
            const res = await getTermosAditivos(contratoId);
            setAditivosMap(prev => ({ ...prev, [contratoId]: res.data }));
            setNovoAditivo(prev => { const n = { ...prev }; delete n[contratoId]; return n; });
            setMostrarFormAditivo(prev => { const n = new Set(prev); n.delete(contratoId); return n; });
            setObjetoManualNovo(prev => { const n = new Set(prev); n.delete(contratoId); return n; });
            toast.success(`${criado.numero_aditivo}º Termo Aditivo criado com sucesso!`);
        } catch {
            toast.error("Erro ao criar termo aditivo.");
        } finally {
            setSalvandoAditivo(prev => { const n = new Set(prev); n.delete(contratoId); return n; });
        }
    };

    const handleUploadArquivoAditivo = async (contratoId: number, aditivoId: number, file: File) => {
        const toastId = `up-ad-${aditivoId}`;
        try {
            toast.loading("Enviando arquivo…", { id: toastId });
            await uploadArquivoAditivo(contratoId, aditivoId, file);
            const res = await getTermosAditivos(contratoId);
            setAditivosMap(prev => ({ ...prev, [contratoId]: res.data }));
            toast.success("Arquivo anexado!", { id: toastId });
        } catch {
            toast.error("Erro ao enviar o arquivo.", { id: toastId });
        }
    };

    const handleDownloadAditivo = async (ad: TermoAditivo, e: React.MouseEvent) => {
        e.stopPropagation();
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

    const handleExcluirAditivo = async (contratoId: number, aditivoId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteTermoAditivo(contratoId, aditivoId);
            // Recarrega lista para mostrar o aditivo como inativo (ele continua na lista)
            const res = await getTermosAditivos(contratoId);
            setAditivosMap(prev => ({ ...prev, [contratoId]: res.data }));
            toast.success("Termo aditivo inativado.");
        } catch {
            toast.error("Erro ao inativar termo aditivo.");
        }
    };

    const handleExcluirAditivoDefinitivo = async (contratoId: number, aditivoId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteTermoAditivoDefinitivamente(contratoId, aditivoId);
            const res = await getTermosAditivos(contratoId);
            setAditivosMap(prev => ({ ...prev, [contratoId]: res.data }));
            toast.success("Termo aditivo excluído definitivamente.");
        } catch {
            toast.error("Erro ao excluir termo aditivo definitivamente.");
        }
    };

    const handleAbrirEdicaoAditivo = (ad: TermoAditivo, e: React.MouseEvent) => {
        e.stopPropagation();
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
        // Se a descrição salva já não corresponder ao texto automático (ex.: foi digitada à mão
        // antes, ou o registro é anterior a um campo novo como Supressão), trata como manual
        // desde já, para não sobrescrever o que já está gravado.
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

    const handleSalvarEdicaoAditivo = async (contratoId: number, aditivoId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const dados = editandoAditivo[aditivoId];
        const erroValidacao = validarCamposAditivo(dados);
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
            // Recarrega do servidor para obter arquivo_id atualizado
            const res = await getTermosAditivos(contratoId);
            setAditivosMap(prev => ({ ...prev, [contratoId]: res.data }));
            setEditandoAditivo(prev => { const n = { ...prev }; delete n[aditivoId]; return n; });
            setObjetoManualEdicao(prev => { const n = new Set(prev); n.delete(aditivoId); return n; });
            toast.success("Termo aditivo atualizado com sucesso!");
        } catch {
            toast.error("Erro ao atualizar termo aditivo.");
        } finally {
            setSalvandoEdicaoAditivo(prev => { const n = new Set(prev); n.delete(aditivoId); return n; });
        }
    };

    const navigate = useNavigate();

    const handleLogout = React.useCallback(async () => {
        try {
            await logout();
        } catch (error) {
            console.warn("Erro ao fazer logout:", error);
        }
        navigate("/login", { replace: true });
    }, [navigate]);

    React.useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                // Carregar dados básicos sempre necessários
                const promises = [
                    getContratados({ page: 1, per_page: 100 }),
                    getStatus(),
                ];

                // Adicionar busca de usuários apenas para administradores
                if (isAdmin) {
                    promises.push(getUsers({ page: 1, per_page: 100 }));
                }

                const responses = await Promise.all(promises);
                
                // Processar respostas com tipos corretos
                const contratadosResponse = responses[0] as any; // ContratadoApiResponse
                const statusResponse = responses[1] as Status[];

                // Filtrar apenas itens ativos (não excluídos)
                const contratadosArray = contratadosResponse.data || [];
                const statusArray = statusResponse || [];

                setContratados(contratadosArray.filter((item: any) => item.ativo !== false && item.data_exclusao == null));
                setStatusList(statusArray.filter((item: any) => item.ativo !== false && item.data_exclusao == null));

                // Definir usuários apenas se for admin
                if (isAdmin && responses[2]) {
                    const usuariosResponse = responses[2] as any; // UserApiResponse
                    const usuariosArray = usuariosResponse.data || [];
                    setUsuarios(usuariosArray.filter((item: any) => item.ativo !== false && item.data_exclusao == null));
                } else {
                    setUsuarios([]); // Lista vazia para não-admins
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";

                if (errorMessage.includes("401") || errorMessage.includes("não autorizado")) {
                    toast.error("Sessão expirada", {
                        description: "Por favor, faça o login novamente.",
                    });
                    handleLogout();
                    return;
                }

                setError(errorMessage);
                toast.error("Erro ao carregar dados de suporte: " + errorMessage);
                setIsLoading(false); // Finalizar loading em caso de erro
            }
        };
        fetchInitialData();
    }, [handleLogout, isAdmin]);


    React.useEffect(() => {
        const fetchContratos = async () => {
            console.log('🔄 useEffect fetchContratos disparado - columnFilters:', columnFilters);
            setIsLoading(true);
            setError(null);
            try {
                const filters: Record<string, any> = {
                    page: pagination.pageIndex + 1,
                    per_page: pagination.pageSize,
                };

                // Aplicar filtros automáticos baseados no perfil
                // Fiscal: NÃO envia fiscal_id aqui — o backend já isola por perfil
                // usando o usuário autenticado (fiscal_id OR fiscal_substituto_id).
                // Enviar fiscal_id explícito sobrescreveria esse OR e esconderia
                // os contratos onde o usuário é apenas fiscal substituto.
                if (isGestor && user?.id) {
                    filters.gestor_id = user.id;
                    console.log(`🔍 Filtro Gestor aplicado: gestor_id=${user.id}`);
                } else if (isAdmin) {
                    console.log(`🔍 Admin: carregando todos os contratos`);
                }

                columnFilters.forEach((filter) => {
                    if (filter.value) {
                        filters[filter.id] = filter.value;
                    }
                });

                // Aplicar filtros de vencimento
                const vencimentoFilters = [];
                if (columnFilters.find(f => f.id === 'vencimento_30_dias')?.value) {
                    vencimentoFilters.push('30');
                }
                if (columnFilters.find(f => f.id === 'vencimento_60_dias')?.value) {
                    vencimentoFilters.push('60');
                }
                if (columnFilters.find(f => f.id === 'vencimento_90_dias')?.value) {
                    vencimentoFilters.push('90');
                }
                if (vencimentoFilters.length > 0) {
                    filters.vencimento_dias = vencimentoFilters.join(',');
                    console.log('🔍 Filtro de vencimento aplicado:', filters.vencimento_dias);
                } else {
                    console.log('🔍 Nenhum filtro de vencimento ativo');
                }

                // Aplicar filtros de garantia
                if (columnFilters.find(f => f.id === 'tem_garantia')?.value) {
                    filters.tem_garantia = true;
                    console.log('🔍 Filtro tem_garantia aplicado: true');

                    const garantiaPrazoDias = columnFilters.find(f => f.id === 'garantia_prazo_dias')?.value;
                    if (garantiaPrazoDias && garantiaPrazoDias !== 'all') {
                        filters.garantia_prazo_dias = garantiaPrazoDias;
                        console.log('🔍 Filtro garantia_prazo_dias aplicado:', garantiaPrazoDias);
                    }
                } else {
                    console.log('🔍 Nenhum filtro de garantia ativo');
                }

                console.log('📡 Filtros enviados para API:', filters);

                // Aplicar ordenação
                if (sorting.length > 0) {
                    const sort = sorting[0];
                    filters.sort_by = sort.id;
                    filters.sort_order = sort.desc ? 'desc' : 'asc';
                }

                const response = await getContratos(filters);

                // Converter os dados para o tipo ContratoList
                const contratoListData = response.data.map(convertToContratoList);

                setContratos(contratoListData);
                setPaginationMeta({
                    total_items: response.total_items,
                    total_pages: response.total_pages,
                    current_page: response.current_page,
                    per_page: response.per_page,
                });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";

                if (errorMessage.includes("401") || errorMessage.includes("não autorizado")) {
                    toast.error("Sessão expirada", {
                        description: "Por favor, faça o login novamente.",
                    });
                    handleLogout();
                    return;
                }

                setError(errorMessage);
                toast.error("Erro ao carregar contratos: " + errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        // Verificar se os dados básicos estão carregados
        const dadosBasicosCarregados = contratados.length > 0 && statusList.length > 0;
        // Para admins, também aguardar usuários; para outros perfis, não é necessário
        const dadosCompletos = isAdmin ? dadosBasicosCarregados && usuarios.length > 0 : dadosBasicosCarregados;
        
        console.log('🔍 Verificação dados completos:', { dadosCompletos, dadosBasicosCarregados, isAdmin, usuariosLength: usuarios.length });
        
        if (dadosCompletos) {
            fetchContratos();
        } else {
            console.log('⏳ Aguardando dados completos para buscar contratos');
        }
    }, [columnFilters, pagination, sorting, contratados, statusList, usuarios, handleLogout, perfilAtivo, user, isFiscal, isGestor, isAdmin]);

    const handleContratoDeleted = (deletedId: number) => {
        setContratos((current) => current.filter((c) => c.id !== deletedId));
    };

    const table = useReactTable({
        data: contratos,
        columns,
        pageCount: paginationMeta?.total_pages ?? -1,
        state: { sorting, columnFilters, pagination },
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getRowId: (row) => row.id.toString(),
        getCoreRowModel: getCoreRowModel(),
    });


    if (error && !isLoading) {
        return (
            <div className="p-8 text-center text-red-600">
                <strong>Erro ao carregar dados:</strong> {error}
            </div>
        );
    }

    return (
        <div className="flex w-full flex-col justify-start gap-4 p-4">
            <ContratosFilters
                table={table}
                statusList={statusList}
                usuarios={usuarios}
                perfilAtivo={perfilAtivo}
                pageDescription={getPageDescription()}
                searchParams={searchParams}
            />
            <Tabs defaultValue="all" className="w-full">
                <div className="flex items-center justify-between">
                    {getPageTitle() ? (
                        <TabsList>
                            <TabsTrigger value="all">{getPageTitle()}</TabsTrigger>
                        </TabsList>
                    ) : (
                        <div></div>
                    )}
                    {canManageContratos && (
                        <NavLink to="/novocontrato">
                            <Button variant="default" size="sm" className="gap-2">
                                <IconPlus className="h-4 w-4" />
                                <span className="hidden lg:inline">Novo Contrato</span>
                            </Button>
                        </NavLink>
                    )}
                </div>
                <TabsContent value="all" className="relative mt-4 flex flex-col gap-4">
                    {isLoading ? (
                        <div className="flex h-60 items-center justify-center">
                            <div className="text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                                    Carregando contratos...
                                </h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    {isFiscal 
                                        ? "Buscando seus contratos de fiscalização"
                                        : isGestor 
                                        ? "Buscando seus contratos de gestão"
                                        : "Buscando todos os contratos do sistema"
                                    }
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ===== TABELA DE CONTRATOS ===== */}
                            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                                            <TableHead className="w-[110px] text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</TableHead>
                                            <TableHead
                                                className="w-[120px] text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                                                onClick={table.getColumn("nr_contrato")?.getToggleSortingHandler()}
                                            >
                                                <span className="flex items-center gap-1">
                                                    Nº Contrato
                                                    {table.getColumn("nr_contrato")?.getIsSorted() === "asc" ? " ↑" : table.getColumn("nr_contrato")?.getIsSorted() === "desc" ? " ↓" : " ↕"}
                                                </span>
                                            </TableHead>
                                            <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Objeto</TableHead>
                                            <TableHead
                                                className="w-[200px] text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                                                onClick={table.getColumn("contratado_nome")?.getToggleSortingHandler()}
                                            >
                                                <span className="flex items-center gap-1">
                                                    Contratado
                                                    {table.getColumn("contratado_nome")?.getIsSorted() === "asc" ? " ↑" : table.getColumn("contratado_nome")?.getIsSorted() === "desc" ? " ↓" : " ↕"}
                                                </span>
                                            </TableHead>
                                            <TableHead
                                                className="w-[100px] text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                                                onClick={table.getColumn("data_fim")?.getToggleSortingHandler()}
                                            >
                                                <span className="flex items-center gap-1">
                                                    Data Fim
                                                    {table.getColumn("data_fim")?.getIsSorted() === "asc" ? " ↑" : table.getColumn("data_fim")?.getIsSorted() === "desc" ? " ↓" : " ↕"}
                                                </span>
                                            </TableHead>
                                            <TableHead
                                                className="w-[100px] text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                                                onClick={table.getColumn("total_aditivos")?.getToggleSortingHandler()}
                                            >
                                                <span className="flex items-center gap-1">
                                                    Aditivos
                                                    {table.getColumn("total_aditivos")?.getIsSorted() === "asc" ? " ↑" : table.getColumn("total_aditivos")?.getIsSorted() === "desc" ? " ↓" : " ↕"}
                                                </span>
                                            </TableHead>
                                            <TableHead className="w-[80px] text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows?.length ? (
                                            table.getRowModel().rows.map((row) => {
                                                const c = row.original;
                                                const isExpanded = expandedRows.has(c.id);
                                                const isVencido = c.status_nome?.toLowerCase().includes("vencido");
                                                const isAtivo = c.status_nome?.toLowerCase().includes("ativo");

                                                return (
                                                    <React.Fragment key={c.id}>
                                                        <TableRow
                                                            className="cursor-pointer hover:bg-blue-50/40 transition-colors border-b border-gray-100"
                                                            onClick={() => navigate(`/contratos/${c.id}`)}
                                                        >
                                                            {/* Status */}
                                                            <TableCell className="py-3">
                                                                <Badge className={`text-xs font-medium border px-2 py-0.5 ${
                                                                    isVencido ? "bg-red-100 text-red-800 border-red-200" :
                                                                    isAtivo ? "bg-green-100 text-green-800 border-green-200" :
                                                                    "bg-blue-100 text-blue-800 border-blue-200"
                                                                }`}>
                                                                    {isVencido ? <IconExclamationCircle className="w-3 h-3 mr-1 inline" /> :
                                                                     isAtivo ? <IconCircleCheckFilled className="w-3 h-3 mr-1 inline" /> :
                                                                     <IconClockHour4 className="w-3 h-3 mr-1 inline" />}
                                                                    {c.status_nome || "Pendente"}
                                                                </Badge>
                                                            </TableCell>

                                                            {/* Nº Contrato */}
                                                            <TableCell className="py-3">
                                                                <span className="font-semibold text-gray-900 text-sm">{c.nr_contrato}</span>
                                                            </TableCell>

                                                            {/* Objeto */}
                                                            <TableCell className="py-3 max-w-[220px]">
                                                                <span className="text-sm text-gray-700 line-clamp-1 overflow-hidden text-ellipsis" title={c.objeto}>{c.objeto}</span>
                                                            </TableCell>

                                                            {/* Contratado */}
                                                            <TableCell className="py-3">
                                                                <span className="text-sm text-gray-600 truncate block max-w-[195px]" title={c.contratado_nome ?? ""}>
                                                                    {c.contratado_nome || "—"}
                                                                </span>
                                                            </TableCell>

                                                            {/* Data Fim */}
                                                            <TableCell className="py-3">
                                                                <span className={`text-sm font-medium ${isVencido ? "text-red-700" : "text-gray-700"}`}>
                                                                    {formatDate(c.data_fim)}
                                                                </span>
                                                            </TableCell>

                                                            {/* Termos Aditivos — expand */}
                                                            <TableCell className="py-3">
                                                                <button
                                                                    onClick={(e) => toggleExpandRow(c.id, e)}
                                                                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border transition-all ${
                                                                        isExpanded
                                                                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                                                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                                                                    }`}
                                                                >
                                                                    <IconFileText className="w-3.5 h-3.5 shrink-0" />
                                                                    {aditivosLoading.has(c.id) ? (
                                                                        <span className="animate-pulse w-4 text-center">…</span>
                                                                    ) : (
                                                                        <span className={`inline-flex items-center justify-center rounded-full w-5 h-5 text-xs font-bold ${
                                                                            (aditivosMap[c.id]?.length ?? c.total_aditivos) > 0
                                                                                ? "bg-indigo-100 text-indigo-700"
                                                                                : "bg-gray-100 text-gray-500"
                                                                        }`}>
                                                                            {aditivosMap[c.id]?.length ?? c.total_aditivos}
                                                                        </span>
                                                                    )}
                                                                    <IconChevronDown className={`w-3 h-3 transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                                                                </button>
                                                            </TableCell>

                                                            {/* Ações */}
                                                            <TableCell className="py-3 text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <IconDotsVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-44">
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => { e.stopPropagation(); navigate(`/contratos/${c.id}`); }}
                                                                            className="cursor-pointer text-xs gap-2"
                                                                        >
                                                                            <IconSearch className="h-3.5 w-3.5" />
                                                                            Ver Detalhes
                                                                        </DropdownMenuItem>
                                                                        {canManageContratos && !isFiscal && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <CriarPendenciaDialog
                                                                                    contratoId={c.id}
                                                                                    contratoNumero={c.nr_contrato}
                                                                                    onPendenciaCriada={() => {}}
                                                                                >
                                                                                    <DropdownMenuItem
                                                                                        onSelect={(e) => e.preventDefault()}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        className="cursor-pointer text-xs gap-2"
                                                                                    >
                                                                                        <IconPlus className="h-3.5 w-3.5 text-orange-600" />
                                                                                        Criar Pendência
                                                                                    </DropdownMenuItem>
                                                                                </CriarPendenciaDialog>
                                                                                <DropdownMenuSeparator />
                                                                                <AlertDialog>
                                                                                    <AlertDialogTrigger asChild>
                                                                                        <DropdownMenuItem
                                                                                            onSelect={(e) => e.preventDefault()}
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="cursor-pointer text-xs gap-2 text-red-600 focus:text-red-600"
                                                                                        >
                                                                                            <IconX className="h-3.5 w-3.5" />
                                                                                            Excluir Contrato
                                                                                        </DropdownMenuItem>
                                                                                    </AlertDialogTrigger>
                                                                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                                                        <AlertDialogHeader>
                                                                                            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                                                                                            <AlertDialogDescription>
                                                                                                Esta ação excluirá permanentemente o contrato "{c.nr_contrato}".
                                                                                            </AlertDialogDescription>
                                                                                        </AlertDialogHeader>
                                                                                        <AlertDialogFooter>
                                                                                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                                                                            <AlertDialogAction
                                                                                                onClick={async (e) => {
                                                                                                    e.stopPropagation();
                                                                                                    try {
                                                                                                        await deleteContrato(c.id);
                                                                                                        handleContratoDeleted(c.id);
                                                                                                        toast.success("Contrato excluído com sucesso.");
                                                                                                    } catch {
                                                                                                        toast.error("Erro ao excluir contrato.");
                                                                                                    }
                                                                                                }}
                                                                                                className="bg-red-600 hover:bg-red-700"
                                                                                            >
                                                                                                Sim, excluir
                                                                                            </AlertDialogAction>
                                                                                        </AlertDialogFooter>
                                                                                    </AlertDialogContent>
                                                                                </AlertDialog>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* ===== LINHA EXPANSÍVEL — TERMOS ADITIVOS ===== */}
                                                        {isExpanded && (
                                                            <TableRow className="bg-indigo-50/20 hover:bg-indigo-50/20">
                                                                <TableCell colSpan={7} className="py-0">
                                                                    <div className="px-6 py-4 border-l-4 border-indigo-400">
                                                                        {/* Cabeçalho */}
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <IconFileText className="h-4 w-4 text-indigo-600" />
                                                                                <span className="text-sm font-semibold text-indigo-800">
                                                                                    Termos Aditivos — {c.nr_contrato}
                                                                                </span>
                                                                            </div>
                                                                            {canManageAditivos && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="h-7 text-xs gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const abrindo = !mostrarFormAditivo.has(c.id);
                                                                                        setMostrarFormAditivo(prev => {
                                                                                            const n = new Set(prev);
                                                                                            n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                                                                                            return n;
                                                                                        });
                                                                                        if (abrindo) {
                                                                                            setNovoAditivo(prev => ({ ...prev, [c.id]: {} }));
                                                                                            setObjetoManualNovo(prev => { const n = new Set(prev); n.delete(c.id); return n; });
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <IconPlus className="h-3.5 w-3.5" />
                                                                                    Novo Aditivo
                                                                                </Button>
                                                                            )}
                                                                        </div>

                                                                        {/* Formulário inline */}
                                                                        {mostrarFormAditivo.has(c.id) && (
                                                                            <div className="mb-3 p-4 bg-white rounded-md border border-indigo-200 grid grid-cols-2 gap-3 md:grid-cols-4" onClick={e => e.stopPropagation()}>
                                                                                {/* Linha 1 */}
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Termo Aditivo *</label>
                                                                                    <Select
                                                                                        onValueChange={v => {
                                                                                            const tipo = v as TermoAditivoCreate["tipo"];
                                                                                            const curr = novoAditivo[c.id] ?? {};
                                                                                            const manual = objetoManualNovo.has(c.id);
                                                                                            setNovoAditivo(prev => ({
                                                                                                ...prev,
                                                                                                [c.id]: {
                                                                                                    ...prev[c.id],
                                                                                                    tipo,
                                                                                                    objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, tipo })
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                        value={novoAditivo[c.id]?.tipo ?? ""}
                                                                                    >
                                                                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {TIPOS_ADITIVO_OPTIONS.map(({ value, label }) => (
                                                                                                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Data Assinatura *</label>
                                                                                    <Input
                                                                                        type="date"
                                                                                        className="h-8 text-xs"
                                                                                        value={novoAditivo[c.id]?.data_assinatura ?? ""}
                                                                                        onChange={e => {
                                                                                            const data_assinatura = e.target.value;
                                                                                            const curr = novoAditivo[c.id] ?? {};
                                                                                            const manual = objetoManualNovo.has(c.id);
                                                                                            setNovoAditivo(prev => ({
                                                                                                ...prev,
                                                                                                [c.id]: {
                                                                                                    ...prev[c.id],
                                                                                                    data_assinatura,
                                                                                                    objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, data_assinatura })
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">
                                                                                        Data Início{(novoAditivo[c.id]?.tipo === "Misto" || novoAditivo[c.id]?.tipo === "Prazo") ? " *" : ""}
                                                                                    </label>
                                                                                    <Input
                                                                                        type="date"
                                                                                        className="h-8 text-xs"
                                                                                        value={novoAditivo[c.id]?.data_inicio ?? ""}
                                                                                        onChange={e => {
                                                                                            const data_inicio = e.target.value || null;
                                                                                            const curr = novoAditivo[c.id] ?? {};
                                                                                            const manual = objetoManualNovo.has(c.id);
                                                                                            setNovoAditivo(prev => ({
                                                                                                ...prev,
                                                                                                [c.id]: {
                                                                                                    ...prev[c.id],
                                                                                                    data_inicio,
                                                                                                    objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, data_inicio })
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">
                                                                                        Nova Data Fim{(novoAditivo[c.id]?.tipo === "Misto" || novoAditivo[c.id]?.tipo === "Prazo") ? " *" : ""}
                                                                                    </label>
                                                                                    <Input
                                                                                        type="date"
                                                                                        className="h-8 text-xs"
                                                                                        value={novoAditivo[c.id]?.nova_data_fim ?? ""}
                                                                                        onChange={e => {
                                                                                            const nova_data_fim = e.target.value || null;
                                                                                            const curr = novoAditivo[c.id] ?? {};
                                                                                            const manual = objetoManualNovo.has(c.id);
                                                                                            setNovoAditivo(prev => ({
                                                                                                ...prev,
                                                                                                [c.id]: {
                                                                                                    ...prev[c.id],
                                                                                                    nova_data_fim,
                                                                                                    objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, nova_data_fim })
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Valor Acréscimo (R$){(novoAditivo[c.id]?.tipo === "Misto" || novoAditivo[c.id]?.tipo === "Valor") ? " *" : ""}</label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        className="h-8 text-xs"
                                                                                        placeholder="0,00"
                                                                                        value={novoAditivo[c.id]?.valor_acrescimo ?? ""}
                                                                                        onChange={e => {
                                                                                            const valor_acrescimo = e.target.value ? parseFloat(e.target.value) : null;
                                                                                            const curr = novoAditivo[c.id] ?? {};
                                                                                            const tipo = curr.tipo ?? "Valor";
                                                                                            setNovoAditivo(prev => ({
                                                                                                ...prev,
                                                                                                [c.id]: {
                                                                                                    ...prev[c.id],
                                                                                                    tipo,
                                                                                                    valor_acrescimo,
                                                                                                    objeto: gerarDescricaoAditivo({ ...curr, tipo, valor_acrescimo })
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Valor Supressão (R$){(novoAditivo[c.id]?.tipo === "Misto" || novoAditivo[c.id]?.tipo === "Valor") ? " *" : ""}</label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        className="h-8 text-xs"
                                                                                        placeholder="0,00"
                                                                                        value={novoAditivo[c.id]?.valor_supressao ?? ""}
                                                                                        onChange={e => {
                                                                                            const valor_supressao = e.target.value ? parseFloat(e.target.value) : null;
                                                                                            const curr = novoAditivo[c.id] ?? {};
                                                                                            const tipo = curr.tipo ?? "Valor";
                                                                                            setNovoAditivo(prev => ({
                                                                                                ...prev,
                                                                                                [c.id]: {
                                                                                                    ...prev[c.id],
                                                                                                    tipo,
                                                                                                    valor_supressao,
                                                                                                    objeto: gerarDescricaoAditivo({ ...curr, tipo, valor_supressao })
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                {/* Linha 2 */}
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">PAE</label>
                                                                                    <Input
                                                                                        className="h-8 text-xs"
                                                                                        placeholder="Ex: 2025/123456"
                                                                                        value={novoAditivo[c.id]?.pae ?? ""}
                                                                                        onChange={e => setNovoAditivo(prev => ({ ...prev, [c.id]: { ...prev[c.id], pae: e.target.value || null } }))}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Data Publicação</label>
                                                                                    <Input
                                                                                        type="date"
                                                                                        className="h-8 text-xs"
                                                                                        value={novoAditivo[c.id]?.data_publicacao ?? ""}
                                                                                        onChange={e => setNovoAditivo(prev => ({ ...prev, [c.id]: { ...prev[c.id], data_publicacao: e.target.value || null } }))}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Arquivo do Termo Aditivo</label>
                                                                                    <label className="flex items-center gap-2 cursor-pointer h-8 px-2 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                                                                                        <IconFileText className="w-4 h-4 shrink-0" />
                                                                                        <span className="truncate">
                                                                                            {arquivoAditivo[c.id]?.name ?? "Selecionar arquivo (PDF, DOC…)"}
                                                                                        </span>
                                                                                        <input
                                                                                            type="file"
                                                                                            className="hidden"
                                                                                            accept=".pdf,.doc,.docx,.odt,.xls,.xlsx"
                                                                                            onChange={e => {
                                                                                                const f = e.target.files?.[0] ?? null;
                                                                                                setArquivoAditivo(prev => ({ ...prev, [c.id]: f }));
                                                                                            }}
                                                                                        />
                                                                                    </label>
                                                                                </div>
                                                                                <div className="col-span-1 md:col-span-3 flex flex-col gap-1">
                                                                                    <label className="text-xs font-medium text-gray-600">Descrição do Termo Aditivo *</label>
                                                                                    <Input
                                                                                        className="h-8 text-xs"
                                                                                        placeholder="Preenchido automaticamente conforme o tipo..."
                                                                                        value={novoAditivo[c.id]?.objeto ?? ""}
                                                                                        onChange={e => {
                                                                                            setObjetoManualNovo(prev => new Set(prev).add(c.id));
                                                                                            setNovoAditivo(prev => ({ ...prev, [c.id]: { ...prev[c.id], objeto: e.target.value } }));
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                {/* Linha 3 — botões */}
                                                                                <div className="col-span-2 md:col-span-4 flex items-center gap-2 justify-end">
                                                                                    <Button
                                                                                        size="sm"
                                                                                        className="h-8 text-xs px-6 bg-indigo-600 hover:bg-indigo-700"
                                                                                        onClick={(e) => handleSalvarAditivo(c.id, e)}
                                                                                        disabled={salvandoAditivo.has(c.id)}
                                                                                    >
                                                                                        {salvandoAditivo.has(c.id) ? "Salvando..." : "Salvar"}
                                                                                    </Button>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        className="h-8 text-xs"
                                                                                        onClick={(e) => { e.stopPropagation(); setMostrarFormAditivo(prev => { const n = new Set(prev); n.delete(c.id); return n; }); setObjetoManualNovo(prev => { const n = new Set(prev); n.delete(c.id); return n; }); }}
                                                                                    >
                                                                                        Cancelar
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Lista de aditivos */}
                                                                        {aditivosLoading.has(c.id) ? (
                                                                            <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
                                                                                <div className="animate-spin h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
                                                                                Carregando termos aditivos...
                                                                            </div>
                                                                        ) : (aditivosMap[c.id] ?? []).length === 0 ? (
                                                                            <div className="flex items-center gap-3 text-sm text-gray-500 italic py-3 px-4 bg-white rounded-md border border-indigo-100">
                                                                                <IconClockHour4 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                                                                                <span>Nenhum termo aditivo cadastrado para este contrato.</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="rounded-md overflow-hidden border border-indigo-100">
                                                                                <table className="w-full text-xs">
                                                                                    <thead className="bg-indigo-50">
                                                                                        <tr>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-10">Nº</th>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-24">Tipo</th>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700">Descrição</th>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-28">Assinatura</th>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-28">Publicação</th>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-28">Início</th>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-28">Nova Vigência</th>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-32">Acréscimo</th>
                                                                                            <th className="text-left px-3 py-2 font-semibold text-indigo-700 w-32">Supressão</th>
                                                                                            <th className="text-center px-3 py-2 font-semibold text-indigo-700 w-20">Arquivo</th>
                                                                                            {canManageAditivos && <th className="w-8 px-3 py-2" />}
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="bg-white divide-y divide-indigo-50">
                                                                                        {[...(aditivosMap[c.id] ?? [])]
                                                                                            .sort((a, b) => a.numero_aditivo - b.numero_aditivo)
                                                                                            .map((ad, idx) => {
                                                                                            const hoje = new Date(); hoje.setHours(0,0,0,0);
                                                                                            const expiradoFallback = ad.nova_data_fim ? new Date(ad.nova_data_fim + "T00:00:00") < hoje : false;
                                                                                            const inativoFallback = ad.ativo === false;
                                                                                            const inativo = ad.status ? ad.status === "Inativo" : inativoFallback;
                                                                                            const vigente = ad.status ? ad.status === "Ativo" : (!expiradoFallback && !inativoFallback);
                                                                                            const numeroExibido = idx + 1;
                                                                                            return (
                                                                                            <React.Fragment key={ad.id}>
                                                                                            <tr className={vigente ? "hover:bg-indigo-50/30 transition-colors" : "bg-gray-50 transition-colors opacity-70"}>
                                                                                                <td className="px-3 py-2 font-bold text-indigo-700">
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <span>{numeroExibido}º</span>
                                                                                                        {inativo ? (
                                                                                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 uppercase tracking-wide">
                                                                                                                Inativo
                                                                                                            </span>
                                                                                                        ) : vigente ? (
                                                                                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700 uppercase tracking-wide">
                                                                                                                Ativo
                                                                                                            </span>
                                                                                                        ) : (
                                                                                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wide">
                                                                                                                Vencido
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td className="px-3 py-2">
                                                                                                    <Badge className={`text-xs px-1.5 py-0 border ${vigente ? "bg-indigo-100 text-indigo-800 border-indigo-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                                                                                        {ad.tipo}
                                                                                                    </Badge>
                                                                                                </td>
                                                                                                <td className="px-3 py-2 text-gray-700 max-w-[250px] truncate" title={ad.objeto}>{ad.objeto}</td>
                                                                                                <td className="px-3 py-2 text-gray-600">{formatDate(ad.data_assinatura)}</td>
                                                                                                <td className="px-3 py-2 text-gray-600">{ad.data_publicacao ? formatDate(ad.data_publicacao) : "—"}</td>
                                                                                                <td className="px-3 py-2 text-gray-600">{ad.data_inicio ? formatDate(ad.data_inicio) : "—"}</td>
                                                                                                <td className="px-3 py-2 text-gray-600">{ad.nova_data_fim ? formatDate(ad.nova_data_fim) : "—"}</td>
                                                                                                <td className="px-3 py-2 text-gray-600">{ad.valor_acrescimo ? formatCurrency(ad.valor_acrescimo) : "—"}</td>
                                                                                                <td className="px-3 py-2 text-gray-600">{ad.valor_supressao ? formatCurrency(ad.valor_supressao) : "—"}</td>
                                                                                                <td className="px-3 py-2 text-center">
                                                                                                    {ad.arquivo_id ? (
                                                                                                        <button
                                                                                                            onClick={e => handleDownloadAditivo(ad, e)}
                                                                                                            className="text-indigo-500 hover:text-indigo-700 transition-colors"
                                                                                                            title={ad.arquivo_nome ?? "Baixar arquivo"}
                                                                                                        >
                                                                                                            <IconDownload className="h-3.5 w-3.5" />
                                                                                                        </button>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <label
                                                                                                                htmlFor={`upload-aditivo-${ad.id}`}
                                                                                                                className="cursor-pointer inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
                                                                                                                title="Anexar arquivo do termo aditivo"
                                                                                                                onClick={e => e.stopPropagation()}
                                                                                                            >
                                                                                                                <IconUpload className="h-3.5 w-3.5" />
                                                                                                            </label>
                                                                                                            <input
                                                                                                                id={`upload-aditivo-${ad.id}`}
                                                                                                                type="file"
                                                                                                                className="hidden"
                                                                                                                accept=".pdf,.doc,.docx,.odt,.xls,.xlsx"
                                                                                                                onChange={e => {
                                                                                                                    const f = e.target.files?.[0];
                                                                                                                    if (f) handleUploadArquivoAditivo(c.id, ad.id, f);
                                                                                                                    e.target.value = "";
                                                                                                                }}
                                                                                                            />
                                                                                                        </>
                                                                                                    )}
                                                                                                </td>
                                                                                                {canManageAditivos && (
                                                                                                    <td className="px-3 py-2">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <button
                                                                                                                onClick={e => handleAbrirEdicaoAditivo(ad, e)}
                                                                                                                className="text-indigo-400 hover:text-indigo-600 transition-colors"
                                                                                                                title="Editar"
                                                                                                            >
                                                                                                                <IconPencil className="h-3.5 w-3.5" />
                                                                                                            </button>
                                                                                                            {vigente && <AlertDialog>
                                                                                                                <AlertDialogTrigger asChild>
                                                                                                                    <button
                                                                                                                        onClick={e => e.stopPropagation()}
                                                                                                                        className="text-red-400 hover:text-red-600 transition-colors"
                                                                                                                        title="Inativar"
                                                                                                                    >
                                                                                                                        <IconX className="h-3.5 w-3.5" />
                                                                                                                    </button>
                                                                                                                </AlertDialogTrigger>
                                                                                                                <AlertDialogContent onClick={e => e.stopPropagation()}>
                                                                                                                    <AlertDialogHeader>
                                                                                                                        <AlertDialogTitle>Inativar {ad.numero_aditivo}º Aditivo?</AlertDialogTitle>
                                                                                                                        <AlertDialogDescription>O termo aditivo será inativado e permanecerá visível na lista.</AlertDialogDescription>
                                                                                                                    </AlertDialogHeader>
                                                                                                                    <AlertDialogFooter>
                                                                                                                        <AlertDialogCancel onClick={e => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                                                                                                        <AlertDialogAction
                                                                                                                            className="bg-red-600 hover:bg-red-700"
                                                                                                                            onClick={e => handleExcluirAditivo(c.id, ad.id, e)}
                                                                                                                        >
                                                                                                                            Inativar
                                                                                                                        </AlertDialogAction>
                                                                                                                    </AlertDialogFooter>
                                                                                                                </AlertDialogContent>
                                                                                                            </AlertDialog>}
                                                                                                            <AlertDialog>
                                                                                                                <AlertDialogTrigger asChild>
                                                                                                                    <button
                                                                                                                        onClick={e => e.stopPropagation()}
                                                                                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                                                                                        title="Excluir definitivamente"
                                                                                                                    >
                                                                                                                        <IconTrash className="h-3.5 w-3.5" />
                                                                                                                    </button>
                                                                                                                </AlertDialogTrigger>
                                                                                                                <AlertDialogContent onClick={e => e.stopPropagation()}>
                                                                                                                    <AlertDialogHeader>
                                                                                                                        <AlertDialogTitle>Excluir {ad.numero_aditivo}º Aditivo definitivamente?</AlertDialogTitle>
                                                                                                                        <AlertDialogDescription>
                                                                                                                            Essa ação remove o termo aditivo do banco de dados de vez — diferente de "Inativar", não tem como desfazer.
                                                                                                                        </AlertDialogDescription>
                                                                                                                    </AlertDialogHeader>
                                                                                                                    <AlertDialogFooter>
                                                                                                                        <AlertDialogCancel onClick={e => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                                                                                                        <AlertDialogAction
                                                                                                                            className="bg-red-600 hover:bg-red-700"
                                                                                                                            onClick={e => handleExcluirAditivoDefinitivo(c.id, ad.id, e)}
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
                                                                                            {editandoAditivo[ad.id] !== undefined && (
                                                                                                <tr className="bg-indigo-50/40">
                                                                                                    <td colSpan={9} className="px-3 py-3">
                                                                                                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" onClick={e => e.stopPropagation()}>
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">Termo Aditivo *</label>
                                                                                                                <Select
                                                                                                                    onValueChange={v => {
                                                                                                                        const tipo = v as TermoAditivoCreate["tipo"];
                                                                                                                        const curr = editandoAditivo[ad.id] ?? {};
                                                                                                                        const manual = objetoManualEdicao.has(ad.id);
                                                                                                                        setEditandoAditivo(prev => ({
                                                                                                                            ...prev,
                                                                                                                            [ad.id]: {
                                                                                                                                ...prev[ad.id],
                                                                                                                                tipo,
                                                                                                                                objeto: manual ? curr.objeto : gerarDescricaoAditivo({ ...curr, tipo })
                                                                                                                            }
                                                                                                                        }));
                                                                                                                    }}
                                                                                                                    value={editandoAditivo[ad.id]?.tipo ?? ""}
                                                                                                                >
                                                                                                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                                                                    <SelectContent>
                                                                                                                        {TIPOS_ADITIVO_OPTIONS.map(({ value, label }) => (
                                                                                                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                                                                                                        ))}
                                                                                                                    </SelectContent>
                                                                                                                </Select>
                                                                                                            </div>
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
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">
                                                                                                                    Data Início{(editandoAditivo[ad.id]?.tipo === "Misto" || editandoAditivo[ad.id]?.tipo === "Prazo") ? " *" : ""}
                                                                                                                </label>
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
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">
                                                                                                                    Nova Data Fim{(editandoAditivo[ad.id]?.tipo === "Misto" || editandoAditivo[ad.id]?.tipo === "Prazo") ? " *" : ""}
                                                                                                                </label>
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
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">Valor Acréscimo (R$){(editandoAditivo[ad.id]?.tipo === "Misto" || editandoAditivo[ad.id]?.tipo === "Valor") ? " *" : ""}</label>
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
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">Valor Supressão (R$){(editandoAditivo[ad.id]?.tipo === "Misto" || editandoAditivo[ad.id]?.tipo === "Valor") ? " *" : ""}</label>
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
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">PAE</label>
                                                                                                                <Input
                                                                                                                    className="h-8 text-xs"
                                                                                                                    placeholder="Ex: 2025/123456"
                                                                                                                    value={editandoAditivo[ad.id]?.pae ?? ""}
                                                                                                                    onChange={e => setEditandoAditivo(prev => ({ ...prev, [ad.id]: { ...prev[ad.id], pae: e.target.value || null } }))}
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">Data Publicação</label>
                                                                                                                <Input
                                                                                                                    type="date"
                                                                                                                    className="h-8 text-xs"
                                                                                                                    value={editandoAditivo[ad.id]?.data_publicacao ?? ""}
                                                                                                                    onChange={e => setEditandoAditivo(prev => ({ ...prev, [ad.id]: { ...prev[ad.id], data_publicacao: e.target.value || null } }))}
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div className="flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">Arquivo do Termo Aditivo</label>
                                                                                                                <label className="flex items-center gap-2 cursor-pointer h-8 px-2 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                                                                                                                    <IconFileText className="w-4 h-4 shrink-0" />
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
                                                                                                            <div className="col-span-1 md:col-span-3 flex flex-col gap-1">
                                                                                                                <label className="text-xs font-medium text-gray-600">Descrição do Termo Aditivo *</label>
                                                                                                                <Input
                                                                                                                    className="h-8 text-xs"
                                                                                                                    placeholder="Preenchido automaticamente conforme o tipo..."
                                                                                                                    value={editandoAditivo[ad.id]?.objeto ?? ""}
                                                                                                                    onChange={e => {
                                                                                                                        setObjetoManualEdicao(prev => new Set(prev).add(ad.id));
                                                                                                                        setEditandoAditivo(prev => ({ ...prev, [ad.id]: { ...prev[ad.id], objeto: e.target.value } }));
                                                                                                                    }}
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div className="col-span-2 md:col-span-4 flex justify-end gap-2">
                                                                                                                <Button
                                                                                                                    size="sm"
                                                                                                                    variant="outline"
                                                                                                                    className="h-8 text-xs"
                                                                                                                    onClick={e => { e.stopPropagation(); setEditandoAditivo(prev => { const n = { ...prev }; delete n[ad.id]; return n; }); setObjetoManualEdicao(prev => { const n = new Set(prev); n.delete(ad.id); return n; }); }}
                                                                                                                >
                                                                                                                    Cancelar
                                                                                                                </Button>
                                                                                                                <Button
                                                                                                                    size="sm"
                                                                                                                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                                                                                                                    disabled={salvandoEdicaoAditivo.has(ad.id)}
                                                                                                                    onClick={e => handleSalvarEdicaoAditivo(c.id, ad.id, e)}
                                                                                                                >
                                                                                                                    {salvandoEdicaoAditivo.has(ad.id) ? "Salvando..." : "Salvar"}
                                                                                                                </Button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            )}
                                                                                            </React.Fragment>
                                                                                        ); })}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7}>
                                                    <div className="flex h-60 items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                                                <IconExclamationCircle className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                            <h3 className="mt-4 text-lg font-semibold text-gray-900">Nenhum contrato encontrado</h3>
                                                            <p className="mt-2 text-sm text-gray-500">
                                                                {isFiscal ? "Você não possui contratos sob sua fiscalização."
                                                                    : isGestor ? "Você não possui contratos sob sua gestão."
                                                                    : "Não há contratos cadastrados no sistema."}
                                                            </p>
                                                            {!isFiscal && !isGestor && canManageContratos && (
                                                                <div className="mt-4">
                                                                    <NavLink to="/novocontrato">
                                                                        <Button variant="outline" size="sm" className="gap-2">
                                                                            <PlusCircle className="h-4 w-4" />
                                                                            Cadastrar Primeiro Contrato
                                                                        </Button>
                                                                    </NavLink>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
                                    Exibindo {table.getRowModel().rows.length} de{" "}
                                    {paginationMeta?.total_items ?? 0} contrato(s).
                                </div>
                                <div className="flex w-full items-center gap-6 lg:w-fit">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">Itens por página</p>
                                        <Select
                                            value={`${table.getState().pagination.pageSize}`}
                                            onValueChange={(value) => {
                                                table.setPageSize(Number(value));
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[70px]">
                                                <SelectValue
                                                    placeholder={table.getState().pagination.pageSize}
                                                />
                                            </SelectTrigger>
                                            <SelectContent side="top">
                                                {[6, 12, 18, 24].map((pageSize) => (
                                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                                        {pageSize}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                                        Página {table.getState().pagination.pageIndex + 1} de{" "}
                                        {table.getPageCount() || 1}
                                    </div>
                                    <div className="ml-auto flex items-center gap-2 lg:ml-0">
                                        <Button
                                            variant="outline"
                                            className="hidden h-8 w-8 p-0 lg:flex"
                                            onClick={() => table.setPageIndex(0)}
                                            disabled={!table.getCanPreviousPage()}
                                        >
                                            <IconChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                        >
                                            <IconChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-8 w-8 p-0"
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                        >
                                            <IconChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="hidden h-8 w-8 p-0 lg:flex"
                                            onClick={() =>
                                                table.setPageIndex(table.getPageCount() - 1)
                                            }
                                            disabled={!table.getCanNextPage()}
                                        >
                                            <IconChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
