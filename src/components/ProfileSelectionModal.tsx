import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { redirectToProfileDashboard } from "@/utils/profileRedirect";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconUserCheck, IconChevronRight } from "@tabler/icons-react";

interface ProfileSelectionModalProps {
  open: boolean;
  onProfileSelected: () => void;
}

export function ProfileSelectionModal({ open, onProfileSelected }: ProfileSelectionModalProps) {
  const { perfisDisponiveis, alternarPerfil } = useAuth();
  const navigate = useNavigate();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);

  const handleProfileSelect = async (perfilId: number) => {
    if (isSelecting) return;

    // Encontra o perfil selecionado
    const perfilSelecionado = perfisDisponiveis.find(p => p.id === perfilId);
    if (!perfilSelecionado) return;

    setSelectedProfileId(perfilId);
    setIsSelecting(true);

    try {
      // Função de redirecionamento baseada no perfil
      const redirectToDashboard = () => {
        redirectToProfileDashboard(perfilSelecionado.nome, navigate);
      };

      await alternarPerfil(perfilId, redirectToDashboard);
      toast.success("Perfil selecionado com sucesso!");
      onProfileSelected();
    } catch (error: any) {
      console.error("Erro ao selecionar perfil:", error);
      toast.error("Erro ao selecionar perfil. Tente novamente.");
      setSelectedProfileId(null);
    } finally {
      setIsSelecting(false);
    }
  };

  const getProfileColor = (perfil: string) => {
    switch (perfil) {
      case "Administrador":
        return "bg-red-100 text-red-800 border-red-200";
      case "Gestor":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Fiscal":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getProfileDescription = (perfil: string) => {
    switch (perfil) {
      case "Administrador":
        return "Acesso completo ao sistema, gerenciamento de usuários e configurações.";
      case "Gestor":
        return "Gestão de contratos e acompanhamento da equipe de fiscalização.";
      case "Fiscal":
        return "Fiscalização de contratos e envio de relatórios.";
      default:
        return "Acesso limitado conforme perfil.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Seleção de Perfil</DialogTitle>
          <DialogDescription className="text-center">
            Você possui múltiplos perfis no sistema. Selecione o perfil com o qual deseja acessar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {perfisDisponiveis.map((perfil) => (
            <Card
              key={perfil.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                selectedProfileId === perfil.id ? 'ring-2 ring-blue-500' : ''
              } ${isSelecting && selectedProfileId !== perfil.id ? 'opacity-50' : ''}`}
              onClick={() => handleProfileSelect(perfil.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <IconUserCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{perfil.nome}</CardTitle>
                      <Badge className={`text-xs ${getProfileColor(perfil.nome)} mt-1`}>
                        {perfil.nome}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {isSelecting && selectedProfileId === perfil.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    ) : (
                      <IconChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  {getProfileDescription(perfil.nome)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center text-sm text-gray-500 mt-4">
          Você poderá alternar entre os perfis disponíveis a qualquer momento através do menu do usuário.
        </div>
      </DialogContent>
    </Dialog>
  );
}