# Content Approval — Plataforma de Aprovação de Conteúdo

Aplicação web para social media managers enviarem conteúdo mensal para aprovação dos clientes.

---

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL)
- **Deploy:** Vercel

---

## Setup local

### 1. Clone e instale as dependências

```bash
git clone <seu-repo>
cd content-approval
npm install
```

### 2. Configure o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. No **SQL Editor**, cole e execute o conteúdo de `supabase/schema.sql`
3. Vá em **Project Settings → API** e copie:
   - `Project URL`
   - `anon public` key
   - `service_role` key (aba Service Role)

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas chaves:

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Rode localmente

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Deploy na Vercel

1. Faça push do projeto para o GitHub
2. Importe o repositório na [Vercel](https://vercel.com)
3. Em **Environment Variables**, adicione as mesmas variáveis do `.env.local`
4. Altere `NEXT_PUBLIC_APP_URL` para a URL da sua aplicação em produção
5. Clique em **Deploy**

---

## Estrutura de arquivos

```
app/
  page.tsx                      → Dashboard do gestor (lista de planejamentos)
  criar/page.tsx                → Formulário de criação de planejamento
  aprovar/[token]/page.tsx      → Página de aprovação do cliente (link público)
  api/
    plans/route.ts              → GET (lista) e POST (cria) planejamentos
    plans/[id]/route.ts         → GET planejamento por ID
    approve/[token]/route.ts    → GET planejamento por token público
    approve/[token]/content/[contentId]/route.ts  → PATCH aprovação individual
    approve/[token]/finalize/route.ts             → POST finalizar aprovação

lib/
  supabase.ts                   → Cliente Supabase (browser)
  supabase-server.ts            → Cliente Supabase (server, service role)

types/index.ts                  → Types TypeScript e helpers
supabase/schema.sql             → SQL para criar as tabelas no Supabase
```

---

## Fluxo de uso

1. Acesse a aplicação → clique em **+ Novo**
2. Preencha nome do cliente e mês de referência
3. Adicione os conteúdos (título, tipo, copy, roteiro opcional)
4. Clique em **Gerar link de aprovação**
5. Copie o link e envie ao cliente pelo WhatsApp
6. O cliente abre o link, aprova ou reprova cada item e clica em **Finalizar**
7. Você retorna ao dashboard e vê o resultado

---

## Banco de dados

### Tabela `plans`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| client_name | text | Nome do cliente |
| month_reference | text | Mês (ex: "Maio 2026") |
| share_token | text | Token único para URL pública |
| status | text | draft / sent / completed |
| created_at | timestamp | Data de criação |

### Tabela `contents`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| plan_id | uuid | FK → plans |
| title | text | Título do conteúdo |
| type | text | post / reels / stories / carrossel |
| copy_text | text | Texto da legenda |
| video_script | text? | Roteiro (opcional) |
| approval_status | text | pending / approved / rejected |
| order_position | integer | Ordem de exibição |
| created_at | timestamp | Data de criação |
