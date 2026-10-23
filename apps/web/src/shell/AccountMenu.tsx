import { useNavigate } from "@tanstack/react-router";
import { Bookmark, LogOut, Share } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSignedInEmail } from "../auth/auth-state";
import { signOut } from "../auth/supabase";
import { BookmarkletDialog } from "../save/BookmarkletDialog";
import { SAVE_ANYWHERE_PATH } from "../save-anywhere/SaveAnywherePage";

type AccountMenuProps = { showEmail?: boolean; className?: string };

export function AccountMenu({ showEmail = false, className }: AccountMenuProps) {
  const email = useSignedInEmail() ?? "";
  const initial = email.charAt(0).toUpperCase() || "?";
  const [bookmarkletOpen, setBookmarkletOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account"
          className={cn(
            "flex min-h-11 min-w-11 items-center gap-2.5 rounded-md text-left hover:bg-muted data-popup-open:bg-muted",
            showEmail && "w-full px-2.5",
            !showEmail && "justify-center",
            className,
          )}
        >
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-bold">
            {initial}
          </span>
          {showEmail ? <span className="min-w-0 truncate text-[13.5px] text-muted-foreground">{email}</span> : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <p className="truncate px-2.5 pt-1.5 pb-2 text-[12.5px] text-muted-foreground">{email}</p>
          <DropdownMenuItem onClick={() => void navigate({ to: SAVE_ANYWHERE_PATH })}>
            <Share aria-hidden className="text-muted-foreground" />
            Save from anywhere
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setBookmarkletOpen(true); }}>
            <Bookmark aria-hidden className="text-muted-foreground" />
            Get the bookmark button
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void signOut()}>
            <LogOut aria-hidden className="text-muted-foreground" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BookmarkletDialog open={bookmarkletOpen} onOpenChange={setBookmarkletOpen} />
    </>
  );
}
