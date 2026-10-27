import { useEffect, useState } from "react";
import { readConnection } from "./session";

export function SignedInAs() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void readConnection().then((connection) => { if (current) setEmail(connection?.session?.user.email ?? null); });
    return () => { current = false; };
  }, []);
  return email ? <p title={email} className="max-w-full truncate px-1 text-[11.5px] text-subtle-foreground">Signed in as {email}</p> : null;
}
