import { buttonVariants } from "@/components/ui/button";

// A plain link: a fresh load leaves the signed-out state behind, so / shows the landing page.
export function AccountDeletedPage() {
  return (
    <main className="flex min-h-svh animate-fade-in items-center justify-center bg-background p-8">
      <div className="flex max-w-[420px] animate-rise flex-col items-center gap-4 text-center">
        <img src="/logo-96.png" alt="" width={48} height={48} className="size-12 object-contain" />
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Your account is deleted</h1>
        <p className="text-[15.5px] leading-[1.55] text-muted-foreground">
          Your links, notes and collections are gone, and you're signed out. Thanks for trying linkables.
        </p>
        <a href="/" className={buttonVariants({ variant: "ghost", size: "touch", className: "mt-2 h-[46px] text-[14.5px] font-bold" })}>
          Back to linkables.app
        </a>
      </div>
    </main>
  );
}
