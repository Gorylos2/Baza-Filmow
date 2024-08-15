const mongoose = require('mongoose');

// Definicja schematu filmu
const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  director: String,
  year: Number,
  genre: String,
  rating: Number
});

// Utworzenie modelu na podstawie schematu
const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
