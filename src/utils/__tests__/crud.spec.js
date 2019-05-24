'use strict';

import mongoose from 'mongoose';

import {
  getOne,
  getMany,
  getManySortLimit,
  createOne,
  updateOne,
  updateMany,
  removeOne,
  removeMany
} from '../crud';

import { HOUR_IN_MILIS } from '../../prompts/study';

import { Deck } from '../../resources/deck/deck.model';
import { Card } from '../../resources/card/card.model';

describe('crud controllers', () => {
  describe('getOne', async () => {
    test('finds an item based on specified criteria', async () => {
      expect.assertions(1);

      let deck = await Deck.create({ name: 'test-deck' });
      let now = Math.floor(new Date().getTime() / HOUR_IN_MILIS);
      let card = await Card.create({
        prompt: 'test-prompt',
        target: 'test-target',
        timesCorrect: 0,
        timeAdded: now,
        nextReview: now,
        deck: deck._id
      });

      let criteria = { prompt: card.prompt, deck: deck._id };
      let cardFromDb = await getOne(Card)(criteria);
      
      expect(cardFromDb._id.toString()).toBe(card._id.toString());
    });
  });

  describe('getMany', async () => {
    test('finds array of items based on specified criteria', async () => {
      expect.assertions(3);
      let deck = await Deck.create({ name: 'test-deck' });
      let now = Math.floor(new Date().getTime() / HOUR_IN_MILIS);
      await Card.create([
        {
          prompt: 'test-prompt1',
          target: 'test-target',
          timesCorrect: 0,
          timeAdded: now,
          nextReview: now,
          deck: deck._id
        },
        {
          prompt: 'test-prompt2',
          target: 'test-target',
          timesCorrect: 0,
          timeAdded: now,
          nextReview: now,
          deck: deck._id
        }
      ]);
      
      let criteria = { deck: deck._id };
      let cardsFromDb = await getMany(Card)(criteria);
      
      expect(cardsFromDb).toHaveLength(2);
      cardsFromDb.forEach(cardFromDb => expect(cardFromDb.deck.toString()).toBe(deck._id.toString()));
    });
  });
});
