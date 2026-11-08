import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, SESSION_EXPIRED_EVENT } from "./fit";

const dispatchEvent = vi.fn();
const removeItem = vi.fn();

beforeEach(() => {
  vi.stubGlobal("window", { dispatchEvent });
  vi.stubGlobal("sessionStorage", {
    getItem: () => "test-session",
    removeItem,
  });
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

function response(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status,
      ok: status === 200,
      json: async () =>
        status === 200 ? { plans: [] } : { error: "Debes iniciar sesión" },
    })
  );
}

describe("Puerta de acceso y sesión expirada", () => {
  it("descarta la credencial y notifica al contexto cuando expira una consulta privada", async () => {
    response(401);
    await expect(api("/plans")).rejects.toThrow("Debes iniciar sesión");
    expect(removeItem).toHaveBeenCalledWith("ritmo-session");
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].type).toBe(SESSION_EXPIRED_EVENT);
  });
  it("una contraseña incorrecta no se confunde con una sesión expirada", async () => {
    response(401);
    await expect(api("/login", { method: "POST", body: {} })).rejects.toThrow();
    expect(removeItem).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
  it("la respuesta autenticada mantiene la sesión existente", async () => {
    response(200);
    await expect(api("/plans")).resolves.toEqual({ plans: [] });
    expect(removeItem).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
