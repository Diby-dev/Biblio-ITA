// voir_emprunt-renderer.js (Version Complète avec Edition et PDF individuel)

const { ipcRenderer } = require('electron');

let initialData = {
    livres: [],
    utilisateurs: []
};
let currentEmprunts = {}; // Stocke les données des emprunts par ID pour référence

// --- UTILS ---

const tableBody = document.getElementById('emprunts-table-body');
const messageDiv = document.getElementById('message');
const searchForm = document.getElementById('search-form');
const btnTous = document.getElementById('btn-tous');
const backButton = document.getElementById('btn-retour');

const statutOptions = [
    { value: 'En cours', text: 'En cours' },
    { value: 'Retourné', text: 'Retourné' },
    { value: 'En retard', text: 'En retard' }
];

const displayMessage = (message, type) => {
    messageDiv.className = type;
    messageDiv.textContent = message;
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = '';
    }, 5000);
};

const displayError = (message) => {
    displayMessage(`Erreur : ${message}`, 'error');
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Erreur de chargement des données.</td></tr>';
};

// Récupère les filtres du formulaire
const getCurrentFilters = () => {
    const formData = new FormData(searchForm);
    const rawFilters = Object.fromEntries(formData.entries());
    const filters = {};

    // Filtrer les champs qui sont vides
    for (const key in rawFilters) {
        const value = rawFilters[key].trim();
        if (value !== "") {
            filters[key] = value;
        }
    }
    return filters;
}

// --- RENDU DU TABLEAU ---

const renderEmprunts = (emprunts) => {
    tableBody.innerHTML = '';
    currentEmprunts = {}; // Réinitialise le cache

    if (emprunts.length === 0) {
        displayMessage("Aucun emprunt trouvé correspondant aux critères.", 'info');
        return;
    }

    emprunts.forEach(emprunt => {
        currentEmprunts[emprunt.id_emprunt] = emprunt; // Stocke l'emprunt
        
        const row = tableBody.insertRow();
        row.id = `emprunt-row-${emprunt.id_emprunt}`;
        
        const statut = emprunt.statut_emprunt || 'N/A';
        const statutClass = `statut-${statut.toLowerCase().replace(' ', '.').replace('é', 'e')}`; 

        // Cellules d'affichage
        row.insertCell().textContent = emprunt.id_emprunt;
        row.insertCell().textContent = emprunt.titre_livre || 'Livre (ID Inconnu)'; 
        row.insertCell().textContent = emprunt.nom_utilisateur_complet || 'Utilisateur (ID Inconnu)';
        row.insertCell().textContent = emprunt.date_emprunt;
        
        const statutCell = row.insertCell();
        statutCell.textContent = statut;
        statutCell.className = statutClass;
        
        row.insertCell().textContent = emprunt.date_limite_retour;
        row.insertCell().textContent = emprunt.date_retour || 'En attente';
        
        // Cellule d'Action
        const actionCell = row.insertCell();
        actionCell.className = 'action-cell';
        
        // Bouton Modifier
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.textContent = 'Modifier';
        editButton.dataset.id = emprunt.id_emprunt;
        
        editButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            enterEditMode(emprunt.id_emprunt);
        });

        // NOUVEAU : Bouton PDF
        const pdfButton = document.createElement('button');
        pdfButton.className = 'action-button';
        pdfButton.textContent = 'PDF';
        // Utilisation de styles inline simples pour le bouton PDF
        pdfButton.style.backgroundColor = '#dc3545'; 
        pdfButton.style.padding = '5px';
        pdfButton.style.fontSize = '12px';
        pdfButton.style.margin = '2px';
        pdfButton.dataset.id = emprunt.id_emprunt;

        pdfButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            generateSinglePdf(emprunt.id_emprunt); // Appel à la fonction PDF
        });
        
        actionCell.appendChild(editButton);
        actionCell.appendChild(pdfButton); // Ajout du bouton PDF
    });
};

// --- MODE ÉDITION EN LIGNE ---

