import { useEffect, useState, useCallback } from "react";
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from 'react-hook-form';

// --- Imports de UI ---
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, LoaderCircle, CirclePlus, Pencil, X, ChevronLeft, ChevronRight } from "lucide-react";

// --- Imports da nossa API centralizada ---
import {
    getContratados,
    getContratadoById,
    createContratado,
    updateContratado,
    deleteContratado,
    type Contratado,
    type NewContratadoPayload,
    type EditContratadoPayload
} from "@/lib/api";


//================================================================================
// SECTION: VALIDAÇÃO E MÁSCARAS
//================================================================================

// Funções de validação (mantidas)
function validateCPF(cpf: string): boolean { 
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf.substring(10, 11));
}
function validateCNPJ(cnpj: string): boolean { 
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    const digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
}

// Schema Zod para o formulário
const contratadoSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("E-mail inválido").optional().or(z.literal("")),
    telefone: z.string().optional(),
    cpf: z.string().transform(v => v.replace(/\D/g, '')).optional().refine(v => !v || v.length === 11, "CPF deve ter 11 números").refine(v => !v || validateCPF(v), "CPF inválido"),
    cnpj: z.string().transform(v => v.replace(/\D/g, '')).optional().refine(v => !v || v.length === 14, "CNPJ deve ter 14 números").refine(v => !v || validateCNPJ(v), "CNPJ inválido"),
});
type ContratadoForm = z.infer<typeof contratadoSchema>;

// Funções de máscara (mantidas)
const applyMask = (value: string = '', mask: (v: string) => string) => mask(value);
const cpfMask = (value: string) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const cnpjMask = (value: string) => value.replace(/\D/g, '').slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
const phoneMask = (value: string) => value.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');


//================================================================================
// SECTION: COMPONENTES FILHOS (REFATORADOS)
//================================================================================

