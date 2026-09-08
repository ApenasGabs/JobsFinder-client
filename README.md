# React + TypeScript + Vite
# 🚀 S-Job-Crawler

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
Agregador e Web Crawler de vagas de alta performance, unificando a cobertura de **134 empresas da Gupy**, múltiplas plataformas **CLT e Freelancer** (RemoteOK, Programathor, 99Freelas, GeekHunter) e suporte ao navegador ultraleve **Lightpanda Browser**.

Currently, two official plugins are available:
Projetado especificamente para rodar com **baixo consumo de recursos (CPU e RAM)**, ideal para servidores locais, PCs antigos ou VPS de baixo custo.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
---

## Expanding the ESLint configuration
## ⚡ Diferenciais de Performance

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:
- **Zero Sobrecarga de Navegador:** Para ~80% das fontes (incluindo as 134 empresas da Gupy e RemoteOK), o crawler consulta diretamente endpoints públicos de API via HTTP assíncrono com pool de concorrência. Varre 134 empresas em menos de 5 segundos.
- **Consumo de Memória:** O servidor e todo o banco em memória ocupam **menos de 50 MB de RAM**.
- **Streaming em Tempo Real (SSE):** As vagas aparecem na tela no mesmo instante em que são coletadas, sem esperas bloqueantes.
- **Armazenamento Otimizado:** Persistência em JSON com gravações em disco assíncronas com debounce (evitando travar o disco rígido em PCs antigos).
- **Configuração Centralizada:** Todas as stacks buscadas, palavras-chave e empresas ativas ficam em `config/search.config.json` e podem ser alteradas tanto pelo arquivo quanto pela interface web.
- **Lightpanda Headless Engine:** Integração pronta para páginas dinâmicas que exigem execução de JavaScript via protocolo CDP (`ws://127.0.0.1:9222`).

- Configure the top-level `parserOptions` property like this:
---

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
## 🛠️ Como Iniciar

### 1. Pré-requisitos
Node.js 18+ (testado e validado no Node 24).

### 2. Iniciar a Aplicação Completa (Backend + Interface Web)

```bash
cd S-Job-Crawler
yarn start
# ou: npx tsx server/index.ts
```

Acesse no seu navegador:
👉 **`http://127.0.0.1:3001`**

### 3. Modo Desenvolvimento com Hot-Reload
Caso queira editar a interface React com HMR:

```bash
# Terminal 1: Backend API
yarn server

# Terminal 2: Frontend Vite
yarn dev
```

---

## ⚙️ Configuração Centralizada de Stacks e Buscas

Você pode configurar quais tecnologias e empresas deseja monitorar de duas formas:

1. **Pela Interface Web:** Clique no botão **Configurações** no topo da tela ou adicione novos termos diretamente pelas tags.
2. **Pelo Arquivo:** Edite o arquivo `config/search.config.json`:

```json
{
  "searchTerms": [
    "java",
    "react",
    "node",
    "typescript",
    "fullstack",
    "frontend",
    "backend",
    "python",
    "devops",
    "estagio",
    "junior"
  ],
  "sources": [
    { "id": "GUPY", "name": "Gupy (134 Empresas)", "enabled": true },
    { "id": "REMOTEOK", "name": "RemoteOK (Global)", "enabled": true },
    { "id": "PROGRAMATHOR", "name": "Programathor", "enabled": true },
    { "id": "FREELAS_99", "name": "99Freelas", "enabled": true },
    { "id": "GEEKHUNTER", "name": "GeekHunter", "enabled": true }
  ]
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
---

## 📡 Endpoints da API

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Status da aplicação e consumo real de memória em MB |
| `GET` | `/api/config` | Retorna a configuração de busca e empresas ativas |
| `PUT` | `/api/config` | Atualiza termos, senioridades ou empresas |
| `GET` | `/api/jobs` | Consulta vagas salvas com paginação e filtros |
| `GET` | `/api/stats` | Estatísticas por fonte, modelo (Remoto/Presencial/Híbrido) |
| `GET` | `/api/scrape/stream` | **Server-Sent Events (SSE)** disparando a varredura em tempo real |
| `DELETE` | `/api/jobs` | Limpa o banco de vagas local |
