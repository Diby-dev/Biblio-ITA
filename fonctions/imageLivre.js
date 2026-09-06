const fs = require('fs');
const path = require('path');

const EXTENSIONS_AUTORISEES = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

function detecterTypeImage(header) {
    if (header.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) return 'jpg';
    if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'png';
    if (header.subarray(0, 3).toString('ascii') === 'GIF') return 'gif';
    if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
    return null;
}

async function enregistrerImageLivre(cheminSource) {
    if (!cheminSource) return null;

    if (!fs.existsSync(cheminSource)) {
        throw new Error("Le fichier image sélectionné est introuvable.");
    }

    const extension = path.extname(cheminSource).toLowerCase();
    if (!EXTENSIONS_AUTORISEES.has(extension)) {
        throw new Error("Format d'image non pris en charge. Utilisez JPG, PNG, GIF ou WEBP.");
    }

    const metadata = await fs.promises.stat(cheminSource);
    if (!metadata.isFile() || metadata.size > TAILLE_MAX_IMAGE) {
        throw new Error("L'image doit être un fichier de 5 Mo maximum.");
    }
    const handle = await fs.promises.open(cheminSource, 'r');
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    await handle.close();
    if (!detecterTypeImage(header)) {
        throw new Error("Le contenu du fichier n'est pas une image valide.");
    }

    const dossierUploads = path.join(__dirname, '..', 'uploads');
    const nomFichier = `livre-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;

    await fs.promises.mkdir(dossierUploads, { recursive: true });
    await fs.promises.copyFile(cheminSource, path.join(dossierUploads, nomFichier));

    return `uploads/${nomFichier}`;
}

module.exports = { enregistrerImageLivre };
