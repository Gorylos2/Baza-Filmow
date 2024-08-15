Baza Filmów
Baza Filmów to aplikacja internetowa umożliwiająca zarządzanie filmami. Użytkownicy mogą przeglądać listę filmów, filtrować i sortować filmy, a administratorzy mogą dodawać, edytować, usuwać filmy oraz zarządzać użytkownikami.
1. Technologie użyte
- HTML
- CSS
- JavaScript (ES6+)
- Node.js z Express.js
- MongoDB
- JWT (JSON Web Token)
- OMDb API
2. Funkcje
Użytkownicy
- Przeglądanie listy filmów
- Filtrowanie i sortowanie filmów
- Logowanie i rejestracja
Administratorzy
- Dodawanie nowych filmów (manualnie i przez OMDb API)
- Edytowanie i usuwanie filmów
- Zarządzanie użytkownikami (zmiana ról, blokowanie użytkowników)
- Zmiana hasła
3. Instalacja i uruchomienie
a. Sklonuj repozytorium:
git clone https://github.com/twoje-uzytkownik/baza-filmow.git
cd baza-filmow
b. Zainstaluj zależności:
npm install
c. Uruchom serwer:
node server.js
d. Otwórz przeglądarkę i wejdź na:
http://localhost:3000
Wymagania:
• Node.js
• MongoDB
4. Autoryzacja
Rejestracja i logowanie
- `POST /register` - Rejestracja nowego użytkownika
- `POST /login` - Logowanie użytkownika
Filmy
- `GET /movies` - Pobranie listy filmów
- `POST /movies` - Dodanie nowego filmu (wymaga uprawnień admina)
- `PUT /movies/:id` - Edytowanie filmu (wymaga uprawnień admina)
- `DELETE /movies/:id` - Usunięcie filmu (wymaga uprawnień admina)
- `GET /add-movie/:title` - Dodanie filmu z OMDb API
Użytkownicy
- `GET /users` - Pobranie listy użytkowników (wymaga uprawnień admina)
- `PUT /users/:id/role` - Zmiana roli użytkownika (wymaga uprawnień admina)
- `DELETE /users/:id` - Usunięcie użytkownika (wymaga uprawnień admina)
- `POST /change-password` - Zmiana hasła użytkownika
5. Instrukcja użycia
1. **Rejestracja:** Użytkownik musi się najpierw zarejestrować, aby uzyskać dostęp do aplikacji.
2. **Logowanie:** Po zalogowaniu użytkownik może przeglądać filmy.
3. **Dodawanie filmu (Admin):** Administrator może dodać nowy film, wypełniając formularz lub używając OMDb API.
4. **Zarządzanie użytkownikami (Admin):** Administrator może zmieniać role użytkowników lub usuwać użytkowników.