const enterEditMode = (id) => {
    const emprunt = currentEmprunts[id];
    const row = document.getElementById(`emprunt-row-${id}`);
    
    // Si la ligne est déjà en mode édition, ne rien faire
    if (row.classList.contains('editing')) return;
    
    row.classList.add('editing');
    const cells = row.querySelectorAll('td');
    
    // 1. Livre (Index 1) - Champ SELECT
    const livreCell = cells[1];
    livreCell.dataset.originalValue = emprunt.id_livre;
    livreCell.innerHTML = createSelectField('id_livre', initialData.livres, emprunt.id_livre, 'id_livre', 'titre_livre');
    
    // 2. Utilisateur (Index 2) - Champ SELECT
    const utilisateurCell = cells[2];
    utilisateurCell.dataset.originalValue = emprunt.id_utilisateur;
    utilisateurCell.innerHTML = createSelectField('id_utilisateur', initialData.utilisateurs, emprunt.id_utilisateur, 'id_utilisateur', 'nom_complet');
    
    // 3. Date Emprunt (Index 3) - Champ INPUT DATE
    const dateEmpruntCell = cells[3];
    dateEmpruntCell.dataset.originalValue = emprunt.date_emprunt;
    dateEmpruntCell.innerHTML = `<input type="date" class="edit-input" name="date_emprunt" value="${emprunt.date_emprunt}">`;

    // 4. Statut (Index 4) - Champ SELECT
    const statutCell = cells[4];
    statutCell.dataset.originalValue = emprunt.statut_emprunt;
    statutCell.innerHTML = createSelectField('statut_emprunt', statutOptions, emprunt.statut_emprunt, 'value', 'text');
    
    // 5. Date Limite (Index 5) - Champ INPUT DATE
    const dateLimiteCell = cells[5];
    dateLimiteCell.dataset.originalValue = emprunt.date_limite_retour;
    dateLimiteCell.innerHTML = `<input type="date" class="edit-input" name="date_limite_retour" value="${emprunt.date_limite_retour}">`;

    // 6. Date Retour Réelle (Index 6) - Champ INPUT DATE
    const dateRetourCell = cells[6];
    dateRetourCell.dataset.originalValue = emprunt.date_retour || '';
    dateRetourCell.innerHTML = `<input type="date" class="edit-input" name="date_retour" value="${emprunt.date_retour || ''}">`;

    // 7. Action (Index 7) - Boutons Sauvegarder/Annuler
    const actionCell = cells[7];
    actionCell.innerHTML = `
        <button class="save-button" data-id="${id}">Sauvegarder</button>
        <button class="cancel-button" data-id="${id}">Annuler</button>
    `;
    
    // Ajout des écouteurs pour Sauvegarder et Annuler
    actionCell.querySelector('.save-button').addEventListener('click', (e) => {
        e.stopPropagation();
        saveEmprunt(id, row);
    });

    actionCell.querySelector('.cancel-button').addEventListener('click', (e) => {
        e.stopPropagation();
        exitEditMode(id, row, emprunt);
    });
};

const createSelectField = (name, options, selectedValue, valueKey, textKey) => {
    let selectHtml = `<select class="edit-select" name="${name}">`;
    options.forEach(option => {
        // Convertir en chaîne pour une comparaison fiable
        const isSelected = (option[valueKey] && option[valueKey].toString() === selectedValue.toString()) ? 'selected' : ''; 
        selectHtml += `<option value="${option[valueKey]}" ${isSelected}>${option[textKey]}</option>`;
    });
    selectHtml += '</select>';
    return selectHtml;
};

// Sortie du mode édition et restauration des valeurs d'origine
const exitEditMode = (id, row, emprunt) => {
    const cells = row.querySelectorAll('td');
    
    // Restaure le contenu de chaque cellule aux valeurs textuelles d'origine
    cells[1].textContent = emprunt.titre_livre;
    cells[2].textContent = emprunt.nom_utilisateur_complet;
    cells[3].textContent = emprunt.date_emprunt;
    cells[4].textContent = emprunt.statut_emprunt;
    cells[5].textContent = emprunt.date_limite_retour;
    cells[6].textContent = emprunt.date_retour || 'En attente';

    // Restaure les boutons d'action (Modifier + PDF)
    const actionCell = cells[7];
    actionCell.innerHTML = '';

    // Bouton Modifier
    const editButton = document.createElement('button');
    editButton.className = 'edit-btn';
    editButton.textContent = 'Modifier';
    editButton.dataset.id = id;
    editButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        enterEditMode(id);
    });
    
    // Bouton PDF
    const pdfButton = document.createElement('button');
    pdfButton.className = 'action-button'; 
    pdfButton.textContent = 'PDF';
    pdfButton.style.backgroundColor = '#dc3545'; 
    pdfButton.style.padding = '5px';
    pdfButton.style.fontSize = '12px';
    pdfButton.style.margin = '2px';
    pdfButton.dataset.id = id;

    pdfButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        generateSinglePdf(id);
    });

    actionCell.appendChild(editButton);
    actionCell.appendChild(pdfButton);
    
    row.classList.remove('editing');
};

