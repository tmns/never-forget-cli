import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 50
    },
    description: String
  }
);

export const Deck = mongoose.model('deck', deckSchema);