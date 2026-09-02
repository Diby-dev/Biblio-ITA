function dependancelivre2(ipcMain, pool) {
    ipcMain.on('get-livre-dependencies', async (event) => {
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [auteursResult] = await pool.execute(`
                SELECT 
                    id_auteur, 
                    CONCAT(nom_auteur, ' ', prenom_auteur) AS nom_auteur_complet 
                FROM auteur 
                ORDER BY nom_auteur_complet
            `);
    
            const [fournisseursResult] = await pool.execute(`
                SELECT 
                    id_fournisseur, 
                    nom_fournisseur 
                FROM fournisseur 
                ORDER BY nom_fournisseur
            `);
    
            event.sender.send('get-livre-dependencies-response', { 
                success: true, 
                auteurs: auteursResult, 
                fournisseurs: fournisseursResult 
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des dépendances du livre:", error);
            event.sender.send('get-livre-dependencies-response', { 
                success: false, 
                message: error.message 
            });
        }
    });
}

module.exports = { dependancelivre2 };