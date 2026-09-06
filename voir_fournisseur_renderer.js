const { ipcRenderer } = window.electron;

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('fournisseurs-table-body');
    const messageDiv = document.getElementById('message');
    const searchForm = document.getElementById('search-form');
    const btnTous = document.getElementById('btn-tous');
    const backButton = document.getElementById('btn-retour');
    
    let editModeRowId = null;

    const editableFields = [
        { index: 1, name: 'nom_fournisseur', type: 'text' },
        { index: 2, name: 'contact_fournisseur', type: 'text' },
        { index: 3, name: 'email_fournisseur', type: 'email' },
        { index: 4, name: 'adresse_fournisseur', type: 'text' } 
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

    const loadFournisseurs = (filters = {}) => {
        messageDiv.textContent = 'Chargement de la liste des fournisseurs...';
        messageDiv.className = '';
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Recherche en cours...</td></tr>';
        
        ipcRenderer.send('get-fournisseurs', filters);
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

    function enterEditMode(fournisseurId) {
        if (editModeRowId && editModeRowId !== fournisseurId) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours sur l\'autre ligne.';
            return;
        }
        
        const row = tableBody.querySelector(`tr[data-fournisseur-id="${fournisseurId}"]`);
        if (!row) return;

        editModeRowId = fournisseurId;
        const cells = row.cells;
        
        editableFields.forEach(field => {
            const cell = cells[field.index];
            let originalValue = cell.textContent.trim(); 
            
            if (originalValue === 'N/A') {
                originalValue = '';
            }
            
            cell.innerHTML = `<input type="${escapeHtml(field.type)}" class="edit-input" name="${escapeHtml(field.name)}" value="${escapeHtml(originalValue)}">`;
        });

        const actionCell = cells[5];
        actionCell.innerHTML = `
            <button class="save-button" data-id="${fournisseurId}">Sauvegarder</button>
            <button class="cancel-button">Annuler</button>
        `;

        actionCell.querySelector('.save-button').addEventListener('click', saveEdit);
        actionCell.querySelector('.cancel-button').addEventListener('click', cancelEdit);
    }
    
    function saveEdit(e) {
        e.stopPropagation();
        const fournisseurId = e.target.dataset.id;
        const row = tableBody.querySelector(`tr[data-fournisseur-id="${fournisseurId}"]`);
        if (!row) return;

        const cells = row.cells;
        const fournisseurData = { id_fournisseur: fournisseurId };

        for (const field of editableFields) {
            const input = cells[field.index].querySelector('.edit-input');
            if (input) {
                const value = input.value.trim();
                fournisseurData[field.name] = value === '' ? null : value;
            }
        }
        
        messageDiv.className = '';
        messageDiv.textContent = `Sauvegarde du fournisseur ID ${fournisseurId} en cours...`;

        ipcRenderer.send('update-fournisseur', fournisseurData);
        
        editModeRowId = null;
    }
    
    function cancelEdit() {
        if (!editModeRowId) return;

        messageDiv.textContent = 'Modification annulée. Rechargement...';
        editModeRowId = null;
        loadFournisseurs(getCurrentFilters()); 
    }
    
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        loadFournisseurs(getCurrentFilters());
    });

    btnTous.addEventListener('click', () => {
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        searchForm.reset(); 
        loadFournisseurs({});
    });

    ipcRenderer.on('get-fournisseurs-response', (event, response) => {
        
        messageDiv.textContent = '';
        messageDiv.className = '';
        tableBody.innerHTML = '';
        const colspan = 6; 

        if (response.success) {
            const fournisseurs = response.fournisseurs;
            
            if (fournisseurs.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">Aucun fournisseur trouvé correspondant aux critères.</td></tr>`;
                return;
            }

            fournisseurs.forEach(fournisseur => {
                const row = tableBody.insertRow();
                row.dataset.fournisseurId = fournisseur.id_fournisseur;
                
                row.insertCell().textContent = fournisseur.id_fournisseur;
                row.insertCell().textContent = fournisseur.nom_fournisseur;
                row.insertCell().textContent = fournisseur.contact_fournisseur || 'N/A';
                row.insertCell().textContent = fournisseur.email_fournisseur || 'N/A';
                row.insertCell().textContent = fournisseur.adresse_fournisseur || 'N/A';
                
                const actionCell = row.insertCell();
                actionCell.className = 'action-cell';
                actionCell.innerHTML = '<button class="edit-btn" data-id="' + fournisseur.id_fournisseur + '">Modifier</button>';
                
                actionCell.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    enterEditMode(fournisseur.id_fournisseur);
                });
            });

        } else {
            displayError(response.message, colspan);
            console.error("Erreur de récupération des fournisseurs:", response.message);
        }
    });
    
    ipcRenderer.on('update-fournisseur-response', (event, response) => {
        if (response.success) {
            messageDiv.className = '';
            messageDiv.textContent = `Fournisseur ID ${response.id} mis à jour avec succès! Rechargement...`;
            loadFournisseurs(getCurrentFilters());
        } else {
            displayError(`Échec de la mise à jour du fournisseur ID ${response.id} : ${response.message}`, 6);
            loadFournisseurs(getCurrentFilters());
        }
    });

    loadFournisseurs({});

    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'fournisseur.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});