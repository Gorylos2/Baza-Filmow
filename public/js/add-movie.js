document.getElementById('apiMovieForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const movieTitle = document.getElementById('movieTitle').value;
    const token = localStorage.getItem('token');

    fetch(`/add-movie/${encodeURIComponent(movieTitle)}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Nie udało się dodać filmu');
        }
    })
    .then(data => {
        alert('Film został dodany pomyślnie');
        window.location.href = '/html/index.html'; // Przekierowanie po sukcesie
    })
    .catch(error => {
        console.error('Błąd:', error);
        alert(error.message);
    });
});
