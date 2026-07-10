import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { calculerPrixNet } from "@/lib/decimal";
import { prisma } from "@/lib/db";
import { attribuerNumeroBL } from "@/lib/bl";

const villesMaroc = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fès",
  "Tanger",
  "Agadir",
  "Meknès",
  "Oujda",
  "Kénitra",
  "Tétouan",
  "Safi",
  "Mohammedia",
  "El Jadida",
  "Béni Mellal",
  "Nador",
];

type SeedUtilisateur = {
  nom_utilisateur: string;
  nom_complet: string;
  email: string;
  mot_de_passe: string;
  role: "ADMIN" | "COMMERCIAL";
};

function motDePasseSeed(
  variable: "SEED_ADMIN_PASSWORD" | "SEED_COMMERCIAL_PASSWORD",
  valeurLocale: string,
): string {
  const configure = process.env[variable]?.trim();

  if (configure) {
    if (configure.length < 8) {
      throw new Error(`${variable} doit contenir au moins 8 caracteres`);
    }
    return configure;
  }

  console.warn(
    `[seed] ${variable} non defini — utilisation du mot de passe seed par defaut.`,
  );
  return valeurLocale;
}

const produitsCdc = [
  { nom: "Abats de poulet", categorie: "Abats", prix_reference: "18.00", ordre_affichage: 10 },
  { nom: "Ailes", categorie: "Découpe", prix_reference: "21.00", ordre_affichage: 20 },
  { nom: "Blanc", categorie: "Découpe", prix_reference: "48.00", ordre_affichage: 30 },
  { nom: "Brochettes de Poulet", categorie: "Élaboré", prix_reference: "55.00", ordre_affichage: 40 },
  { nom: "Carcasse", categorie: "Découpe", prix_reference: "8.00", ordre_affichage: 50 },
  { nom: "Chawarma poulet", categorie: "Élaboré", prix_reference: "52.00", ordre_affichage: 60 },
  { nom: "Coquelet", categorie: "Poulet frais", prix_reference: "32.00", ordre_affichage: 70 },
  { nom: "COU", categorie: "Abats", prix_reference: "11.00", ordre_affichage: 80 },
  { nom: "Cuisse entiere", categorie: "Découpe", prix_reference: "28.00", ordre_affichage: 90 },
  { nom: "Cuisse entiere desossee A Peau", categorie: "Découpe", prix_reference: "42.00", ordre_affichage: 100 },
  { nom: "Cuisse entiere desossee SP", categorie: "Découpe", prix_reference: "45.00", ordre_affichage: 110 },
  { nom: "Emince de poulet", categorie: "Élaboré", prix_reference: "50.00", ordre_affichage: 120 },
  { nom: "FOIE", categorie: "Abats", prix_reference: "18.00", ordre_affichage: 130 },
  { nom: "GESIER", categorie: "Abats", prix_reference: "16.00", ordre_affichage: 140 },
  { nom: "HDC Desosse", categorie: "Découpe", prix_reference: "44.00", ordre_affichage: 150 },
  { nom: "HDC Desosse S Peau", categorie: "Découpe", prix_reference: "46.00", ordre_affichage: 160 },
  { nom: "HDC Os & Peau", categorie: "Découpe", prix_reference: "31.00", ordre_affichage: 170 },
  { nom: "HDC Os & S Peau", categorie: "Découpe", prix_reference: "33.00", ordre_affichage: 180 },
  { nom: "KEFTA NATURE OU EPICE", categorie: "Élaboré", prix_reference: "49.00", ordre_affichage: 190 },
  { nom: "Pau", categorie: "Découpe", prix_reference: "12.00", ordre_affichage: 200 },
  { nom: "Petite Viande", categorie: "Découpe", prix_reference: "20.00", ordre_affichage: 210 },
  { nom: "Pilon", categorie: "Découpe", prix_reference: "25.00", ordre_affichage: 220 },
  { nom: "POULET ENTIER", categorie: "Poulet frais", prix_reference: "23.50", ordre_affichage: 230 },
  { nom: "SAUCISSES NATURE OU EPICE", categorie: "Élaboré", prix_reference: "54.00", ordre_affichage: 240 },
  { nom: "Sot-l'y-laisse", categorie: "Découpe", prix_reference: "58.00", ordre_affichage: 250 },
  { nom: "RELIQUAT PAYEMENT", categorie: "Règlement", prix_reference: "1.00", ordre_affichage: 900 },
];

