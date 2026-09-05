const fs = require('fs');
const path = require('path');

const EXTENSIONS_AUTORISEES = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

async function enregistrerImageLivre(cheminSource) {
    if (!cheminSource) return null;

    if (!fs.existsSync(cheminSource)) {
        throw new Error("Le fichier image sélectionné est introuvable.");
    }

    const extension = path.extname(cheminSource).toLowerCase();
    if (!EXTENSIONS_AUTORISEES.has(extension)) {
        throw new Error("Format d'image non pris en charge. Utilisez JPG, PNG, GIF ou WEBP.");
    }

    const dossierUploads = path.join(__dirname, '..', 'uploads');
    const nomFichier = `livre-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;

    await fs.promises.mkdir(dossierUploads, { recursive: true });
    await fs.promises.copyFile(cheminSource, path.join(dossierUploads, nomFichier));

    return `uploads/${nomFichier}`;
}

module.exports = { enregistrerImageLivre };
