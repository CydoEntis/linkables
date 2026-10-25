import { createRootRoute, createRoute, createRouter, redirect, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";
import { RequestAccessPage } from "./access/RequestAccessPage";
import { AuthGate } from "./auth/AuthGate";
import { REQUEST_ACCESS_PATH } from "./config/access";
import { LinkPage } from "./link-page/LinkPage";
import { oldLinkSearchShape, redirectOldLinkAddress } from "./link-page/old-link-address";
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
import { AccountDeletedPage } from "./settings/AccountDeletedPage";
import { ACCOUNT_DELETED_PATH, SETTINGS_PATH } from "./settings/path";
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
  beforeLoad: redirectOldLinkAddress,
  component: LinksPage,
});

// A collection is a place of its own (shareable later), so it gets a path, not a ?view= value.
const collectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/c/$collectionId",
  validateSearch: z.object({ ...listFiltersShape, ...oldLinkSearchShape }).transform(orderRange),
  beforeLoad: redirectOldLinkAddress,
  component: CollectionPage,
});

// Signed in only: the page reads the owner's own saved link, so a shared
// collection never links here.
const linkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/l/$linkId",
  component: LinkPage,
});

// The reader had its own address before it became the link page's body.
const oldReaderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/l/$linkId/read",
  beforeLoad: ({ params }) => redirect({ to: "/l/$linkId", params, replace: true, throw: true }),
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

const accountDeletedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ACCOUNT_DELETED_PATH,
  component: AccountDeletedPage,
});

// Restoring scroll brings a list back where it was when Back leaves a link's page.
export const router = createRouter({
  scrollRestoration: true,
  routeTree: rootRoute.addChildren([linksRoute, collectionRoute, linkRoute, oldReaderRoute, signInRoute, saveRoute, saveAnywhereRoute, settingsRoute, accountDeletedRoute, extensionGuideRoute, requestAccessRoute, sharedCollectionRoute, ...legalRoutes]),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
