import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { CirclePlus, Users, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createUserWithoutProfile, type CreateUserPayload } from '@/lib/api';

// Função para validar dígitos verificadores do CPF
function validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) {
        remainder = 0;
    }
    if (remainder !== parseInt(cpf.substring(9, 10))) {
        return false;
    }
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) {
        remainder = 0;
    }
    if (remainder !== parseInt(cpf.substring(10, 11))) {
        return false;
    }
    return true;
}

const cpfMask = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

// Schema simplificado sem perfis
const signUpForm = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    email: z.string().email("E-mail inválido"),
    senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    cpf: z
        .string()
        .transform((val) => val.replace(/\D/g, ''))
        .refine((val) => val.length === 0 || val.length === 11, {
            message: "CPF deve conter 11 números"
        })
        .refine((val) => val.length === 0 || validateCPF(val), {
            message: "CPF inválido"
        }),
    matricula: z.string().optional(),
});

type SignUpForm = z.infer<typeof signUpForm>;

interface CadastrarUsuarioSimplesProps {
    onUsuarioCriado?: (usuario: any) => void;
}

export function CadastrarUsuarioSimples({ onUsuarioCriado }: CadastrarUsuarioSimplesProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<SignUpForm>({
        resolver: zodResolver(signUpForm),
    });

    async function handleSignUp(data: SignUpForm) {
        try {
            console.log('🚀 Iniciando cadastro de usuário simples...');
            console.log('📋 Dados do formulário:', data);

            // Criar usuário básico sem perfil (conforme API)
            const usuarioPayload: CreateUserPayload = {
                nome: data.nome,
                email: data.email,
                senha: data.senha,
                cpf: data.cpf ? data.cpf.replace(/\D/g, '') : '',
                matricula: data.matricula || '',
            };

            console.log('👤 Criando usuário básico:', usuarioPayload);
            const novoUsuario = await createUserWithoutProfile(usuarioPayload);
            console.log('✅ Usuário criado com sucesso:', novoUsuario);

            toast.success('Usuário cadastrado com sucesso! Agora conceda os perfis de acesso.');
            reset();
            setIsDialogOpen(false);
            
            if (onUsuarioCriado) {
                onUsuarioCriado(novoUsuario);
            }

        } catch (error: any) {
            console.error('❌ Erro ao cadastrar usuário:', error);
            
            if (error.message?.includes('email')) {
                toast.error('Este e-mail já está em uso por outro usuário.');
            } else if (error.message?.includes('cpf')) {
                toast.error('Este CPF já está em uso por outro usuário.');
            } else {
                toast.error('Erro ao cadastrar usuário. Verifique os dados e tente novamente.');
            }
        }
    }

    const resetForm = () => {
        reset();
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
                resetForm();
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="default" onClick={() => setIsDialogOpen(true)}>
                    <CirclePlus className="h-4 w-4" />
                    <span className="hidden lg:inline ml-2">Novo Usuário</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit(handleSignUp)}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Cadastrar Novo Usuário
                        </DialogTitle>
                        <DialogDescription>
                            Cadastre um novo usuário no sistema. Os perfis de acesso devem ser concedidos após a criação.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        {/* Alerta sobre perfis */}
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Importante:</strong> Após criar o usuário, use o botão "Perfis" para conceder os acessos necessários. 
                                Usuários sem perfis não conseguem fazer login no sistema.
                            </AlertDescription>
                        </Alert>

                        {/* Dados Pessoais */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Dados do Usuário</CardTitle>
                                <CardDescription>Informações básicas para cadastro</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="nome">Nome *</Label>
                                        <Input id="nome" {...register('nome')} />
                                        {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="email">E-mail *</Label>
                                        <Input id="email" type="email" {...register('email')} />
                                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="cpf">CPF</Label>
                                        <Controller
                                            name="cpf"
                                            control={control}
                                            defaultValue=""
                                            render={({ field }) => (
                                                <Input
                                                    id="cpf"
                                                    value={cpfMask(field.value)}
                                                    onChange={(e) => {
                                                        const unmasked = e.target.value.replace(/\D/g, '');
                                                        if (unmasked.length <= 11) {
                                                            field.onChange(unmasked);
                                                        }
                                                    }}
                                                    maxLength={14}
                                                    placeholder="Opcional"
                                                />
                                            )}
                                        />
                                        {errors.cpf && <p className="text-red-500 text-sm mt-1">{errors.cpf.message}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="matricula">Matrícula</Label>
                                        <Input id="matricula" {...register('matricula')} placeholder="Opcional" />
                                        {errors.matricula && <p className="text-red-500 text-sm mt-1">{errors.matricula.message}</p>}
                                    </div>
                                </div>
                                
                                <div>
                                    <Label htmlFor="senha">Senha *</Label>
                                    <Input id="senha" type="password" {...register('senha')} placeholder="Mínimo 6 caracteres" />
                                    {errors.senha && <p className="text-red-500 text-sm mt-1">{errors.senha.message}</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={resetForm}>
                            Cancelar
                        </Button>
                        <Button 
                            disabled={isSubmitting} 
                            type="submit"
                        >
                            {isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
