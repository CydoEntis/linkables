import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NotFoundPage } from "../shell/NotFoundPage";
import { type BuiltAssets, marketingDocument, sitemapXml } from "./document";
import { LandingPage } from "./landing/LandingPage";
import { PrivacyPage, SupportPage, TermsPage } from "./legal/LegalPages";
import { LANDING_PAGE, type MarketingPage, NOT_FOUND_PAGE, PRIVACY_PAGE, SUPPORT_PAGE, TERMS_PAGE } from "./pages";

type Prerendered = { page: MarketingPage; element: ReactElement; indexable: boolean; bootsApp: boolean };

const PRERENDERED: Prerendered[] = [
  { page: LANDING_PAGE, element: <LandingPage />, indexable: true, bootsApp: true },
  { page: PRIVACY_PAGE, element: <PrivacyPage />, indexable: true, bootsApp: false },
  { page: TERMS_PAGE, element: <TermsPage />, indexable: true, bootsApp: false },
  { page: SUPPORT_PAGE, element: <SupportPage />, indexable: true, bootsApp: false },
  { page: NOT_FOUND_PAGE, element: <NotFoundPage />, indexable: false, bootsApp: false },
];

export type OutputFile = { file: string; contents: string };

export function renderMarketingFiles(assets: BuiltAssets): OutputFile[] {
  const pages = PRERENDERED.map(({ page, element, indexable, bootsApp }) => ({
    file: page.file,
    contents: marketingDocument({ page, body: renderToStaticMarkup(element), assets, indexable, bootsApp }),
  }));
  const indexed = PRERENDERED.filter((entry) => entry.indexable).map((entry) => entry.page);
  return [...pages, { file: "sitemap.xml", contents: sitemapXml(indexed) }];
}