async function upsertUtilisateur(seed: SeedUtilisateur) {
  const existantParNom = await prisma.user.findUnique({
    where: { nom_utilisateur: seed.nom_utilisateur },
  });

  if (existantParNom && existantParNom.email !== seed.email) {
    await prisma.user.update({
      where: { id: existantParNom.id },
      data: {
        nom_utilisateur: `${seed.nom_utilisateur}.archive.${existantParNom.id.slice(0, 8)}`,
        actif: false,
        deleted_at: new Date(),
      },
    });
  }

  const utilisateur = await prisma.user.upsert({
    where: { email: seed.email },
    create: {
      nom_utilisateur: seed.nom_utilisateur,
      nom_complet: seed.nom_complet,
      email: seed.email,
      email_verifie: true,
      role: seed.role,
    },
    update: {
      nom_utilisateur: seed.nom_utilisateur,
      nom_complet: seed.nom_complet,
      email_verifie: true,
      role: seed.role,
      actif: true,
      deleted_at: null,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: utilisateur.id,
      },
    },
    create: {
      providerId: "credential",
      accountId: utilisateur.id,
      userId: utilisateur.id,
      password: await hashPassword(seed.mot_de_passe),
    },
    update: {
      password: await hashPassword(seed.mot_de_passe),
    },
  });

  return utilisateur;
}

