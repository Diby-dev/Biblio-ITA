const { ipcRenderer } = require('electron');

let initialData = {
    livres: [],
    utilisateurs: []
};
let currentEmprunts = {};

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
}


const renderEmprunts = (emprunts) => {
    tableBody.innerHTML = '';
    currentEmprunts = {};

    if (emprunts.length === 0) {
        displayMessage("Aucun emprunt trouvé correspondant aux critères.", 'info');
        return;
    }

    emprunts.forEach(emprunt => {
        currentEmprunts[emprunt.id_emprunt] = emprunt;
        
        const row = tableBody.insertRow();
        row.id = `emprunt-row-${emprunt.id_emprunt}`;
        
        const statut = emprunt.statut_emprunt || 'N/A';
        const statutClass = `statut-${statut.toLowerCase().replace(' ', '.').replace('é', 'e')}`; 

        row.insertCell().textContent = emprunt.id_emprunt;
        row.insertCell().textContent = emprunt.titre_livre || 'Livre (ID Inconnu)'; 
        row.insertCell().textContent = emprunt.nom_utilisateur_complet || 'Utilisateur (ID Inconnu)';
        row.insertCell().textContent = emprunt.date_emprunt;
        
        const statutCell = row.insertCell();
        statutCell.textContent = statut;
        statutCell.className = statutClass;
        
        row.insertCell().textContent = emprunt.date_limite_retour;
        row.insertCell().textContent = emprunt.date_retour || 'En attente';
        
        const actionCell = row.insertCell();
        actionCell.className = 'action-cell';
        
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.textContent = 'Modifier';
        editButton.dataset.id = emprunt.id_emprunt;
        
        editButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            enterEditMode(emprunt.id_emprunt);
        });

        const pdfButton = document.createElement('button');
        pdfButton.className = 'action-button';
        pdfButton.textContent = 'PDF';
        pdfButton.style.backgroundColor = '#dc3545'; 
        pdfButton.style.padding = '5px';
        pdfButton.style.fontSize = '12px';
        pdfButton.style.margin = '2px';
        pdfButton.dataset.id = emprunt.id_emprunt;

        pdfButton.addEventListener('click', (e) => {
            e.stopPropagation(); 
            generateSinglePdf(emprunt.id_emprunt);
        });
        
        actionCell.appendChild(editButton);
        actionCell.appendChild(pdfButton);
    });
};


const enterEditMode = (id) => {
    const emprunt = currentEmprunts[id];
    const row = document.getElementById(`emprunt-row-${id}`);
    
    if (row.classList.contains('editing')) return;
    
    row.classList.add('editing');
    const cells = row.querySelectorAll('td');
    
    const livreCell = cells[1];
    livreCell.dataset.originalValue = emprunt.id_livre;
    livreCell.innerHTML = createSelectField('id_livre', initialData.livres, emprunt.id_livre, 'id_livre', 'titre_livre');

    const utilisateurCell = cells[2];
    utilisateurCell.dataset.originalValue = emprunt.id_utilisateur;
    utilisateurCell.innerHTML = createSelectField('id_utilisateur', initialData.utilisateurs, emprunt.id_utilisateur, 'id_utilisateur', 'nom_complet');
    
    const dateEmpruntCell = cells[3];
    dateEmpruntCell.dataset.originalValue = emprunt.date_emprunt;
    dateEmpruntCell.innerHTML = `<input type="date" class="edit-input" name="date_emprunt" value="${emprunt.date_emprunt}">`;

    const statutCell = cells[4];
    statutCell.dataset.originalValue = emprunt.statut_emprunt;
    statutCell.innerHTML = createSelectField('statut_emprunt', statutOptions, emprunt.statut_emprunt, 'value', 'text');
    
    const dateLimiteCell = cells[5];
    dateLimiteCell.dataset.originalValue = emprunt.date_limite_retour;
    dateLimiteCell.innerHTML = `<input type="date" class="edit-input" name="date_limite_retour" value="${emprunt.date_limite_retour}">`;

    const dateRetourCell = cells[6];
    dateRetourCell.dataset.originalValue = emprunt.date_retour || '';
    dateRetourCell.innerHTML = `<input type="date" class="edit-input" name="date_retour" value="${emprunt.date_retour || ''}">`;

    const actionCell = cells[7];
    actionCell.innerHTML = `
        <button class="save-button" data-id="${id}">Sauvegarder</button>
        <button class="cancel-button" data-id="${id}">Annuler</button>
    `;
    
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
        const isSelected = (option[valueKey] && option[valueKey].toString() === selectedValue.toString()) ? 'selected' : ''; 
        selectHtml += `<option value="${option[valueKey]}" ${isSelected}>${option[textKey]}</option>`;
    });
    selectHtml += '</select>';
    return selectHtml;
};

