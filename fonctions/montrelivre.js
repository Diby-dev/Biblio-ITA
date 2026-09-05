function montrelivre(ipcMain, pool) {
    ipcMain.on('get-livres', async (event, filters = {}) => {
        console.log('Tentative de récupération de la liste des livres avec filtres:', filters);
    
        let whereClauses = [];
        let values = [];
    
        if (filters.titre_livre) {
            whereClauses.push(`L.titre_livre LIKE ?`);
            values.push(`%${filters.titre_livre}%`);
        }
    
        if (filters.statut_livre) {
            whereClauses.push(`L.statut_livre = ?`);
            values.push(filters.statut_livre);
        }
        
        if (filters.nom_auteur_complet) {
            whereClauses.push(`CONCAT(A.prenom_auteur, ' ', A.nom_auteur) LIKE ?`);
            values.push(`%${filters.nom_auteur_complet}%`);
        }
    
        if (filters.nom_fournisseur) {
            whereClauses.push(`F.nom_fournisseur LIKE ?`);
            values.push(`%${filters.nom_fournisseur}%`);
        }
    
        let sql = `
            SELECT 
                L.id_livre, 
                L.titre_livre, 
                L.image_livre,
                L.statut_livre,
                IFNULL(L.exemplaire_livre, 0) AS exemplaire_livre,
                L.id_auteur,
                L.id_fournisseur,
                CONCAT(A.prenom_auteur, ' ', A.nom_auteur) AS nom_auteur_complet,
                F.nom_fournisseur,
                (SELECT COUNT(*) FROM emprunt E WHERE E.id_livre = L.id_livre AND E.statut_emprunt IN ('en cours', 'en retard')) AS emprunts_actifs
            FROM livre L
            LEFT JOIN auteur A ON L.id_auteur = A.id_auteur
            LEFT JOIN fournisseur F ON L.id_fournisseur = F.id_fournisseur
        `;
    
        if (whereClauses.length > 0) {
            sql += ' WHERE ' + whereClauses.join(' AND ');
        }
        
        sql += ' ORDER BY L.titre_livre;';
        
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [rows] = await pool.execute(sql, values);
            
            event.sender.send('get-livres-response', { 
                success: true, 
                livres: rows 
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des livres:", error);
            
            event.sender.send('get-livres-response', { 
                success: false, 
                message: error.message 
            });
        }
    });
}

module.exports = { montrelivre };
