import { Card } from '../card.model';
import mongoose from 'mongoose';

describe('Card model', () => {
  describe('schema', () => {
    test('prompt', () => {
      let prompt = Card.schema.obj.prompt;
      expect(prompt).toEqual({
        type: String,
        required: true,
        trim: true
      });
    });

    test('target', () => {
      let target = Card.schema.obj.target;
      expect(target).toEqual({
        type: String,
        required: true,
        trim: true
      });
    });

    test('promptExample', () => {
      let promptExample = Card.schema.obj.promptExample;
      expect(promptExample).toEqual({
        type: String,
        trim: true
      });
    });

    test('targetExample', () => {
      let targetExample = Card.schema.obj.targetExample;
      expect(targetExample).toEqual({
        type: String,
        trim: true
      });
    });

    test('timeAdded', () => {
      let timeAdded = Card.schema.obj.timeAdded;
      expect(timeAdded).toEqual({
        type: Number,
        required: true
      });
    });

    test('nextReview', () => {
      let nextReview = Card.schema.obj.nextReview;
      expect(nextReview).toEqual({
        type: Number,
        required: true
      });
    });

    test('intervalProgress', () => {
      let intervalProgress = Card.schema.obj.intervalProgress;
      expect(intervalProgress).toEqual({
        type: Number,
        required: true
      });
    });

    test('deck', () => {
      let deck = Card.schema.obj.deck;
      expect(deck).toEqual({
        type: mongoose.SchemaTypes.ObjectId,
        ref: "deck",
        required: true
      });
    });
    
  });
});
