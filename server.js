const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

// [NOWE – security/performance]
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// [NOWE – wczytanie zmiennych środowiskowych]
require('dotenv').config();
if (!process.env.MONGO_URL || !process.env.JWT_SECRET || !process.env.OMDB_KEY) {
  console.warn('UWAGA: Brakuje jednej z wymaganych zmiennych środowiskowych (MONGO_URL/JWT_SECRET/OMDB_KEY).');
}

// [NOWE – walidacja]
const { body, param, query, validationResult } = require('express-validator');

const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      const arr = result.array();
      const first = arr[0]; // pierwszy błąd
      return res.status(400).json({
        message: first.msg,    // <-- JEDNOZNACZNY komunikat dla frontu
        field: first.param,    // (opcjonalnie) nazwa pola
        errors: arr            // pełna lista dla debugowania
      });
    }
    next();
  }
];



// Inicjalizacja aplikacji Express
const app = express();


// [NOWE – security/performance;]
app.set('trust proxy', 1); // jeśli za proxy (Heroku/Render/Railway/Nginx)

// Nagłówki bezpieczeństwa
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https:"],
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));




// Kompresja odpowiedzi
app.use(compression());

// Globalny rate limit (wszystkie endpointy)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Surowszy limit dla logowania/rejestracji/zmiany hasła
app.use(['/login','/register','/change-password'], rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200, // tymczasowo
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' }
}));


// Obsługa plików statycznych
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Dodajemy model Movie
const Movie = require('./models/Movie');

// Połączenie z MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Rejestracja nowego użytkownika
app.post('/register', validate([
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Login musi mieć od 3 do 30 znaków')
    .trim()
    .escape(),

  body('email')
    .isEmail()
    .withMessage('Podaj poprawny adres e-mail')
    .normalizeEmail(),

  body('password')
    .isStrongPassword({ minLength: 8, minSymbols: 0 })
    .withMessage('Hasło musi mieć min. 8 znaków, zawierać małą i wielką literę oraz cyfrę')
]), async (req, res) => {
  const { username, email, password } = req.body;
  console.log("Otrzymane dane:", req.body);


  try {
    const user = new User({ username, email, password });
    await user.save();
    console.log("Zapisany użytkownik:", user);
    res.status(201).json({ message: 'Użytkownik zarejestrowany pomyślnie' });
} catch (error) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({ message: `Użytkownik z takim ${field} już istnieje` });
  }
  res.status(400).json({ message: error.message });
}
});


// Logowanie użytkownika
app.post('/login', validate([
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').isString().isLength({ min: 1 })
]), async (req, res) => {
  const { username, password } = req.body;  // Zmieniono email na username
  console.log('Otrzymane dane logowania:', { username, password });

  try {
    const user = await User.findOne({ username });  // Szukanie użytkownika po username
    console.log('Znaleziony użytkownik:', user);

    if (!user) {
      console.log('Użytkownik nie znaleziony');
      return res.status(400).json({ message: 'Nieprawidłowy username lub hasło' });
    }

    const isMatch = await user.comparePassword(password);
    console.log('Porównanie hasła:', isMatch);

    if (!isMatch) {
      console.log('Hasło niepoprawne');
      return res.status(400).json({ message: 'Nieprawidłowy username lub hasło' });
    }

    const token = jwt.sign(
  { id: user._id, username: user.username, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

    console.log('Wygenerowany token:', token);
    res.json({ token });
  } catch (error) {
    console.log('Błąd podczas logowania:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Middleware do autoryzacji użytkowników
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  console.log('Token otrzymany od klienta:', token); // Dodaj to logowanie

  if (!token) {
      return res.status(401).json({ message: 'Brak tokenu, autoryzacja nieudana' });
  }

  

  jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, user) => {
      if (err) {
          return res.status(403).json({ message: 'Token jest nieprawidłowy lub wygasł' });
      }
      req.user = user;
      next();
  });
}


function authorizeRoles(...roles) {
  return (req, res, next) => {
    console.log('Rola użytkownika:', req.user.role); // Dodaj logowanie roli użytkownika
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Nie masz odpowiednich uprawnień do wykonania tej akcji' });
    }
    next();
  };
}

// Endpoint do zmiany hasła
app.post('/change-password', authenticateToken, validate([
  body('oldPassword').isString().isLength({ min: 1 }),
  body('newPassword').isStrongPassword({ minLength: 8, minSymbols: 0 })
]), async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Stare hasło jest niepoprawne' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Hasło zostało zmienione pomyślnie' });
  } catch (error) {
    res.status(500).json({ message: 'Błąd podczas zmiany hasła', error: error.message });
  }
});

