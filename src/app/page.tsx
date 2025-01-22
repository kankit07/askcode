import Link from "next/link";

import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { SignIn, SignOut } from "@/app/_components/auth";
import Image from "next/image";

export default async function Home() {
  // const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="relative flex flex-col items-center justify-center px-4">
          <div className="relative z-10 flex flex-col items-center gap-16 rounded-lg border border-border/40 bg-card px-16 py-32 shadow-lg md:px-20 md:py-32">
            {/* Authencated view */}
            {session ? (
              <div className="flex flex-col items-center gap-6">
                <div className="flex flex-col items-center gap-3">
                  {session.user.image && (
                    <div className="relative">
                      <div className="animate-tilt absolute -inset-0.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-75 blur" />
                      <Image
                        src={session.user.image}
                        alt="Profile"
                        className="relative h-20 w-20 rounded-full border border-border"
                        width={80}
                        height={80}
                      />
                    </div>
                  )}
                  <h1 className="text-2xl font-semibold text-foreground">
                    Welcome back, {session.user.name}!
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
                <div className="flex gap-4">
                  <Link href="/dashboard">
                    <Button variant="secondary" className="font-medium">
                      Dashboard
                    </Button>
                  </Link>
                  <SignOut />
                </div>
              </div>
            ) : (
              // Non-authenticated view
              <div className="flex flex-col items-center gap-6">
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold text-foreground">
                    Welcome
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Sign in to get started
                  </p>
                </div>
                <SignIn />
              </div>
            )}
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
