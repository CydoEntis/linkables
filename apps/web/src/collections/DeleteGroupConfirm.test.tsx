import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeleteGroupConfirm } from "./DeleteGroupConfirm";

const NOTICE = "This group isn't shared. Its links will become ungrouped, and visible on the shared page.";

function renderConfirm(becomesPublic: boolean) {
  render(<DeleteGroupConfirm name="Hotels" open pending={false} becomesPublic={becomesPublic} onOpenChange={() => {}} onConfirm={() => {}} />);
}

describe("DeleteGroupConfirm", () => {
  it("says the links become visible on the shared page when the group is unshared and the link is on", () => {
    renderConfirm(true);

    expect(screen.getByText(NOTICE)).toBeInTheDocument();
  });

  it("keeps the usual copy otherwise", () => {
    renderConfirm(false);

    expect(screen.getByText("Its links stay in the collection.")).toBeInTheDocument();
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });
});
