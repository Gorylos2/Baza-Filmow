document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');

    // Pobieranie listy użytkowników
    fetch('/users', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(users => {
        const usersTableBody = document.querySelector('#usersTable tbody');
        usersTableBody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');

            // Nazwa użytkownika
            const usernameTd = document.createElement('td');
            usernameTd.textContent = user.username;
            tr.appendChild(usernameTd);

            // Email
            const emailTd = document.createElement('td');
            emailTd.textContent = user.email;
            tr.appendChild(emailTd);

            // Rola
            const roleTd = document.createElement('td');
            roleTd.textContent = user.role;
            tr.appendChild(roleTd);

            // Status
            const statusTd = document.createElement('td');
            statusTd.textContent = user.isBlocked ? 'Zablokowany' : 'Aktywny';
            tr.appendChild(statusTd);

            // Akcje
            const actionsTd = document.createElement('td');

            // Przycisk zmiany roli
            const changeRoleBtn = document.createElement('button');
            changeRoleBtn.textContent = user.role === 'admin' ? 'Zmień na User' : 'Zmień na Admin';
            changeRoleBtn.addEventListener('click', function() {
                changeUserRole(user._id, user.role === 'admin' ? 'user' : 'admin');
            });
            actionsTd.appendChild(changeRoleBtn);

            // Przycisk usunięcia użytkownika
            const deleteUserBtn = document.createElement('button');
            deleteUserBtn.textContent = 'Usuń';
            deleteUserBtn.addEventListener('click', function() {
                deleteUser(user._id);
            });
            actionsTd.appendChild(deleteUserBtn);

            tr.appendChild(actionsTd);
            usersTableBody.appendChild(tr);
        });
    })
    .catch(error => {
        console.error('Błąd podczas ładowania użytkowników:', error);
    });

    // Funkcja zmieniająca rolę użytkownika
    function changeUserRole(userId, newRole) {
        fetch(`/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role: newRole })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Rola użytkownika zmieniona:', data);
            window.location.reload(); // Przeładuj stronę po zmianie roli
        })
        .catch(error => {
            console.error('Błąd podczas zmiany roli użytkownika:', error);
        });
    }

    // Funkcja usuwająca użytkownika
    function deleteUser(userId) {
        fetch(`/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('Użytkownik usunięty:', data);
            window.location.reload(); // Przeładuj stronę po usunięciu użytkownika
        })
        .catch(error => {
            console.error('Błąd podczas usuwania użytkownika:', error);
        });
    }

});
