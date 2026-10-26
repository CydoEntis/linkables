import { useEffect, useState } from "react";
import { supabase } from "./supabase";

function useSignedInEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (current) setEmail(data.session?.user.email ?? null);
    });
    return () => { current = false; };
  }, []);
  return email;
}

// The extension can sign itself in from linkables.app, so it always says whose
// account it saves to: a wrong one is spotted at once.
export function SignedInAs() {
  const email = useSignedInEmail();
  if (!email) return null;
  return (
    <p title={email} className="max-w-full truncate px-1 text-[11.5px] text-subtle-foreground">
      Signed in as {email}
    </p>
  );
}
