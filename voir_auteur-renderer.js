// voir_auteur-renderer.js (Mis à Jour pour l'édition)

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('auteurs-table-body');
    const messageDiv = document.getElementById('message');
    const searchForm = document.getElementById('search-form'); 
    const btnTous = document.getElementById('btn-tous'); 
    const backButton = document.getElementById('btn-retour');
    
    let editModeRowId = null; // ID de l'auteur en cours d'édition

    // Définition des champs éditables (index basé sur l'ordre du tableau HTML)
    const editableFields = [
        { index: 1, name: 'nom_auteur', type: 'text' },
        { index: 2, name: 'prenom_auteur', type: 'text' },
        { index: 3, name: 'nationalite_auteur', type: 'text' },
        // La date de naissance sera traitée comme un champ date
        { index: 4, name: 'date_naissance_auteur', type: 'date' } 
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

    // 1. Fonction principale pour charger les données (avec filtres optionnels)
    const loadAuteurs = (filters = {}) => {
        messageDiv.textContent = 'Chargement de la liste des auteurs...';
        messageDiv.className = '';
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Recherche en cours...</td></tr>';
        
        ipcRenderer.send('get-auteurs', filters);
    };

    // 2. Fonction pour passer en mode édition
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
        
        // Remplacer le contenu des cellules par des champs de saisie/date
        editableFields.forEach(field => {
            const cell = cells[field.index];
            let originalValue = cell.textContent.trim(); 
            
            // Si c'est 'N/A', la valeur initiale est vide pour le champ de saisie
            if (originalValue === 'N/A') {
                originalValue = '';
            }
            
            if (field.type === 'text') {
                cell.innerHTML = `<input type="text" class="edit-input" name="${field.name}" value="${originalValue}">`;
            } else if (field.type === 'date') {
                 // Le format de la date affichée est déjà YYYY-MM-DD grâce à main.js
                cell.innerHTML = `<input type="date" class="edit-input" name="${field.name}" value="${originalValue}">`;
            }
        });

        // Mettre à jour la cellule d'action (cells[5])
        const actionCell = cells[5];
        actionCell.innerHTML = `
            <button class="save-button" data-id="${auteurId}">Sauvegarder</button>
            <button class="cancel-button">Annuler</button>
        `;

        // Attacher les nouveaux écouteurs d'événements
        actionCell.querySelector('.save-button').addEventListener('click', saveEdit);
        actionCell.querySelector('.cancel-button').addEventListener('click', cancelEdit);
    }
    
    // 3. Fonction pour sauvegarder les modifications
    function saveEdit(e) {
        e.stopPropagation();
        const auteurId = e.target.dataset.id;
        const row = tableBody.querySelector(`tr[data-auteur-id="${auteurId}"]`);
        if (!row) return;

        const cells = row.cells;
        const auteurData = { id_auteur: auteurId };

        // Collecter les nouvelles valeurs
        for (const field of editableFields) {
            const input = cells[field.index].querySelector('.edit-input');
            if (input) {
                const value = input.value.trim();
                // Passer NULL si le champ est vide
                auteurData[field.name] = value === '' ? null : value;
            }
        }
        
        messageDiv.className = '';
        messageDiv.textContent = `Sauvegarde de l'auteur ID ${auteurId} en cours...`;

        // Envoyer la requête de mise à jour à main.js
        ipcRenderer.send('update-auteur', auteurData);
        
        // Réinitialiser le mode édition (sera rechargé par la réponse de main.js)
        editModeRowId = null;
    }
    
    // 4. Fonction pour annuler les modifications
    function cancelEdit() {
        if (!editModeRowId) return;

        messageDiv.textContent = 'Modification annulée. Rechargement...';
        editModeRowId = null;
        loadAuteurs(getCurrentFilters()); 
    }
    
    // --- Événements et Réponse IPC ---

    // 5. Gestion de la soumission du formulaire de recherche
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        loadAuteurs(getCurrentFilters());
    });

    // 6. Gestion du bouton "TOUS LES AUTEURS"
    btnTous.addEventListener('click', () => {
        if (editModeRowId) {
             messageDiv.className = 'error';
             messageDiv.textContent = 'Veuillez sauvegarder ou annuler la modification en cours.';
             return;
        }
        searchForm.reset(); 
        loadAuteurs({});
    });

    // 7. Écoute la réponse du processus principal (Chargement)
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

            // Construction des lignes du tableau
            auteurs.forEach(auteur => {
                const row = tableBody.insertRow();
                row.dataset.auteurId = auteur.id_auteur; // Important pour l'édition
                
                const dateNaissance = auteur.date_naissance_auteur_formattee || 'N/A';
                
                row.insertCell().textContent = auteur.id_auteur;
                row.insertCell().textContent = auteur.nom_auteur;
                row.insertCell().textContent = auteur.prenom_auteur;
                row.insertCell().textContent = auteur.nationalite_auteur || 'N/A';
                row.insertCell().textContent = dateNaissance;
                
                // Cellule d'action
                const actionCell = row.insertCell();
                actionCell.className = 'action-cell';
                actionCell.innerHTML = '<button class="edit-btn" data-id="' + auteur.id_auteur + '">Modifier</button>';
                
                // Attacher l'écouteur d'événement au bouton Modifier
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
    
    // 8. NOUVEAU: Écoute la réponse de la mise à jour
    ipcRenderer.on('update-auteur-response', (event, response) => {
        if (response.success) {
            messageDiv.className = '';
            messageDiv.textContent = `Auteur ID ${response.id} mis à jour avec succès! Rechargement...`;
            // Recharger la liste après une mise à jour réussie
            loadAuteurs(getCurrentFilters());
        } else {
            displayError(`Échec de la mise à jour de l'auteur ID ${response.id} : ${response.message}`, 6);
            // Recharger pour rétablir l'état d'affichage normal
            loadAuteurs(getCurrentFilters());
        }
    });

    // 9. Lancer le chargement initial au démarrage
    loadAuteurs({});

    if (backButton) {
        backButton.addEventListener('click', () => {
            // Envoie la demande pour ouvrir utilisateur.html (qui remplacera la fenêtre actuelle)
            ipcRenderer.send('open-window', 'auteur.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});