# AskCode

AskCode is an AI-powered platform that helps developers understand codebases through intelligent code analysis and Q&A. It integrates with GitHub repositories to provide contextual insights and explanations.

## Features

- 🤖 AI-powered code analysis and explanation
- 📚 GitHub repository integration
- 💬 Natural language Q&A about your codebase
- 📝 Commit history analysis and summaries
- 🔍 Advanced code search with semantic understanding
- 👥 Project collaboration support
- 💾 Save and reference previous questions/answers

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) with App Router
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Database:** PostgreSQL with [Prisma](https://www.prisma.io/)
- **AI:** Google Gemini via the [AI SDK](https://ai-sdk.dev/). Answers use `gemini-3-flash-preview`, file and commit summaries use lite models, and embeddings use `gemini-embedding-001`. Each list falls back to the next model when one is busy or out of quota (see `src/lib/ai.ts`; override with `GEMINI_MODELS` / `GEMINI_SUMMARY_MODELS`).
- **Vector search:** PostgreSQL + [pgvector](https://github.com/pgvector/pgvector)
- **UI Components:**
  - [shadcn/ui](https://ui.shadcn.com/)
  - [Tailwind CSS](https://tailwindcss.com/)
- **Type Safety:** [TypeScript](https://www.typescriptlang.org/)
- **API Layer:** [tRPC](https://trpc.io/)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL with the `pgvector` extension
- GitHub Account
- A Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/askcode.git
cd askcode
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Fill in your environment variables:
```env
DATABASE_URL=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
GEMINI_API_KEY=
GITHUB_TOKEN=   # optional, raises GitHub rate limits
```

4. Sync the database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

## How it works

1. **Create a project.** The repository URL is checked against GitHub, the
   project is saved with status `INDEXING`, and the request returns right away.
2. **Indexing runs in the background** (`src/lib/indexer.ts`, started with
   Next.js `after()`). Each file on the default branch is summarized by Gemini,
   the summary is embedded, and the vector is stored in `SourceCodeEmbedding`.
   Progress is written to the project row, and the dashboard polls it.
3. **Ask a question** (`src/server/actions/ask-question.ts`). The question is
   embedded, the closest file summaries are found with pgvector, and Gemini
   streams an answer grounded in those files. The files are shown as sources.
4. **Commits.** The latest 15 commits are summarized from their diffs. Refreshing
   only summarizes commits that haven't been seen yet.

Every project-scoped query and action checks that the signed-in user is a
member of the project.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page (redirects to /dashboard when signed in)
│   └── (protected)/          # Signed-in app: dashboard, qa, create
├── components/               # App components (ask card, answer dialog, sources…)
│   └── ui/                   # shadcn/ui primitives
├── hooks/use-project.tsx     # Selected project (localStorage) + project list
├── lib/
│   ├── ai.ts                 # Gemini models, prompts, embeddings
│   ├── github.ts             # GitHub URL parsing, commits, diffs
│   └── indexer.ts            # Background repository indexing
└── server/
    ├── actions/              # Server actions (streaming Q&A)
    ├── api/routers/          # tRPC routers
    └── project-access.ts     # Membership check used everywhere
```

## Contributing

- Contributions are welcome! Feel free to open an issue or submit a pull request.

## Acknowledgments

- Thanks to all contributors who have helped shape AskCode
