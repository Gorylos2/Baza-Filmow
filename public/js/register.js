document.getElementById("registerForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Zatrzymanie domyślnej akcji wysłania formularza

    // Pobieranie wartości z pól formularza
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Prosta walidacja po stronie klienta
    if (username.length < 3) {
        alert('Nazwa użytkownika musi mieć co najmniej 3 znaki.');
        return;
    }

    if (password.length < 6) {
        alert('Hasło musi mieć co najmniej 6 znaków.');
        return;
    }

    // Wysłanie żądania POST do endpointu rejestracji
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
    })
    .then(response => {
        return response.json().then(data => {
            if (!response.ok) {
                throw new Error(data.message || 'Nieznany błąd');
            }
            return data;
        });
    })
    .then(data => {
        if (data.message && data.message.includes('zarejestrowany pomyślnie')) {
            alert('Rejestracja udana! Możesz się teraz zalogować.');
            window.location.href = '/html/login.html'; // Przekierowanie na stronę logowania
        } else {
            alert('Błąd rejestracji: ' + (data.message || 'Nieznany błąd'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Wystąpił problem z połączeniem z serwerem. Spróbuj ponownie później.');
    });
});

