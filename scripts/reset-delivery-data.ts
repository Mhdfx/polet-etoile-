import "dotenv/config";
import { prisma } from "@/lib/db";

async function main() {
  const avant = {
    users: await prisma.user.count(),
    commandes: await prisma.commande.count(),
    clients: await prisma.client.count(),
    clientsExternes: await prisma.clientExterne.count(),
    produits: await prisma.produit.count(),
    audits: await prisma.auditLog.count(),
  };

  await prisma.$transaction(async (tx) => {
    await tx.paiement.deleteMany({});
    await tx.ligneCommande.deleteMany({});
    await tx.commande.deleteMany({});
    await tx.ligneBonCharge.deleteMany({});
    await tx.bonCharge.deleteMany({});
    await tx.retour.deleteMany({});
    await tx.historiquePrix.deleteMany({});
    await tx.objectif.deleteMany({});
    await tx.client.deleteMany({});
    await tx.clientExterne.deleteMany({});
    await tx.auditLog.deleteMany({});
    await tx.produit.deleteMany({});
    await tx.session.deleteMany({});
    await tx.compteurBl.upsert({
      where: { cle: "numero_bl" },
      create: { cle: "numero_bl", valeur: 0 },
      update: { valeur: 0 },
    });
    await tx.compteurBl.upsert({
      where: { cle: "numero_bc" },
      create: { cle: "numero_bc", valeur: 0 },
      update: { valeur: 0 },
    });
  });

  const apres = {
    users: await prisma.user.count(),
    commandes: await prisma.commande.count(),
    clients: await prisma.client.count(),
    clientsExternes: await prisma.clientExterne.count(),
    produits: await prisma.produit.count(),
    audits: await prisma.auditLog.count(),
  };

  console.log(JSON.stringify({ avant, apres }, null, 2));
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
