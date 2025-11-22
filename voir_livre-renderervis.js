// voir_livre-renderer.js (Mis à Jour pour l'édition avec clés étrangères)

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('livres-table-body');
    const messageDiv = document.getElementById('message');
    const searchForm = document.getElementById('search-form');
    const btnTous = document.getElementById('btn-tous');
    const backButton = document.getElementById('btn-retour');
    
    let editModeRowId = null; 
    let initialData = { auteurs: [], fournisseurs: [] }; // Pour stocker les listes déroulantes

    // Définition des champs éditables (index basé sur l'ordre du tableau HTML)
    const editableFields = [
        { index: 1, name: 'titre_livre', type: 'text' },
        { index: 2, name: 'id_auteur', type: 'select', dataKey: 'auteurs', idKey: 'id_auteur', textKey: 'nom_auteur_complet' },
        { index: 3, name: 'id_fournisseur', type: 'select', dataKey: 'fournisseurs', idKey: 'id_fournisseur', textKey: 'nom_fournisseur' },
        { index: 4, name: 'statut_livre', type: 'select', options: ['Disponible', 'Emprunté'] }
    ];

    const displayError = (message, colspan = 6) => {
        messageDiv.className = 'error';
        messageDiv.textContent = `Erreur : ${message}`;
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
    const loadLivres = (filters = {}) => {
        messageDiv.textContent = 'Chargement de la liste des livres...';
        messageDiv.className = '';
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Recherche en cours...</td></tr>';
        
        // La requête est envoyée seulement si les listes d'auteurs/fournisseurs sont prêtes
        if (initialData.auteurs.length > 0 && initialData.fournisseurs.length > 0) {
            ipcRenderer.send('get-livres', filters);
        } else {
             messageDiv.textContent = 'Initialisation des données (auteurs/fournisseurs)...';
        }
    };
    
    // Fonction pour passer en mode édition
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
        
        // Remplacer le contenu des cellules par des champs de saisie/select
        editableFields.forEach(field => {
            const cell = cells[field.index];
            
            if (field.type === 'text') {
                const originalValue = cell.textContent.trim();
                cell.innerHTML = `<input type="text" class="edit-input" name="${field.name}" value="${originalValue}">`;
            
            } else if (field.type === 'select' && field.options) {
                // Statut (Liste statique)
                const currentValue = cell.textContent.trim();
                let optionsHTML = field.options.map(opt => 
                    `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`
                ).join('');
                cell.innerHTML = `<select class="edit-select" name="${field.name}">${optionsHTML}</select>`;
            
            } else if (field.type === 'select' && field.dataKey) {
                // Clé étrangère (Liste dynamique Auteur/Fournisseur)
                const dataList = initialData[field.dataKey];
                
                // Récupérer l'ID actuel
                // Si l'auteur/fournisseur est 'Inconnu', l'ID est null/0, sinon c'est l'ID stocké dans l'objet livre
                const currentId = currentData[field.idKey] || ''; 
                
                let optionsHTML = `<option value="">-- Non spécifié --</option>`; // Option pour NULL
                
                optionsHTML += dataList.map(item => 
                    `<option value="${item[field.idKey]}" ${item[field.idKey] == currentId ? 'selected' : ''}>${item[field.textKey]}</option>`
                ).join('');
                cell.innerHTML = `<select class="edit-select" name="${field.name}">${optionsHTML}</select>`;
            }
        });

        // Mettre à jour la cellule d'action (cells[5])
        const actionCell = cells[5];
        actionCell.innerHTML = `
            <button class="save-button" data-id="${livreId}">Sauvegarder</button>
            <button class="cancel-button">Annuler</button>
        `;

        // Attacher les nouveaux écouteurs d'événements
        actionCell.querySelector('.save-button').addEventListener('click', saveEdit);
        actionCell.querySelector('.cancel-button').addEventListener('click', cancelEdit);
    }
    
    // Fonction pour sauvegarder les modifications
    function saveEdit(e) {
        e.stopPropagation();
        const livreId = e.target.dataset.id;
        const row = tableBody.querySelector(`tr[data-livre-id="${livreId}"]`);
        if (!row) return;

        const cells = row.cells;
        const livreData = { id_livre: livreId };

        // Collecter les nouvelles valeurs
        for (const field of editableFields) {
            const input = cells[field.index].querySelector(`.edit-input, .edit-select`);
            if (input) {
                const value = input.value.trim();
                // Passer NULL si le champ est vide (seulement pour les select non-obligatoires) ou pour les ID non choisis
                livreData[field.name] = value === '' ? null : value;
            }
        }
        
        messageDiv.className = '';
        messageDiv.textContent = `Sauvegarde du livre ID ${livreId} en cours...`;

        // Envoyer la requête de mise à jour à main.js
        ipcRenderer.send('update-livre', livreData);
        
        editModeRowId = null;
    }
    
    // Fonction pour annuler les modifications
    function cancelEdit() {
        if (!editModeRowId) return;

        messageDiv.textContent = 'Modification annulée. Rechargement...';
        editModeRowId = null;
        loadLivres(getCurrentFilters()); 
    }
    
    // --- Événements et Réponses IPC ---

    // Récupère les IDs et les noms des Auteurs/Fournisseurs au démarrage
    ipcRenderer.send('get-livre-dependencies');

    // 1. Réponse des dépendances (Auteurs/Fournisseurs)
    ipcRenderer.on('get-livre-dependencies-response', (event, response) => {
        if (response.success) {
            initialData.auteurs = response.auteurs;
            initialData.fournisseurs = response.fournisseurs;
            // Maintenant que les listes sont prêtes, charger les livres
            loadLivres({});
        } else {
             displayError(`Impossible de charger les dépendances (Auteurs/Fournisseurs) : ${response.message}`);
        }
    });

    // 2. Réponse des Livres (Chargement/Recherche)
    ipcRenderer.on('get-livres-response', (event, response) => {
        
        messageDiv.textContent = '';
        messageDiv.className = '';
        tableBody.innerHTML = '';
        const colspan = 6; 

        if (response.success) {
            const livres = response.livres;
            
            if (livres.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;">Aucun livre trouvé correspondant aux critères.</td></tr>`;
                return;
            }

            // Construction des lignes du tableau
            livres.forEach(livre => {
                const row = tableBody.insertRow();
                row.dataset.livreId = livre.id_livre; 
                
                const statut = livre.statut_livre || 'N/A';
                const statutClass = `statut-${statut.toLowerCase().replace('é', 'e')}`; 

                row.insertCell().textContent = livre.id_livre;
                row.insertCell().textContent = livre.titre_livre;
                row.insertCell().textContent = livre.nom_auteur_complet || 'Inconnu'; 
                row.insertCell().textContent = livre.nom_fournisseur || 'Inconnu';
                
                const statutCell = row.insertCell();
                statutCell.textContent = statut;
                statutCell.className = statutClass;
                
                // Cellule d'action
                const actionCell = row.insertCell();
                actionCell.className = 'action-cell';
                actionCell.innerHTML = '';
                
                
                
            });

      
        }
    });
    
    // 3. Réponse de la mise à jour
    ipcRenderer.on('update-livre-response', (event, response) => {
        if (response.success) {
            messageDiv.className = '';
            messageDiv.textContent = `Livre ID ${response.id} mis à jour avec succès! Rechargement...`;
            loadLivres(getCurrentFilters());
        } else {
            displayError(`Échec de la mise à jour du livre ID ${response.id} : ${response.message}`, 6);
            loadLivres(getCurrentFilters());
        }
    });

    // 4. Gestion du formulaire de recherche
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        loadLivres(getCurrentFilters());
    });

    // 5. Gestion du bouton "TOUS LES LIVRES"
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
            // Envoie la demande pour ouvrir utilisateur.html (qui remplacera la fenêtre actuelle)
            ipcRenderer.send('open-window', 'indexvis.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});