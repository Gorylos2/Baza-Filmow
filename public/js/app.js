document.addEventListener('DOMContentLoaded', function () {
    let currentPage = 1;
    const limit = 10; // Liczba filmów na stronę

    const token = localStorage.getItem('token');
    let isAdmin = false;
    let username = '';

    if (token) {
        const decoded = jwt_decode(token);
        isAdmin = decoded.role === 'admin';
        username = decoded.username; // Przyjmując, że nazwa użytkownika jest przechowywana w tokenie jako 'username'
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const adminPanelLink = document.getElementById('adminPanelLink');
    const userPanelLink = document.getElementById('userPanelLink');
    const welcomeMessage = document.getElementById('welcomeMessage');

    if (token) {
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }

        // Ukryj linki admina jeśli użytkownik nie jest administratorem
        if (!isAdmin) {
            if (adminPanelLink) adminPanelLink.style.display = 'none';
            if (userPanelLink) userPanelLink.style.display = 'none';
        }

        // Ustaw treść wiadomości powitalnej
        if (welcomeMessage) {
            welcomeMessage.textContent = `Witaj, ${username} (${isAdmin ? 'Admin' : 'User'})`;
            welcomeMessage.style.display = 'block';
        }
    } else {
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }
        alert('Nie jesteś zalogowany!');
        window.location.href = '/html/login.html';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            localStorage.removeItem('token');
            alert('Zostałeś wylogowany.');
            window.location.href = '/html/login.html';
        });
    }

    // Funkcja do pobierania i wyświetlania filmów z opcjami filtrowania, sortowania i paginacji
    function fetchAndDisplayMovies(filters = {}) {
        filters.page = currentPage;
        filters.limit = limit;

        let query = '/movies';
        const params = new URLSearchParams(filters).toString();
        if (params) {
            query += `?${params}`;
        }

        fetch(query)
            .then(response => response.json())
            .then(data => {
                const moviesDiv = document.getElementById('movies');
                moviesDiv.innerHTML = ''; // Wyczyszczenie listy przed załadowaniem filmów
                data.movies.forEach(movie => {
                    const movieElement = document.createElement('div');
                    movieElement.className = 'movie';
                    movieElement.innerHTML = `
                        <h2>${movie.title}</h2>
                        <p><strong>Opis:</strong> ${movie.description}</p>
                        <p><strong>Reżyser:</strong> ${movie.director}</p>
                        <p><strong>Rok:</strong> ${movie.year}</p>
                        <p><strong>Gatunek:</strong> ${movie.genre}</p>
                        <p><strong>Ocena:</strong> ${movie.rating}</p>
                        ${isAdmin ? `
                            <button class="edit-btn" data-id="${movie._id}">Edytuj</button>
                            <button class="delete-btn" data-id="${movie._id}">Usuń</button>
                        ` : ''}
                    `;
                    moviesDiv.appendChild(movieElement);
                });

                // Dodanie obsługi przycisków "Usuń"
                if (isAdmin) {
                    const deleteButtons = document.querySelectorAll('.delete-btn');
                    deleteButtons.forEach(button => {
                        button.addEventListener('click', function () {
                            const movieId = this.getAttribute('data-id');
                            fetch(`/movies/${movieId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            })
                            .then(response => response.json())
                            .then(data => {
                                console.log('Film usunięty:', data);
                                fetchAndDisplayMovies(filters); // Odświeżenie listy po usunięciu filmu
                            })
                            .catch(error => {
                                console.error('Błąd:', error);
                            });
                        });
                    });

                    // Dodanie obsługi przycisków "Edytuj"
                    const editButtons = document.querySelectorAll('.edit-btn');
                    editButtons.forEach(button => {
                        button.addEventListener('click', function () {
                            const movieId = this.getAttribute('data-id');
                            window.location.href = `/html/edit.html?id=${movieId}`; // Przekierowanie na stronę edycji filmu
                        });
                    });
                }

                // Paginacja: Wyświetlanie przycisków
                const paginationDiv = document.getElementById('pagination');
                paginationDiv.innerHTML = '';

                if (data.totalPages > 1) {
                    for (let i = 1; i <= data.totalPages; i++) {
                        const pageButton = document.createElement('button');
                        pageButton.textContent = i;
                        pageButton.className = i === data.currentPage ? 'active' : '';
                        pageButton.addEventListener('click', function () {
                            currentPage = i;
                            fetchAndDisplayMovies(filters);
                        });
                        paginationDiv.appendChild(pageButton);
                    }
                }
            });
    }

    // Funkcja obsługująca filtrowanie i sortowanie
    function handleFilterAndSort(event) {
        event.preventDefault();
        const filters = {
            genre: document.getElementById('genreFilter').value,
            year: document.getElementById('yearFilter').value,
            rating: document.getElementById('ratingFilter').value,
            sort: document.getElementById('sortCriteria').value,
            order: document.getElementById('sortOrder').value,
        };
        fetchAndDisplayMovies(filters);
    }

    // Obsługa formularza filtrowania
    const filterForm = document.getElementById('filterForm');
    filterForm.addEventListener('submit', handleFilterAndSort);

    // Inicjalne wyświetlanie filmów
    fetchAndDisplayMovies();
});


