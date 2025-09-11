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
git clone https://github.com/Gorylos2/baza-filmow.git
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

## 🔒 Bezpieczeństwo i wydajność

W aplikacji dodano zestaw middleware poprawiających bezpieczeństwo i optymalizujących serwer:

- [helmet](https://github.com/helmetjs/helmet) – automatycznie ustawia nagłówki bezpieczeństwa (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` itd.)
- [compression](https://github.com/expressjs/compression) – kompresja odpowiedzi (gzip/br), mniejszy transfer i szybsze ładowanie
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) – ogranicza liczbę żądań z jednego IP  
  - globalny limit: **300 zapytań / 15 min / IP**
  - ostrzejszy limit dla `/login`, `/register`, `/change-password`: **20 prób / 10 min / IP**

Dzięki temu aplikacja jest mniej podatna na ataki (np. brute-force) i działa wydajniej.

### Przykład konfiguracji
W pliku `server.js` (zaraz po `const app = express();`):

```js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(['/login','/register','/change-password'], rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' }
}));

## ⚙️ Konfiguracja środowiska (.env)

Aplikacja korzysta z pliku `.env` do przechowywania wrażliwych danych (hasła, klucze API).  
Dzięki temu nie trzymamy sekretów bezpośrednio w kodzie źródłowym.

### 1. Utwórz plik `.env` w katalogu głównym projektu
Na podstawie pliku `.env.example` utwórz własny `.env` i uzupełnij wartości:

```env
PORT=3000
MONGO_URL=mongodb://localhost/moviesdb
JWT_SECRET=twoj_sekretny_klucz
OMDB_KEY=twoj_klucz_omdb

## 🔐 Bezpieczeństwo haseł

Hasła użytkowników **nie są przechowywane w postaci jawnej (plaintext)**.  
Aplikacja wykorzystuje bibliotekę [bcrypt](https://github.com/kelektiv/node.bcrypt.js) do bezpiecznego haszowania.

- przy rejestracji i zmianie hasła wartość jest hashowana (`bcrypt.hash`) przed zapisaniem do MongoDB,  
- podczas logowania wprowadzone hasło jest porównywane z hashem (`bcrypt.compare`),  
- w bazie danych hasła są zapisane w formie skrótu (np. `$2b$12$abc...`) i nie można ich odzyskać w oryginalnej formie.

Dodatkowe zabezpieczenia:
- wymuszona minimalna długość hasła (`minlength` w modelu),
- unikalne `username` i `email`,
- obsługa pola `isBlocked` dla blokowania użytkowników przez administratora.

## 👥 Role i uprawnienia

Aplikacja obsługuje dwa typy użytkowników:

- **User** – zwykły użytkownik  
  - może się rejestrować i logować  
  - może przeglądać listę filmów (z filtrowaniem i sortowaniem)  
  - może zmieniać swoje hasło  

- **Admin** – administrator  
  - wszystkie uprawnienia użytkownika  
  - dodawanie, edytowanie i usuwanie filmów  
  - pobieranie filmów z OMDb API  
  - zarządzanie użytkownikami (lista, zmiana ról, blokowanie, usuwanie)  

### Middleware w kodzie
- `authenticateToken` – sprawdza, czy użytkownik jest zalogowany (token JWT).  
- `authorizeRoles('admin')` – sprawdza, czy zalogowany użytkownik ma rolę **admin**.

Przykład użycia w kodzie:

```js
// tylko admin może dodawać filmy
app.post('/movies', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  // ...
});

### Walidacja i sanitacja danych
Wszystkie kluczowe endpointy są chronione walidacją wejścia przy użyciu `express-validator`.  
Błędne żądania zwracają `400` z listą błędów, a pola tekstowe są przycinane (`trim`) i czyszczone (`escape`).

## 🛡️ Walidacja i sanitacja danych

Wszystkie kluczowe endpointy API są chronione walidacją wejścia przy użyciu
[biblioteki `express-validator`](https://express-validator.github.io/docs/).

- podczas **rejestracji** sprawdzane są poprawność e-maila, długość loginu i siła hasła,
- podczas **logowania** sprawdzane są wymagane pola (`username`, `password`),
- przy **dodawaniu/edycji filmów** walidowane są typy i zakresy (`year`, `rating`, długość opisów),
- przy operacjach na użytkownikach sprawdzane są identyfikatory MongoDB oraz rola (`user` / `admin`).

Jeśli żądanie zawiera błędne dane, serwer zwraca odpowiedź **400 Bad Request** w formacie:

```json
{
  "errors": [
    {
      "msg": "Nieprawidłowy adres e-mail",
      "param": "email",
      "location": "body"
    }
  ]
}
