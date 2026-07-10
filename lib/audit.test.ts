import { beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }));

vi.mock("next/headers", () => ({ headers: headersMock }));

import { adresseIpRequete } from "@/lib/audit";

beforeEach(() => {
  headersMock.mockReset();
});

describe("adresseIpRequete", () => {
  it("retient la premiere adresse IP valide de la chaine proxy", async () => {
    headersMock.mockResolvedValue(
      new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.2" }),
    );

    await expect(adresseIpRequete()).resolves.toBe("203.0.113.10");
  });

  it("ignore une valeur injectee qui depasserait la colonne d'audit", async () => {
    headersMock.mockResolvedValue(
      new Headers({ "x-forwarded-for": "pas-une-ip-avec-du-contenu-arbitraire" }),
    );

    await expect(adresseIpRequete()).resolves.toBeNull();
  });

  it("accepte une adresse IPv6 valide", async () => {
    headersMock.mockResolvedValue(new Headers({ "x-real-ip": "2001:db8::1" }));

    await expect(adresseIpRequete()).resolves.toBe("2001:db8::1");
  });
});
