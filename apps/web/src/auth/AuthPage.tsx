import { useEffect, useRef, type ReactNode } from "react";

type AuthPageProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  // Set when this page replaces another, so screen readers land on the new screen.
  focusHeading?: boolean;
};

export function AuthPage({ title, description, icon, children, focusHeading = false }: AuthPageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
  }, [focusHeading]);

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2">
          {icon}
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
            {title}
          </h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </header>
        {children}
      </div>
    </main>
  );
}
