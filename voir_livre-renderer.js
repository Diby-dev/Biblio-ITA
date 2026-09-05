const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('livres-table-body');
    const messageDiv = document.getElementById('message');
    const searchForm = document.getElementById('search-form');
    const btnTous = document.getElementById('btn-tous');
    const backButton = document.getElementById('btn-retour');
    
    let editModeRowId = null; 
    let initialData = { auteurs: [], fournisseurs: [] };

    const editableFields = [
        { index: 2, name: 'titre_livre', type: 'text' },
        { index: 3, name: 'id_auteur', type: 'select', dataKey: 'auteurs', idKey: 'id_auteur', textKey: 'nom_auteur_complet' },
        { index: 4, name: 'id_fournisseur', type: 'select', dataKey: 'fournisseurs', idKey: 'id_fournisseur', textKey: 'nom_fournisseur' },
        { index: 5, name: 'exemplaire_livre', type: 'number' }
    ];

    const displayError = (message, colspan = 8) => {
        messageDiv.className = 'error';
        messageDiv.textContent = `Erreur : ${message}`;
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

    const loadLivres = (filters = {}) => {
        messageDiv.textContent = 'Chargement de la liste des livres...';
        messageDiv.className = '';
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Recherche en cours...</td></tr>';
        
        if (initialData.auteurs.length > 0 && initialData.fournisseurs.length > 0) {
            ipcRenderer.send('get-livres', filters);
        } else {
             messageDiv.textContent = 'Initialisation des données (auteurs/fournisseurs)...';
        }
    };
    
    function enterEditMode(livreId, currentData) {
        if (editModeRowId && editModeRowId !== livreId) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours sur l\'autre ligne.';
            return;
        }
        
        const row = tableBody.querySelector(`tr[data-livre-id="${livreId}"]`);
        if (!row) return;

        editModeRowId = livreId;
        const cells = row.cells;
        cells[1].innerHTML = '<input type="file" class="edit-image-input" accept="image/*">';
        
        editableFields.forEach(field => {
            const cell = cells[field.index];
            
            if (field.type === 'text') {
                const originalValue = cell.textContent.trim();
                cell.innerHTML = `<input type="text" class="edit-input" name="${field.name}" value="${originalValue}">`;
            
            } else if (field.type === 'number') {
                const originalValue = cell.textContent.trim();
                cell.innerHTML = `<input type="number" min="0" step="1" class="edit-input" name="${field.name}" value="${originalValue}">`;

            } else if (field.type === 'select' && field.options) {
                const currentValue = cell.textContent.trim();
                let optionsHTML = field.options.map(opt => 
                    `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`
                ).join('');
                cell.innerHTML = `<select class="edit-select" name="${field.name}">${optionsHTML}</select>`;
            
            } else if (field.type === 'select' && field.dataKey) {
                const dataList = initialData[field.dataKey];
                
                const currentId = currentData[field.idKey] || ''; 
                
                let optionsHTML = `<option value="">-- Non spécifié --</option>`;
                
                optionsHTML += dataList.map(item => 
                    `<option value="${item[field.idKey]}" ${item[field.idKey] == currentId ? 'selected' : ''}>${item[field.textKey]}</option>`
                ).join('');
                cell.innerHTML = `<select class="edit-select" name="${field.name}">${optionsHTML}</select>`;
            }
        });

        const actionCell = cells[7];
        actionCell.innerHTML = `
            <button class="save-button" data-id="${livreId}">Sauvegarder</button>
            <button class="cancel-button">Annuler</button>
        `;

        actionCell.querySelector('.save-button').addEventListener('click', saveEdit);
        actionCell.querySelector('.cancel-button').addEventListener('click', cancelEdit);
    }
    
    function saveEdit(e) {
        e.stopPropagation();
        const livreId = e.target.dataset.id;
        const row = tableBody.querySelector(`tr[data-livre-id="${livreId}"]`);
        if (!row) return;

        const cells = row.cells;
        const livreData = { id_livre: livreId };

        for (const field of editableFields) {
            const input = cells[field.index].querySelector(`.edit-input, .edit-select`);
            if (input) {
                const value = input.value.trim();
                livreData[field.name] = value === '' ? null : value;
            }
        }

        const imageFile = cells[1].querySelector('.edit-image-input').files[0];
        livreData.imageSourcePath = imageFile ? imageFile.path : null;
        
        messageDiv.className = '';
        messageDiv.textContent = `Sauvegarde du livre ID ${livreId} en cours...`;

        ipcRenderer.send('update-livre', livreData);
        
        editModeRowId = null;
    }
    
    function cancelEdit() {
        if (!editModeRowId) return;

        messageDiv.textContent = 'Modification annulée. Rechargement...';
        editModeRowId = null;
        loadLivres(getCurrentFilters()); 
    }
    
    ipcRenderer.send('get-livre-dependencies');

    ipcRenderer.on('get-livre-dependencies-response', (event, response) => {
        if (response.success) {
            initialData.auteurs = response.auteurs;
            initialData.fournisseurs = response.fournisseurs;
            loadLivres({});
        } else {
             displayError(`Impossible de charger les dépendances (Auteurs/Fournisseurs) : ${response.message}`);
        }
    });

    ipcRenderer.on('get-livres-response', (event, response) => {
        
        messageDiv.textContent = '';
        messageDiv.className = '';
        tableBody.innerHTML = '';
        const colspan = 8;

        if (response.success) {
            const livres = response.livres;
            
            if (livres.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">Aucun livre trouvé correspondant aux critères.</td></tr>`;
                return;
            }

            livres.forEach(livre => {
                const row = tableBody.insertRow();
                row.dataset.livreId = livre.id_livre; 
                
                const exemplaires = parseInt(livre.exemplaire_livre, 10) || 0;
                const E = livre.emprunts_actifs || 0;

                row.insertCell().textContent = livre.id_livre;
                const imageCell = row.insertCell();
                if (livre.image_livre) {
                    const image = document.createElement('img');
                    image.src = livre.image_livre;
                    image.alt = `Couverture de ${livre.titre_livre}`;
                    image.className = 'livre-image';
                    imageCell.appendChild(image);
                }
                row.insertCell().textContent = livre.titre_livre;
                row.insertCell().textContent = livre.nom_auteur_complet || 'Inconnu'; 
                row.insertCell().textContent = livre.nom_fournisseur || 'Inconnu';
                row.insertCell().textContent = exemplaires;
                
                const statutCell = row.insertCell();
                if (exemplaires > 0) {
                    statutCell.textContent = `disponible (E: ${E})`;
                    statutCell.className = 'statut-disponible';
                } else {
                    statutCell.textContent = `vide (E: ${E})`;
                    statutCell.className = 'statut-vide';
                }
                
                const actionCell = row.insertCell();
                actionCell.className = 'action-cell';
                actionCell.innerHTML = '<button class="edit-btn" data-id="' + livre.id_livre + '">Modifier</button>';
                
                actionCell.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    enterEditMode(livre.id_livre, livre);
                });
            });

        } else {
            displayError(response.message, colspan);
            console.error("Erreur de récupération des livres:", response.message);
        }
    });
    
    ipcRenderer.on('update-livre-response', (event, response) => {
        if (response.success) {
            messageDiv.className = '';
            messageDiv.textContent = `Livre ID ${response.id} mis à jour avec succès! Rechargement...`;
            loadLivres(getCurrentFilters());
        } else {
            displayError(`Échec de la mise à jour du livre ID ${response.id} : ${response.message}`, 8);
            loadLivres(getCurrentFilters());
        }
    });

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        loadLivres(getCurrentFilters());
    });

    btnTous.addEventListener('click', () => {
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        searchForm.reset(); 
        loadLivres({});
    });
    if (backButton) {
        backButton.addEventListener('click', () => {

            ipcRenderer.send('open-window', 'livre.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});
