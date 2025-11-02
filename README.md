# ebooks-ia

Sistema de captura de leads para distribuição de e-books com integração SendPulse.

## 📋 Estrutura do Projeto

Este repositório contém:

- **`client/`** - Frontend estático (HTML/CSS/JS) para captura de leads
- **`server/`** - Backend Node.js (Express + PostgreSQL + Redis + SendPulse)

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 20 ou superior
- Docker e Docker Compose (recomendado)
- PostgreSQL (se não usar Docker)
- Redis (se não usar Docker)

### Executando com Docker Compose

```bash
# Clonar o repositório
git clone https://github.com/Diih062/ebooks-ia.git
cd ebooks-ia

# Configurar variáveis de ambiente
cp server/.env.example server/.env
# Editar server/.env com suas credenciais do SendPulse

# Iniciar todos os serviços
docker-compose up --build
```

O servidor ficará disponível em `http://localhost:3000`

### Executando Localmente (Sem Docker)

```bash
# Instalar dependências
cd server
npm install

# Configurar banco de dados PostgreSQL e Redis localmente
# Ajustar .env com as configurações corretas

# Iniciar servidor
npm start

# Em outro terminal, iniciar worker
node worker.js
```

## 📚 Documentação

- [README do Cliente](./client/README.md) - Documentação do frontend
- [README do Servidor](./server/README.md) - Documentação do backend
- **[Guia de Proteção de Branches](./BRANCH_PROTECTION_GUIDE.md)** - ⚠️ **IMPORTANTE** - Como configurar proteções para a branch main

## ⚠️ Importante: Proteção de Branch

**A branch `main` atualmente não está protegida!** Isso pode causar problemas de:
- Commits acidentais direto em produção
- Perda de histórico com force push
- Falta de revisão de código

👉 **[Leia o Guia de Proteção de Branches](./BRANCH_PROTECTION_GUIDE.md)** para aprender como configurar proteções adequadas.

## 🛠️ Tecnologias Utilizadas

### Frontend
- HTML5, CSS3, JavaScript (vanilla)
- Hospedado via GitHub Pages

### Backend
- Node.js 20+
- Express.js - Framework web
- PostgreSQL - Banco de dados de leads
- Redis + BullMQ - Sistema de filas
- SendPulse API - Envio de e-mails
- Docker - Containerização

## 📦 Estrutura de Dados

### Tabela `leads`

```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Configuração

### Variáveis de Ambiente Necessárias

Crie um arquivo `server/.env` baseado no `server/.env.example`:

```env
# Servidor
PORT=3000

# PostgreSQL
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=sua_senha
PGDATABASE=leads
PGPORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SendPulse
SENDPULSE_CLIENT_ID=seu_client_id
SENDPULSE_CLIENT_SECRET=seu_client_secret
SENDPULSE_BOOK_ID=seu_address_book_id
```

## 🔄 Fluxo de Funcionamento

1. Usuário preenche formulário no site estático (`client/`)
2. Formulário envia dados para `/api/subscribe` no servidor
3. Servidor salva lead no PostgreSQL
4. Servidor cria job na fila Redis (BullMQ)
5. Worker processa job e envia lead para SendPulse
6. Usuário é redirecionado para página de agradecimento

## 🤝 Como Contribuir

1. **NÃO faça push direto para `main`** (veja [Guia de Proteção](./BRANCH_PROTECTION_GUIDE.md))
2. Crie uma branch para sua feature: `git checkout -b feature/nome-da-feature`
3. Faça commit das mudanças: `git commit -m 'feat: adiciona nova feature'`
4. Faça push para a branch: `git push origin feature/nome-da-feature`
5. Abra um Pull Request

### Padrão de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Mudanças na documentação
- `style:` - Formatação, ponto e vírgula, etc
- `refactor:` - Refatoração de código
- `test:` - Adição de testes
- `chore:` - Atualizações de build, etc

## 📝 API Endpoints

### `GET /health`
Health check do servidor

**Resposta**: `✅ Render ativo!`

### `POST /api/subscribe`
Registra um novo lead

**Body**:
```json
{
  "firstName": "João",
  "email": "joao@exemplo.com"
}
```

**Resposta de Sucesso** (202):
```json
{
  "message": "Lead salvo e enviado para processamento."
}
```

**Resposta de Erro** (400):
```json
{
  "error": "E-mail obrigatório"
}
```

## 🐛 Problemas Conhecidos e Soluções

### Dependências corrigidas nesta versão

- ✅ Adicionado `bullmq` ao package.json
- ✅ Adicionado `ioredis` ao package.json
- ✅ Especificada versão mínima do Node.js (20+)

### Problemas Comuns

#### Erro: "Cannot find module 'bullmq'"
**Solução**: Execute `npm install` na pasta `server/`

#### Erro de conexão com PostgreSQL
**Solução**: Verifique se o PostgreSQL está rodando e as variáveis `PGHOST`, `PGUSER`, `PGPASSWORD` estão corretas

#### Erro de conexão com Redis
**Solução**: Verifique se o Redis está rodando e as variáveis `REDIS_HOST`, `REDIS_PORT` estão corretas

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 👥 Autores

- Diógenes Varelo Correia (@Diih062)

## 🔗 Links Úteis

- [Documentação SendPulse API](https://sendpulse.com/integrations/api)
- [Documentação BullMQ](https://docs.bullmq.io/)
- [Documentação Express](https://expressjs.com/)
- [GitHub Pages](https://pages.github.com/)

---

**⚠️ Lembre-se**: Sempre configure proteção de branch antes de trabalhar com uma equipe! Veja [BRANCH_PROTECTION_GUIDE.md](./BRANCH_PROTECTION_GUIDE.md)
