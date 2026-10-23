import { getRouteApi, Link } from "@tanstack/react-router";
import { z } from "zod";
import { env } from "../config/env";
import { Wordmark } from "../shell/Wordmark";
import { currentSaveDevice } from "./save-device";
import { SaveAnywhereSteps } from "./SaveAnywhereSteps";

export const SAVE_ANYWHERE_PATH = "/save-from-anywhere";

// welcome: shown as the first-sign-in prompt, which the user may skip.
export const saveAnywhereSearchSchema = z.object({ welcome: z.boolean().optional().catch(undefined) });

const route = getRouteApi(SAVE_ANYWHERE_PATH);

export function SaveAnywherePage() {
  const { welcome = false } = route.useSearch();
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[600px] flex-col gap-6 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-16 md:pt-10">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="flex min-h-11 items-center rounded-md" aria-label="linkables, All links">
          <Wordmark />
        </Link>
        <Link to="/" className="flex min-h-11 items-center rounded-md px-2 text-[14.5px] font-semibold text-muted-foreground hover:text-foreground">
          {welcome ? "Skip" : "Back to links"}
        </Link>
      </header>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.03em] md:text-[34px]">Save from anywhere</h1>
        <p className="text-[15px] leading-normal text-muted-foreground">Save a link from wherever you are, without copy and paste.</p>
      </div>
      <SaveAnywhereSteps device={currentSaveDevice()} shortcutUrl={env.VITE_IOS_SHORTCUT_URL} />
    </main>
  );
}
