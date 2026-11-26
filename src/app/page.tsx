import { GitCommitHorizontal, MessageSquareCode, Search } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { SignIn } from "@/app/_components/auth";
import { auth } from "@/server/auth";

const features = [
  {
    icon: MessageSquareCode,
    title: "Ask in plain English",
    body: "“Where is auth handled?” “What do I change to add a page?” Get answers grounded in your actual files.",
  },
  {
    icon: Search,
    title: "See the sources",
    body: "Every answer links the files it used, so you can check the code yourself.",
  },
  {
    icon: GitCommitHorizontal,
    title: "Readable commit history",
    body: "Recent commits are summarized by AI so you can catch up on what changed.",
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-indigo-50 via-background to-background">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-2 px-6 py-5">
        <Image src="/logo.png" alt="" width={28} height={28} />
        <span className="text-lg font-semibold">AskCode</span>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-6 pb-16 pt-12 text-center md:pt-20">
        <Image
          src="/illustration.png"
          alt=""
          width={160}
          height={160}
          priority
        />
        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
            Understand any codebase by asking it questions
          </h1>
          <p className="mx-auto max-w-xl text-balance text-lg text-muted-foreground">
            Connect a GitHub repository. AskCode reads every file and answers
            your questions with references to the exact code.
          </p>
        </div>
        <SignIn size="lg" className="h-11 px-6" />

        <ul className="mt-12 grid w-full gap-4 text-left md:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="rounded-lg border bg-card p-5 shadow-sm"
            >
              <feature.icon className="mb-3 size-5 text-primary" />
              <h2 className="font-medium">{feature.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
