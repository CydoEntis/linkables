import { useMutationState } from "@tanstack/react-query";
import type { SaveLinkResponse } from "@linkables/shared/links";
import { SAVE_LINK_KEY } from "./use-save-link";

type SaveState = { status: "idle" | "pending" | "success" | "error"; data: SaveLinkResponse | undefined };

function message({ status, data }: SaveState): string {
  if (status === "pending") return "Saving the link…";
  if (status === "success") return data?.duplicate ? "Already saved" : "Link saved";
  return "";
}

// Announces save progress to screen readers; failures are announced by their toast or field alert.
export function SaveStatus() {
  const saves = useMutationState({
    filters: { mutationKey: SAVE_LINK_KEY },
    select: (mutation): SaveState => ({ status: mutation.state.status, data: mutation.state.data as SaveLinkResponse | undefined }),
  });
  const latest = saves.at(-1);
  return (
    <p role="status" className="sr-only">
      {latest ? message(latest) : null}
    </p>
  );
}
