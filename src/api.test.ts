import { describe, expect, it, vi } from "vitest";
import { api, ApiError, watchRun } from "./api";
describe("client HTTP", () => {
  it("envoie le contrat JSON avec en-tête applicatif et conserve la réponse", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetcher);
    expect(await api("/runs", { prompt: "emploi" })).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/runs",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-platform-request": "1",
        },
        body: '{"prompt":"emploi"}',
      }),
    );
  });
  it("GET sans mutation", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetcher);
    await api("/runs");
    expect(fetcher).toHaveBeenCalledWith("/api/runs", { signal: undefined });
  });
  it("affiche les erreurs métier du serveur", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":"Budget insuffisant"}', { status: 400 }),
        ),
    );
    await expect(api("/runs", {})).rejects.toThrow("Budget insuffisant");
  });
  it("erreurs réseau et réponse invalide lisibles", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(api("/catalog")).rejects.toThrow("API locale inaccessible");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>")));
    await expect(api("/catalog")).rejects.toBeInstanceOf(ApiError);
  });
  it("respecte une requête annulée", async () => {
    const controller = new AbortController();
    controller.abort();
    const failure = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));
    await expect(api("/runs", undefined, controller.signal)).rejects.toBe(
      failure,
    );
  });
});
class FakeSource extends EventTarget {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  send(name: string, data: unknown) {
    this.dispatchEvent(
      new MessageEvent(name, {
        data: typeof data === "string" ? data : JSON.stringify(data),
      }),
    );
  }
}
describe("SSE", () => {
  it("reprend au curseur, déduplique et ferme le flux à end", () => {
    const source = new FakeSource();
    const create = vi.fn(() => source as unknown as EventSource);
    const update = vi.fn(),
      end = vi.fn(),
      connection = vi.fn();
    const close = watchRun("run 1", { update, end, connection }, 7, create);
    expect(create).toHaveBeenCalledWith("/api/runs/run%201/events?after=7");
    source.onopen?.();
    source.send("update", { seq: 7, type: "state", data: {} });
    source.send("update", { seq: 8, type: "step", data: { state: "running" } });
    source.send("update", { seq: 8, type: "step", data: {} });
    expect(update).toHaveBeenCalledTimes(1);
    source.onerror?.();
    expect(connection).toHaveBeenLastCalledWith(false);
    source.send("update", {
      seq: 9,
      type: "state",
      data: { state: "completed" },
    });
    expect(connection).toHaveBeenLastCalledWith(true);
    source.send("end", {});
    expect(end).toHaveBeenCalledTimes(1);
    expect(source.close).toHaveBeenCalled();
    close();
  });
  it("survit à un événement malformé et signale la désynchronisation", () => {
    const source = new FakeSource(),
      connection = vi.fn(),
      update = vi.fn();
    watchRun(
      "id",
      { update, end: vi.fn(), connection },
      0,
      () => source as unknown as EventSource,
    );
    source.send("update", "{");
    source.send("update", { seq: "bad", type: "state", data: {} });
    expect(update).not.toHaveBeenCalled();
    expect(connection).toHaveBeenCalledWith(false);
  });
});
