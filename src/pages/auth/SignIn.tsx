import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { forgotPassword } from "@/lib/api";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Componentes
import { ProfileSelectionModal } from "@/components/ProfileSelectionModal";

// Ícones e Logo
import { LockKeyhole, User, AlertCircle, Mail, Send } from "lucide-react";
import logo from "@/assets/logo.svg";

// Schema simplificado, sem o campo de perfil
const signInFormSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Schema para o formulário de esqueceu a senha
const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type SignInForm = z.infer<typeof signInFormSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const { user, login, loading: authLoading, perfisDisponiveis } = useAuth();
  const [error, setError] = useState("");
  const [showProfileSelection, setShowProfileSelection] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Estados para reset de senha
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInFormSchema),
  });

  // Form para reset de senha
  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: errorsForgot, isSubmitting: isSubmittingForgot },
    reset: resetForgotForm,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // Redireciona se o usuário já estiver logado e não precisa selecionar perfil
  useEffect(() => {
    if (!authLoading && user && user.id && !showProfileSelection) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, navigate, showProfileSelection, redirectTo]);

  // Verifica se precisa mostrar seleção de perfil após login bem-sucedido
  useEffect(() => {
    if (loginSuccess && user && perfisDisponiveis.length > 1) {
      setShowProfileSelection(true);
    } else if (loginSuccess && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [loginSuccess, user, perfisDisponiveis, navigate, redirectTo]);

  // Função para lidar com o submit do formulário, agora sem o perfil
  const onSubmit = async ({ email, password }: SignInForm) => {
    setError("");
    setLoginSuccess(false);
    try {
      // Chama a função 'login' do seu AuthContext com apenas email e senha
      await login(email, password);
      setLoginSuccess(true);
      // O redirecionamento ou seleção de perfil ocorre nos useEffects acima
    } catch (err: any) {
      console.error("Erro no login:", err);
      setError(err.message || "E-mail ou senha inválidos. Tente novamente.");
      setLoginSuccess(false);
    }
  };

  // Função chamada quando um perfil é selecionado
  const handleProfileSelected = () => {
    setShowProfileSelection(false);
    navigate(redirectTo, { replace: true });
  };

  // Função para abrir modal de esqueceu a senha
  const handleForgotPasswordClick = () => {
    setError("");
    setForgotPasswordSent(false);
    setShowForgotPasswordModal(true);
  };

  // Função para fechar modal de esqueceu a senha
  const handleCloseForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordSent(false);
    resetForgotForm();
  };

  // Função para enviar solicitação de reset de senha
  const onSubmitForgotPassword = async ({ email }: ForgotPasswordForm) => {
    try {
      const response = await forgotPassword({ email });
      if (response.success) {
        setForgotPasswordSent(true);
        toast.success(response.message);
      }
    } catch (err: any) {
      console.error("Erro ao solicitar reset de senha:", err);
      toast.error(err.message || "Erro ao solicitar reset de senha. Tente novamente.");
    }
  };

  // Tela de loading inicial - agora dentro do layout
  if (authLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <div className="text-center space-y-3">
            <p className="text-xl font-semibold text-gray-700 animate-pulse">Verificando autenticação</p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <p className="text-sm text-gray-500">Aguarde um momento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fadeIn">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-20 animate-pulse"></div>
          <img 
            src={logo} 
            alt="Logo PGE-PA" 
            className="relative mx-auto h-16 w-16 drop-shadow-lg transform hover:scale-105 transition-transform duration-300" 
          />
        </div>
        <h1 className="mt-6 text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
          Bem-vindo
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-semibold text-blue-700">Sistema de Gestão de Contratos</span>
        </p>
        <div className="mt-4 h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Campo Email */}
        <div className="group">
          <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-2 block">
            Email
          </Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-600" />
            <Input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              className="pl-12 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50/50 hover:bg-white"
              {...register("email")}
              disabled={isSubmitting}
            />
          </div>
          {errors.email && (
            <p className="mt-2 text-sm text-red-600 flex items-center animate-slideIn">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Campo Senha */}
        <div className="group">
          <Label htmlFor="password" className="text-sm font-semibold text-gray-700 mb-2 block">
            Senha
          </Label>
          <div className="relative">
            <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-600" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-12 h-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 bg-gray-50/50 hover:bg-white"
              {...register("password")}
              disabled={isSubmitting}
            />
          </div>
          {errors.password && (
            <p className="mt-2 text-sm text-red-600 flex items-center animate-slideIn">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Exibição de erro */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50/50 animate-slideIn">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-700 font-medium">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Link Esqueceu a senha */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
            disabled={isSubmitting}
          >
            Esqueceu a senha?
          </button>
        </div>

        {/* Botão de submit */}
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-white/30 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-5 h-5 border-2 border-transparent border-t-white rounded-full animate-spin"></div>
                </div>
                <span className="ml-3">Entrando...</span>
              </div>
            ) : (
              <span className="flex items-center justify-center">
                Entrar
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Modal de Seleção de Perfil */}
      <ProfileSelectionModal
        open={showProfileSelection}
        onProfileSelected={handleProfileSelected}
      />

      {/* Modal de Esqueceu a Senha */}
      <Dialog open={showForgotPasswordModal} onOpenChange={handleCloseForgotPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-900">
              <Mail className="h-5 w-5" />
              Recuperar Senha
            </DialogTitle>
          </DialogHeader>

          {!forgotPasswordSent ? (
            <form onSubmit={handleSubmitForgot(onSubmitForgotPassword)} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email" className="text-sm font-semibold text-gray-700 mb-2 block">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    {...registerForgot("email")}
                    disabled={isSubmittingForgot}
                  />
                </div>
                {errorsForgot.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errorsForgot.email.message}
                  </p>
                )}
              </div>

              <p className="text-sm text-gray-600">
                Digite seu e-mail para verificar se está cadastrado no sistema. O administrador será notificado para auxiliar na recuperação de sua senha.
              </p>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForgotPasswordModal}
                  className="flex-1"
                  disabled={isSubmittingForgot}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmittingForgot}
                >
                  {isSubmittingForgot ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white/30 rounded-full animate-spin mr-2"></div>
                      Enviando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </div>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Solicitação Registrada!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Sua solicitação foi registrada. Entre em contato com o administrador do sistema para obter uma nova senha temporária.
              </p>
              <Button
                onClick={handleCloseForgotPasswordModal}
                className="bg-green-600 hover:bg-green-700"
              >
                Entendi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
          .animate-slideIn { animation: slideIn 0.3s ease-out; }
        `
      }} />
    </div>
  );
}