import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { type BuiltAssets, marketingDocument, sitemapXml } from "./document";
import { LandingPage } from "./landing/LandingPage";
import { PrivacyPage, SupportPage, TermsPage } from "./legal/LegalPages";
import { LANDING_PAGE, type MarketingPage, PRIVACY_PAGE, SUPPORT_PAGE, TERMS_PAGE } from "./pages";

type Prerendered = { page: MarketingPage; element: ReactElement; bootsApp: boolean };

const PRERENDERED: Prerendered[] = [
  { page: LANDING_PAGE, element: <LandingPage />, bootsApp: true },
  { page: PRIVACY_PAGE, element: <PrivacyPage />, bootsApp: false },
  { page: TERMS_PAGE, element: <TermsPage />, bootsApp: false },
  { page: SUPPORT_PAGE, element: <SupportPage />, bootsApp: false },
];

export type OutputFile = { file: string; contents: string };

export function renderMarketingFiles(assets: BuiltAssets): OutputFile[] {
  const pages = PRERENDERED.map(({ page, element, bootsApp }) => ({
    file: page.file,
    contents: marketingDocument({ page, body: renderToStaticMarkup(element), assets, bootsApp }),
  }));
  return [...pages, { file: "sitemap.xml", contents: sitemapXml(PRERENDERED.map((entry) => entry.page)) }];
}
