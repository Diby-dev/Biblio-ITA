function montreemprunt(ipcMain, pool) {
    ipcMain.on('get-emprunts', async (event, filters = {}) => {
        console.log('Tentative de récupération de la liste des emprunts avec filtres:', filters);
    
        let whereClauses = [];
        let values = [];
    
        if (filters.titre_livre) {
            whereClauses.push(`L.titre_livre LIKE ?`);
            values.push(`%${filters.titre_livre}%`);
        }
    
        if (filters.nom_utilisateur_complet) {
            whereClauses.push(`CONCAT(U.prenom_utilisateur, ' ', U.nom_utilisateur) LIKE ?`);
            values.push(`%${filters.nom_utilisateur_complet}%`);
        }
    
        if (filters.statut_emprunt) {
            whereClauses.push(`E.statut_emprunt = ?`);
            values.push(filters.statut_emprunt);
        }
        
     
        if (filters.date_emprunt) {
            whereClauses.push(`DATE(E.date_emprunt) = ?`);
            values.push(filters.date_emprunt);
        }
    
        if (filters.date_limite) {
            whereClauses.push(`DATE(E.date_limite_retour_emprunt) = ?`);
            values.push(filters.date_limite);
        }
        
        if (filters.date_retour) {
            whereClauses.push(`DATE(E.date_retour_emprunt) = ?`);
            values.push(filters.date_retour);
        }
    
    
        let sql = `
            SELECT 
                E.id_emprunt,
                E.id_livre, 
                E.id_utilisateur,
                L.titre_livre, 
                CONCAT(U.prenom_utilisateur, ' ', U.nom_utilisateur) AS nom_utilisateur_complet,
                
                DATE_FORMAT(E.date_emprunt, '%Y-%m-%d') AS date_emprunt, 
                E.statut_emprunt, 
                DATE_FORMAT(E.date_limite_retour_emprunt, '%Y-%m-%d') AS date_limite_retour,
                DATE_FORMAT(E.date_retour_emprunt, '%Y-%m-%d') AS date_retour
            FROM emprunt E
            LEFT JOIN livre L ON E.id_livre = L.id_livre
            LEFT JOIN utilisateur U ON E.id_utilisateur = U.id_utilisateur
        `;
    
        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }
        
        sql += ' ORDER BY E.date_emprunt DESC;';
        
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [rows] = await pool.execute(sql, values);
            
            event.sender.send('get-emprunts-response', { 
                success: true, 
                emprunts: rows 
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des emprunts:", error);
            
            event.sender.send('get-emprunts-response', { 
                success: false, 
                message: error.message 
            });
        }
    });
}

module.exports = { montreemprunt };