function ajoutuser(ipcMain, pool) {
ipcMain.on('add-user', async (event, userData) => {
    console.log('Tentative d\'enregistrement d\'un utilisateur:', userData);

    const sql = `
        INSERT INTO utilisateur 
        (nom_utilisateur, prenom_utilisateur, type_utilisateur, classe_utilisateur, filiere_utilisateur, contact_utilisateur, statut_utilisateur) 
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    
    const values = [
        userData.nom_utilisateur,
        userData.prenom_utilisateur,
        userData.type_utilisateur,
        userData.classe_utilisateur || null,
        userData.filiere_utilisateur || null,
        userData.contact_utilisateur,
        userData.statut_utilisateur
    ];

    try {
        if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");

        const [result] = await pool.execute(sql, values);
        
        event.sender.send('add-user-response', { 
            success: true, 
            id: result.insertId 
        });

    } catch (error) {
        console.error("Erreur d'insertion dans la base de données:", error);
        
        event.sender.send('add-user-response', { 
            success: false, 
            message: error.message 
        });
    }
});
}

module.exports = { ajoutuser };