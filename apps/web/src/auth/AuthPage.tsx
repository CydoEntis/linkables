import type { ReactNode } from "react";

type AuthPageProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
};

export function AuthPage({ title, description, icon, children }: AuthPageProps) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2">
          {icon}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </header>
        {children}
      </div>
    </main>
  );
}
