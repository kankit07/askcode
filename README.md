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

- **Framework:** [Next.js 14](https://nextjs.org/) with App Router
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **Database:** PostgreSQL with [Prisma](https://www.prisma.io/)
- **AI Integration:**
  - Google Gemini AI
  - Llama AI
- **UI Components:**
  - [Radix UI](https://www.radix-ui.com/)
  - [shadcn/ui](https://ui.shadcn.com/)
  - [Tailwind CSS](https://tailwindcss.com/)
- **Type Safety:** [TypeScript](https://www.typescriptlang.org/)
- **API Layer:** [tRPC](https://trpc.io/)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- GitHub Account
- AI API Keys (Gemini/Llama)

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
LLAMA_API_KEY=
GITHUB_TOKEN=
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/         # Reusable UI components
├── server/            # Backend server code
│   ├── api/          # tRPC API routes
│   ├── auth/         # Authentication setup
│   └── db/           # Database configuration
├── lib/              # Utility functions and shared logic
├── styles/           # Global styles
└── types/            # TypeScript type definitions
```

## Features in Detail

### GitHub Integration
- Connect any GitHub repository
- Automatic code analysis
- Commit history tracking
- File structure understanding

### AI-Powered Q&A
- Ask questions about your codebase in natural language
- Get contextual answers with code references
- Save important Q&A for future reference

### Project Management
- Create multiple projects
- Collaborate with team members
- Track project activity

## Contributing

- Contributions are welcome! Feel free to open an issue or submit a pull request.

## Acknowledgments

- Thanks to all contributors who have helped shape AskCode
