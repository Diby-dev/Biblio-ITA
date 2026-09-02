function dependanceemprunt2(ipcMain, pool) {
    ipcMain.on('get-emprunt-dependencies', async (event) => {
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [livresRows] = await pool.execute(
                `SELECT id_livre, titre_livre FROM livre ORDER BY titre_livre`
            );
            
            const [utilisateursRows] = await pool.execute(
                `SELECT id_utilisateur, CONCAT(prenom_utilisateur, ' ', nom_utilisateur) AS nom_complet FROM utilisateur ORDER BY nom_complet`
            );
    
            event.sender.send('get-emprunt-dependencies-response', {
                success: true,
                livres: livresRows,
                utilisateurs: utilisateursRows
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des dépendances d'emprunt:", error);
            event.sender.send('get-emprunt-dependencies-response', {
                success: false,
                message: error.message
            });
        }
    });
}

module.exports = { dependanceemprunt2 };