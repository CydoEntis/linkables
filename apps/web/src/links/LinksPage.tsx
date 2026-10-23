import { getRouteApi, Navigate } from "@tanstack/react-router";
import { DropToSave } from "../save-anywhere/DropToSave";
import { SAVE_ANYWHERE_PATH } from "../save-anywhere/SaveAnywherePage";
import { welcomeSeen } from "../save-anywhere/welcome";
import type { FiltersChange } from "../search/list-filters";
import { VIEW_LABELS } from "./links-search";
import { LinksScreen } from "./LinksScreen";

const route = getRouteApi("/");

export function LinksPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { view, ...filters } = search;
  const onFiltersChange: FiltersChange = (patch, { replace = false } = {}) => {
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace });
  };
  // The first time this device sees the signed-in app, it shows how to save from
  // anywhere. Only here: a shared /c/… or /save link opens what it points to.
  if (!welcomeSeen()) return <Navigate to={SAVE_ANYWHERE_PATH} search={{ welcome: true, back: search }} replace />;

  return (
    <>
      <LinksScreen
        scope={{ view }}
        filters={filters}
        onFiltersChange={onFiltersChange}
        heading={
          <h1 className="sr-only text-[34px] leading-[1.1] font-bold tracking-[-0.03em] md:not-sr-only md:mt-[30px] md:mb-3.5 md:block">
            {filters.q === undefined ? VIEW_LABELS[view] : "Search"}
          </h1>
        }
      />
      {/* Not on collection pages: a drop there would land outside the collection on screen. */}
      <DropToSave className="md:left-[286px]" />
    </>
  );
}
