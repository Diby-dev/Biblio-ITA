const { ipcRenderer } = window.electron;

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('auteurs-table-body');
    const messageDiv = document.getElementById('message');
    const searchForm = document.getElementById('search-form'); 
    const btnTous = document.getElementById('btn-tous'); 
    const backButton = document.getElementById('btn-retour');

    const displayError = (message, colspan = 5) => {
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
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Recherche en cours...</td></tr>';
        
        ipcRenderer.send('get-auteurs', filters);
    };

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        loadAuteurs(getCurrentFilters());
    });

    btnTous.addEventListener('click', () => {
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
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Aucun auteur trouvé correspondant aux critères.</td></tr>';
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
            });

        } else {
            displayError(response.message, 5);
            console.error("Erreur de récupération des auteurs:", response.message);
        }
    });

    loadAuteurs({});

    if (backButton) {
        backButton.addEventListener('click', () => {
            ipcRenderer.send('open-window', 'indexvis.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});