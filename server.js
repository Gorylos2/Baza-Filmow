const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

// Inicjalizacja aplikacji Express
const app = express();

// Obsługa plików statycznych
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Dodajemy model Movie
const Movie = require('./models/Movie');

// Połączenie z MongoDB
mongoose.connect('mongodb://localhost/moviesdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Rejestracja nowego użytkownika
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  console.log("Otrzymane dane:", req.body);

  try {
    const user = new User({ username, email, password });
    await user.save();
    console.log("Zapisany użytkownik:", user);
    res.status(201).json({ message: 'Użytkownik zarejestrowany pomyślnie' });
  } catch (error) {
    console.error("Błąd podczas rejestracji:", error.message);
    res.status(400).json({ message: error.message });
  }
});


// Logowanie użytkownika
app.post('/login', async (req, res) => {
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

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, 'secretKey', { expiresIn: '1h' });
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

  

  jwt.verify(token.split(' ')[1], 'secretKey', (err, user) => {
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
app.post('/change-password', authenticateToken, async (req, res) => {
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
app.post('/movies', authenticateToken, authorizeRoles('admin'), async (req, res) => {
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

// Dodanie filmu z OMDb API do bazy danych
app.get('/add-movie/:title', async (req, res) => {
  const movieTitle = req.params.title;
  const apiKey = 'ffb56e8e'; // Podmień na swój klucz API

  try {
    const response = await axios.get(`http://www.omdbapi.com/?t=${encodeURIComponent(movieTitle)}&apikey=${apiKey}`);
    const movieData = response.data;

    if (movieData.Response === 'True') {
      const movie = new Movie({
        title: movieData.Title,
        description: movieData.Plot,
        director: movieData.Director,
        year: movieData.Year,
        genre: movieData.Genre,
        rating: parseFloat(movieData.imdbRating)
      });

      await movie.save();
      res.status(201).json(movie);
    } else {
      res.status(404).json({ message: 'Film nie znaleziony w OMDb.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Błąd podczas komunikacji z OMDb API.', error: error.message });
  }
});

// Blokowanie/odblokowywanie użytkownika (dostępne tylko dla adminów)
app.put('/users/:id/block', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
      const user = await User.findById(req.params.id);
      if (!user) {
          return res.status(404).json({ message: 'Użytkownik nie znaleziony' });
      }

      user.isBlocked = req.body.isBlocked;
      await user.save();
      res.json({ message: 'Status użytkownika zmieniony' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});



// Uruchomienie serwera na porcie 3000
app.listen(3000, () => {
  console.log('Serwer działa na http://localhost:3000');
});
