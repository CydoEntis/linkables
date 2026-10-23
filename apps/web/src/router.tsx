import { createRootRoute, createRoute, createRouter, stripSearchParams } from "@tanstack/react-router";
import { AuthGate } from "./auth/AuthGate";
import { SignInPage } from "./auth/SignInScreen";
import { LinksPage } from "./links/LinksPage";
import { DEFAULT_LINKS_SEARCH, linksSearchSchema } from "./links/links-search";
import { NotFoundPage } from "./shell/NotFoundPage";

const rootRoute = createRootRoute({ component: AuthGate, notFoundComponent: NotFoundPage });

const linksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: linksSearchSchema,
  search: { middlewares: [stripSearchParams(DEFAULT_LINKS_SEARCH)] },
  component: LinksPage,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInPage,
});

export const router = createRouter({ routeTree: rootRoute.addChildren([linksRoute, signInRoute]) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
