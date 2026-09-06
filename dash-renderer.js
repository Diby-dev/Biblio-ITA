const { ipcRenderer } = window.electron;

document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('btn-retour');
    const adminForm = document.getElementById('admin-form');
    const adminMessage = document.getElementById('admin-message');
    const adminsTableBody = document.getElementById('admins-table-body');

    const loadAdmins = () => ipcRenderer.send('get-admins');

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
            document.getElementById('count-admins').textContent = stats.countAdmins;

        } else {
            console.error("Échec du chargement du dashboard:", response.message);
            alert(`Erreur lors de la récupération des données : ${response.message}`);
        }
    });

    ipcRenderer.on('get-admins-response', (event, response) => {
        if (!response.success) {
            adminMessage.textContent = `Erreur : ${response.message}`;
            return;
        }
        adminsTableBody.innerHTML = '';
        if (response.admins.length === 0) {
            adminsTableBody.innerHTML = '<tr><td colspan="3">Aucun administrateur enregistré.</td></tr>';
            return;
        }
        response.admins.forEach(admin => {
            const row = adminsTableBody.insertRow();
            row.insertCell().textContent = admin.nom_admin;
            const statusCell = row.insertCell();
            statusCell.textContent = admin.statut_admin;
            statusCell.className = admin.statut_admin === 'actif' ? 'statut-actif' : 'statut-bloque';
            const actionCell = row.insertCell();
            const button = document.createElement('button');
            button.className = 'admin-button';
            button.textContent = admin.statut_admin === 'actif' ? 'Bloquer' : 'Débloquer';
            button.addEventListener('click', () => ipcRenderer.send('toggle-admin-status', admin.id_admin));
            actionCell.appendChild(button);
        });
    });

    adminForm.addEventListener('submit', (event) => {
        event.preventDefault();
        adminMessage.textContent = 'Création en cours...';
        ipcRenderer.send('add-admin', {
            nom_admin: document.getElementById('nom_admin').value,
            mot_de_passe_admin: document.getElementById('mot_de_passe_admin').value
        });
    });

    ipcRenderer.on('add-admin-response', (event, response) => {
        if (response.success) {
            adminForm.reset();
            adminMessage.textContent = 'Administrateur ajouté avec succès.';
            ipcRenderer.send('get-dashboard-stats');
            loadAdmins();
        } else {
            adminMessage.textContent = `Erreur : ${response.message}`;
        }
    });

    ipcRenderer.on('toggle-admin-status-response', (event, response) => {
        adminMessage.textContent = response.success ? 'Statut administrateur mis à jour.' : `Erreur : ${response.message}`;
        if (response.success) loadAdmins();
    });

    loadAdmins();

    if (backButton) {
        backButton.addEventListener('click', () => {

            ipcRenderer.send('open-window', 'index.html');
        });
    } else {
        console.error("Erreur: L'élément #btn-retour n'existe pas dans le DOM de la page.");
    }
});
