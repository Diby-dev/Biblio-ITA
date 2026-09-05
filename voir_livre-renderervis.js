const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('livres-table-body');
    const messageDiv = document.getElementById('message');
    const searchForm = document.getElementById('search-form');
    const btnTous = document.getElementById('btn-tous');
    const backButton = document.getElementById('btn-retour');
    

    const displayError = (message, colspan = 7) => {
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
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Recherche en cours...</td></tr>';
        ipcRenderer.send('get-livres', filters);
    };
    
    loadLivres({});

    ipcRenderer.on('get-livres-response', (event, response) => {
        
        messageDiv.textContent = '';
        messageDiv.className = '';
        tableBody.innerHTML = '';
        const colspan = 7;

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
            });

        } else {
            displayError(response.message, colspan);
            console.error("Erreur de récupération des livres:", response.message);
        }
    });
    


    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        loadLivres(getCurrentFilters());
    });

    btnTous.addEventListener('click', () => {
        searchForm.reset(); 
        loadLivres({});
    });
    if (backButton) {
        backButton.addEventListener('click', () => {

            ipcRenderer.send('open-window', 'indexvis.html');
        });
    } else {
        console.error("Erreur: Le bouton #btn-retour n'a pas été trouvé.");
    }
});
