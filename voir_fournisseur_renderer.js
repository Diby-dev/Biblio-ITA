// voir_fournisseur-renderer.js (Mis à Jour pour l'édition)

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('fournisseurs-table-body');
    const messageDiv = document.getElementById('message');
    const searchForm = document.getElementById('search-form');
    const btnTous = document.getElementById('btn-tous');
    const backButton = document.getElementById('btn-retour');
    
    let editModeRowId = null; // ID du fournisseur en cours d'édition

    // Définition des champs éditables (index basé sur l'ordre du tableau HTML)
    const editableFields = [
        { index: 1, name: 'nom_fournisseur', type: 'text' },
        { index: 2, name: 'contact_fournisseur', type: 'text' },
        { index: 3, name: 'email_fournisseur', type: 'email' },
        { index: 4, name: 'adresse_fournisseur', type: 'text' } 
    ];

    // Fonction pour afficher un message d'erreur
    const displayError = (message, colspan = 6) => {
        messageDiv.className = 'error';
        messageDiv.textContent = `Erreur de chargement : ${message}`;
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">Erreur de chargement des données.</td></tr>`;
    };

    // Fonction pour obtenir les filtres actuels du formulaire
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

    // Nouvelle fonction principale pour charger les données (avec filtres optionnels)
    const loadFournisseurs = (filters = {}) => {
        messageDiv.textContent = 'Chargement de la liste des fournisseurs...';
        messageDiv.className = '';
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Recherche en cours...</td></tr>';
        
        ipcRenderer.send('get-fournisseurs', filters);
    };

    // 1. Fonction pour passer en mode édition
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
        
        // Remplacer le contenu des cellules par des champs de saisie
        editableFields.forEach(field => {
            const cell = cells[field.index];
            let originalValue = cell.textContent.trim(); 
            
            if (originalValue === 'N/A') {
                originalValue = '';
            }
            
            cell.innerHTML = `<input type="${field.type}" class="edit-input" name="${field.name}" value="${originalValue}">`;
        });

        // Mettre à jour la cellule d'action (cells[5])
        const actionCell = cells[5];
        actionCell.innerHTML = `
            <button class="save-button" data-id="${fournisseurId}">Sauvegarder</button>
            <button class="cancel-button">Annuler</button>
        `;

        // Attacher les nouveaux écouteurs d'événements
        actionCell.querySelector('.save-button').addEventListener('click', saveEdit);
        actionCell.querySelector('.cancel-button').addEventListener('click', cancelEdit);
    }
    
    // 2. Fonction pour sauvegarder les modifications
    function saveEdit(e) {
        e.stopPropagation();
        const fournisseurId = e.target.dataset.id;
        const row = tableBody.querySelector(`tr[data-fournisseur-id="${fournisseurId}"]`);
        if (!row) return;

        const cells = row.cells;
        const fournisseurData = { id_fournisseur: fournisseurId };

        // Collecter les nouvelles valeurs
        for (const field of editableFields) {
            const input = cells[field.index].querySelector('.edit-input');
            if (input) {
                const value = input.value.trim();
                // Passer NULL si le champ est vide
                fournisseurData[field.name] = value === '' ? null : value;
            }
        }
        
        messageDiv.className = '';
        messageDiv.textContent = `Sauvegarde du fournisseur ID ${fournisseurId} en cours...`;

        // Envoyer la requête de mise à jour à main.js
        ipcRenderer.send('update-fournisseur', fournisseurData);
        
        editModeRowId = null;
    }
    
    // 3. Fonction pour annuler les modifications
    function cancelEdit() {
        if (!editModeRowId) return;

        messageDiv.textContent = 'Modification annulée. Rechargement...';
        editModeRowId = null;
        loadFournisseurs(getCurrentFilters()); 
    }
    
    // --- Événements et Réponse IPC ---

    // 4. Gestion de la soumission du formulaire de recherche
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        loadFournisseurs(getCurrentFilters());
    });

    // 5. Gestion du bouton "TOUS LES FOURNISSEURS"
    btnTous.addEventListener('click', () => {
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        searchForm.reset(); 
        loadFournisseurs({});
    });

    // 6. Écoute la réponse du processus principal (Chargement)
    ipcRenderer.on('get-fournisseurs-response', (event, response) => {
        
        messageDiv.textContent = '';
        messageDiv.className = '';
        tableBody.innerHTML = '';
        const colspan = 6; // Nombre total de colonnes (y compris Action)

        if (response.success) {
            const fournisseurs = response.fournisseurs;
            
            if (fournisseurs.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">Aucun fournisseur trouvé correspondant aux critères.</td></tr>`;
                return;
            }

            // Construction des lignes du tableau
            fournisseurs.forEach(fournisseur => {
                const row = tableBody.insertRow();
                row.dataset.fournisseurId = fournisseur.id_fournisseur; // Important pour l'édition
                
                row.insertCell().textContent = fournisseur.id_fournisseur;
                row.insertCell().textContent = fournisseur.nom_fournisseur;
                row.insertCell().textContent = fournisseur.contact_fournisseur || 'N/A';
                row.insertCell().textContent = fournisseur.email_fournisseur || 'N/A';
                row.insertCell().textContent = fournisseur.adresse_fournisseur || 'N/A';
                
                // Cellule d'action
                const actionCell = row.insertCell();
                actionCell.className = 'action-cell';
                actionCell.innerHTML = '<button class="edit-btn" data-id="' + fournisseur.id_fournisseur + '">Modifier</button>';
                
                // Attacher l'écouteur d'événement au bouton Modifier
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
    
    // 7. NOUVEAU: Écoute la réponse de la mise à jour
    ipcRenderer.on('update-fournisseur-response', (event, response) => {
        if (response.success) {
            messageDiv.className = '';
            messageDiv.textContent = `Fournisseur ID ${response.id} mis à jour avec succès! Rechargement...`;
            // Recharger la liste après une mise à jour réussie
            loadFournisseurs(getCurrentFilters());
        } else {
            displayError(`Échec de la mise à jour du fournisseur ID ${response.id} : ${response.message}`, 6);
            // Recharger pour rétablir l'état d'affichage normal
            loadFournisseurs(getCurrentFilters());
        }
    });

    // 8. Lancer le chargement initial au démarrage
    loadFournisseurs({});

    if (backButton) {
        backButton.addEventListener('click', () => {
            // Envoie la demande pour ouvrir utilisateur.html (qui remplacera la fenêtre actuelle)
            ipcRenderer.send('open-window', 'fournisseur.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});