import { getRouteApi, Navigate } from "@tanstack/react-router";
import { SAVE_ANYWHERE_PATH } from "../save-anywhere/SaveAnywherePage";
import { welcomeSeen } from "../save-anywhere/welcome";
import { VIEW_LABELS } from "./links-search";
import { LinksScreen } from "./LinksScreen";

const route = getRouteApi("/");

export function LinksPage() {
  const { view } = route.useSearch();
  // The first time this device sees the signed-in app, it shows how to save from
  // anywhere. Only here: a shared /c/… or /save link opens what it points to.
  if (!welcomeSeen()) return <Navigate to={SAVE_ANYWHERE_PATH} search={{ welcome: true }} replace />;

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