// --- Componente de Edição ---
function EditarContratado({ contratado, onContratadoUpdated }: { contratado: { id: number }, onContratadoUpdated: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [originalData, setOriginalData] = useState<Contratado | null>(null);
    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<ContratadoForm>({
        resolver: zodResolver(contratadoSchema),
    });

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                try {
                    const data = await getContratadoById(contratado.id);
                    setOriginalData(data);
                    reset({ nome: data.nome, email: data.email, cpf: data.cpf || "", cnpj: data.cnpj || "", telefone: data.telefone || "" });
                } catch (error: any) {
                    toast.error(error.message || "Não foi possível carregar dados.");
                    setIsOpen(false);
                }
            };
            loadData();
        }
    }, [isOpen, contratado.id, reset]);

    async function handleUpdate(formData: ContratadoForm) {
        if (!originalData) return;

        const payload: EditContratadoPayload = {};
        
        // Compara e adiciona apenas campos alterados
        if (formData.nome !== originalData.nome) payload.nome = formData.nome;
        if (formData.email !== originalData.email) payload.email = formData.email;
        if (formData.telefone?.replace(/\D/g, '') !== (originalData.telefone || "").replace(/\D/g, '')) payload.telefone = formData.telefone?.replace(/\D/g, '') || null;
        if (formData.cpf?.replace(/\D/g, '') !== (originalData.cpf || "").replace(/\D/g, '')) payload.cpf = formData.cpf?.replace(/\D/g, '') || null;
        if (formData.cnpj?.replace(/\D/g, '') !== (originalData.cnpj || "").replace(/\D/g, '')) payload.cnpj = formData.cnpj?.replace(/\D/g, '') || null;

        
        if (Object.keys(payload).length === 0) {
            toast.info("Nenhuma alteração foi feita.");
            setIsOpen(false);
            return;
        }

        try {
            await updateContratado(contratado.id, payload);
            toast.success('Contratado atualizado com sucesso!');
            setIsOpen(false);
            onContratadoUpdated();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar.');
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="p-2 rounded-lg">
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit(handleUpdate)}>
                    <DialogHeader>
                        <DialogTitle>Editar Contratado</DialogTitle>
                        <DialogDescription>Altere apenas os campos necessários.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nome" className="text-right">Nome</Label>
                            <div className="col-span-3">
                                <Input id="nome" {...register('nome')} />
                                {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">E-mail</Label>
                            <div className="col-span-3">
                                <Input id="email" type="email" {...register('email')} />
                                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cpf" className="text-right">CPF</Label>
                            <div className="col-span-3">
                                <Controller name="cpf" control={control} render={({ field }) => ( <Input id="cpf" value={applyMask(field.value || '', cpfMask)} onChange={field.onChange} /> )} />
                                {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cnpj" className="text-right">CNPJ</Label>
                            <div className="col-span-3">
                                <Controller name="cnpj" control={control} render={({ field }) => ( <Input id="cnpj" value={applyMask(field.value || '', cnpjMask)} onChange={field.onChange} /> )} />
                                {errors.cnpj && <p className="text-red-500 text-sm mt-1">{errors.cnpj.message}</p>}
                            </div>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="telefone" className="text-right">Telefone</Label>
                            <div className="col-span-3">
                                <Controller name="telefone" control={control} render={({ field }) => ( <Input id="telefone" value={applyMask(field.value || '', phoneMask)} onChange={field.onChange} /> )} />
                                {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone.message}</p>}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button disabled={isSubmitting} type="submit">
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


// --- Componente de Criação ---
function NovoContratado({ onContratadoAdded }: { onContratadoAdded: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset } = useForm<ContratadoForm>({
        resolver: zodResolver(contratadoSchema),
    });

    async function handleCreate(data: ContratadoForm) {
        try {
            const payload: NewContratadoPayload = {
                ...data,
                email: data.email || null,
                cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
                cnpj: data.cnpj ? data.cnpj.replace(/\D/g, '') : null,
                telefone: data.telefone ? data.telefone.replace(/\D/g, '') : null,
            };
            await createContratado(payload);
            toast.success('Contratado cadastrado com sucesso.');
            setIsOpen(false);
            reset();
            onContratadoAdded();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao cadastrar.');
        }
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="default">
                    <CirclePlus className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Novo Contratado</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit(handleCreate)}>
                    <DialogHeader>
                        <DialogTitle>Novo Contratado</DialogTitle>
                        <DialogDescription>
                            Preencha os campos para cadastrar uma nova empresa ou pessoa.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nome" className="text-right">Nome</Label>
                            <div className="col-span-3"><Input id="nome" {...register('nome')} />{errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">E-mail</Label>
                            <div className="col-span-3"><Input id="email" placeholder="Opcional" {...register('email')} />{errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cpf" className="text-right">CPF</Label>
                            <div className="col-span-3"><Controller name="cpf" control={control} render={({ field }) => (<Input id="cpf" {...field} onChange={e => field.onChange(applyMask(e.target.value, cpfMask))} placeholder="Opcional" />)} />{errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cnpj" className="text-right">CNPJ</Label>
                            <div className="col-span-3"><Controller name="cnpj" control={control} render={({ field }) => (<Input id="cnpj" {...field} onChange={e => field.onChange(applyMask(e.target.value, cnpjMask))} placeholder="Opcional" />)} />{errors.cnpj && <p className="text-red-500 text-sm mt-1">{errors.cnpj.message}</p>}</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="telefone" className="text-right">Telefone</Label>
                            <div className="col-span-3"><Controller name="telefone" control={control} render={({ field }) => (<Input id="telefone" {...field} onChange={e => field.onChange(applyMask(e.target.value, phoneMask))} placeholder="Opcional" />)} />{errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone.message}</p>}</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button disabled={isSubmitting} type="submit">
                            {isSubmitting ? 'Salvando...' : 'Salvar Contratado'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Componente de Exclusão ---
function ExcluirContratadoDialog({ contratado, onContratadoDeleted }: { contratado: Contratado, onContratadoDeleted: () => void }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteContratado(contratado.id);
            toast.success(`Contratado "${contratado.nome}" excluído.`);
            onContratadoDeleted();
        } catch (error: any) {
            toast.error(error.message, { description: 'Verifique se ele não possui contratos vinculados.', duration: 8000 });
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="p-2 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação irá excluir o contratado <span className="font-bold">{contratado.nome}</span>. Deseja continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                        {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Card para Mobile ---
function ContratadoMobileCard({ contratado, onContratadoUpdated, onContratadoDeleted }: { contratado: Contratado, onContratadoUpdated: () => void, onContratadoDeleted: () => void }) {
    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{contratado.nome}</CardTitle>
                        <CardDescription className="text-sm lowercase truncate">{contratado.email}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2 text-xs">
                        {contratado.cpf ? 'CPF' : contratado.cnpj ? 'CNPJ' : 'Contato'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {contratado.cpf && (
                    <div className="text-sm text-muted-foreground">
                        <strong>CPF:</strong> {cpfMask(contratado.cpf)}
                    </div>
                )}
                {contratado.cnpj && (
                    <div className="text-sm text-muted-foreground">
                        <strong>CNPJ:</strong> {cnpjMask(contratado.cnpj)}
                    </div>
                )}
                {contratado.telefone && (
                    <div className="text-sm text-muted-foreground">
                        <strong>Telefone:</strong> {phoneMask(contratado.telefone)}
                    </div>
                )}
                <div className="flex gap-2 pt-3">
                    <EditarContratado contratado={contratado} onContratadoUpdated={onContratadoUpdated} />
                    <ExcluirContratadoDialog contratado={contratado} onContratadoDeleted={onContratadoDeleted} />
                </div>
            </CardContent>
        </Card>
    );
}


//================================================================================
// SECTION: COMPONENTE PRINCIPAL (REFATORADO)
//================================================================================
export default function Contratados() {
    const [contratados, setContratados] = useState<Contratado[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [perPage, setPerPage] = useState(10);

    const fetchContratados = useCallback(async (page = 1, limit = 10, search = "") => {
        setLoading(true);
        try {
            const result = await getContratados({ page, per_page: limit, nome: search });
            setContratados(result.data);
            setTotalPages(result.total_pages);
            setCurrentPage(result.current_page);
            setTotalItems(result.total_items);
            setPerPage(result.per_page);
        } catch (error: any) {
            toast.error(error.message || "Não foi possível carregar contratados.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContratados(1, 10, ""); // Carga Inicial
    }, [fetchContratados]);

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchContratados(1, perPage, searchTerm);
    };
    
    const handleClearFilter = () => {
        setSearchTerm("");
        setCurrentPage(1);
        fetchContratados(1, perPage, "");
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            fetchContratados(newPage, perPage, searchTerm);
        }
    };

    const refreshCurrentPage = () => {
        fetchContratados(currentPage, perPage, searchTerm);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoaderCircle className="w-8 h-8 animate-spin text-gray-500" />
                <p className="ml-2 text-gray-600">Carregando contratados...</p>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto p-6">
            <div className="flex items-center justify-between py-4 gap-4">
                <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center flex-grow">
                    <Input
                        placeholder="Filtrar por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                    <Button type="submit">Buscar</Button>
                    {searchTerm && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleClearFilter}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </form>
                <NovoContratado onContratadoAdded={refreshCurrentPage} />
            </div>

            {contratados.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-300">Nenhum contratado encontrado.</p>
                </div>
            ) : (
                <>
                    {/* DataTable para telas maiores */}
                    <div className="hidden md:block">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-semibold">Nome</TableHead>
                                        <TableHead className="font-semibold">E-mail</TableHead>
                                        <TableHead className="font-semibold hidden lg:table-cell">CPF</TableHead>
                                        <TableHead className="font-semibold hidden xl:table-cell">CNPJ</TableHead>
                                        <TableHead className="font-semibold hidden 2xl:table-cell">Telefone</TableHead>
                                        <TableHead className="font-semibold text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contratados.map((contratado, index) => (
                                        <TableRow 
                                            key={contratado.id}
                                            className={`hover:bg-muted/50 transition-colors ${
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                            } dark:${index % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/50'}`}
                                        >
                                            <TableCell className="font-medium truncate max-w-[200px]">
                                                {contratado.nome}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground lowercase truncate max-w-[200px]">
                                                {contratado.email}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                                                {contratado.cpf ? cpfMask(contratado.cpf) : '-'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm hidden xl:table-cell">
                                                {contratado.cnpj ? cnpjMask(contratado.cnpj) : '-'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm hidden 2xl:table-cell">
                                                {contratado.telefone ? phoneMask(contratado.telefone) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <EditarContratado 
                                                        contratado={contratado} 
                                                        onContratadoUpdated={refreshCurrentPage} 
                                                    />
                                                    <ExcluirContratadoDialog 
                                                        contratado={contratado} 
                                                        onContratadoDeleted={refreshCurrentPage} 
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Cards para telas menores */}
                    <div className="md:hidden space-y-4">
                        {contratados.map((contratado) => (
                            <ContratadoMobileCard
                                key={contratado.id}
                                contratado={contratado}
                                onContratadoUpdated={refreshCurrentPage}
                                onContratadoDeleted={refreshCurrentPage}
                            />
                        ))}
                    </div>

                    {/* --- CONTROLES DE PAGINAÇÃO --- */}
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="text-sm text-muted-foreground">
                            Total de {totalItems} contratado(s).
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                                Página {currentPage} de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                            >
                                Próxima
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

