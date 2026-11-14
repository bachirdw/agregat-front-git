// Texts of the owner messages sent from this page, by message id: a private mission's
// `owner_message` events carry no text, the interface shows the one it sent. Lost on reload.
const texts = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;
export function rememberOwnerText(id: string, text: string) {
  texts.set(id, text);
  version += 1;
  listeners.forEach((listener) => listener());
}
export const ownerText = (id: string) => texts.get(id);
export const ownerTextsVersion = () => version;
export function subscribeOwnerTexts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
// « Reprendre le texte » on an undelivered message: the page puts it back in its input field.
export const OWNER_DRAFT_EVENT = "relay-owner-draft";
export function reuseOwnerText(text: string) {
  window.dispatchEvent(new CustomEvent(OWNER_DRAFT_EVENT, { detail: text }));
}
