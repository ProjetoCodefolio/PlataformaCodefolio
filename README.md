# Plataforma Codefólio

Bem-vindo à **Plataforma Codefólio**! Este projeto é uma aplicação web desenvolvida com **React** e **Vite**, projetada para ajudar estudantes e profissionais a criar portfólios de código e compartilhar boas práticas de engenharia de software.

## 🚀 Funcionalidades

- 🎥 **Gerenciamento de Vídeos**: Assista e acompanhe o progresso dos vídeos de cursos.
- 📝 **Quizzes Interativos**: Teste seus conhecimentos com quizzes personalizados.
- 📚 **Materiais Complementares**: Acesse materiais extras para aprofundar seus estudos.
- 📊 **Painel de Administração**: Gerencie cursos, estudantes e avaliações.
- 🌟 **Ranking de Alunos**: Veja os melhores desempenhos nos quizzes.
- 🔒 **Autenticação Segura**: Login com suporte ao Firebase Authentication.

## 🛠️ Tecnologias Utilizadas

- **React** com **Vite** para desenvolvimento rápido e moderno.
- **Firebase** para autenticação, banco de dados em tempo real e hospedagem.
- **Material-UI** para componentes estilizados e responsivos.
- **React Toastify** para notificações elegantes.
- **Styled Components** para estilização dinâmica.

## 📂 Estrutura do Projeto

    PlataformaCodefolio/ 
    ├── public/             # Arquivos públicos (HTML, imagens, etc.) 
    ├── src/                # Código-fonte principal
    │ ├── api/              # Serviços e chamadas à API
    │ ├── app/              # Componentes e páginas da aplicação
    │ ├── assets/           # Recursos estáticos (imagens, ícones, etc.)
    │ ├── utils/            # Funções utilitárias
    │ └── main.jsx          # Ponto de entrada da aplicação
    ├── .env                # Variáveis de ambiente
    ├── firebase.json       # Configuração do Firebase Hosting
    ├── package.json        # Dependências e scripts do projeto
    └── vite.config.js      # Configuração do Vite


## 🖥️ Pré-requisitos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas:

- **Node.js** (versão 16 ou superior)
- **npm** ou **yarn**
- **Firebase CLI** (para deploy e emuladores locais)

## ⚙️ Configuração do Ambiente

1. Clone este repositório:
   ```bash
   git clone https://github.com/seu-usuario/plataformacodefolio.git

   cd plataformacodefolio
2. Instale as dependências:
    ```bash
    npm install
3. Configure as variáveis de ambiente:
- Crie um arquivo .env na raiz do projeto.
- Adicione as seguintes variáveis:
    ```bash
    VITE_API_KEY=your-firebase-api-key
    VITE_AUTH_DOMAIN=your-auth-domain
    VITE_PROJECT_ID=your-project-id
    VITE_STORAGE_BUCKET=your-storage-bucket
    VITE_MESSAGING_SENDER=your-sender-id
    VITE_APP_ID=your-app-id
    VITE_MEASUREMENT_ID=your-measurement-id
    VITE_MODE=development-or-production
    VITE_GROQ_API_KEY=your-groq-api-key
    VITE_PIN_SECRET_KEY=your-pin-key


## ▶️ Como Executar
1. Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
2. Inicie os emuladores do firebase para desenvolvimento
    ```bash
    firebase emulators:start
3. Abra uma guia no navegador e acesse a aplicação
    ```bash
    http://localhost:5173
4. Abra outra guia e acesse o emulador do banco de dados
    ```bash
    http://localhost:4000/database/plataformacodefolio/data

5. Importar JSON com os dados do banco de dados