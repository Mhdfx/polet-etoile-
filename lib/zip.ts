type FichierZip = {
  chemin: string;
  contenu: Uint8Array;
  modifieLe?: Date;
};

const encodeur = new TextEncoder();
const TABLE_CRC32 = creerTableCrc32();

function creerTableCrc32(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }

  return table;
}

function crc32(contenu: Uint8Array): number {
  let crc = 0xffffffff;
  for (const octet of contenu) {
    crc = TABLE_CRC32[(crc ^ octet) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dateDos(date: Date): { date: number; heure: number } {
  const annee = Math.max(1980, date.getFullYear());
  return {
    heure:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date: ((annee - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function entete(taille: number): Uint8Array {
  return new Uint8Array(taille);
}

function vue(octets: Uint8Array): DataView {
  return new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
}

function concatener(parties: Uint8Array[]): Uint8Array {
  const taille = parties.reduce((total, partie) => total + partie.byteLength, 0);
  const resultat = new Uint8Array(taille);
  let offset = 0;

  for (const partie of parties) {
    resultat.set(partie, offset);
    offset += partie.byteLength;
  }

  return resultat;
}

function normaliserChemin(chemin: string): string {
  return chemin
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .join("/");
}

export function creerZip(fichiers: FichierZip[]): Uint8Array {
  const morceaux: Uint8Array[] = [];
  const centre: Uint8Array[] = [];
  let offset = 0;

  for (const fichier of fichiers) {
    const chemin = normaliserChemin(fichier.chemin);
    const nom = encodeur.encode(chemin);
    const contenu = fichier.contenu;
    const crc = crc32(contenu);
    const { date, heure } = dateDos(fichier.modifieLe ?? new Date());
    const offsetLocal = offset;

    const local = entete(30);
    const localView = vue(local);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, heure, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contenu.byteLength, true);
    localView.setUint32(22, contenu.byteLength, true);
    localView.setUint16(26, nom.byteLength, true);
    localView.setUint16(28, 0, true);

    morceaux.push(local, nom, contenu);
    offset += local.byteLength + nom.byteLength + contenu.byteLength;

    const central = entete(46);
    const centralView = vue(central);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, heure, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contenu.byteLength, true);
    centralView.setUint32(24, contenu.byteLength, true);
    centralView.setUint16(28, nom.byteLength, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offsetLocal, true);
    centre.push(central, nom);
  }

  const debutCentre = offset;
  const centreConcatene = concatener(centre);
  const fin = entete(22);
  const finView = vue(fin);
  finView.setUint32(0, 0x06054b50, true);
  finView.setUint16(4, 0, true);
  finView.setUint16(6, 0, true);
  finView.setUint16(8, fichiers.length, true);
  finView.setUint16(10, fichiers.length, true);
  finView.setUint32(12, centreConcatene.byteLength, true);
  finView.setUint32(16, debutCentre, true);
  finView.setUint16(20, 0, true);

  return concatener([...morceaux, centreConcatene, fin]);
}
