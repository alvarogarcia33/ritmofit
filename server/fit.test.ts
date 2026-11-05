import { describe, expect, it } from "vitest";
import { hashFitPassword, verifyFitPassword } from "./fit";

describe("Ritmo Fit password hashing", () => {
  it("uses a salted scrypt hash and verifies the original password", async () => {
    const password = "Una-clave-segura-2026";
    const encoded = await hashFitPassword(password);

    expect(encoded.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(encoded).not.toContain(password);
    await expect(verifyFitPassword(password, encoded)).resolves.toBe(true);
    await expect(
      verifyFitPassword("otra-clave-incorrecta", encoded)
    ).resolves.toBe(false);
  });

  it("generates a different salt for repeated passwords", async () => {
    const first = await hashFitPassword("Una-clave-segura-2026");
    const second = await hashFitPassword("Una-clave-segura-2026");
    expect(first).not.toBe(second);
  });

  it("rejects malformed encoded hashes", async () => {
    await expect(
      verifyFitPassword("Una-clave-segura-2026", "not-a-scrypt-hash")
    ).resolves.toBe(false);
  });
});
