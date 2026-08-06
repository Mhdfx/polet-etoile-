import { beforeEach, describe, expect, it, vi } from "vitest";

const { auditCreateMock, chargerCommandeMock, requireCommercialMock } = vi.hoisted(
  () => ({
    auditCreateMock: vi.fn(),
    chargerCommandeMock: vi.fn(),
    requireCommercialMock: vi.fn(),
  }),
);

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf")),
}));
vi.mock("@/app/commandes/bon-livraison-pdf", () => ({
  BonLivraisonPdf: () => null,
}));
vi.mock("@/app/commandes/document-data", () => ({
  chargerCommandeDocument: chargerCommandeMock,
}));
vi.mock("@/lib/audit", () => ({
  adresseIpRequete: vi.fn().mockResolvedValue("127.0.0.1"),
}));
vi.mock("@/lib/db", () => ({
  prisma: { auditLog: { create: auditCreateMock } },
}));
vi.mock("@/lib/session", () => ({
  requireCommercial: requireCommercialMock,
}));

import { POST } from "./[id]/pdf/route";

describe("telechargement BL commercial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCommercialMock.mockResolvedValue({ id: "commercial-1" });
    chargerCommandeMock.mockResolvedValue({ numeroBl: "CP-000123" });
    auditCreateMock.mockResolvedValue({ id: "audit-1" });
  });

  it("autorise plusieurs telechargements du meme BL", async () => {
    const contexte = { params: Promise.resolve({ id: "commande-1" }) };

    const premiere = await POST(new Request("http://local"), contexte);
    const seconde = await POST(new Request("http://local"), contexte);

    expect(premiere.status).toBe(200);
    expect(seconde.status).toBe(200);
    expect(auditCreateMock).toHaveBeenCalledTimes(2);
    expect(auditCreateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          action: "document.bl_telechargement_commercial",
          entite_id: "commande-1",
        }),
      }),
    );
  });
});
