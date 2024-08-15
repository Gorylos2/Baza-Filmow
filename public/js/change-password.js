document.getElementById('changePasswordForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value; // Zmiana tutaj

    if (newPassword !== confirmPassword) {
        alert('Nowe hasło i potwierdzenie hasła muszą być takie same.');
        return;
    }

    const token = localStorage.getItem('token');

    fetch('/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Nie udało się zmienić hasła');
        }
    })
    .then(data => {
        alert('Hasło zostało zmienione pomyślnie');
        window.location.href = '/html/index.html';
    })
    .catch(error => {
        console.error('Błąd:', error);
        alert(error.message);
    });
    
});