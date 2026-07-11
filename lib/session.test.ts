import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleUtilisateur } from "@prisma/client";

const { getSessionMock, findUniqueMock, redirectMock } = vi.hoisted(() => {
  class RedirectionSimulee extends Error {
    constructor(public destination: string) {
      super(`NEXT_REDIRECT:${destination}`);
    }
  }

  return {
    getSessionMock: vi.fn(),
    findUniqueMock: vi.fn(),
    redirectMock: vi.fn((destination: string) => {
      throw new RedirectionSimulee(destination);
    }),
  };
});

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

import {
  cheminAccueilPourRole,
  getUtilisateurSession,
  requireAdmin,
  requireCommercial,
  requireOwnerOrAdmin,
  requireSession,
} from "@/lib/session";

type UtilisateurTest = {
  id: string;
  nom_utilisateur: string;
  nom_complet: string;
  email: string;
  role: RoleUtilisateur;
  actif: boolean;
  deleted_at: Date | null;
};

const utilisateurAdmin: UtilisateurTest = {
  id: "admin-1",
  nom_utilisateur: "admin",
  nom_complet: "Administrateur",
  email: "admin@coq-plus.local",
  role: RoleUtilisateur.ADMIN,
  actif: true,
  deleted_at: null,
};

const utilisateurCommercial: UtilisateurTest = {
  id: "com-1",
  nom_utilisateur: "commercial.nord",
  nom_complet: "Commercial Nord",
  email: "nord@coq-plus.local",
  role: RoleUtilisateur.COMMERCIAL,
  actif: true,
  deleted_at: null,
};

function simulerConnexion(utilisateur: UtilisateurTest | null) {
  if (!utilisateur) {
    getSessionMock.mockResolvedValue(null);
    findUniqueMock.mockResolvedValue(null);
    return;
  }

  getSessionMock.mockResolvedValue({ user: { id: utilisateur.id } });
  findUniqueMock.mockResolvedValue(utilisateur);
}

async function attendreRedirection(action: Promise<unknown>, destination: string) {
  await expect(action).rejects.toThrow(`NEXT_REDIRECT:${destination}`);
}

beforeEach(() => {
  getSessionMock.mockReset();
  findUniqueMock.mockReset();
  redirectMock.mockClear();
});

describe("getUtilisateurSession", () => {
  it("retourne null sans session", async () => {
    simulerConnexion(null);
    expect(await getUtilisateurSession()).toBeNull();
  });

  it("retourne null si l'utilisateur est desactive", async () => {
    simulerConnexion({ ...utilisateurCommercial, actif: false });
    expect(await getUtilisateurSession()).toBeNull();
  });

  it("retourne null si l'utilisateur est soft-delete", async () => {
    simulerConnexion({ ...utilisateurCommercial, deleted_at: new Date() });
    expect(await getUtilisateurSession()).toBeNull();
  });
});

describe("requireSession", () => {
  it("redirige un anonyme vers /connexion", async () => {
    simulerConnexion(null);
    await attendreRedirection(requireSession(), "/connexion");
  });

  it("retourne l'utilisateur connecte", async () => {
    simulerConnexion(utilisateurCommercial);
    const session = await requireSession();
    expect(session.id).toBe("com-1");
    expect(session.role).toBe(RoleUtilisateur.COMMERCIAL);
  });
});

describe("requireAdmin", () => {
  it("redirige un anonyme vers /connexion", async () => {
    simulerConnexion(null);
    await attendreRedirection(requireAdmin(), "/connexion");
  });

  it("bloque un commercial avec /403", async () => {
    simulerConnexion(utilisateurCommercial);
    await attendreRedirection(requireAdmin(), "/403");
  });

  it("laisse passer un admin", async () => {
    simulerConnexion(utilisateurAdmin);
    const session = await requireAdmin();
    expect(session.role).toBe(RoleUtilisateur.ADMIN);
  });
});

describe("requireCommercial", () => {
  it("redirige un anonyme vers /connexion", async () => {
    simulerConnexion(null);
    await attendreRedirection(requireCommercial(), "/connexion");
  });

  it("bloque un admin avec /403", async () => {
    simulerConnexion(utilisateurAdmin);
    await attendreRedirection(requireCommercial(), "/403");
  });

  it("laisse passer un commercial", async () => {
    simulerConnexion(utilisateurCommercial);
    const session = await requireCommercial();
    expect(session.role).toBe(RoleUtilisateur.COMMERCIAL);
  });
});

describe("requireOwnerOrAdmin", () => {
  it("redirige un anonyme vers /connexion", async () => {
    simulerConnexion(null);
    await attendreRedirection(requireOwnerOrAdmin("com-1"), "/connexion");
  });

  it("bloque un commercial sur la ressource d'un autre avec /403", async () => {
    simulerConnexion(utilisateurCommercial);
    await attendreRedirection(requireOwnerOrAdmin("com-2"), "/403");
  });

  it("laisse passer le proprietaire", async () => {
    simulerConnexion(utilisateurCommercial);
    const session = await requireOwnerOrAdmin("com-1");
    expect(session.id).toBe("com-1");
  });

  it("laisse passer un admin sur la ressource d'un commercial", async () => {
    simulerConnexion(utilisateurAdmin);
    const session = await requireOwnerOrAdmin("com-1");
    expect(session.role).toBe(RoleUtilisateur.ADMIN);
  });
});

describe("cheminAccueilPourRole", () => {
  it("routes admin et commercial", () => {
    expect(cheminAccueilPourRole(RoleUtilisateur.ADMIN)).toBe("/admin");
    expect(cheminAccueilPourRole(RoleUtilisateur.COMMERCIAL)).toBe("/commercial");
  });
});
