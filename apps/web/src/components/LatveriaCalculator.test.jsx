import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { LatveriaCalculator } from "./LatveriaCalculator";

vi.mock("../utils/audioFeedback", () => ({
  sound: {
    playClick: vi.fn(),
    playSelect: vi.fn(),
  },
}));

it("returns null when isOpen is false", () => {
  const html = renderToStaticMarkup(
    <LatveriaCalculator isOpen={false} onClose={() => {}} isAllowed={true} />,
  );
  expect(html).toBe("");
});

it("renders floating draggable calculator widget when isOpen is true", () => {
  const html = renderToStaticMarkup(
    <LatveriaCalculator isOpen={true} onClose={() => {}} isAllowed={true} />,
  );
  expect(html).toContain("latveria-calculator-floating");
  expect(html).toContain("calc-header-drag");
  expect(html).toContain("LATVERIA // CALC-01 ANALYTICAL");
  expect(html).toContain("calc-keypad-grid");
  expect(html).toContain("calc-display-main");
});

it("renders protocol notice when calculator is not allowed for the subtest", () => {
  const html = renderToStaticMarkup(
    <LatveriaCalculator isOpen={true} onClose={() => {}} isAllowed={false} />,
  );
  expect(html).toContain("CALCULATOR UNAVAILABLE FOR THIS SESSION");
  expect(html).toContain("STANDARDIZED PROTOCOL");
  expect(html).toContain("AKTIFKAN UNTUK LATIHAN BEBAS");
});
