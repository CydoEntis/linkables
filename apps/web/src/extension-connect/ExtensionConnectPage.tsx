import { AuthPage } from "../auth/AuthPage";

export function ExtensionConnectPage() {
  return <AuthPage title="Connect your extension" description="Open the Linkables extension, enter this server address, and sign in with your local account."><p className="break-all font-mono">{window.location.origin}</p></AuthPage>;
}
