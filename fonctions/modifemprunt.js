function modifemprunt(ipcMain, pool) {
    ipcMain.on('update-emprunt', async (event, data) => {
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
            
            const { id_emprunt, id_livre, statut_emprunt } = data; 
            const dateRetourValue = data.date_retour || null;
    
            const [[oldEmprunt]] = await pool.execute(
                `SELECT id_livre, statut_emprunt FROM emprunt WHERE id_emprunt = ?`,
                [id_emprunt]
            );

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

            const oldStatut = oldEmprunt ? oldEmprunt.statut_emprunt.toLowerCase() : '';
            const newStatut = statut_emprunt.toLowerCase();
            const wasActive = (oldStatut === 'en cours' || oldStatut === 'en retard');
            const isActive = (newStatut === 'en cours' || newStatut === 'en retard');

            if (oldEmprunt && oldEmprunt.id_livre != id_livre) {
                if (wasActive) {
                    await pool.execute(`
                        UPDATE livre 
                        SET 
                            exemplaire_livre = IFNULL(exemplaire_livre, 0) + 1,
                            statut_livre = IF(IFNULL(exemplaire_livre, 0) + 1 > 0, 'disponible', 'vide')
                        WHERE id_livre = ?;
                    `, [oldEmprunt.id_livre]);
                }
                if (isActive) {
                    await pool.execute(`
                        UPDATE livre 
                        SET 
                            exemplaire_livre = GREATEST(0, IFNULL(exemplaire_livre, 1) - 1),
                            statut_livre = IF(GREATEST(0, IFNULL(exemplaire_livre, 1) - 1) <= 0, 'vide', 'disponible')
                        WHERE id_livre = ?;
                    `, [id_livre]);
                }
            } else {
                if (wasActive && newStatut === 'retourné') {
                    await pool.execute(`
                        UPDATE livre 
                        SET 
                            exemplaire_livre = IFNULL(exemplaire_livre, 0) + 1,
                            statut_livre = IF(IFNULL(exemplaire_livre, 0) + 1 > 0, 'disponible', 'vide')
                        WHERE id_livre = ?;
                    `, [id_livre]);
                } else if (!wasActive && isActive) {
                    await pool.execute(`
                        UPDATE livre 
                        SET 
                            exemplaire_livre = GREATEST(0, IFNULL(exemplaire_livre, 1) - 1),
                            statut_livre = IF(GREATEST(0, IFNULL(exemplaire_livre, 1) - 1) <= 0, 'vide', 'disponible')
                        WHERE id_livre = ?;
                    `, [id_livre]);
                }
            }

            const [[livreRow]] = await pool.execute(`SELECT statut_livre FROM livre WHERE id_livre = ?`, [id_livre]);
            let nouveauStatutLivre = livreRow ? livreRow.statut_livre : null;
            
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