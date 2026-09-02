function dependanceemprunt(ipcMain, pool) {
    ipcMain.on('get-emprunt-add-dependencies', async (event) => {
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [utilisateursResult] = await pool.execute(`
                SELECT 
                    id_utilisateur, 
                    -- Utilisation de IFNULL pour gérer les NULL et assurer que la concaténation ne renvoie pas NULL.
                    CONCAT(
                        IFNULL(prenom_utilisateur, ''),  
                        ' ', 
                        IFNULL(nom_utilisateur, '')
                    ) AS nom_complet_affichage -- Alias clair pour le formulaire d'ajout
                FROM utilisateur 
                ORDER BY nom_complet_affichage ASC
            `);
    
            const [livresResult] = await pool.execute(`
                SELECT 
                    id_livre, 
                    titre_livre 
                FROM livre 
                WHERE statut_livre = 'Disponible'
                ORDER BY titre_livre ASC
            `);
    
            event.sender.send('get-emprunt-add-dependencies-response', { 
                success: true, 
                utilisateurs: utilisateursResult, 
                livres: livresResult 
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des dépendances d'ajout d'emprunt:", error);
            event.sender.send('get-emprunt-add-dependencies-response', { 
                success: false, 
                message: error.message 
            });
        }
    });
}

module.exports = { dependanceemprunt };