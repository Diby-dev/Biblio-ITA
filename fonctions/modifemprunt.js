function modifemprunt(ipcMain, pool) {
    ipcMain.on('update-emprunt', async (event, data) => {
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
            
            const { id_emprunt, id_livre, statut_emprunt } = data; 
            const dateRetourValue = data.date_retour || null;
    
            const updateEmpruntSql = `
                UPDATE emprunt SET
                    id_livre = ?, 
                    id_utilisateur = ?, 
                    date_emprunt = ?, 
                    statut_emprunt = ?, 
                    date_limite_retour_emprunt = ?, 
                    date_retour_emprunt = ? 
                WHERE id_emprunt = ?;
            `;
            const updateEmpruntValues = [
                data.id_livre, 
                data.id_utilisateur, 
                data.date_emprunt, 
                data.statut_emprunt, 
                data.date_limite_retour, 
                dateRetourValue,
                data.id_emprunt
            ];
    
            await pool.execute(updateEmpruntSql, updateEmpruntValues);
            
            let nouveauStatutLivre;
            const statutEmpruntModifie = statut_emprunt.toLowerCase();
    
            if (statutEmpruntModifie === 'en cours' || statutEmpruntModifie === 'en retard') {
                nouveauStatutLivre = 'emprunté';
                
            } else if (statutEmpruntModifie === 'retourné') {
                
                const [activeEmprunts] = await pool.execute(
                    `
                    SELECT COUNT(*) AS count 
                    FROM emprunt 
                    WHERE id_livre = ? 
                    AND statut_emprunt IN ('en cours', 'en retard')
                    `, 
                    [id_livre]
                );
    
                if (activeEmprunts[0].count > 0) {
                    nouveauStatutLivre = 'emprunté';
                } else {
                    nouveauStatutLivre = 'disponible';
                }
            } else {
                nouveauStatutLivre = null; 
            }
    
    
            if (nouveauStatutLivre) {
                const updateLivreSql = `
                    UPDATE livre 
                    SET statut_livre = ? 
                    WHERE id_livre = ?;
                `;
                await pool.execute(updateLivreSql, [nouveauStatutLivre, id_livre]); 
                console.log(`Statut du livre ID ${id_livre} mis à jour à: ${nouveauStatutLivre} suite à la modification de l'emprunt.`);
            }
            
            event.sender.send('update-emprunt-response', {
                success: true,
                id_emprunt: id_emprunt,
                statut_livre_mis_a_jour: nouveauStatutLivre
            });
    
        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'emprunt:", error);
            
            let message = error.message;
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                 message = "Erreur de clé étrangère : L'ID Utilisateur ou l'ID Livre n'existe pas.";
            }
            
            event.sender.send('update-emprunt-response', {
                success: false,
                id_emprunt: data.id_emprunt,
                message: message
            });
        }
    });
}

module.exports = { modifemprunt };