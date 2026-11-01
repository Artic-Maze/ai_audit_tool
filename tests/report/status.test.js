import { describe, expect, it } from "vitest";
import { GRADE_STATUS, speedStatus } from "../../lib/report/status.js";

describe("speedStatus", () => {
  it.each([
    ["score", 90, "good"],
    ["score", 89, "warning"],
    ["score", 50, "warning"],
    ["score", 49, "critical"],
    ["lcpMs", 2500, "good"],
    ["lcpMs", 4000, "warning"],
    ["lcpMs", 4001, "critical"],
    ["cls", 0.1, "good"],
    ["cls", 0.25, "warning"],
    ["cls", 0.26, "critical"],
    ["inpMs", 200, "good"],
    ["inpMs", 500, "warning"],
    ["inpMs", 501, "critical"],
  ])("%s %d is %s", (metric, value, status) => {
    expect(speedStatus(metric, value)).toBe(status);
  });

  it("has no status without a value", () => {
    expect(speedStatus("inpMs", null)).toBeNull();
    expect(speedStatus("lcpMs", undefined)).toBeNull();
  });
});

describe("GRADE_STATUS", () => {
  it("maps every grade to a status level", () => {
    expect(GRADE_STATUS).toEqual({
      good: "good",
      needs_work: "warning",
      big_opportunity: "serious",
    });
  });
});
