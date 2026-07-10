import { describe, expect, it } from "vitest";
import { estCheminLogoPublic, extensionLogoValide } from "@/lib/logo-upload";

describe("securite upload logo", () => {
  it("accepte une signature PNG coherente", () => {
    const contenu = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    expect(extensionLogoValide("image/png", contenu)).toBe("png");
  });

  it("refuse un SVG annonce comme image et un contenu incoherent", () => {
    const svg = Buffer.from("<svg><script>alert(1)</script></svg>");
    expect(extensionLogoValide("image/svg+xml", svg)).toBeNull();
    expect(extensionLogoValide("image/png", svg)).toBeNull();
  });

  it("n'autorise que les chemins generes dans le dossier logos", () => {
    expect(
      estCheminLogoPublic(
        "/uploads/logos/logo-123e4567-e89b-12d3-a456-426614174000.jpg",
      ),
    ).toBe(true);
    expect(estCheminLogoPublic("/../../secret.jpg")).toBe(false);
    expect(estCheminLogoPublic("https://example.com/logo.jpg")).toBe(false);
  });
});
