import { describe, expect, it, vi } from "vitest";
import { api, ApiError, toApiInput, uploadFile, watchRun } from "./api";
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
  it("reconnaît un 502 HTML du proxy comme une perte du backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>Bad Gateway</html>", { status: 502 }),
        ),
    );
    await expect(api("/runs/id")).rejects.toThrow("API locale inaccessible");
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
  it("ignore les événements tardifs après la fermeture du flux", () => {
    const source = new FakeSource();
    const handlers = { update: vi.fn(), end: vi.fn(), connection: vi.fn() };
    const close = watchRun(
      "id",
      handlers,
      0,
      () => source as unknown as EventSource,
    );
    close();
    source.onopen?.();
    source.onerror?.();
    source.send("update", {
      seq: 1,
      type: "state",
      data: { state: "running" },
    });
    source.send("end", {});
    expect(handlers.connection).not.toHaveBeenCalled();
    expect(handlers.update).not.toHaveBeenCalled();
    expect(handlers.end).not.toHaveBeenCalled();
  });
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
describe("pièces jointes", () => {
  it("envoie les octets bruts avec nom encodé et type exact déduit de l'extension", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        '{"id":"u1","name":"cv.md","size":5,"type":"text/markdown"}',
        {
          status: 201,
        },
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const file = new File(["FICTIF"], "mon cv é.md", { type: "" });
    expect((await uploadFile(file)).id).toBe("u1");
    const [path, init] = fetcher.mock.calls[0];
    expect(path).toBe("/api/files");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(file);
    expect(init.headers).toEqual({
      "x-platform-request": "1",
      "x-file-name": encodeURIComponent("mon cv é.md"),
      "content-type": "text/markdown",
    });
  });
  it("refuse avant envoi : type, fichier vide, taille", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(uploadFile(new File(["x"], "photo.png"))).rejects.toThrow(
      /Type refusé/,
    );
    await expect(uploadFile(new File([], "vide.txt"))).rejects.toThrow(/vide/);
    const big = new File(["x"], "gros.pdf");
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    await expect(uploadFile(big)).rejects.toThrow(/10 Mo/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("relaie l'erreur du serveur", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"error":"Conversion impossible"}', { status: 400 }),
        ),
    );
    await expect(uploadFile(new File(["x"], "cv.pdf"))).rejects.toThrow(
      "Conversion impossible",
    );
  });
  it("le plan et le run ne reçoivent que les identifiants", () => {
    const base = {
      prompt: "p",
      agent: "auto",
      pack: "auto",
      skills: [],
      model: "",
      budgetCents: 0,
      mode: "agent" as const,
      workflow: "auto",
    };
    expect(toApiInput({ ...base, attachments: [] })).toEqual(base);
    expect(
      toApiInput({
        ...base,
        browserDomains: " Example.com, autre.example.org ",
      }),
    ).toEqual({
      ...base,
      browserDomains: ["example.com", "autre.example.org"],
    });
    expect(
      toApiInput({
        ...base,
        attachments: [
          { id: "u1", name: "cv.pdf", size: 3, type: "application/pdf" },
        ],
      }),
    ).toEqual({ ...base, attachments: ["u1"] });
  });
});
