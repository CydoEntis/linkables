import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { linksKeys, type LinksPages } from "../links/use-links";
import { savedLink } from "../links/test-links";
import { renderWithRouter, testQueryClient } from "../test/render-with-router";
import { resetViewport, stubViewport } from "../test/viewport";
import { useDockedDetails } from "./docked-details";
import { LinkDetails } from "./LinkDetails";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const newest = savedLink({ resource: { title: "Fushimi Inari Shrine" } });
const older = savedLink({ resource: { title: "Ramen guide" } });

async function renderDocked(path = "/") {
  const queryClient = testQueryClient();
  queryClient.setQueryData<LinksPages>(linksKeys.list("all"), { pages: [{ items: [newest, older], cursor: null }], pageParams: [undefined] });
  return renderWithRouter(<LinkDetails newestLinkId={newest.id} />, { path, queryClient });
}

const panel = () => screen.queryByRole("region", { name: "Link details" });

afterEach(() => {
  resetViewport();
  useDockedDetails.setState({ dismissed: false });
});

describe("the docked details panel", () => {
  it("opens on the newest link at 2200 px and wider, without taking focus", async () => {
    stubViewport(2560);
    await renderDocked();
    expect(within(panel() ?? document.body).getByRole("heading", { name: /Fushimi Inari Shrine/ })).toBeInTheDocument();
    expect(panel()).not.toHaveFocus();
  });

  it("shows the link the user opened instead", async () => {
    stubViewport(2560);
    await renderDocked(`/?link=${older.id}`);
    expect(within(panel() ?? document.body).getByRole("heading", { name: /Ramen guide/ })).toBeInTheDocument();
    expect(panel()).toHaveFocus();
  });

  it("stays closed once the user closes it", async () => {
    stubViewport(2560);
    await renderDocked();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(panel()).not.toBeInTheDocument();
  });

  it("stays shut below 2200 px until a link is opened", async () => {
    stubViewport(1440);
    await renderDocked();
    expect(panel()).not.toBeInTheDocument();
  });
});
