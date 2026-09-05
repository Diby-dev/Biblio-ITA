function dashboard(ipcMain, pool) {
    ipcMain.on('get-dashboard-stats', async (event) => {
        console.log('Tentative de récupération des statistiques du dashboard...');
        
        try {
            if (!pool) throw new Error("La connexion à la base de données n'est pas initialisée.");
    
            const [
                [livresTotal],
                [livresEmpruntes],
                [livresDispo],
                [empruntsTotal],
                [empruntsEnCours],
                [empruntsRetournes],
                [empruntsRetard],
                [utilisateursTotal],
                [utilisateursInscrits],
                [utilisateursDesabonnes],
                [fournisseursTotal],
                [auteursTotal]
            ] = await Promise.all([
                pool.execute('SELECT COUNT(*) AS total FROM livre;'),
                pool.execute("SELECT COUNT(*) AS total FROM livre WHERE statut_livre = 'emprunté';"),
                pool.execute('SELECT COALESCE(SUM(exemplaire_livre), 0) AS total FROM livre;'),
                pool.execute('SELECT COUNT(*) AS total FROM emprunt;'),
                pool.execute("SELECT COUNT(*) AS total FROM emprunt WHERE statut_emprunt = 'en cours';"),
                pool.execute("SELECT COUNT(*) AS total FROM emprunt WHERE statut_emprunt = 'retourné';"),
                pool.execute("SELECT COUNT(*) AS total FROM emprunt WHERE statut_emprunt = 'en retard';"),
                pool.execute('SELECT COUNT(*) AS total FROM utilisateur;'),
                pool.execute("SELECT COUNT(*) AS total FROM utilisateur WHERE statut_utilisateur = 'inscrit';"),
                pool.execute("SELECT COUNT(*) AS total FROM utilisateur WHERE statut_utilisateur = 'désabonné';"),
                pool.execute('SELECT COUNT(*) AS total FROM fournisseur;'),
                pool.execute('SELECT COUNT(*) AS total FROM auteur;')
            ]);
    
            event.sender.send('get-dashboard-stats-response', {
                success: true,
                stats: {
                    livresEnregistres: livresTotal[0].total,
                    livresEmpruntes: livresEmpruntes[0].total,
                    livresDisponibles: livresDispo[0].total,
                    countEmprunts: empruntsTotal[0].total,
                    empruntsEnCours: empruntsEnCours[0].total,
                    empruntsRetournes: empruntsRetournes[0].total,
                    empruntsRetard: empruntsRetard[0].total,
                    countUtilisateurs: utilisateursTotal[0].total,
                    utilisateursInscrits: utilisateursInscrits[0].total,
                    utilisateursDesabonnes: utilisateursDesabonnes[0].total,
                    countFournisseurs: fournisseursTotal[0].total,
                    countAuteurs: auteursTotal[0].total
                }
            });
    
        } catch (error) {
            console.error("Erreur lors de la récupération des statistiques du dashboard:", error);
            
            event.sender.send('get-dashboard-stats-response', {
                success: false,
                message: error.message
            });
        }
    });
}

module.exports = { dashboard };
