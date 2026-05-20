# SIGESCON - Sistema de Gestão de Contratos

![Logo do Projeto](src/assets/logo.svg)

[![React](https://img.shields.io/badge/React-19.1-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.1-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-green?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Licença](https://img.shields.io/badge/licença-MIT-green?style=for-the-badge)](LICENSE)

---

##  sobre o projeto

O **SIGESCON** (Sistema de Gestão de Contratos) é uma aplicação moderna desenvolvida para otimizar e centralizar a administração de contratos. Construído com as mais recentes tecnologias de front-end, o sistema oferece uma interface de usuário intuitiva e responsiva para gerenciar contratos, fornecedores, modalidades e usuários de forma eficiente.

O dashboard principal fornece uma visão geral e interativa dos dados mais importantes, permitindo um acompanhamento rápido e eficaz do status dos contratos e outras métricas relevantes.

---

## ✨ Funcionalidades

-   **Dashboard Interativo:** Gráficos e cartões informativos para uma visão rápida da situação dos contratos.
-   **Gestão de Contratos:** Crie, edite, visualize e remova contratos detalhados.
-   **Gerenciamento de Entidades:** Administração completa de Fornecedores (Contratados), Modalidades e Status.
-   **Controle de Acesso:** Sistema de autenticação e rotas privadas baseadas em perfis de usuário (Administrador, Gestor, Fiscal).
-   **Interface Responsiva:** Layout adaptável para uma ótima experiência em desktops e dispositivos móveis.
-   **Componentes Reutilizáveis:** Construído com base no `shadcn/ui` para uma UI consistente e de alta qualidade.

---

## 🚀 Tecnologias Utilizadas

Este projeto foi construído utilizando as seguintes tecnologias:

-   **React 19:** Biblioteca principal para a construção da interface de usuário.
-   **Vite:** Ferramenta de build extremamente rápida para desenvolvimento front-end.
-   **TypeScript:** Superset do JavaScript que adiciona tipagem estática.
-   **React Router DOM:** Para gerenciamento de rotas na aplicação.
-   **Tailwind CSS:** Framework CSS utility-first para estilização.
-   **shadcn/ui:** Coleção de componentes de UI reutilizáveis.
-   **Zod:** Para validação de schemas e formulários.
-   **React Hook Form:** Para gerenciamento de formulários.
-   **TanStack Table:** Para criação de tabelas e data grids poderosos.
-   **Recharts:** Para a criação de gráficos interativos.
-   **Lucide React:** Pacote de ícones.

---

## ▶️ Começando

Siga as instruções abaixo para configurar e rodar o projeto em seu ambiente local.

### Pré-requisitos

Você vai precisar ter o [Node.js](https://nodejs.org/) (versão 18 ou superior) e um gerenciador de pacotes ([npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/) ou [pnpm](https://pnpm.io/)) instalados.

### Instalação

1.  Clone o repositório:
    ```bash
    git clone [https://github.com/seu-usuario/sigescon.git](https://github.com/seu-usuario/sigescon.git)
    ```
2.  Navegue até o diretório do projeto:
    ```bash
    cd sigescon
    ```
3.  Instale as dependências:
    ```bash
    npm install
    ```

### Variáveis de Ambiente (produção)

Copie `.env.example` para `.env` e ajuste com as URLs **públicas ou alcançáveis pelo navegador** da API (sem barra no final). Em seguida rode `npm run build` — os valores são incorporados ao bundle.

```env
VITE_API_URL="https://seu-servidor/api/v1"
VITE_AUTH_API_URL="https://seu-servidor/api/v1"
```

- **`VITE_API_URL`**: base dos endpoints REST (`/usuarios`, `/contratos`, …).
- **`VITE_AUTH_API_URL`**: base das rotas `/auth/*` (login, contexto, logout). Com o sigescon-fastapi atual, use em geral a **mesma** base terminando em `/api/v1`.
- O esquema (**HTTPS** vs **HTTP**) deve ser compatível com o do site: uma página HTTPS não pode chamar API HTTP (o navegador bloqueia).