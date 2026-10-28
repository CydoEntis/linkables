import { Link } from "@tanstack/react-router";
import { Wordmark } from "../shell/Wordmark";

export function ExtensionGuidePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[600px] flex-col gap-6 px-4 py-10">
      <Link to="/" aria-label="linkables, All links"><Wordmark /></Link>
      <h1 className="text-3xl font-bold">Linkables browser extensions</h1>
      <p>Use the free Chrome or Firefox extension with your own server. Saving, collections, the side panel, and keyboard shortcuts connect to the instance you choose.</p>
      <a href="/downloads/linkables-firefox.xpi" className="self-start rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground">Add to Firefox</a>
      <ol className="list-decimal space-y-4 pl-5">
        <li>Download the <a href="/downloads/linkables-chrome.zip" download className="underline">Chrome package</a> or <a href="/downloads/linkables-firefox-source.zip" download className="underline">Firefox source package</a> for this instance.</li>
        <li>For Chrome, unzip the Chrome package, open chrome://extensions, enable Developer mode, then choose Load unpacked.</li>
        <li>For Firefox, choose Add to Firefox above and allow installation. Developers can alternatively load the source package's manifest.json through about:debugging; temporary installs end when Firefox restarts.</li>
        <li>Open the extension and enter this server address: <code className="break-all">{window.location.origin}</code>.</li>
        <li>Allow access to the selected server and sign in with your local email and password.</li>
      </ol>
      <p>Private Tailscale instances require a connection to that network. Older hosted-service extension releases do not support this version.</p>
    </main>
  );
}
