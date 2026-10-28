import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject, UIEvent } from "react";

// The user is "at the bottom" only within this distance. A loose threshold made small layout
// changes (dock resize) snap the page back down whenever the user tried to scroll up.
const BOTTOM = 2;
const distance = (el: HTMLElement) =>
  el.scrollHeight - el.scrollTop - el.clientHeight;

// Keeps a scroll container at the bottom while content grows. Following stops as soon as the
// user scrolls up (wheel, touch, keys, scrollbar) and resumes only when they come back to the
// bottom themselves or call `toBottom`.
export function useFollow(
  scroll: RefObject<HTMLElement | null>,
  active: boolean,
  content: unknown,
  scope: unknown,
) {
  const stuck = useRef(true);
  const last = useRef(0);
  const [away, setAway] = useState(false);
  const set = useCallback((value: boolean) => {
    stuck.current = value;
    setAway(!value);
  }, []);
  useEffect(() => {
    set(true);
  }, [scope, set]);
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    if (active && stuck.current) el.scrollTo({ top: el.scrollHeight });
    last.current = el.scrollTop;
  }, [scroll, active, content]);
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    let touchY = 0;
    const up = () => set(false);
    const wheel = (e: WheelEvent) => {
      if (e.deltaY < 0) up();
    };
    const start = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const move = (e: TouchEvent) => {
      // A finger moving down scrolls the content up.
      if ((e.touches[0]?.clientY ?? 0) > touchY + 1) up();
    };
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']"))
        return;
      if (["ArrowUp", "PageUp", "Home"].includes(e.key)) up();
    };
    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      window.removeEventListener("keydown", key);
    };
  }, [scroll, scope, set]);
  const onScroll = (e: UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    // Only a falling scrollTop is a scroll up: a dock that grows shrinks the feed and
    // lengthens the distance to the bottom without the user moving.
    if (distance(el) <= BOTTOM) set(true);
    else if (el.scrollTop < last.current - 1) set(false);
    last.current = el.scrollTop;
  };
  const toBottom = useCallback(() => {
    const el = scroll.current;
    if (!el) return;
    const calm =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: calm ? "auto" : "smooth" });
    set(true);
  }, [scroll, set]);
  return { onScroll, stuck, away, toBottom };
}
