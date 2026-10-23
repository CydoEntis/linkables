import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localDayEnd, localDayStart } from "./date-bounds";

const originalTz = process.env.TZ;

function inZone(zone: string) {
  beforeAll(() => { process.env.TZ = zone; });
  afterAll(() => { process.env.TZ = originalTz; });
}

describe("local day bounds in New York", () => {
  inZone("America/New_York");

  it("covers a winter day from its first to its last millisecond", () => {
    expect(localDayStart("2026-01-15")).toBe("2026-01-15T00:00:00.000-05:00");
    expect(localDayEnd("2026-01-15")).toBe("2026-01-15T23:59:59.999-05:00");
  });

  it("gives each end of the spring-forward day its own offset", () => {
    expect(localDayStart("2026-03-08")).toBe("2026-03-08T00:00:00.000-05:00");
    expect(localDayEnd("2026-03-08")).toBe("2026-03-08T23:59:59.999-04:00");
  });

  it("gives each end of the fall-back day its own offset", () => {
    expect(localDayStart("2026-11-01")).toBe("2026-11-01T00:00:00.000-04:00");
    expect(localDayEnd("2026-11-01")).toBe("2026-11-01T23:59:59.999-05:00");
  });

  it("sends instants the API reads as that local day", () => {
    expect(Date.parse(localDayStart("2026-03-08"))).toBe(Date.UTC(2026, 2, 8, 5));
    expect(Date.parse(localDayEnd("2026-03-08"))).toBe(Date.UTC(2026, 2, 9, 3, 59, 59, 999));
  });
});

describe("local day bounds east of UTC", () => {
  inZone("Asia/Kolkata");

  it("writes a half-hour offset", () => {
    expect(localDayStart("2026-06-01")).toBe("2026-06-01T00:00:00.000+05:30");
  });
});
