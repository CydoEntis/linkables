import { Link } from "@tanstack/react-router";
import { Bookmark, ChevronRight, ExternalLink, MonitorSmartphone, Puzzle, Smartphone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { env } from "../config/env";
import { CHROME_WEB_STORE_URL, EXTENSION_GUIDE_PATH } from "../extension-guide/path";
import { BookmarkletDialog } from "../save/BookmarkletDialog";
import { useInstallPrompt } from "../save-anywhere/install-prompt";
import { SAVE_ANYWHERE_PATH } from "../save-anywhere/SaveAnywherePage";
import { SettingsSection } from "./SettingsSection";

const TILE_ACTION = "h-9 px-[13px] text-[13px] font-bold";
const TILE_LINK = cn(buttonVariants({ variant: "ghost" }), TILE_ACTION);

type EverywhereSectionProps = { shortcutUrl?: string | undefined; storeUrl?: string | undefined };

// shortcut: no tile shows "Installed ✓" yet; the web app cannot tell whether the extension is installed.
export function EverywhereSection({ shortcutUrl = env.VITE_IOS_SHORTCUT_URL, storeUrl = CHROME_WEB_STORE_URL }: EverywhereSectionProps) {
  return (
    <SettingsSection title="Get linkables everywhere">
      <div className="grid gap-px bg-border sm:grid-cols-2">
        <Tile icon={<Puzzle />} name="Chrome extension" detail="Save the tab you're on in one click.">
          {storeUrl ? (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className={TILE_LINK}>
              Add to Chrome
              <ExternalLink aria-hidden />
            </a>
          ) : (
            <Link to={EXTENSION_GUIDE_PATH} className={TILE_LINK}>
              Add to Chrome
            </Link>
          )}
        </Tile>
        <Tile
          icon={<Smartphone />}
          name="iPhone"
          detail={shortcutUrl ? "Add the Save to linkables Shortcut, then save from Share in any app." : "The iPhone shortcut is coming soon."}
        >
          {shortcutUrl ? (
            <a href={shortcutUrl} target="_blank" rel="noopener noreferrer" className={TILE_LINK}>
              Get the Shortcut
              <ExternalLink aria-hidden />
            </a>
          ) : null}
        </Tile>
        <InstallTile />
        <BookmarkTile />
      </div>
      <Link
        to={SAVE_ANYWHERE_PATH}
        className="flex min-h-[52px] items-center justify-between border-t border-border px-[18px] text-[15px] font-semibold hover:bg-row-hover"
      >
        All the ways to save
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      </Link>
    </SettingsSection>
  );
}

type TileProps = { icon: ReactNode; name: string; detail: string; children?: ReactNode };

function Tile({ icon, name, detail, children }: TileProps) {
  return (
    <div className="flex flex-col gap-2.5 bg-card p-[18px]">
      <span aria-hidden className="flex size-9 items-center justify-center rounded-[10px] bg-accent [&_svg]:size-[18px]">
        {icon}
      </span>
      <h3 className="text-[15px] font-bold">{name}</h3>
      <p className="flex-1 text-[13.5px] leading-normal text-muted-foreground">{detail}</p>
      {children ? <div className="self-start">{children}</div> : null}
    </div>
  );
}

// The browser's own install dialog where it offers one; elsewhere, how to add it by hand.
function InstallTile() {
  const install = useInstallPrompt();
  const name = "Android and desktop app";
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return <Tile icon={<MonitorSmartphone />} name={name} detail="You're using the installed app." />;
  }
  if (!install) {
    return (
      <Tile
        icon={<MonitorSmartphone />}
        name={name}
        detail="In Chrome on Android, tap ⋮, then Install app. On a computer, use Install in the address bar."
      />
    );
  }
  return (
    <Tile icon={<MonitorSmartphone />} name={name} detail="Install linkables like an app. On Android it shows up in Share.">
      <Button variant="ghost" className={TILE_ACTION} onClick={install}>
        Install
      </Button>
    </Tile>
  );
}

function BookmarkTile() {
  const [open, setOpen] = useState(false);
  return (
    <Tile icon={<Bookmark />} name="Bookmark button" detail="A bookmark that saves the page you're on. Works in any browser.">
      <Button variant="ghost" className={TILE_ACTION} onClick={() => { setOpen(true); }}>
        Get the button
      </Button>
      <BookmarkletDialog open={open} onOpenChange={setOpen} />
    </Tile>
  );
}
