import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-16 text-center">
      <div className="flex max-w-[520px] flex-col items-center gap-[18px]">
        <div aria-hidden className="relative h-[100px] w-[120px]">
          <span className="absolute top-0 right-1.5 size-16 rotate-[16deg] rounded-[18px] bg-primary" />
          <span className="absolute bottom-0 left-0 size-[70px] -rotate-[8deg] rounded-[20px] bg-accent shadow-[inset_0_0_0_2px_#3a3a3a]" />
        </div>
        <span className="font-mono text-[13px] text-muted-foreground">404</span>
        <h1 className="font-display text-[clamp(32px,5vw,48px)] leading-[1.08] font-semibold tracking-[-0.04em]">This link didn't save.</h1>
        <p className="text-[17px] leading-[1.55] text-muted-foreground">The page you're looking for isn't here. It may have moved, or the address has a typo.</p>
        <a href="/" className={buttonVariants({ size: "xl", className: "mt-1.5" })}>
          Back to linkables
        </a>
      </div>
    </main>
  );
}
