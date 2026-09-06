const { ipcRenderer } = window.electron;

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('auteurs-table-body');
    const messageDiv = document.getElementById('message');
    const searchForm = document.getElementById('search-form'); 
    const btnTous = document.getElementById('btn-tous'); 
    const backButton = document.getElementById('btn-retour');
    
    let editModeRowId = null;

    const editableFields = [
        { index: 1, name: 'nom_auteur', type: 'text' },
        { index: 2, name: 'prenom_auteur', type: 'text' },
        { index: 3, name: 'nationalite_auteur', type: 'text' },
        { index: 4, name: 'date_naissance_auteur', type: 'date' } 
    ];

    const displayError = (message, colspan = 6) => {
        messageDiv.className = 'error';
        messageDiv.textContent = `Erreur de chargement : ${message}`;
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">Erreur de chargement des données.</td></tr>`;
    };

    const getCurrentFilters = () => {
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
    };

    const loadAuteurs = (filters = {}) => {
        messageDiv.textContent = 'Chargement de la liste des auteurs...';
        messageDiv.className = '';
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Recherche en cours...</td></tr>';
        
        ipcRenderer.send('get-auteurs', filters);
    };

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[character]));
    }

    function enterEditMode(auteurId) {
        if (editModeRowId && editModeRowId !== auteurId) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours sur l\'autre ligne.';
            return;
        }
        
        const row = tableBody.querySelector(`tr[data-auteur-id="${auteurId}"]`);
        if (!row) return;

        editModeRowId = auteurId;
        const cells = row.cells;
        
        editableFields.forEach(field => {
            const cell = cells[field.index];
            let originalValue = cell.textContent.trim(); 
            
            if (originalValue === 'N/A') {
                originalValue = '';
            }
            
            if (field.type === 'text') {
                cell.innerHTML = `<input type="text" class="edit-input" name="${escapeHtml(field.name)}" value="${escapeHtml(originalValue)}">`;
            } else if (field.type === 'date') {

                cell.innerHTML = `<input type="date" class="edit-input" name="${escapeHtml(field.name)}" value="${escapeHtml(originalValue)}">`;
            }
        });

        const actionCell = cells[5];
        actionCell.innerHTML = `
            <button class="save-button" data-id="${auteurId}">Sauvegarder</button>
            <button class="cancel-button">Annuler</button>
        `;

        actionCell.querySelector('.save-button').addEventListener('click', saveEdit);
        actionCell.querySelector('.cancel-button').addEventListener('click', cancelEdit);
    }
    
    function saveEdit(e) {
        e.stopPropagation();
        const auteurId = e.target.dataset.id;
        const row = tableBody.querySelector(`tr[data-auteur-id="${auteurId}"]`);
        if (!row) return;

        const cells = row.cells;
        const auteurData = { id_auteur: auteurId };

        for (const field of editableFields) {
            const input = cells[field.index].querySelector('.edit-input');
            if (input) {
                const value = input.value.trim();
                auteurData[field.name] = value === '' ? null : value;
            }
        }
        
        messageDiv.className = '';
        messageDiv.textContent = `Sauvegarde de l'auteur ID ${auteurId} en cours...`;

        ipcRenderer.send('update-auteur', auteurData);
        
        editModeRowId = null;
    }
    
    function cancelEdit() {
        if (!editModeRowId) return;

        messageDiv.textContent = 'Modification annulée. Rechargement...';
        editModeRowId = null;
        loadAuteurs(getCurrentFilters()); 
    }
    
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        loadAuteurs(getCurrentFilters());
    });

    btnTous.addEventListener('click', () => {
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        searchForm.reset(); 
        loadAuteurs({});
    });

    ipcRenderer.on('get-auteurs-response', (event, response) => {
        
        messageDiv.textContent = '';
        messageDiv.className = '';
        tableBody.innerHTML = '';

        if (response.success) {
            const auteurs = response.auteurs;
            
            if (auteurs.length === 0) {
                messageDiv.textContent = "Aucun auteur trouvé correspondant aux critères.";
                return;
            }

            auteurs.forEach(auteur => {
                const row = tableBody.insertRow();
                row.dataset.auteurId = auteur.id_auteur;
                
                const dateNaissance = auteur.date_naissance_auteur_formattee || 'N/A';
                
                row.insertCell().textContent = auteur.id_auteur;
                row.insertCell().textContent = auteur.nom_auteur;
                row.insertCell().textContent = auteur.prenom_auteur;
                row.insertCell().textContent = auteur.nationalite_auteur || 'N/A';
                row.insertCell().textContent = dateNaissance;
                
                const actionCell = row.insertCell();
                actionCell.className = 'action-cell';
                actionCell.innerHTML = '<button class="edit-btn" data-id="' + auteur.id_auteur + '">Modifier</button>';
                
                actionCell.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    enterEditMode(auteur.id_auteur);
                });
            });

        } else {
            displayError(response.message);
            console.error("Erreur de récupération des auteurs:", response.message);
        }
    });
    
    ipcRenderer.on('update-auteur-response', (event, response) => {
        if (response.success) {
            messageDiv.className = '';
            messageDiv.textContent = `Auteur ID ${response.id} mis à jour avec succès! Rechargement...`;
            loadAuteurs(getCurrentFilters());
        } else {
            displayError(`Échec de la mise à jour de l'auteur ID ${response.id} : ${response.message}`, 6);
            loadAuteurs(getCurrentFilters());
        }
    });

    loadAuteurs({});

    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'auteur.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});