async function main() {
  const motDePasseAdmin = motDePasseSeed("SEED_ADMIN_PASSWORD", "password");
  const motDePasseCommercial = motDePasseSeed("SEED_COMMERCIAL_PASSWORD", "password");

  await prisma.compteurBl.upsert({
    where: { cle: "numero_bl" },
    create: { cle: "numero_bl", valeur: 0 },
    update: {},
  });

  const admin = await upsertUtilisateur({
    nom_utilisateur: "admin",
    nom_complet: "Administrateur",
    email: "admin@poulet-etoile.local",
    mot_de_passe: motDePasseAdmin,
    role: "ADMIN",
  });

  const commercialCom1 = await upsertUtilisateur({
    nom_utilisateur: "com1",
    nom_complet: "Commercial 1",
    email: "commercial.nord@poulet-etoile.local",
    mot_de_passe: motDePasseCommercial,
    role: "COMMERCIAL",
  });

  const commercialCom2 = await upsertUtilisateur({
    nom_utilisateur: "com2",
    nom_complet: "Commercial 2",
    email: "commercial.sud@poulet-etoile.local",
    mot_de_passe: motDePasseCommercial,
    role: "COMMERCIAL",
  });

  await prisma.parametreSysteme.createMany({
    data: [
      { cle: "raison_sociale", valeur: "Poulet Étoilé", updated_by: admin.id },
      { cle: "ice", valeur: "000000000000000", updated_by: admin.id },
      { cle: "rc", valeur: "RC Casablanca 000000", updated_by: admin.id },
      { cle: "prefixe_bl", valeur: "PE", updated_by: admin.id },
      { cle: "fuseau_horaire", valeur: "Africa/Casablanca", updated_by: admin.id },
      { cle: "taux_tva", valeur: "0", updated_by: admin.id },
      { cle: "villes_maroc", valeur: JSON.stringify(villesMaroc), updated_by: admin.id },
    ],
    skipDuplicates: true,
  });

  for (const produit of produitsCdc) {
    await prisma.produit.upsert({
      where: { id: `seed-produit-${produit.ordre_affichage}` },
      create: {
        id: `seed-produit-${produit.ordre_affichage}`,
        nom: produit.nom,
        categorie: produit.categorie,
        unite: "kg",
        prix_reference: produit.prix_reference,
        ordre_affichage: produit.ordre_affichage,
      },
      update: {
        nom: produit.nom,
        categorie: produit.categorie,
        prix_reference: produit.prix_reference,
        actif: true,
        deleted_at: null,
      },
    });
  }

  await prisma.produit.upsert({
    where: { id: "seed-produit-desactive" },
    create: {
      id: "seed-produit-desactive",
      nom: "Produit désactivé recette",
      categorie: "Recette",
      unite: "kg",
      prix_reference: "10.00",
      actif: false,
      ordre_affichage: 999,
      deleted_at: new Date(),
    },
    update: {
      actif: false,
      deleted_at: new Date(),
    },
  });

  const clientSansCommande = await prisma.client.upsert({
    where: { id: "seed-client-sans-commande" },
    create: {
      id: "seed-client-sans-commande",
      nom: "Client sans commande",
      region_ville: "Casablanca",
      telephone: "0600000000",
      commercial_id: commercialCom1.id,
    },
    update: {
      commercial_id: commercialCom1.id,
      actif: true,
      deleted_at: null,
    },
  });

  const clientBoucherie = await prisma.client.upsert({
    where: { id: "seed-client-boucherie-atlas" },
    create: {
      id: "seed-client-boucherie-atlas",
      nom: "Boucherie Atlas",
      region_ville: "Casablanca",
      telephone: "0611111111",
      commercial_id: commercialCom1.id,
    },
    update: {
      commercial_id: commercialCom1.id,
      actif: true,
      deleted_at: null,
    },
  });

  const clientRestaurant = await prisma.client.upsert({
    where: { id: "seed-client-restaurant-sud" },
    create: {
      id: "seed-client-restaurant-sud",
      nom: "Restaurant Sud",
      region_ville: "Marrakech",
      telephone: "0622222222",
      commercial_id: commercialCom2.id,
    },
    update: {
      commercial_id: commercialCom2.id,
      actif: true,
      deleted_at: null,
    },
  });

  const clientExterne = await prisma.clientExterne.upsert({
    where: { id: "seed-client-externe-traiteur" },
    create: {
      id: "seed-client-externe-traiteur",
      nom: "Traiteur Externe",
      region_ville: "Rabat",
      telephone: "0633333333",
    },
    update: {
      actif: true,
      deleted_at: null,
    },
  });

  await prisma.objectif.upsert({
    where: { utilisateur_id_mois: { utilisateur_id: commercialCom1.id, mois: "2026-07" } },
    create: {
      utilisateur_id: commercialCom1.id,
      mois: "2026-07",
      montant_objectif: "60000.00",
      created_by: admin.id,
    },
    update: {
      montant_objectif: "60000.00",
      created_by: admin.id,
    },
  });

  await prisma.objectif.upsert({
    where: { utilisateur_id_mois: { utilisateur_id: commercialCom2.id, mois: "2026-07" } },
    create: {
      utilisateur_id: commercialCom2.id,
      mois: "2026-07",
      montant_objectif: "45000.00",
      created_by: admin.id,
    },
    update: {
      montant_objectif: "45000.00",
      created_by: admin.id,
    },
  });

  await prisma.$transaction(async (tx) => {
    const commandeExistante = await tx.commande.findUnique({ where: { id: "seed-commande-payee" } });

    if (!commandeExistante) {
      const bl = await attribuerNumeroBL(tx);
      const ligne1 = calculerPrixNet("120.000", "23.50");
      const ligne2 = calculerPrixNet("35.500", "48.00");
      const total = ligne1.plus(ligne2);

      await tx.commande.create({
        data: {
          id: "seed-commande-payee",
          numero_bl: bl.numeroBl,
          numero_bl_compteur: bl.compteur,
          client_id: clientBoucherie.id,
          utilisateur_id: commercialCom1.id,
          date_commande: new Date("2026-07-08T10:00:00.000Z"),
          lignes: {
            create: [
              {
                produit_id: "seed-produit-10",
                quantite: "120.000",
                prix_unitaire: "23.50",
                prix_net: ligne1.toFixed(2),
              },
              {
                produit_id: "seed-produit-30",
                quantite: "35.500",
                prix_unitaire: "48.00",
                prix_net: ligne2.toFixed(2),
              },
            ],
          },
          paiements: {
            create: {
              montant: total.toFixed(2),
              mode_paiement: "ESPECES",
              date_paiement: new Date("2026-07-08T15:00:00.000Z"),
              encaisse_par: admin.id,
            },
          },
        },
      });
    }
  });

  await prisma.$transaction(async (tx) => {
    const commandeExistante = await tx.commande.findUnique({ where: { id: "seed-commande-partielle" } });

    if (!commandeExistante) {
      const bl = await attribuerNumeroBL(tx);
      const ligne = calculerPrixNet("80.000", "28.00");

      await tx.commande.create({
        data: {
          id: "seed-commande-partielle",
          numero_bl: bl.numeroBl,
          numero_bl_compteur: bl.compteur,
          client_id: clientRestaurant.id,
          utilisateur_id: commercialCom2.id,
          date_commande: new Date("2026-07-08T18:30:00.000Z"),
          lignes: {
            create: {
              produit_id: "seed-produit-20",
              quantite: "80.000",
              prix_unitaire: "28.00",
              prix_net: ligne.toFixed(2),
            },
          },
          paiements: {
            create: {
              montant: "500.00",
              mode_paiement: "CHEQUE",
              reference: "CHQ-TEST-001",
              date_paiement: new Date("2026-07-08T19:00:00.000Z"),
              encaisse_par: admin.id,
            },
          },
        },
      });
    }
  });

  await prisma.$transaction(async (tx) => {
    const commandeExistante = await tx.commande.findUnique({ where: { id: "seed-commande-externe" } });

    if (!commandeExistante) {
      const bl = await attribuerNumeroBL(tx);
      const ligne = calculerPrixNet("50.000", "21.00");

      await tx.commande.create({
        data: {
          id: "seed-commande-externe",
          numero_bl: bl.numeroBl,
          numero_bl_compteur: bl.compteur,
          client_externe_id: clientExterne.id,
          utilisateur_id: commercialCom1.id,
          type_commande: "EXTERNE",
          date_commande: new Date("2026-07-09T09:00:00.000Z"),
          lignes: {
            create: {
              produit_id: "seed-produit-40",
              quantite: "50.000",
              prix_unitaire: "21.00",
              prix_net: ligne.toFixed(2),
            },
          },
        },
      });
    }
  });

  const volumeExistant = await prisma.commande.count({
    where: { id: { startsWith: "seed-volume-" } },
  });

  if (volumeExistant < 1000) {
    const produitsVolume = await prisma.produit.findMany({
      where: { actif: true, deleted_at: null, nom: { not: "RELIQUAT PAYEMENT" } },
      orderBy: { ordre_affichage: "asc" },
      select: { id: true, prix_reference: true },
    });
    const clientsVolume = [clientBoucherie, clientRestaurant];
    const commerciauxVolume = [commercialCom1, commercialCom2];

    for (let index = volumeExistant; index < 1000; index += 1) {
      const produit = produitsVolume[index % produitsVolume.length];
      const client = clientsVolume[index % clientsVolume.length];
      const commercial = commerciauxVolume[index % commerciauxVolume.length];
      const quantite = `${(10 + (index % 90) + (index % 3) * 0.25).toFixed(3)}`;
      const prixNet = calculerPrixNet(quantite, produit.prix_reference);
      const dateCommande = new Date(
        Date.UTC(2026, index % 12, (index % 27) + 1, 9 + (index % 8), 0, 0),
      );
      const idCommande = `seed-volume-${String(index + 1).padStart(4, "0")}`;

      await prisma.$transaction(async (tx) => {
        const existante = await tx.commande.findUnique({ where: { id: idCommande } });
        if (existante) {
          return;
        }
        const bl = await attribuerNumeroBL(tx);
        await tx.commande.create({
          data: {
            id: idCommande,
            numero_bl: bl.numeroBl,
            numero_bl_compteur: bl.compteur,
            client_id: client.id,
            utilisateur_id: commercial.id,
            date_commande: dateCommande,
            lignes: {
              create: {
                produit_id: produit.id,
                quantite,
                prix_unitaire: produit.prix_reference,
                prix_net: prixNet.toFixed(2),
              },
            },
            ...(index % 4 === 0
              ? {
                  paiements: {
                    create: {
                      montant: prixNet.toFixed(2),
                      mode_paiement: "ESPECES",
                      date_paiement: dateCommande,
                      encaisse_par: admin.id,
                    },
                  },
                }
              : index % 4 === 1
                ? {
                    paiements: {
                      create: {
                        montant: prixNet.div(2).toFixed(2),
                        mode_paiement: "CHEQUE",
                        reference: `VOL-${index + 1}`,
                        date_paiement: dateCommande,
                        encaisse_par: admin.id,
                      },
                    },
                  }
                : {}),
          },
        });
      });
    }
  }

  await prisma.retour.create({
    data: {
      produit_id: "seed-produit-10",
      quantite_kg: "4.500",
      commentaire: "Retour magasin test",
      utilisateur_id: commercialCom1.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      utilisateur_id: admin.id,
      action: "SEED",
      entite: "base",
      entite_id: clientSansCommande.id,
      donnees_apres: { message: "Seed initial chargé" },
      ip_address: "127.0.0.1",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
