import { useLocation } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import { FiscalDashboard } from "@/pages/fiscal/FiscalDashboard";
import { GestorDashboard } from "@/pages/gestor/GestorDashboard";

/**
 * Componente que renderiza o dashboard apropriado baseado no perfil ativo do usuário
 */
export default function DashboardRouter() {
  const location = useLocation();
  const { perfilAtivo, user, perfisDisponiveis } = useAuth();

  console.log("🔍 DashboardRouter - Estado atual:", {
    perfilAtivo,
    user,
    perfisDisponiveis,
    url: location.pathname
  });

  if (!perfilAtivo) {
    console.log("⚠️ DashboardRouter - Nenhum perfil ativo encontrado");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log("✅ DashboardRouter - Renderizando dashboard para perfil:", perfilAtivo.nome);

  // Renderiza dashboard baseado no perfil ativo
  switch (perfilAtivo?.nome) {
    case "Administrador":
      console.log("📊 Renderizando AdminDashboard");
      return <AdminDashboard />;
    case "Gestor":
      console.log("📊 Renderizando GestorDashboard");
      return <GestorDashboard />;
    case "Fiscal":
      console.log("📊 Renderizando FiscalDashboard");
      return <FiscalDashboard />;
    default:
      console.log("❌ Perfil não reconhecido:", perfilAtivo?.nome);
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Perfil não reconhecido: {perfilAtivo?.nome || 'Nenhum'}
          </p>
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Debug Info:</h3>
            <pre className="text-xs mt-2">
              {JSON.stringify({ perfilAtivo, perfisDisponiveis }, null, 2)}
            </pre>
          </div>
        </div>
      );
  }
}
