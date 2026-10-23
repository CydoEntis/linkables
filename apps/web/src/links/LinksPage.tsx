import { getRouteApi } from "@tanstack/react-router";
import { VIEW_LABELS } from "./links-search";
import { LinksScreen } from "./LinksScreen";

const route = getRouteApi("/");

export function LinksPage() {
  const { view } = route.useSearch();

  return (
    <LinksScreen
      scope={{ view }}
      heading={
        <h1 className="sr-only text-[34px] leading-[1.1] font-bold tracking-[-0.03em] md:not-sr-only md:mt-[30px] md:mb-3.5 md:block">
          {VIEW_LABELS[view]}
        </h1>
      }
    />
  );
}
