import { useEffect, useRef } from "react";
import type { RefObject, UIEvent } from "react";

// Keeps a scroll container at the bottom while content grows, unless the user scrolled up.
export function useFollow(
  scroll: RefObject<HTMLElement | null>,
  active: boolean,
  content: unknown,
) {
  const stick = useRef(true);
  useEffect(() => {
    const el = scroll.current;
    if (active && el && stick.current) el.scrollTo({ top: el.scrollHeight });
  }, [scroll, active, content]);
  return (e: UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
}
