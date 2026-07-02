import { createHashRouter } from 'react-router-dom';
import AppLayout from '@/_layouts/app';
import { AuthLayout } from '@/_layouts/auth';

// Páginas
import AdminDashboard from '@/pages/admin/AdminDashboard';
import { ContratosDataTable } from '@/pages/contratos/Contratos';
import { NovoContrato } from '@/pages/contratos/NovoContrato';
import { EditarContrato } from '@/pages/contratos/EditarContrato';
import DetalhesContrato from '@/pages/contratos/DetalhesContrato';
import UserCard from '@/pages/usuarios/Usuario';
import { CadastrarUsuarioSimples } from '@/pages/usuarios/CadastrarUsuarioSimples';
import { NotFound } from '@/NotFound';
import { SignIn } from '@/pages/auth/SignIn';
import { ResetPassword } from '@/pages/auth/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import Contratados from '@/pages/fornecedor/Contratado';
import Modalidades from '@/pages/modalidades/Modalidade';
import { FiscalDashboard } from '@/pages/fiscal/FiscalDashboard';
import { FiscalContratos } from '@/pages/fiscal/FiscalContratos';
import { GestorDashboard } from '@/pages/gestor/GestorDashboard';
import EnviarRelatorio from '@/pages/fiscal/EnviarRelatorio';
import Relatorios from '@/pages/relatorios/Relatorios';
import RelatorioContratos from '@/pages/relatorios/RelatorioContratos';
import { AnalisarRelatoriosNovo } from '@/pages/admin/AnalisarRelatoriosNovo';
import Fiscalizacao from '@/pages/fiscalizacao/Fiscalizacao';
import GestaoPendenciasVencidas from '@/pages/pendencias/GestaoPendenciasVencidas';
import Administracao from '@/pages/admin/Administracao';
import LogsAuditoria from '@/pages/admin/LogsAuditoria';
import GestaoResponsaveis from '@/pages/responsaveis/GestaoResponsaveis';

// Componente para dashboard dinâmico baseado no perfil
import DashboardRouter from '@/components/DashboardRouter';

// Hash routing: atualizar (F5) continua válido mesmo sem FallbackResource / `.htaccess` no Apache,
// porque o pedido HTTP é sempre `GET /` e a rota fica em `#/dashboard`.
export const router = createHashRouter([
  // Rota pública sem layout (acesso direto sem login)
  {
    path: '/relatorio-contratos',
    element: <RelatorioContratos />,
    errorElement: <NotFound />,
  },

  // Rotas públicas
  {
    element: <AuthLayout />,
    errorElement: <NotFound />,
    children: [
      {
        path: '/',
        element: <SignIn />,
      },
      {
        path: '/login',
        element: <SignIn />,
      },
      {
        path: '/auth/signin',
        element: <SignIn />,
      },
      {
        path: '/reset-password',
        element: <ResetPassword />,
      },
    ],
  },

  // Rotas privadas
  {
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      {
        path: '/home',
        element: <ProtectedRoute><DashboardRouter /></ProtectedRoute>,
      },
      {
        path: '/dashboard',
        element: <ProtectedRoute><DashboardRouter /></ProtectedRoute>,
      },
      {
        path: '/dashboard/admin',
        element: <ProtectedRoute requiredProfiles={['Administrador']}><AdminDashboard /></ProtectedRoute>,
      },
      {
        path: '/dashboard/gestor',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Gestor']}><GestorDashboard /></ProtectedRoute>,
      },
      {
        path: '/dashboard/fiscal',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Fiscal']}><FiscalDashboard /></ProtectedRoute>,
      },
      {
        path: '/fiscal/contratos',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Fiscal']}><FiscalContratos /></ProtectedRoute>,
      },
      {
        path: '/contratos',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Gestor', 'Fiscal']}><ContratosDataTable /></ProtectedRoute>,
      },
      {
        path: '/novocontrato',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Gestor']}><NovoContrato /></ProtectedRoute>,
      },
      {
        path: '/contratos/editar/:id',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Gestor']}><EditarContrato /></ProtectedRoute>,
      },
      {
        path: '/contratos/:id',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Gestor', 'Fiscal']}><DetalhesContrato /></ProtectedRoute>,
      },
      {
        path: '/contratado',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Gestor', 'Fiscal']}><Contratados /></ProtectedRoute>,
      },
      {
        path: '/modalidades',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Gestor']}><Modalidades /></ProtectedRoute>,
      },
      {
        path: '/administracao',
        element: <ProtectedRoute requiredProfiles={['Administrador']}><Administracao /></ProtectedRoute>,
      },
      {
        path: '/logs-auditoria',
        element: <ProtectedRoute requiredProfiles={['Administrador']}><LogsAuditoria /></ProtectedRoute>,
      },
      {
        path: '/usuarios',
        element: <ProtectedRoute requiredProfiles={['Administrador']}><UserCard /></ProtectedRoute>,
      },
      {
        path: '/cadastrarusuario',
        element: <ProtectedRoute requiredProfiles={['Administrador']}><CadastrarUsuarioSimples /></ProtectedRoute>,
      },
      {
        path: '/pendencias-vencidas',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Fiscal']}><GestaoPendenciasVencidas /></ProtectedRoute>,
      },
      {
        path: '/gestao-de-pendencias',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Fiscal']}><GestaoPendenciasVencidas /></ProtectedRoute>,
      },
      {
        path: '/fiscalizacao',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Fiscal']}><Fiscalizacao /></ProtectedRoute>,
      },
      {
        path: '/enviar-relatorio',
        element: <ProtectedRoute requiredProfiles={['Fiscal']}><EnviarRelatorio /></ProtectedRoute>,
      },
      {
        path: '/relatorios',
        element: <ProtectedRoute requiredProfiles={['Administrador', 'Gestor', 'Fiscal']}><Relatorios /></ProtectedRoute>,
      },
      {
        path: '/gestao-relatorios',
        element: <ProtectedRoute requiredProfiles={['Administrador']}><AnalisarRelatoriosNovo /></ProtectedRoute>,
      },
      {
        path: '/gestao-responsaveis',
        element: <ProtectedRoute requiredProfiles={['Administrador']}><GestaoResponsaveis /></ProtectedRoute>,
      },
      {
        path: '/configuracoes',
        element: <ProtectedRoute requiredProfiles={['Administrador']}><div>Página de Configurações</div></ProtectedRoute>,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
