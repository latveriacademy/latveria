import { describe, expect, it, vi } from "vitest";
import { sound } from "./audioFeedback";

describe("SoundEngine", () => {
  it("initializes with sound enabled and unsuppressed", () => {
    expect(sound.enabled).toBe(true);
    expect(sound.suppressed).toBe(false);
    expect(sound.isPlayable()).toBe(true);
  });

  it("suppresses and unsuppresses audio feedback", () => {
    sound.suppress(true);
    expect(sound.suppressed).toBe(true);
    expect(sound.isPlayable()).toBe(false);

    sound.suppress(false);
    expect(sound.suppressed).toBe(false);
    expect(sound.isPlayable()).toBe(true);
  });

  it("does not play when disabled or suppressed", () => {
    const initSpy = vi.spyOn(sound, "init");

    sound.enabled = false;
    sound.suppress(false);
    sound.playClick();
    expect(initSpy).not.toHaveBeenCalled();

    sound.enabled = true;
    sound.suppress(true);
    sound.playClick();
    sound.playSelect();
    sound.playSuccess();
    expect(initSpy).not.toHaveBeenCalled();

    sound.suppress(false);
  });
});
