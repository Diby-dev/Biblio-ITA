const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('user-table-body');
    const messageDiv = document.getElementById('message');
    const userCountSpan = document.getElementById('user-count');
    const searchForm = document.getElementById('search-form');
    const btnTous = document.getElementById('btn-tous');
    const backButton = document.getElementById('btn-retour');

    let selectedRow = null; // Pour garder une trace de la ligne sélectionnée pour la surbrillance
    let editModeRowId = null; // Pour savoir quelle ligne est en mode édition (ID de l'utilisateur)

    // Options pour les champs Select
    const TYPE_OPTIONS = ["Étudiant", "Enseignant", "Personnel", "Autre"];
    const STATUT_OPTIONS = ["inscrit", "Désabonné"];

    // Définition des champs éditables (index basé sur l'ordre du tableau HTML)
    const editableFields = [
        { index: 1, name: 'nom_utilisateur', type: 'text' },
        { index: 2, name: 'prenom_utilisateur', type: 'text' },
        { index: 3, name: 'type_utilisateur', type: 'select', options: TYPE_OPTIONS },
        { index: 4, name: 'classe_utilisateur', type: 'text' },
        { index: 5, name: 'filiere_utilisateur', type: 'text' },
        { index: 6, name: 'contact_utilisateur', type: 'text' },
        { index: 7, name: 'statut_utilisateur', type: 'select', options: STATUT_OPTIONS }
    ];

    // 1. Fonction pour afficher les utilisateurs
    function displayUsers(users) {
        tableBody.innerHTML = '';
        userCountSpan.textContent = users.length;

        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Aucun utilisateur trouvé.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = tableBody.insertRow();
            row.dataset.userId = user.id_utilisateur;
            
            // Les cellules sont créées dans l'ordre du tableau (9 colonnes)
            row.insertCell().textContent = user.id_utilisateur;
            row.insertCell().textContent = user.nom_utilisateur;
            row.insertCell().textContent = user.prenom_utilisateur;
            row.insertCell().textContent = user.type_utilisateur;
            row.insertCell().textContent = user.classe_utilisateur || ''; // Afficher vide si null/N/A
            row.insertCell().textContent = user.filiere_utilisateur || ''; // Afficher vide si null/N/A
            row.insertCell().textContent = user.contact_utilisateur;
            row.insertCell().textContent = user.statut_utilisateur;
            
            // Cellule d'action
            const actionCell = row.insertCell();
            actionCell.className = 'action-cell';
            actionCell.innerHTML = '<button class="edit-btn" data-id="' + user.id_utilisateur + '">Modifier</button>';
            
            // Attacher l'écouteur d'événement au bouton Modifier
            actionCell.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation(); 
                enterEditMode(user.id_utilisateur);
            });
            
            // Attacher l'écouteur d'événement pour la sélection de ligne
            row.addEventListener('click', (e) => {
                if (editModeRowId === user.id_utilisateur) return;
                
                if (selectedRow) {
                    selectedRow.classList.remove('selected-row');
                }
                
                row.classList.add('selected-row');
                selectedRow = row;
            });
        });
    }

    // 2. Fonction pour passer en mode édition
    function enterEditMode(userId) {
        // Interdire l'édition si une autre ligne est déjà en cours
        if (editModeRowId && editModeRowId !== userId) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
            return;
        }
        
        const row = tableBody.querySelector(`tr[data-user-id="${userId}"]`);
        if (!row) return;

        editModeRowId = userId;
        row.classList.remove('selected-row'); 
        
        const cells = row.cells;
        
        // Remplacer le contenu des cellules par des champs de saisie/sélection
        editableFields.forEach(field => {
            const cell = cells[field.index];
            // Utiliser le textContent actuel comme valeur initiale
            const originalValue = cell.textContent.trim(); 
            
            if (field.type === 'text') {
                cell.innerHTML = `<input type="text" class="edit-input" name="${field.name}" value="${originalValue}">`;
            } else if (field.type === 'select') {
                let optionsHtml = field.options.map(option => 
                    `<option value="${option}" ${option === originalValue ? 'selected' : ''}>${option}</option>`
                ).join('');
                cell.innerHTML = `
                    <select class="edit-select" name="${field.name}">
                        ${optionsHtml}
                    </select>
                `;
            }
        });

        // Mettre à jour la cellule d'action (cells[8])
        const actionCell = cells[8];
        actionCell.innerHTML = `
            <button class="save-button" data-id="${userId}">Sauvegarder</button>
            <button class="cancel-button">Annuler</button>
        `;

        // Attacher les nouveaux écouteurs d'événements
        actionCell.querySelector('.save-button').addEventListener('click', saveEdit);
        actionCell.querySelector('.cancel-button').addEventListener('click', cancelEdit);
    }
    
    // 3. Fonction pour sauvegarder les modifications
    function saveEdit(e) {
        e.stopPropagation();
        const userId = e.target.dataset.id;
        const row = tableBody.querySelector(`tr[data-user-id="${userId}"]`);
        if (!row) return;

        const cells = row.cells;
        const userData = { id_utilisateur: userId };

        // Collecter les nouvelles valeurs
        for (const field of editableFields) {
            const input = cells[field.index].querySelector('.edit-input, .edit-select');
            if (input) {
                // Si la valeur est vide, la forcer à null pour MySQL si c'est un champ nullable
                const value = input.value.trim();
                userData[field.name] = value === '' ? null : value;
            }
        }
        
        messageDiv.className = '';
        messageDiv.textContent = `Sauvegarde de l'utilisateur ID ${userId} en cours...`;

        // Envoyer la requête de mise à jour à main.js
        ipcRenderer.send('update-user', userData);
        
        editModeRowId = null;
        selectedRow = null;
    }
    
    // 4. Fonction pour annuler les modifications
    function cancelEdit() {
        if (!editModeRowId) return;

        messageDiv.textContent = 'Modification annulée. Rechargement...';
        editModeRowId = null;
        selectedRow = null;
        loadUsers(getCurrentFilters()); 
    }

    // 5. Fonction pour obtenir les filtres actuels du formulaire
    function getCurrentFilters() {
        const formData = new FormData(searchForm);
        const rawFilters = Object.fromEntries(formData.entries());
        const filters = {};
        for (const key in rawFilters) {
            const value = rawFilters[key].trim();
            if (value !== "") {
                filters[key] = value;
            }
        }
        return filters;
    }

    // 6. Fonction principale pour charger les données
    function loadUsers(filters = {}) {
        messageDiv.className = '';
        messageDiv.textContent = 'Chargement des utilisateurs en cours...';
        userCountSpan.textContent = '...';
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Recherche en cours...</td></tr>';
        
        ipcRenderer.send('get-users', filters);
    }
    
    // 7. Gestion de la soumission du formulaire de recherche
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        loadUsers(getCurrentFilters());
    });

    // 8. Gestion du bouton "TOUS LES UTILISATEURS"
    btnTous.addEventListener('click', () => {
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        searchForm.reset(); 
        loadUsers({});
    });

    // 9. Écoute les réponses de main.js (Chargement)
    ipcRenderer.on('get-users-response', (event, response) => {
        if (response.success) {
            displayUsers(response.users);
            // Ne pas écraser le message de succès si la mise à jour vient de réussir
            if (!messageDiv.textContent.includes('mis à jour avec succès')) {
                 messageDiv.textContent = '';
            }
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = `Erreur de chargement des données : ${response.message}`;
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Erreur de connexion/base de données.</td></tr>';
        }
    });
    
    // 10. NOUVEAU: Écoute la réponse de la mise à jour
    ipcRenderer.on('update-user-response', (event, response) => {
        if (response.success) {
            messageDiv.className = '';
            messageDiv.textContent = `Utilisateur ID ${response.id} mis à jour avec succès! Rechargement...`;
            // Recharger la liste après une mise à jour réussie
            loadUsers(getCurrentFilters());
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = `Échec de la mise à jour de l'utilisateur ID ${response.id} : ${response.message}`;
            // Recharger pour rétablir l'état d'affichage normal
            loadUsers(getCurrentFilters());
        }
    });

    // 11. Lancer le chargement initial
    loadUsers({});
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Envoie la demande pour ouvrir utilisateur.html (qui remplacera la fenêtre actuelle)
            ipcRenderer.send('open-window', 'utilisateur.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});