// Logique de sauvegarde
const saveEmprunt = (id, row) => {
    const cells = row.querySelectorAll('td');
    const updatedData = {
        id_emprunt: id
    };
    
    // Récupère les nouvelles valeurs
    updatedData.id_livre = cells[1].querySelector('.edit-select').value;
    updatedData.id_utilisateur = cells[2].querySelector('.edit-select').value;
    updatedData.date_emprunt = cells[3].querySelector('.edit-input').value;
    updatedData.statut_emprunt = cells[4].querySelector('.edit-select').value;
    updatedData.date_limite_retour = cells[5].querySelector('.edit-input').value;
    updatedData.date_retour = cells[6].querySelector('.edit-input').value;

    // Validation basique (s'assurer que les dates ne sont pas nulles pour les champs obligatoires)
    if (!updatedData.id_livre || !updatedData.id_utilisateur || !updatedData.date_emprunt || !updatedData.statut_emprunt || !updatedData.date_limite_retour) {
         displayMessage("Veuillez remplir tous les champs obligatoires (Livre, Utilisateur, Dates, Statut).", 'error');
         return;
    }
    
    // Envoi au processus principal
    ipcRenderer.send('update-emprunt', updatedData);
};

// --- LOGIQUE PDF ---

const generateSinglePdf = (id) => {
    displayMessage(`Préparation du rapport PDF pour l'emprunt N° ${id}...`, 'info');
    // Envoi de la demande au processus principal (main.js)
    ipcRenderer.send('generate-emprunt-pdf-single', id);
};


// --- COMMUNICATION IPC ---

const loadEmprunts = (filters = {}) => {
    messageDiv.textContent = 'Chargement de la liste des emprunts...';
    messageDiv.className = '';
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Chargement...</td></tr>';
    
    // Le chargement des emprunts ne doit se faire qu'après avoir les dépendances
    if (initialData.livres.length > 0 && initialData.utilisateurs.length > 0) {
        ipcRenderer.send('get-emprunts', filters);
    } else {
        // Si les dépendances ne sont pas encore chargées, on les demande d'abord
        ipcRenderer.send('get-emprunt-dependencies');
    }
};

// 1. Réception des dépendances (Livres et Utilisateurs)
ipcRenderer.on('get-emprunt-dependencies-response', (event, response) => {
    if (response.success) {
        initialData.livres = response.livres;
        initialData.utilisateurs = response.utilisateurs;
        
        // Une fois les dépendances chargées, on charge les emprunts
        loadEmprunts({});
    } else {
        displayError(`Impossible de charger les dépendances (Livres/Utilisateurs): ${response.message}`);
    }
});

// 2. Réception de la liste des emprunts
ipcRenderer.on('get-emprunts-response', (event, response) => {
    messageDiv.textContent = '';
    messageDiv.className = '';

    if (response.success) {
        renderEmprunts(response.emprunts);
    } else {
        displayError(response.message);
        console.error("Erreur de récupération des emprunts:", response.message);
    }
});

// 3. Réception de la réponse de mise à jour
ipcRenderer.on('update-emprunt-response', (event, response) => {
    if (response.success) {
        displayMessage(`Emprunt ID ${response.id_emprunt} mis à jour avec succès!`, 'success');
        
        // Recharger le tableau pour afficher les nouvelles valeurs
        loadEmprunts(getCurrentFilters()); 
    } else {
        displayError(`La mise à jour de l'emprunt a échoué: ${response.message}`);
    }
});

// 4. Réception de la réponse de génération de PDF (NOUVEAU)
ipcRenderer.on('generate-emprunt-pdf-response', (event, response) => {
    if (response.success) {
        displayMessage(`Rapport PDF généré avec succès! Ouverture du fichier...`, 'success');
        // Demande au processus principal d'ouvrir le fichier
        ipcRenderer.send('open-file-in-shell', response.path); 
    } else {
        displayError(`Échec de la génération du PDF: ${response.message}`);
        console.error("Erreur PDF:", response.message);
    }
});


// --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Gestion de la soumission du formulaire de recherche
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        const filters = getCurrentFilters();
        loadEmprunts(filters);
    });

    // 2. Gestion du bouton "TOUS LES EMPRUNTS"
    btnTous.addEventListener('click', () => {
        searchForm.reset();
        loadEmprunts({});
    });
    
    // Lance le chargement initial. Il demandera d'abord les dépendances.
    loadEmprunts({});

    if (backButton) {
        backButton.addEventListener('click', () => {
            // Envoie la demande pour ouvrir utilisateur.html (qui remplacera la fenêtre actuelle)
            ipcRenderer.send('open-window', 'emprunt.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});