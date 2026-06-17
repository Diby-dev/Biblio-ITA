const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('user-table-body');
    const messageDiv = document.getElementById('message');
    const userCountSpan = document.getElementById('user-count');
    const searchForm = document.getElementById('search-form');
    const btnTous = document.getElementById('btn-tous');
    const backButton = document.getElementById('btn-retour');

    let selectedRow = null;
    let editModeRowId = null;

    const TYPE_OPTIONS = ["Étudiant", "Enseignant", "Personnel", "Autre"];
    const STATUT_OPTIONS = ["inscrit", "Désabonné"];

    const editableFields = [
        { index: 1, name: 'nom_utilisateur', type: 'text' },
        { index: 2, name: 'prenom_utilisateur', type: 'text' },
        { index: 3, name: 'type_utilisateur', type: 'select', options: TYPE_OPTIONS },
        { index: 4, name: 'classe_utilisateur', type: 'text' },
        { index: 5, name: 'filiere_utilisateur', type: 'text' },
        { index: 6, name: 'contact_utilisateur', type: 'text' },
        { index: 7, name: 'statut_utilisateur', type: 'select', options: STATUT_OPTIONS }
    ];

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
            
            row.insertCell().textContent = user.id_utilisateur;
            row.insertCell().textContent = user.nom_utilisateur;
            row.insertCell().textContent = user.prenom_utilisateur;
            row.insertCell().textContent = user.type_utilisateur;
            row.insertCell().textContent = user.classe_utilisateur || ''; 
            row.insertCell().textContent = user.filiere_utilisateur || '';
            row.insertCell().textContent = user.contact_utilisateur;
            row.insertCell().textContent = user.statut_utilisateur;
            
            const actionCell = row.insertCell();
            actionCell.className = 'action-cell';
            actionCell.innerHTML = '<button class="edit-btn" data-id="' + user.id_utilisateur + '">Modifier</button>';
            
            actionCell.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation(); 
                enterEditMode(user.id_utilisateur);
            });
            
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

    function enterEditMode(userId) {
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
        
        editableFields.forEach(field => {
            const cell = cells[field.index];
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

        const actionCell = cells[8];
        actionCell.innerHTML = `
            <button class="save-button" data-id="${userId}">Sauvegarder</button>
            <button class="cancel-button">Annuler</button>
        `;

        actionCell.querySelector('.save-button').addEventListener('click', saveEdit);
        actionCell.querySelector('.cancel-button').addEventListener('click', cancelEdit);
    }
    
    function saveEdit(e) {
        e.stopPropagation();
        const userId = e.target.dataset.id;
        const row = tableBody.querySelector(`tr[data-user-id="${userId}"]`);
        if (!row) return;

        const cells = row.cells;
        const userData = { id_utilisateur: userId };

        for (const field of editableFields) {
            const input = cells[field.index].querySelector('.edit-input, .edit-select');
            if (input) {
                const value = input.value.trim();
                userData[field.name] = value === '' ? null : value;
            }
        }
        
        messageDiv.className = '';
        messageDiv.textContent = `Sauvegarde de l'utilisateur ID ${userId} en cours...`;

        ipcRenderer.send('update-user', userData);
        
        editModeRowId = null;
        selectedRow = null;
    }
    
    function cancelEdit() {
        if (!editModeRowId) return;

        messageDiv.textContent = 'Modification annulée. Rechargement...';
        editModeRowId = null;
        selectedRow = null;
        loadUsers(getCurrentFilters()); 
    }

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

    function loadUsers(filters = {}) {
        messageDiv.className = '';
        messageDiv.textContent = 'Chargement des utilisateurs en cours...';
        userCountSpan.textContent = '...';
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Recherche en cours...</td></tr>';
        
        ipcRenderer.send('get-users', filters);
    }
    
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        loadUsers(getCurrentFilters());
    });

    btnTous.addEventListener('click', () => {
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        searchForm.reset(); 
        loadUsers({});
    });

    ipcRenderer.on('get-users-response', (event, response) => {
        if (response.success) {
            displayUsers(response.users);
            if (!messageDiv.textContent.includes('mis à jour avec succès')) {
                 messageDiv.textContent = '';
            }
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = `Erreur de chargement des données : ${response.message}`;
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Erreur de connexion/base de données.</td></tr>';
        }
    });
    
    ipcRenderer.on('update-user-response', (event, response) => {
        if (response.success) {
            messageDiv.className = '';
            messageDiv.textContent = `Utilisateur ID ${response.id} mis à jour avec succès! Rechargement...`;
            loadUsers(getCurrentFilters());
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = `Échec de la mise à jour de l'utilisateur ID ${response.id} : ${response.message}`;
            loadUsers(getCurrentFilters());
        }
    });

    loadUsers({});
    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'utilisateur.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});
