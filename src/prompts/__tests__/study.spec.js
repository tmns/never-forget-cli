'use strict';

import { 
  HOUR_IN_MILIS,
  attemptUpdateProgress, 
  getNewProgressValues
} from '../study';

import {
  getOne
} from '../../utils/crud';

import { Card } from '../../resources/card/card.model';
import { Deck } from '../../resources/deck/deck.model';

let now = Math.floor(new Date().getTime() / HOUR_IN_MILIS);

describe('study prompts helper functions', () => {
  describe('getNewProgressValues', () => {
    test('calculates new review time and progress interval given card score and interval progress of 0', () => {
      let cardScore = 0;
      let intervalProgress = 0;

      let { nextReview, newIntervalProgress } = getNewProgressValues(cardScore, intervalProgress, now);
      
      expect(nextReview).toBe(now + 2);
      expect(newIntervalProgress).toBe(0);
    })
  
    test('calculates new review time and progress interval given card score 2 and interval progress 3', () => {
      let cardScore = 2;
      let intervalProgress = 3;

      let { nextReview, newIntervalProgress } = getNewProgressValues(cardScore, intervalProgress, now);

      expect(nextReview).toBe(now + 16);
      expect(newIntervalProgress).toBe(4);
    }) 

    test('calculates new review time and progress interval given card score 1 and interval progress 2', () => {
      let cardScore = 1;
      let intervalProgress = 2;

      let { nextReview, newIntervalProgress } = getNewProgressValues(cardScore, intervalProgress, now);

      expect(nextReview).toBe(now + 2);
      expect(newIntervalProgress).toBe(1);
    })

    test('calculates new review time and progress interval given card score 2 and itnerval progress 6', () => {
      let cardScore = 2;
      let intervalProgress = 6

      let { nextReview, newIntervalProgress } = getNewProgressValues(cardScore, intervalProgress, now);

      expect(nextReview).toBe(now + (34 * (6 + 1 - 5) * 2));
      expect(newIntervalProgress).toBe(7);
    })
  });

  describe('attemptUpdateProgress', async () => {
    test('correctly update card progress in database given a card and new card score', async () => {
      expect.assertions(2);

      let score = 2;
      let deck = await Deck.create({ name: 'test-deck' });
      let card = await Card.create({
        prompt: 'test-prompt',
        target: 'test-target',
        intervalProgress: 3,
        timeAdded: now,
        nextReview: now,
        deck: deck._id
      });

      await attemptUpdateProgress(card, score);
      let updatedCard = await getOne(Card)({ prompt: card.prompt });
      expect(updatedCard.nextReview).toBe(now + 16);
      expect(updatedCard.intervalProgress).toBe(4);
    })
  })
})