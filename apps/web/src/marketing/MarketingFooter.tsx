import { MarkWordmark } from "./Mark";
import { PRIVACY_PAGE, SUPPORT_EMAIL, SUPPORT_PAGE, TERMS_PAGE } from "./pages";

const LINK = "flex min-h-11 items-center text-muted-foreground hover:text-foreground";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-7 gap-y-4 px-5 pt-8 pb-10 text-[14.5px] text-muted-foreground">
        <span className="text-foreground">
          <MarkWordmark size={20} textClass="text-[15px]" />
        </span>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-[18px] gap-y-1">
          <a href={PRIVACY_PAGE.path} className={LINK}>Privacy</a>
          <a href={TERMS_PAGE.path} className={LINK}>Terms</a>
          <a href={SUPPORT_PAGE.path} className={LINK}>Support</a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK}>{SUPPORT_EMAIL}</a>
        </nav>
        <span className="flex-1" />
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} linkables</span>
          <a href="https://codystine.com" className="text-subtle-foreground hover:text-foreground">
            Made by Cody Stine
          </a>
        </span>
      </div>
    </footer>
  );
}
