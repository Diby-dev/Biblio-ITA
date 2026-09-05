function ajoutemprunt(ipcMain, pool) {
    ipcMain.on('add-emprunt', async (event, empruntData) => {
        console.log('Tentative d\'enregistrement d\'un emprunt:', empruntData);
    
        const insertSql = `
            INSERT INTO emprunt 
            (id_utilisateur, id_livre, date_emprunt, statut_emprunt, date_limite_retour_emprunt, date_retour_emprunt) 
            VALUES (?, ?, ?, ?, ?, ?);
        `;
        
        const insertValues = [
            empruntData.id_utilisateur,
            empruntData.id_livre,
            empruntData.date_emprunt,
            empruntData.statut_emprunt,
            empruntData.date_limite_retour_emprunt,
            empruntData.date_retour_emprunt || null 
        ];
    
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [result] = await pool.execute(insertSql, insertValues);
            
            const statutEmprunt = empruntData.statut_emprunt.toLowerCase();
            let nouveauStatutLivre = null;
    
            if (statutEmprunt === 'en cours' || statutEmprunt === 'en retard') {
                await pool.execute(`
                    UPDATE livre 
                    SET 
                        exemplaire_livre = GREATEST(0, IFNULL(exemplaire_livre, 1) - 1),
                        statut_livre = IF(GREATEST(0, IFNULL(exemplaire_livre, 1) - 1) <= 0, 'vide', 'disponible')
                    WHERE id_livre = ?;
                `, [empruntData.id_livre]);

                const [[livreRow]] = await pool.execute(`SELECT statut_livre FROM livre WHERE id_livre = ?`, [empruntData.id_livre]);
                nouveauStatutLivre = livreRow ? livreRow.statut_livre : 'disponible';
                console.log(`Statut et exemplaire du livre ID ${empruntData.id_livre} mis à jour suite au nouvel emprunt.`);
            }
            
            event.sender.send('add-emprunt-response', { 
                success: true, 
                id: result.insertId,
                statut_livre_mis_a_jour: nouveauStatutLivre
            });
    
        } catch (error) {
            console.error("Erreur d'insertion de l'emprunt et/ou de mise à jour du livre:", error);
            
            let message = error.message;
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                 message = "Erreur de clé étrangère : L'ID Utilisateur ou l'ID Livre n'existe pas.";
            }
            
            event.sender.send('add-emprunt-response', { 
                success: false, 
                message: message
            });
        }
    });
}

module.exports = { ajoutemprunt };