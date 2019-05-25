import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  target: {
    type: String,
    required: true,
    trim: true
  },
  promptExample: {
    type: String,
    trim: true
  },
  targetExample: {
    type: String,
    trim: true
  },
  timeAdded: {
    type: Number,
    required: true
  },
  nextReview: {
    type: Number,
    required: true
  },
  intervalProgress: {
    type: Number,
    required: true
  },
  deck: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'deck',
    required: true
  }
});

export const Card = mongoose.model('card', cardSchema);
