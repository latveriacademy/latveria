import React, { useRef } from "react";

export function useChatSwipe({
  activeTab,
  onSwipeToDm,
  onSwipeToGlobal,
}: {
  activeTab: "global" | "dm";
  onSwipeToDm: () => void;
  onSwipeToGlobal: () => void;
}) {
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, button, a, [role='button']")) return;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    const deltaTime = Date.now() - dragStartRef.current.time;
    dragStartRef.current = null;

    if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaTime <= 600) {
      if (deltaX < 0 && activeTab === "global") {
        onSwipeToDm();
      } else if (deltaX > 0 && activeTab === "dm") {
        onSwipeToGlobal();
      }
    }
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
  };

  return {
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
  };
}
