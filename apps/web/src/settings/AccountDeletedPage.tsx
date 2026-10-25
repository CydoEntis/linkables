import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useAuthState } from "../auth/auth-state";
import { forgetAccountDeleted, wasAccountDeleted } from "./account-deleted";
import { endSessions } from "./use-delete-account";

export function AccountDeletedPage() {
  const [deleted] = useState(wasAccountDeleted);
  const signedIn = useAuthState().status === "signed-in";

  // A reload during the revoke would cancel it and keep the session; this finishes the job.
  useEffect(() => {
    if (deleted && signedIn) void endSessions();
  }, [deleted, signedIn]);

  if (!deleted) return <Navigate to="/" replace />;
  return (
    <main className="flex min-h-svh animate-fade-in items-center justify-center bg-background p-8">
      <div className="flex max-w-[420px] animate-rise flex-col items-center gap-4 text-center">
        <img src="/logo-96.png" alt="" width={48} height={48} className="size-12 object-contain" />
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Your account is deleted</h1>
        <p className="text-[15.5px] leading-[1.55] text-muted-foreground">
          Your links, notes and collections are gone, and you're signed out. Thanks for trying linkables.
        </p>
        {/* Offered only once no session is left, so the reload can't land signed in. A plain
            link: the fresh load leaves the signed-out state behind, so / shows the landing page. */}
        {signedIn ? null : (
          <a
            href="/"
            onClick={forgetAccountDeleted}
            className={buttonVariants({ variant: "ghost", size: "touch", className: "mt-2 h-[46px] animate-fade-in text-[14.5px] font-bold" })}
          >
            Back to linkables.app
          </a>
        )}
      </div>
    </main>
  );
}
