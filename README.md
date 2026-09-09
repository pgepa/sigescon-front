# SIGESCON - Sistema de Gestão de Contratos (Frontend)

![Logo do Projeto](src/assets/logo.svg)

[![React](https://img.shields.io/badge/React-19.1-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.1-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-green?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Licença](https://img.shields.io/badge/licença-MIT-green?style=for-the-badge)](LICENSE)

---

## 📖 Sobre o Projeto

O **SIGESCON** (Sistema de Gestão de Contratos) é uma aplicação moderna desenvolvida para a **Procuradoria-Geral do Estado do Pará (PGE-PA)** para otimizar, centralizar e fiscalizar a administração de contratos públicos. Construído com as tecnologias mais recentes do ecossistema React, o sistema oferece interface intuitiva, rápida e responsiva para gerenciar contratos, termos aditivos, relatórios fiscais, fornecedores e usuários.

---

## ✨ Funcionalidades

- **Dashboard Interativo**: Indicadores visuais, contadores em tempo real e visão adaptada ao perfil logado (Admin, Gestor ou Fiscal).
- **Gestão Completa de Contratos**: Cadastro com múltiplos campos, upload de documentos anexos, filtros dinâmicos e controle de histórico de vigência original (`data_inicio_original` e `data_fim_original`).
- **Módulo de Termos Aditivos**:
  - Cadastro e edição integrados via acordeão na própria listagem de contratos.
  - Formulário com layout otimizado em 3 linhas:
    - **Linha 1**: `Termo Aditivo *` (Tipo), `Data Assinatura *`, `Data Publicação *` e `PAE *`.
    - **Linha 2**: Campos específicos da natureza (`Nova Data Início *`, `Nova Data Fim *`, `Valor Acréscimo (R$) *` e `Valor Supressão (R$) *`).
    - **Linha 3**: Upload do arquivo do aditivo e campo de descrição automática/manual.
  - Suporte a download do arquivo vinculado, inativação (soft delete) e exclusão definitiva.
- **Relatório de Termos Aditivos**: Tela dedicada para busca avançada, filtros por natureza, status (`Ativo`, `Inativo`, `Vencido`) e contrato.
- **Sistema de Múltiplos Perfis**: Suporte a múltiplos papéis por usuário com alternância instantânea de contexto (Admin, Gestor, Fiscal) diretamente no cabeçalho.
- **Relatórios Fiscais e Pendências**: Acompanhamento de prazos, notificações automáticas e fluxo de análise/aprovação de relatórios.
- **Administração de Entidades Auxiliares**: Gerenciamento de Fornecedores (Contratados), Modalidades, Status e Usuários.
- **Interface Responsiva**: Construída com Tailwind CSS v4 e `shadcn/ui`, adaptável a desktops, tablets e smartphones.

---

## 🚀 Tecnologias Utilizadas

- **React 19**: Biblioteca principal para construção de interfaces.
- **Vite**: Ferramenta de compilação ultrarrápida.
- **TypeScript**: Tipagem estática rigorosa para segurança e manutenibilidade.
- **React Router DOM**: Gerenciamento de rotas e histórico da aplicação.
- **Tailwind CSS v4**: Estilização utility-first moderna e responsiva.
- **shadcn/ui & Radix UI**: Componentes acessíveis e reutilizáveis.
- **TanStack Table**: Manipulação avançada de tabelas, paginação e ordenação.
- **Lucide React & Tabler Icons**: Conjunto moderno de ícones vetoriais.

---

## ▶️ Instalação e Execução

Siga o passo a passo abaixo para rodar o frontend a partir de um clone limpo dos fontes.

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **npm** (incluso com o Node.js) ou outro gerenciador de pacotes (`yarn`, `pnpm`)

### 1. Clonar o Repositório
```bash
git clone https://github.com/pgepa/sigescon-front.git
cd sigescon-front
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Crie o arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
# Windows (PowerShell):
Copy-Item .env.example .env

# Linux / macOS:
cp .env.example .env
```

Edite o arquivo `.env` informando a URL da API do backend:

```env
# Ambiente de Desenvolvimento Local:
VITE_API_URL="http://localhost:8000/api/v1"
VITE_AUTH_API_URL="http://localhost:8000/api/v1"

# Ambiente de Homologação / Produção:
# VITE_API_URL="http://seu-servidor:8000/api/v1"
# VITE_AUTH_API_URL="http://seu-servidor:8000/api/v1"
```

> **Nota**: As variáveis `VITE_*` são embutidas no código durante o build. Ao alterar o `.env`, reinicie o servidor de desenvolvimento ou execute um novo build.

### 4. Executar em Modo de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em: `http://localhost:5173`.

### 5. Compilação para Produção (Build)
Para compilar o projeto para implantação em servidores de homologação ou produção:

```bash
npm run build
```
Os arquivos estáticos otimizados serão gerados no diretório `dist/`.

---

## 🌐 Implantação e Servidores Web (Apache / Nginx)

Por padrão, a aplicação utiliza **`createHashRouter`**, o que permite navegação com URLs no formato `/#/dashboard` compatível com qualquer servidor estático sem necessidade de configuração especial de redirecionamento.

### Implantação em Servidor Apache (sem `#` na URL):
Caso o roteamento seja alterado para **`createBrowserRouter`**, configure o Apache para entregar o `index.html` em requisições diretas:

```apache
<Directory "/var/www/sigescon">
    AllowOverride All
    FallbackResource /index.html
</Directory>
```
Certifique-se de copiar o conteúdo gerado em `dist/` (incluindo o arquivo `.htaccess`) para a raiz do diretório web.

---

## 📄 Licença

Este projeto é desenvolvido para a **Procuradoria-Geral do Estado do Pará (PGE-PA)** sob licença MIT.
