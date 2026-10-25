import { createRootRoute, createRoute, createRouter, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";
import { RequestAccessPage } from "./access/RequestAccessPage";
import { AuthGate } from "./auth/AuthGate";
import { REQUEST_ACCESS_PATH } from "./config/access";
import { linkDetailsSearchShape } from "./link-details/details-search";
import { CollectionPage } from "./collections/CollectionPage";
import { ExtensionGuidePage } from "./extension-guide/ExtensionGuidePage";
import { EXTENSION_GUIDE_PATH } from "./extension-guide/path";
import { SignInPage } from "./auth/SignInScreen";
import { LinksPage } from "./links/LinksPage";
import { DEFAULT_LINKS_SEARCH, linksSearchSchema } from "./links/links-search";
import { PrivacyPage, SupportPage, TermsPage } from "./marketing/legal/LegalPages";
import { PRIVACY_PAGE, SUPPORT_PAGE, TERMS_PAGE } from "./marketing/pages";
import { SAVE_PATH } from "./save/pending-save";
import { SavePage } from "./save/SavePage";
import { saveSearchSchema } from "./save/save-search";
import { SAVE_ANYWHERE_PATH, SaveAnywherePage, saveAnywhereSearchSchema } from "./save-anywhere/SaveAnywherePage";
import { SETTINGS_PATH } from "./settings/path";
import { SettingsPage } from "./settings/SettingsPage";
import { listFiltersShape, orderRange } from "./search/list-filters";
import { SHARED_PATH_PREFIX } from "./sharing/path";
import { SharedCollectionPage } from "./sharing/SharedCollectionPage";
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
  validateSearch: z.object({ ...listFiltersShape, ...linkDetailsSearchShape }).transform(orderRange),
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

// Served as prerendered HTML in production; these routes render them in dev and on in-app navigation.
const legalRoutes = [
  createRoute({ getParentRoute: () => rootRoute, path: PRIVACY_PAGE.path, component: PrivacyPage }),
  createRoute({ getParentRoute: () => rootRoute, path: TERMS_PAGE.path, component: TermsPage }),
  createRoute({ getParentRoute: () => rootRoute, path: SUPPORT_PAGE.path, component: SupportPage }),
];

// Not prerendered: the form needs the app to submit, so Caddy serves the SPA shell here.
const requestAccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: REQUEST_ACCESS_PATH,
  component: RequestAccessPage,
});

// Public: the AuthGate lets anyone through, signed in or not.
const sharedCollectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: `${SHARED_PATH_PREFIX}$token`,
  component: SharedCollectionPage,
});

const extensionGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: EXTENSION_GUIDE_PATH,
  component: ExtensionGuidePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: SETTINGS_PATH,
  component: SettingsPage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([linksRoute, collectionRoute, signInRoute, saveRoute, saveAnywhereRoute, settingsRoute, extensionGuideRoute, requestAccessRoute, sharedCollectionRoute, ...legalRoutes]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
