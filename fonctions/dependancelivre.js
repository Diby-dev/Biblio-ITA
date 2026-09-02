function dependancelivre(ipcMain, pool) {
    ipcMain.on('get-livre-dependencies-for-add', async (event) => {
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [auteursResult] = await pool.execute(`
                SELECT 
                    id_auteur, 
                    CONCAT(prenom_auteur, ' ', nom_auteur) AS nom_auteur_complet 
                FROM auteur 
                ORDER BY nom_auteur_complet ASC
            `);
    
            const [fournisseursResult] = await pool.execute(`
                SELECT 
                    id_fournisseur, 
                    nom_fournisseur 
                FROM fournisseur 
                ORDER BY nom_fournisseur ASC
            `);
    
            console.log(`Dépendances Livre chargées. Auteurs: ${auteursResult.length}, Fournisseurs: ${fournisseursResult.length}`);
    
            event.sender.send('get-livre-dependencies-for-add-response', { 
                success: true, 
                auteurs: auteursResult, 
                fournisseurs: fournisseursResult 
            });
    
        } catch (error) {
            console.error("ERREUR CRITIQUE DE CHARGEMENT DES DÉPENDANCES (main.js):", error);
            event.sender.send('get-livre-dependencies-for-add-response', { 
                success: false, 
                message: error.message 
            });
        }
    });
}

module.exports = { dependancelivre };