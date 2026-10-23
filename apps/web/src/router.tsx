import { createRootRoute, createRoute, createRouter, stripSearchParams } from "@tanstack/react-router";
import { AuthGate } from "./auth/AuthGate";
import { CollectionPage } from "./collections/CollectionPage";
import { SignInPage } from "./auth/SignInScreen";
import { LinksPage } from "./links/LinksPage";
import { DEFAULT_LINKS_SEARCH, linksSearchSchema } from "./links/links-search";
import { SAVE_PATH } from "./save/pending-save";
import { SavePage } from "./save/SavePage";
import { saveSearchSchema } from "./save/save-search";
import { SAVE_ANYWHERE_PATH, SaveAnywherePage, saveAnywhereSearchSchema } from "./save-anywhere/SaveAnywherePage";
import { listFiltersSchema } from "./search/list-filters";
import { NotFoundPage } from "./shell/NotFoundPage";

const rootRoute = createRootRoute({ component: AuthGate, notFoundComponent: NotFoundPage });

const linksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: linksSearchSchema,
  search: { middlewares: [stripSearchParams(DEFAULT_LINKS_SEARCH)] },
  component: LinksPage,
});

// A collection is a place of its own (shareable later), so it gets a path, not a ?view= value.
const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/c/$collectionId",
  validateSearch: listFiltersSchema,
  component: CollectionPage,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInPage,
});

const saveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: SAVE_PATH,
  validateSearch: saveSearchSchema,
  component: SavePage,
});

const saveAnywhereRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: SAVE_ANYWHERE_PATH,
  validateSearch: saveAnywhereSearchSchema,
  component: SaveAnywherePage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([linksRoute, collectionRoute, signInRoute, saveRoute, saveAnywhereRoute]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