const exitEditMode = (id, row, emprunt) => {
    const cells = row.querySelectorAll('td');
    
    cells[1].textContent = emprunt.titre_livre;
    cells[2].textContent = emprunt.nom_utilisateur_complet;
    cells[3].textContent = emprunt.date_emprunt;
    cells[4].textContent = emprunt.statut_emprunt;
    cells[5].textContent = emprunt.date_limite_retour;
    cells[6].textContent = emprunt.date_retour || 'En attente';

    const actionCell = cells[7];
    actionCell.innerHTML = '';

    const editButton = document.createElement('button');
    editButton.className = 'edit-btn';
    editButton.textContent = 'Modifier';
    editButton.dataset.id = id;
    editButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        enterEditMode(id);
    });
    
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

const saveEmprunt = (id, row) => {
    const cells = row.querySelectorAll('td');
    const updatedData = {
        id_emprunt: id
    };
    
    updatedData.id_livre = cells[1].querySelector('.edit-select').value;
    updatedData.id_utilisateur = cells[2].querySelector('.edit-select').value;
    updatedData.date_emprunt = cells[3].querySelector('.edit-input').value;
    updatedData.statut_emprunt = cells[4].querySelector('.edit-select').value;
    updatedData.date_limite_retour = cells[5].querySelector('.edit-input').value;
    updatedData.date_retour = cells[6].querySelector('.edit-input').value;

    if (!updatedData.id_livre || !updatedData.id_utilisateur || !updatedData.date_emprunt || !updatedData.statut_emprunt || !updatedData.date_limite_retour) {
         displayMessage("Veuillez remplir tous les champs obligatoires (Livre, Utilisateur, Dates, Statut).", 'error');
         return;
    }
    
    ipcRenderer.send('update-emprunt', updatedData);
};


const generateSinglePdf = (id) => {
    displayMessage(`Préparation du rapport PDF pour l'emprunt N° ${id}...`, 'info');
    ipcRenderer.send('generate-emprunt-pdf-single', id);
};


const loadEmprunts = (filters = {}) => {
    messageDiv.textContent = 'Chargement de la liste des emprunts...';
    messageDiv.className = '';
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Chargement...</td></tr>';
    
    if (initialData.livres.length > 0 && initialData.utilisateurs.length > 0) {
        ipcRenderer.send('get-emprunts', filters);
    } else {
        ipcRenderer.send('get-emprunt-dependencies');
    }
};

ipcRenderer.on('get-emprunt-dependencies-response', (event, response) => {
    if (response.success) {
        initialData.livres = response.livres;
        initialData.utilisateurs = response.utilisateurs;
        
        loadEmprunts({});
    } else {
        displayError(`Impossible de charger les dépendances (Livres/Utilisateurs): ${response.message}`);
    }
});

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

ipcRenderer.on('update-emprunt-response', (event, response) => {
    if (response.success) {
        displayMessage(`Emprunt ID ${response.id_emprunt} mis à jour avec succès!`, 'success');
        
        loadEmprunts(getCurrentFilters()); 
    } else {
        displayError(`La mise à jour de l'emprunt a échoué: ${response.message}`);
    }
});

ipcRenderer.on('generate-emprunt-pdf-response', (event, response) => {
    if (response.success) {
        displayMessage(`Rapport PDF généré avec succès! Ouverture du fichier...`, 'success');
        ipcRenderer.send('open-file-in-shell', response.path); 
    } else {
        displayError(`Échec de la génération du PDF: ${response.message}`);
        console.error("Erreur PDF:", response.message);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        const filters = getCurrentFilters();
        loadEmprunts(filters);
    });

    btnTous.addEventListener('click', () => {
        searchForm.reset();
        loadEmprunts({});
    });
    
    loadEmprunts({});

    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'emprunt.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});