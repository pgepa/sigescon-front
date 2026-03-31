import { useEffect, useState } from 'react';
import { Button } from "../../components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { UserRoundPen } from 'lucide-react';

// --- Importa as funções e tipos da API central ---
import { 
    getUserById, 
    updateUser, 
    type UserDetail,
    type EditUserPayload
} from '../../lib/api';

// --- Funções auxiliares e Schemas (mantidos como estavam) ---
function validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0, remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder >= 10) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder >= 10) remainder = 0;
    return remainder === parseInt(cpf.substring(10, 11));
}
const cpfMask = (value: string = '') =>
    value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const editUserFormSchema = z.object({
    nome: z.string().min(1, "O nome não pode ficar em branco").transform((val) => val.trim().toUpperCase()).optional(),
    email: z.string().email("Formato de e-mail inválido").optional(),
    perfil_id: z.string().optional(),
    senha: z.union([
        z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
        z.literal("")
    ]).optional(),
    cpf: z.string().transform((val) => val.replace(/\D/g, ''))
        .refine((val) => val.length === 11, { message: "CPF deve conter 11 dígitos" })
        .refine((val) => validateCPF(val), { message: "CPF inválido" })
        .optional(),
    matricula: z.string().optional(),
});
type EditUserForm = z.infer<typeof editUserFormSchema>;

interface UserEditarProps {
    user: { id: number };
    onUserUpdated: () => void;
}

export function UserEditar({ user, onUserUpdated }: UserEditarProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
   
    const [originalUserData, setOriginalUserData] = useState<UserDetail | null>(null);

    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<EditUserForm>({
        resolver: zodResolver(editUserFormSchema),
    });

    // Efeito para carregar os dados da API quando o modal abrir
    useEffect(() => {
        if (!isDialogOpen) return;

        const loadDataForEdit = async () => {
            try {
                // Busca perfis e dados do usuário em paralelo
                const [userData] = await Promise.all([
                    
                    getUserById(user.id)
                ]);

            
                setOriginalUserData(userData); // Armazena os dados originais completos

            } catch (error: any) {
                console.error("Erro ao carregar dados:", error);
                toast.error(error.message || "Não foi possível carregar os dados do usuário.");
                setIsDialogOpen(false); // Fecha o modal em caso de erro
            }
        };

        loadDataForEdit();
    }, [isDialogOpen, user.id]);

    // Efeito para popular o formulário APÓS os dados serem carregados
    useEffect(() => {
        if (originalUserData) {
            reset({
                nome: originalUserData.nome ?? "",
                email: originalUserData.email ?? "",
                cpf: originalUserData.cpf ?? "",
                matricula: originalUserData.matricula ?? "",
                perfil_id: String(originalUserData.perfil_id ?? ""),
                senha: "",
            });
        }
    }, [originalUserData, reset]);


    // Lida com a submissão do formulário de atualização
    async function handleUpdate(data: EditUserForm) {
        if (!originalUserData) return; // Proteção extra

        const changedFields: EditUserPayload = {};

        // Compara os dados do formulário com os originais para enviar apenas o que mudou.
        if (data.nome !== undefined && data.nome !== originalUserData.nome) changedFields.nome = data.nome.trim().toUpperCase();
        if (data.email !== undefined && data.email !== originalUserData.email) changedFields.email = data.email;
        if (data.cpf !== undefined && data.cpf !== originalUserData.cpf) changedFields.cpf = data.cpf;
        if (data.matricula !== undefined && data.matricula !== (originalUserData.matricula ?? "")) changedFields.matricula = data.matricula;
        if (data.perfil_id !== undefined && data.perfil_id !== String(originalUserData.perfil_id)) {
            changedFields.perfil_id = parseInt(data.perfil_id, 10);
        }
        if (data.senha && data.senha.trim() !== "") {
            changedFields.senha = data.senha;
        }

        if (Object.keys(changedFields).length === 0) {
            toast.info("Nenhuma alteração foi feita.");
            setIsDialogOpen(false);
            return;
        }

        try {
            await updateUser(user.id, changedFields);
            toast.success('Usuário atualizado com sucesso!');
            setIsDialogOpen(false);
            onUserUpdated();
        } catch (error: any) {
            console.error('Erro ao atualizar usuário:', error);
            toast.error(error.message || 'Erro ao atualizar usuário.');
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="p-2 h-8 w-8">
                    <UserRoundPen className="h-4 w-4 text-indigo-700" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <form onSubmit={handleSubmit(handleUpdate)}>
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>
                            Altere apenas os campos necessários. Clique em salvar para confirmar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Nome */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="nome" className="text-right">Nome</Label>
                            <div className="col-span-3">
                                <Input
                                    id="nome"
                                    {...register('nome', {
                                        onChange: (e) => {
                                            e.target.value = e.target.value.toUpperCase();
                                        },
                                    })}
                                />
                                {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>}
                            </div>
                        </div>
                        {/* Email */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">E-mail</Label>
                            <div className="col-span-3">
                                <Input id="email" type="email" {...register('email')} />
                                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                            </div>
                        </div>
                        {/* CPF */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cpf" className="text-right">CPF</Label>
                            <div className="col-span-3">
                                <Controller
                                    name="cpf"
                                    control={control}
                                    render={({ field }) => (
                                        <Input
                                            id="cpf"
                                            value={cpfMask(field.value)}
                                            onChange={(e) => {
                                                const unmasked = e.target.value.replace(/\D/g, '');
                                                if (unmasked.length <= 11) field.onChange(unmasked);
                                            }}
                                            maxLength={14}
                                        />
                                    )}
                                />
                                {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>}
                            </div>
                        </div>
                        {/* Matrícula */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="matricula" className="text-right">Matrícula</Label>
                            <div className="col-span-3">
                                <Input id="matricula" {...register('matricula')} />
                            </div>
                        </div>
                      
                        {/* Senha opcional */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="senha" className="text-right">Nova Senha</Label>
                            <div className="col-span-3">
                                <Input
                                    id="senha"
                                    type="password"
                                    placeholder="Deixe em branco para não alterar"
                                    {...register('senha')}
                                />
                                {errors.senha && <p className="text-red-500 text-sm mt-1">{errors.senha.message}</p>}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button disabled={isSubmitting} type="submit">
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

