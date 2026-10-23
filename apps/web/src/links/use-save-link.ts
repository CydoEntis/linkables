import { saveLinkResponseSchema, type SavedLink } from "@linkables/shared/links";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../api/api";
import { useLinksUi } from "./links-ui-store";
import type { LinksView } from "./links-search";
import { saveProblem } from "./save-link-form";
import { saveSource } from "./save-source";
import { linksKeys, type LinksPages } from "./use-links";

export const SAVE_LINK_KEY = ["save-link"] as const;

// A new save has no collection and is not pinned, so only these lists show it.
const VIEWS_SHOWING_NEW_SAVES: LinksView[] = ["all", "inbox"];

type SaveOptions = { onInvalid?: (message: string) => void };

export function useSaveLink() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: SAVE_LINK_KEY,
    mutationFn: (url: string) =>
      api.request("/links", saveLinkResponseSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, source: saveSource(navigator) }),
      }),
    onMutate: async (url) => {
      await queryClient.cancelQueries({ queryKey: linksKeys.all });
      const placeholder = pendingLink(url, saveSource(navigator));
      updateNewSaveLists(queryClient, (data) => withLink(data, placeholder));
      useLinksUi.getState().hop(placeholder.id);
      return { placeholderId: placeholder.id };
    },
    onSuccess: ({ duplicate, ...saved }, _url, context) => {
      updateNewSaveLists(queryClient, (data) => withLink(withoutLink(data, context.placeholderId), duplicate ? null : saved));
      if (duplicate) {
        toast("Already saved");
        useLinksUi.getState().flash(saved.id);
      }
    },
    onError: (_error, _url, context) => {
      if (context) updateNewSaveLists(queryClient, (data) => withoutLink(data, context.placeholderId));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: linksKeys.all }),
  });

  function save(url: string, { onInvalid }: SaveOptions = {}) {
    mutation.mutate(url, {
      onError: (error) => {
        const problem = saveProblem(error);
        if (problem.kind === "inline" && onInvalid) onInvalid(problem.message);
        else if (problem.kind !== "none") toast.error(problem.message);
      },
    });
  }

  return save;
}

function pendingLink(url: string, source: SavedLink["savedFrom"]): SavedLink {
  return {
    id: crypto.randomUUID(),
    originalUrl: url,
    titleOverride: null,
    note: null,
    pinned: false,
    savedAt: new Date().toISOString(),
    savedFrom: source,
    collections: [],
    resource: {
      id: crypto.randomUUID(),
      canonicalUrl: url,
      title: null,
      description: null,
      author: null,
      faviconUrl: null,
      thumbnailUrl: null,
      kind: null,
      fetchStatus: "pending",
    },
  };
}

function updateNewSaveLists(queryClient: QueryClient, update: (data: LinksPages) => LinksPages) {
  for (const view of VIEWS_SHOWING_NEW_SAVES) {
    queryClient.setQueryData<LinksPages>(linksKeys.list(view), (data) => (data ? update(data) : data));
  }
}

function withoutLink(data: LinksPages, linkId: string): LinksPages {
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== linkId) })) };
}

// A refetch may already have brought the saved link in, so it is never added twice.
function withLink(data: LinksPages, link: SavedLink | null): LinksPages {
  if (link === null) return data;
  const [first, ...rest] = withoutLink(data, link.id).pages;
  if (first === undefined) return data;
  return { ...data, pages: [{ ...first, items: [link, ...first.items] }, ...rest] };
}
