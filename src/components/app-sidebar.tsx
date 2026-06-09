import * as React from "react"
import {
  IconDashboard,
  IconUsers,
  IconBuilding,
  IconFileText,
  IconFileCertificate,
  IconClipboardList,
  IconAlertTriangle,
  IconSettings,
  IconReportAnalytics,
} from "@tabler/icons-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

// Configurações de navegação por perfil
const getNavigationByProfile = (perfilNome: string) => {
  const baseItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
  ];

  switch (perfilNome) {
    case "Administrador":
      return [
        ...baseItems,
        {
          title: "Contratos",
          url: "/contratos",
          icon: IconFileText,
        },
        {
          title: "Modalidades",
          url: "/modalidades",
          icon: IconFileCertificate,
        },
        {
          title: "Contratados",
          url: "/contratado",
          icon: IconBuilding,
        },
        {
          title: "Usuários",
          url: "/usuarios",
          icon: IconUsers,
        },
        {
          title: "Gestão de Relatórios",
          url: "/gestao-relatorios",
          icon: IconClipboardList,
        },
        {
          title: "Gestão de Pendências",
          url: "/gestao-de-pendencias",
          icon: IconAlertTriangle,
        },
        {
          title: "Relatório Contratos",
          url: "/relatorio-contratos",
          icon: IconReportAnalytics,
        },
        {
          title: "Administração",
          url: "/administracao",
          icon: IconSettings,
        },
      ];

    case "Gestor":
      return [
        ...baseItems,
        {
          title: "Contratos",
          url: "/contratos",
          icon: IconFileText,
        },
        {
          title: "Relatório Contratos",
          url: "/relatorio-contratos",
          icon: IconReportAnalytics,
        },
      ];

    case "Fiscal":
      return [
        ...baseItems,
        {
          title: "Meus Contratos",
          url: "/contratos",
          icon: IconFileText,
          isReadOnly: true, // Apenas visualização
        },
      ];

    default:
      return baseItems;
  }
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { perfilAtivo } = useAuth();
  
  // Obtém a navegação baseada no perfil ativo
  const navigationItems = React.useMemo(() => {
    if (!perfilAtivo) return [];
    return getNavigationByProfile(perfilAtivo.nome);
  }, [perfilAtivo]);

  // Função para obter cor do header baseada no perfil
  const getHeaderColor = () => {
    if (!perfilAtivo) return "";
    switch (perfilAtivo.nome) {
      case "Administrador":
        return "bg-purple-50 border-purple-200 border-radius-2xl";
      case "Gestor":
        return "bg-blue-50 border-blue-200";
      case "Fiscal":
        return "bg-green-50 border-green-200";
      default:
        return "";
    }
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className={`border-b ${getHeaderColor()}`}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/home">
                <ShieldCheck className="!size-5" />
                <span className="text-base font-semibold">SIGESCON</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* navegação dinâmica baseada no perfil */}
        <NavMain items={navigationItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
