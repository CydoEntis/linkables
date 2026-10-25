import { env } from "../../config/env";
import { MarketingShell } from "../MarketingShell";
import { ExtensionSection } from "./ExtensionSection";
import { Faq } from "./Faq";
import { FindSection } from "./FindSection";
import { FinalCta } from "./FinalCta";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { PhoneSection } from "./PhoneSection";
import { PrivacySection } from "./PrivacySection";
import { StoreSection } from "./StoreSection";
import { storeCards } from "./stores";

export function LandingPage() {
  return (
    <MarketingShell>
      <main>
        <Hero />
        <HowItWorks />
        <PhoneSection />
        <ExtensionSection />
        <StoreSection cards={storeCards(env.VITE_IOS_SHORTCUT_URL)} />
        <FindSection />
        <PrivacySection />
        <Faq />
        <FinalCta />
      </main>
    </MarketingShell>
  );
}
