const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('btn-retour');

    ipcRenderer.send('get-dashboard-stats');

    ipcRenderer.on('get-dashboard-stats-response', (event, response) => {
        if (response.success) {
            const stats = response.stats;

            document.getElementById('livres-enregistres').textContent = stats.livresEnregistres;
            document.getElementById('livres-disponibles').textContent = stats.livresDisponibles;

            document.getElementById('count-emprunts').textContent = stats.countEmprunts;
            document.getElementById('emprunts-en-cours').textContent = stats.empruntsEnCours;
            document.getElementById('emprunts-retournes').textContent = stats.empruntsRetournes;
            document.getElementById('emprunts-retard').textContent = stats.empruntsRetard;

            document.getElementById('count-utilisateurs').textContent = stats.countUtilisateurs;
            document.getElementById('utilisateurs-inscrits').textContent = stats.utilisateursInscrits;
            document.getElementById('utilisateurs-désabonnés').textContent = stats.utilisateursDesabonnes;

            document.getElementById('count-fournisseurs').textContent = stats.countFournisseurs;

            document.getElementById('count-auteurs').textContent = stats.countAuteurs;

        } else {
            console.error("Échec du chargement du dashboard:", response.message);
            alert(`Erreur lors de la récupération des données : ${response.message}`);
        }
    });

    if (backButton) {
        backButton.addEventListener('click', () => {

            ipcRenderer.send('open-window', 'index.html');
        });
    } else {
        console.error("Erreur: L'élément #btn-retour n'existe pas dans le DOM de la page.");
    }
});
