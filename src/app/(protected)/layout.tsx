import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/server/auth";
import { AppSidebar } from "./app-sidebar";
import { ProjectHeader } from "../_components/project-header";

type Props = {
  children: React.ReactNode;
};
const SidebarLayout = async ({ children }: Props) => {
  const session = await auth();
  // const { projectId } = useProject();
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="m-2 w-full">
        <ProjectHeader userImage={session?.user.image} />
        {/* <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar p-2 px-4">

          {session && (
            <>
              <div className="ml-auto" />
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  className="relative h-8 w-8 rounded-full border border-border"
                  width={32}
                  height={32}
                />
              )}
            </>
          )}
        </div> */}
        {/* main content */}
        <div className="mt-4 h-[calc(100vh-5.2rem)] overflow-y-scroll rounded-md border border-sidebar-border bg-sidebar p-4 shadow">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
};
export default SidebarLayout;
