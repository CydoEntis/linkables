import { Link } from "@tanstack/react-router";
import { AuthPage } from "../auth/AuthPage";

export function NotFoundPage() {
  return (
    <AuthPage title="Page not found" description="There's nothing at this address.">
      <Link to="/" className="font-semibold text-primary underline-offset-4 hover:underline">
        Go to All links
      </Link>
    </AuthPage>
  );
}
