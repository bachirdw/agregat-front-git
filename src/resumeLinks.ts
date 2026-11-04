// The back may open a new agent session on resume and send no `resumedFrom`: the front then
// keeps the link it knows when the user replies, so the thread can still show earlier turns.
const KEY = "agre-resumed-from";

function read(): Record<string, string> {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function rememberResume(child: string, parent: string) {
  if (!child || !parent || child === parent) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [child]: parent }));
  } catch {
    /* Private browsing may disable storage: the thread then shows this turn only. */
  }
}

export function resumedFromLinks(): Record<string, string> {
  return read();
}