// Dodawanie nowego filmu (chronione)
app.post('/movies',
  authenticateToken,
  authorizeRoles('admin'),
  validate([
    body('title').isLength({ min: 1 }).trim().escape(),
    body('description').optional().isLength({ max: 2000 }).trim(),
    body('director').optional().isLength({ max: 100 }).trim().escape(),
    body('year').optional().isInt({ min: 1888, max: 2100 }).toInt(),
    body('genre').optional().isLength({ max: 100 }).trim().escape(),
    body('rating').optional().isFloat({ min: 0, max: 10 }).toFloat(),
  ]),
  async (req, res) => {

  console.log('Otrzymane dane dla nowego filmu:', req.body); // Logowanie danych
  const movie = new Movie({
    title: req.body.title,
    description: req.body.description,
    director: req.body.director,
    year: req.body.year,
    genre: req.body.genre,
    rating: req.body.rating
  });


  try {
    const newMovie = await movie.save();
    console.log('Nowy film dodany:', newMovie); // Logowanie po zapisaniu filmu
    res.status(201).json(newMovie);
  } catch (err) {
    console.error('Błąd podczas dodawania filmu:', err.message); // Logowanie błędu
    res.status(400).json({ message: err.message });
  }
});

// Aktualizowanie filmu (chronione)
app.put('/movies/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (movie == null) {
      return res.status(404).json({ message: 'Nie znaleziono filmu' });
    }

    if (req.body.title != null) {
      movie.title = req.body.title;
    }
    if (req.body.description != null) {
      movie.description = req.body.description;
    }
    if (req.body.director != null) {
      movie.director = req.body.director;
    }
    if (req.body.year != null) {
      movie.year = req.body.year;
    }
    if (req.body.genre != null) {
      movie.genre = req.body.genre;
    }
    if (req.body.rating != null) {
      movie.rating = req.body.rating;
    }

    const updatedMovie = await movie.save();
    res.json(updatedMovie);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Pobieranie listy użytkowników (dostępne tylko dla adminów)
