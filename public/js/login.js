document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;  // Używanie username zamiast email
    const password = document.getElementById("password").value;

    console.log("Próba logowania z danymi:", { username, password });

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })  // Wysłanie username i password
    })
    .then(response => {
        console.log("Odpowiedź serwera:", response);
        if (response.ok) {
            return response.json();
        }
        throw new Error('Logowanie nieudane');
    })
    .then(data => {
        if (data.token) {
            console.log("Token otrzymany:", data.token);
            localStorage.setItem('token', data.token);
            alert('Zalogowano pomyślnie!');
            window.location.href = '/html/index.html';  // Przekierowanie na stronę główną po zalogowaniu
        } else {
            console.error('Błąd logowania:', data.message);
            alert('Błąd logowania: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error.message);
        alert('Błąd logowania: ' + error.message);
    });
});
