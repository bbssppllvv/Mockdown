import { describe, expect, it } from "vitest";

import {
  dirsToBoxChar,
  getBoxDirs,
  isAnyBoxChar,
  isBoxCorner,
  mergeBoxChars,
} from "./box-chars";

describe("box-chars", () => {
  it("maps junction directions to the expected glyph", () => {
    expect(dirsToBoxChar({ up: true, down: true, left: true, right: true })).toBe("┼");
    expect(dirsToBoxChar({ up: false, down: true, left: false, right: true })).toBe("┌");
    expect(dirsToBoxChar({ up: true, down: false, left: true, right: false })).toBe("┘");
  });

  it("identifies recognised box-drawing characters", () => {
    expect(isAnyBoxChar("┌")).toBe(true);
    expect(isBoxCorner("┘")).toBe(true);
    expect(isAnyBoxChar("a")).toBe(false);
    expect(getBoxDirs("z")).toBeNull();
  });

  it("merges two box glyphs by unioning their direction sets", () => {
    expect(mergeBoxChars("─", "│")).toBe("┼");
    expect(mergeBoxChars("┌", "┐")).toBe("┬");
    expect(mergeBoxChars("a", "│")).toBe("│");
  });
});
