import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 100
  }
});

export const Deck = mongoose.model('deck', deckSchema);