app.get('/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
      const users = await User.find({}, 'username email role isBlocked'); // Pobieramy tylko wybrane pola
      res.json(users);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

// Zmiana roli użytkownika (dostępne tylko dla adminów)
app.put('/users/:id/role', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
      const user = await User.findById(req.params.id);
      if (!user) {
          return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
      }

      user.role = req.body.role;
      await user.save();
      res.json({ message: 'Rola użytkownika zmieniona' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

// Usuwanie użytkownika (dostępne tylko dla adminów)
app.delete('/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
      const user = await User.findById(req.params.id);
      if (!user) {
          return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
      }

      await user.deleteOne();
      res.json({ message: 'Użytkownik został usunięty' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

app.put('/users/:id/role', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
      const user = await User.findById(req.params.id);
      if (!user) {
          return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
      }

      user.role = req.body.role;
      await user.save();
      res.json({ message: 'Rola użytkownika została zmieniona' });
  } catch (err) {
      res.status(400).json({ message: err.message });
  }
});

app.delete('/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
      const user = await User.findById(req.params.id);
      if (!user) {
          return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
      }

      await user.deleteOne();
      res.json({ message: 'Użytkownik został usunięty' });
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
});



// Usuwanie filmu (chronione dla administratorów)
app.delete('/movies/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (movie == null) {
      return res.status(404).json({ message: 'Nie znaleziono filmu' });
    }

    await movie.deleteOne();
    res.json({ message: 'Film usunięty' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Testowy endpoint
app.get('/', (req, res) => {
  res.redirect('/html/login.html');
});

// Pobieranie wszystkich filmów z opcjami filtrowania, sortowania i paginacji
app.get('/movies', async (req, res) => {
  try {
    
      const { title, director, genre, year, rating, sort, order, page = 1, limit = 10 } = req.query;
      let filter = {};
      let sortOrder = {};

      // Filtrowanie na podstawie tytułu
      if (title) {
          filter.title = new RegExp(title, 'i'); // ignorowanie wielkości liter
      }

      // Filtrowanie na podstawie reżysera
      if (director) {
          filter.director = new RegExp(director, 'i');
      }

      // Filtrowanie na podstawie gatunku
      if (genre) {
          filter.genre = new RegExp(genre, 'i');
      }

      // Filtrowanie na podstawie roku produkcji
      if (year) {
          filter.year = year;
      }

      // Filtrowanie na podstawie minimalnej oceny
      if (rating) {
          filter.rating = { $gte: rating };
      }

      // Sortowanie
      if (sort) {
          sortOrder[sort] = order === 'desc' ? -1 : 1;
      }

      // Paginacja
      const options = {
          skip: (page - 1) * limit,
          limit: parseInt(limit),
      };

      const movies = await Movie.find(filter)
          .sort(sortOrder)
          .skip(options.skip)
          .limit(options.limit);

      const totalMovies = await Movie.countDocuments(filter);
      const totalPages = Math.ceil(totalMovies / limit);

      res.json({
          movies,
          totalPages,
          currentPage: parseInt(page),
          totalMovies,
      });
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
});

// Pobieranie jednego filmu po ID
app.get('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (movie == null) {
      return res.status(404).json({ message: 'Nie znaleziono filmu' });
    }
    res.json(movie);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/// Dodanie filmu z OMDb API do bazy danych
app.get(
  '/add-movie/:title',
  // Jeśli chcesz tymczasowo bez autoryzacji, zostaw te linie zakomentowane:
  // authenticateToken,
  // authorizeRoles('admin'),
  async (req, res) => {
    try {
      const apiKey = process.env.OMDB_KEY || 'ffb56e8e';
      const movieTitle = req.params.title;

      const { data: movieData } = await axios.get('http://www.omdbapi.com/', {
        params: { t: movieTitle, apikey: apiKey, plot: 'full' },
        timeout: 10000,
      });

      if (movieData?.Response !== 'True') {
        return res.status(404).json({ message: 'Film nie znaleziony w OMDb.' });
      }

      const yearNum = Number.parseInt(movieData.Year, 10);
      const ratingNum = Number.parseFloat(movieData.imdbRating);

      const movie = new Movie({
        title: movieData.Title,
        description: movieData.Plot && movieData.Plot !== 'N/A' ? movieData.Plot : undefined,
        director: movieData.Director && movieData.Director !== 'N/A' ? movieData.Director : undefined,
        year: Number.isFinite(yearNum) ? yearNum : undefined,
        genre: movieData.Genre && movieData.Genre !== 'N/A' ? movieData.Genre : undefined,
        rating: Number.isFinite(ratingNum) ? ratingNum : undefined,
        posterUrl: movieData.Poster && movieData.Poster !== 'N/A' ? movieData.Poster : undefined,
      });

      await movie.save();
      return res.status(201).json(movie);
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: 'Taki film już istnieje.' });
      }
      console.error('Błąd OMDb:', error?.message || error);
      return res.status(500).json({ message: 'Błąd podczas komunikacji z OMDb API.', error: error.message });
    }
  }
);

// Uruchomienie serwera na porcie 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});

