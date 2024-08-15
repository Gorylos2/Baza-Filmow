document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    const token = localStorage.getItem('token'); // Pobranie tokenu z localStorage
    console.log("Token otrzymany od klienta:", token); // Dodaj to logowanie

    if (!movieId) {
        alert('Brak ID filmu');
        window.location.href = '/html/index.html';
        return;
    }

    // Pobieranie danych filmu
    fetch(`/movies/${movieId}`, {
        headers: {
            'Authorization': `Bearer ${token}` // Dodaj token do nagłówków
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Błąd w pobieraniu danych filmu');
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('title').value = data.title;
        document.getElementById('description').value = data.description;
        document.getElementById('director').value = data.director;
        document.getElementById('year').value = data.year;
        document.getElementById('genre').value = data.genre;
        document.getElementById('rating').value = data.rating;
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Nie udało się załadować danych filmu.');
        window.location.href = '/html/index.html';
    });

    // Obsługa formularza edycji
    document.getElementById('editForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const updatedMovie = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            director: document.getElementById('director').value,
            year: document.getElementById('year').value,
            genre: document.getElementById('genre').value,
            rating: document.getElementById('rating').value
        };

        fetch(`/movies/${movieId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Upewnij się, że token jest tutaj przekazany
            },
            body: JSON.stringify(updatedMovie)
        })
        
        .then(response => {
            if (!response.ok) {
                throw new Error('Błąd w aktualizacji filmu');
            }
            return response.json();
        })
        .then(data => {
            alert('Film zaktualizowany pomyślnie!');
            window.location.href = '/html/index.html';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Nie udało się zaktualizować filmu.');
        });
    });
});

