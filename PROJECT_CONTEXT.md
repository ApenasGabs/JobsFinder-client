# 📌 S-Job-Crawler: Contexto do Projeto, Propósito e Guia de Evolução

> **Documento de Referência Técnica para Desenvolvedores e Agentes de IA**  
> Este documento deve ser lido juntamente com [`SERVER_CONTEXT.md`](file:///home/gabs/projetos/busca-vagas/SERVER_CONTEXT.md) para compreender o ecossistema completo de servidores (`gabisa` e `servidor`), banco de dados, scrapers, bot de WhatsApp e regras de negócio.

---

## 🎯 1. Propósito e Visão do Projeto

O **S-Job-Crawler** é uma plataforma automatizada de monitoramento, agregação, normalização e distribuição de oportunidades de emprego com foco **100% EXCLUSIVO EM TECNOLOGIA DA INFORMAÇÃO, SOFTWARE E DADOS** para o mercado brasileiro.

### Objetivos Centrais
1. **Público-Alvo**: Estudantes de computação, estagiários, desenvolvedores juniores, plenos, seniores, engenheiros de dados, DevOps e profissionais de produto/design tech.
2. **Canais de Distribuição**:
   - **Comunidade no WhatsApp**: Grupo com ~300 membros ativos (ex: `[VAGAS] [ESTÁGIO]`). Requer extrema disciplina contra spam e mensagens fora do escopo.
   - **Dashboard Web de Gestão**: Interface SPA moderna rodando em rede local para monitoramento em tempo real, disparo manual de lotes, configuração de fontes e gestão das vagas.
3. **⚠️ REGRA DE OURO (Core Business Rule)**:
   - **NÃO É UM BUSCADOR DE EMPREGOS GENERALISTA.**
   - Vagas de Saúde/Enfermagem, Comercial/Vendas/SDR, Jurídico, Financeiro, Logística, Atendimento ao Cliente, Balcão/Varejo, etc., **NÃO DEVEM** ser adicionadas ao banco de dados e **JAMAIS** devem ser enviadas ao grupo de WhatsApp.

---

## 🏗️ 2. Arquitetura da Aplicação

O projeto está localizado na pasta `/home/gabs/projetos/busca-vagas/S-Job-Crawler`.

```text
S-Job-Crawler/
├── server/                      # Backend em Node.js / Express (TypeScript)
│   ├── index.ts                 # Ponto de entrada, rotas da API REST e SSE
│   ├── types.ts                 # Interfaces (Job, ScrapeOptions, WhatsAppConfig, etc.)
│   ├── scrapers/                # 10 Scrapers modulares de plataformas ATS
│   │   ├── base.ts              # Interface BaseScraper e ScraperRegistry
│   │   ├── gupy.ts              # Scraper Gupy (134 empresas cadastradas)
│   │   ├── inhire.ts            # Scraper InHire (63 startups tech brasileiras)
│   │   ├── ashby.ts             # Scraper Ashby (41 empresas globais de tech)
│   │   ├── lever.ts             # Scraper Lever (25 startups e empresas tech)
│   │   ├── greenhouse.ts        # Scraper Greenhouse (empresas como QuintoAndar)
│   │   ├── workable.ts          # Scraper Workable (22 empresas internacionais)
│   │   ├── programathor.ts      # Scraper Programathor
│   │   ├── remoteok.ts          # Scraper RemoteOK
│   │   ├── geekhunter.ts        # Scraper GeekHunter
│   │   └── freelas99.ts         # Scraper 99Freelas
│   ├── bot/
│   │   └── whatsapp.ts          # Bot Baileys com anti-flood, agrupamento e fila
│   ├── services/
│   │   ├── crawler.ts           # Orquestrador de busca e execução paralela
│   │   ├── storage.ts           # Camada de persistência em memória + JSON
│   │   ├── config.ts            # Leitura/escrita de configurações
│   │   └── scheduler.ts         # Agendador cron contínuo (ex: */30 * * * *)
│   └── utils/
│       ├── normalizer.ts        # Normalização de dados, stacks, modelos e slugs
│       └── pool.ts              # Pool de concorrência assíncrona com throttle
├── src/                         # Frontend SPA (React 18 + Vite + Tailwind CSS)
│   ├── App.tsx                  # Dashboard completo, filtros, métricas, QR Code e logs
│   ├── main.tsx                 # Bootstrap do React
│   └── index.css                # Tailwind e estilos globais
├── config/
│   └── search.config.json       # Lista de empresas por ATS, termos e WhatsApp
├── data/
│   ├── jobs.json                # Banco de dados plano com as vagas indexadas (~5.000)
│   └── stats.json               # Métricas agregadas
├── auth_baileys/                # Sessão persistente da conexão do WhatsApp
├── tests/                       # Suíte de testes automatizados (Node:test + tsx)
├── docker-compose.zimaos.yml    # Configuração de container para o ZimaOS
└── Dockerfile                   # Build de produção (Node 20 Alpine)
```

---

## 🚀 3. O Que Já Foi Implementado e Melhorias Recentes

### 1. Suporte a 10 Plataformas ATS
- Mapeamento e coleta via APIs públicas e extração de payload de páginas de carreiras: **Gupy (134 empresas)**, **InHire (63 empresas)**, **Ashby (41 empresas)**, **Lever (25 empresas)**, **Greenhouse**, **Workable**, **RemoteOK**, **Programathor**, **GeekHunter** e **99Freelas**.
- Streaming em tempo real via **Server-Sent Events (SSE)** em `/api/scrape/stream`.

### 2. Normalização de URLs do InHire (`slugifyInHire`)
- O InHire utiliza um SPA em React que exige rota no padrão `/vagas/:jobId/:jobSlug`. Links contendo apenas o ID falhavam com 404/tela em branco.
- Foi implementado o gerador `slugifyInHire` em `server/utils/normalizer.ts` que replica com exatidão as regras do InHire (tratamento de acentos, caracteres como `&` para `and`, `|` para `or`, hífens compostos).
- Todas as 784 vagas de InHire foram migradas no banco e abrem diretamente com status **HTTP 200**.

### 3. Reformulação do WhatsApp Bot (Anti-Flood & UX Compacta)
- **Problema resolvido**: Anteriormente, cada vaga nova enviava 1 mensagem isolada, gerando dezenas de notificações sonoras seguidas no grupo e causando silenciamento em massa.
- **Formato em Lotes Agrupados**: Agora, 1 única mensagem consolida até 4 vagas numeradas (`1️⃣`, `2️⃣`, `3️⃣`, `4️⃣`).
- **Skim Rápido no Topo**: Cabeçalho informando áreas/stacks e localidades para leitura instantânea (`📌 *Foco:* ...`, `📍 *Locais:* ...`).
- **Layout Compacto**: Reduzido em 40% o tamanho por vaga (sem separadores poluídos `───` e com rodapé único de fontes).
- **Fila com Cadenciamento**: Vagas pendentes são disparadas em blocos a cada 5 minutos (configurável via `batchIntervalMinutes`).
- **Proteção de Cold Start**: Ao reiniciar a aplicação, as vagas antigas são marcadas como já notificadas para evitar reenvios.

### 4. Suíte de Testes Automatizados
- 47 testes unitários implementados em `tests/` cobrindo scrapers, normalizadores, slugger e formatação de mensagens do WhatsApp.

### 5. Implantação Contínua no ZimaOS
- O sistema roda em container Docker (`s-job-crawler`) no servidor doméstico **`gabisa`** (`http://gabisa.local:3001`).

---

## ⚠️ 4. Problemas Diagnosticados Atualmente (O Gargalo das Vagas Não-Tech)

Apesar de termos ~5.000 vagas indexadas, **há muitas vagas fora da área de Tecnologia**.

### Por que isso está acontecendo?
1. **Empresas Não-Tech ou Multissetoriais**:
   - Empresas cadastradas na lista (como Cogna, Unimed, Cacau Show, Localiza, DB1 Group, Rentbrella, ABT Atividades, etc.) contratam para diversos departamentos: Comercial, Jurídico, Vendas, Saúde, Finanças e Operações.
2. **Termos de Busca Amplos sem Filtro de Área**:
   - Na busca por senioridades (como `estagio`, `junior`, `pleno`, `senior`), se a vaga tiver `Monitor(a) de Estágio – Enfermagem`, `Vendedor Pleno`, `Analista Comercial Júnior` ou `Advogado Júnior`, ela é aceita porque atende à palavra-chave da busca!
3. **Falsos Positivos de Regex**:
   - A palavra `intern` para estágio dava match na palavra em inglês `internal` (ex: `Software Engineer - Internal Tooling`).
4. **Ausência de Flag de Área no Modelo**:
   - O objeto `Job` não possui uma propriedade booleana `isTech` ou categoria de área para que o sistema saiba separar com precisão o que é tech do que não é.
5. **Risco Crítico**:
   - Se essas vagas não-tech permanecerem com a senioridade `ESTAGIO` ou `JUNIOR`, o bot de WhatsApp ou a rotina agendada pode enviá-las para a comunidade de desenvolvedores.

---

## 🧭 5. Guia Cirúrgico: Onde Mexer para Resolver Esse Problema

A próxima IA ou desenvolvedor deve seguir exatamente este roteiro:

### 📍 Passo 1: Criar o Detector/Classificador em `server/utils/normalizer.ts`

Criar funções especializadas para validação de vagas de tecnologia:

```typescript
// 1. Palavras que identificam que a vaga É de tecnologia
const TECH_WHITELIST_KEYWORDS = [
  'desenvolvedor', 'desenvolvedora', 'developer', 'software', 'frontend', 'front-end',
  'backend', 'back-end', 'fullstack', 'full-stack', 'engenheiro de software', 'software engineer',
  'devops', 'sre', 'cloud', 'aws', 'azure', 'gcp', 'qa', 'tester', 'testes', 'quality assurance',
  'dados', 'data engineer', 'data scientist', 'cientista de dados', 'analista de dados', 'data analyst',
  'machine learning', 'ia', 'ai', 'inteligência artificial', 'dba', 'banco de dados', 'database',
  'segurança da informação', 'cibersegurança', 'infosec', 'cybersecurity', 'red team', 'blue team',
  'arquiteto de software', 'tech lead', 'ui/ux', 'ux designer', 'ui designer', 'product designer',
  'product manager', 'product owner', 'scrum master', 'agilista', 'analista de sistemas',
  'programador', 'programadora', 'mobile', 'android', 'ios', 'flutter', 'react native',
  'computação', 'informática', 'tecnologia', 'ti', 'suporte técnico', 'helpdesk', 'redes'
];

// 2. Palavras que ELIMINAM a vaga imediatamente (Vagas Não-Tech)
const NON_TECH_BLACKLIST_KEYWORDS = [
  'enfermagem', 'médic', 'saúde', 'farmac', 'odontol', 'hospitalar', 'fisioter', 'nutriç', 'psicolog',
  'vendedor', 'vendedora', 'vendas', 'comercial', 'sdr', 'bdr', 'inside sales', 'telemarketing',
  'atendimento ao cliente', 'suporte ao cliente', 'sac', 'balconista', 'recepcionista', 'caixa',
  'estoquista', 'logística', 'motorista', 'entregador', 'almoxarif', 'fiscal de loja',
  'advogad', 'jurídic', 'tributár', 'contábil', 'contabil', 'financeir', 'faturamento', 'cobrança',
  'recursos humanos', 'rh', 'dp', 'departamento pessoal', 'recrutamento e seleção', 'talent acquisition',
  'pedagog', 'professor(a)', 'monitor(a) escolar', 'cozinheir', 'limpeza', 'zelador', 'porteiro'
];

export function isTechJob(title: string, department?: string, description?: string): boolean {
  // Lógica de matching estrita:
  // 1. Se contiver termos da blacklist no título -> NÃO TECH (retorna false)
  // 2. Se contiver termos da whitelist no título, departamento ou stack -> TECH (retorna true)
  // 3. Casos ambíguos: avaliar contexto ou retornar false por segurança
}
```

> **Atenção com a Regex de Estágio**:  
> Em `detectSeniority`, substituir `.includes('intern')` por regex de palavra completa `/\b(intern|internship|estagio|estágio|estagiario|estagiária)\b/i` para nunca mais dar falso positivo com `internal` ou `international`.

---

### 📍 Passo 2: Aplicar a Validação na Ingestão (`server/scrapers/*.ts`)

Em cada um dos scrapers (ou no interceptor em `server/services/crawler.ts`):
- Antes de emitir `onJobFound(jobData)` ou dar push no array de vagas, verificar se `isTechJob(jobData.title, item.department)` é verdadeiro.
- Se for falso, **descartar** ou marcar com a propriedade `isTech: false`.

---

### 📍 Passo 3: Limpar as Vagas Já Existentes no Banco (`data/jobs.json`)

Criar uma função de migração/limpeza em `server/services/storage.ts`:
- Função `StorageService.purgeNonTechJobs(): { purgedCount: number; remainingCount: number }`.
- Pode ser acionada via rota `POST /api/jobs/purge-non-tech` ou executada uma única vez via script scratch em `scripts/clean_non_tech.ts`.
- Isso vai remover imediatamente as ~100-200 vagas de enfermagem, vendas e jurídico que já estão em `data/jobs.json`.

---

### 📍 Passo 4: Blindar o Envio do Bot do WhatsApp (`server/bot/whatsapp.ts`)

No método `notifyNewJobs` e no método `dispatchCategoryJobs`:
- Adicionar filtro explícito:
  ```typescript
  const techOnlyJobs = filteredJobs.filter(j => isTechJob(j.title));
  ```
- Isso garante **100% de certeza** de que nenhuma vaga fora da área de tecnologia será disparada no grupo de WhatsApp, mesmo que de alguma forma entre no banco.

---

### 📍 Passo 5: Atualizar a Interface do Dashboard (`src/App.tsx`)

Na interface web:
1. **Adicionar Filtro de Área**:
   - Dropdown ou Toggle com "Apenas Tecnologia (Tech)" ativado por padrão.
2. **Ação de Limpeza**:
   - Botão no cabeçalho ou nas configurações: "Remover Vagas Não-Tech" que consome `POST /api/jobs/purge-non-tech`.
3. **Métrica**:
   - Exibir na barra de estatísticas: `Total de Vagas Tech: X | Vagas Filtradas: Y`.

---

### 📍 Passo 6 (Opcional Avançado): Classificação Inteligente via IA Local (`servidor`)

Conforme detalhado no [`SERVER_CONTEXT.md`](file:///home/gabs/projetos/busca-vagas/SERVER_CONTEXT.md), temos o servidor **`servidor`** (`http://servidor.local:11434`) equipado com uma GPU NVIDIA GTX 1050 Ti e instâncias do Ollama ativas:
- Modelos recomendados para classificação instantânea:
  - **`llama3.2:1b`** (processa a ~44 tokens/segundo).
  - **`qwen2.5:1.5b`** (processa a ~38 tokens/segundo).
  - **`llama3.2:3b`** (máxima assertividade com 100% de acertos).
- Pode ser criado um micro-serviço ou chamada simples via `fetch('http://servidor.local:11434/api/generate', ...)` para classificar títulos que fiquem no limiar de dúvida (ex: títulos curtos como *"Especialista de Operações"* ou *"Analista Jr"* sem stack evidente).

---

## 🧪 6. Como Rodar, Testar e Validar as Alterações

### 1. Rodar os Testes Unitários
```bash
# Na pasta S-Job-Crawler
npm test
# ou teste isolado
npx tsx --test tests/normalizer.test.ts
npx tsx --test tests/whatsapp_formatter.test.ts
```

### 2. Validar Compilação do Frontend e Backend
```bash
npm run build
```

### 3. Deploy de Produção no Servidor ZimaOS (`gabisa`)
Lembre-se das regras do [`SERVER_CONTEXT.md`](file:///home/gabs/projetos/busca-vagas/SERVER_CONTEXT.md): o host ZimaOS tem rootfs imutável, então todo o ciclo de vida roda via Docker.

```bash
# 1. Commit e Push no repositório
git add .
git commit -m "feat(filter): implement isTechJob classifier and purge non-tech vacancies"
git push origin main

# 2. Atualizar e reiniciar o container no ZimaOS (gabisa)
ssh gabisa "docker exec s-job-crawler sh -c 'cd /app && rm -f .git/index.lock && git fetch origin && git reset --hard origin/main && yarn build' && docker restart s-job-crawler"
```

### 4. Checagem de Saúde Pós-Deploy
```bash
# Health check da API
curl -s http://gabisa.local:3001/api/health

# Status do WhatsApp
curl -s http://gabisa.local:3001/api/whatsapp/status

# Estatísticas do banco de vagas
curl -s http://gabisa.local:3001/api/stats
```

---

## 📋 Resumo dos Arquivos Chave

| Arquivo | Função Principal |
| :--- | :--- |
| [`SERVER_CONTEXT.md`](file:///home/gabs/projetos/busca-vagas/SERVER_CONTEXT.md) | Infraestrutura física dos servidores `gabisa` e `servidor`, SSH e limitações do ZimaOS |
| [`PROJECT_CONTEXT.md`](file:///home/gabs/projetos/busca-vagas/PROJECT_CONTEXT.md) | **Este arquivo.** Regras de negócio, arquitetura, problemas diagnosticados e guia da IA |
| [`server/utils/normalizer.ts`](file:///home/gabs/projetos/busca-vagas/S-Job-Crawler/server/utils/normalizer.ts) | Onde deve ser implementado o classificador `isTechJob` e a correção da regex de `intern` |
| [`server/services/storage.ts`](file:///home/gabs/projetos/busca-vagas/S-Job-Crawler/server/services/storage.ts) | Métodos de persistência e onde implementar a limpeza/expurgo de vagas não-tech |
| [`server/bot/whatsapp.ts`](file:///home/gabs/projetos/busca-vagas/S-Job-Crawler/server/bot/whatsapp.ts) | Trava obrigatória de tecnologia para impedir envios não-tech no grupo de WhatsApp |
| [`src/App.tsx`](file:///home/gabs/projetos/busca-vagas/S-Job-Crawler/src/App.tsx) | Interface gráfica com filtros, botões de ação e gerenciamento das vagas |
| [`config/search.config.json`](file:///home/gabs/projetos/busca-vagas/S-Job-Crawler/config/search.config.json) | Empresas mapeadas e termos de busca |

