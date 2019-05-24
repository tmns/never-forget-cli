'use strict';

import {
  getOne,
  getMany,
  createOne,
  updateOne,
  removeOne,
  removeMany
} from '../crud';

import { HOUR_IN_MILIS } from '../../prompts/study';

import { Deck } from '../../resources/deck/deck.model';
import { Card } from '../../resources/card/card.model';

describe('crud controllers', () => {
  describe('getOne', async () => {
    test('finds an doc based on specified criteria', async () => {
      let deck = await Deck.create({ name: 'test-deck' });
      let card = await createTestCard('test-prompt', deck._id);
      let criteria = { prompt: card.prompt, deck: deck._id };
      let cardFromDb = await getOne(Card)(criteria);
      
      expect(cardFromDb._id.toString()).toBe(card._id.toString());
    });
  });

  describe('getMany', async () => {
    test('finds array of docs based on specified criteria', async () => {
      expect.assertions(3);
      let deck = await Deck.create({ name: 'test-deck' });
      await createTestCard('test-prompt1', deck._id);
      await createTestCard('test-prompt2', deck._id);
      let criteria = { deck: deck._id };
      let cardsFromDb = await getMany(Card)(criteria);
      
      expect(cardsFromDb).toHaveLength(2);
      cardsFromDb.forEach(cardFromDb => expect(cardFromDb.deck.toString()).toBe(deck._id.toString()));
    });
  });

  describe('createOne', async () => {
    test('creates a new doc', async () => {
      expect.assertions(2);
      let deckProps = {
        name: 'test-deck',
        description: 'test-description'
      }

      let deck = await createOne(Deck)(deckProps);
      expect(deck.name).toBe(deckProps.name);
      expect(deck.description).toBe(deckProps.description);
    });
  });

  describe('updateOne', async () => {
    test('finds a doc by id and updates it with given details', async () => {
      expect.assertions(2);

      let deck = await Deck.create({ name: 'test-deck' });
      let card = await createTestCard('test-prompt1', deck._id);
      let update = { prompt: 'changed-prompt' };
      let updatedCard = await updateOne(Card)(card._id, update);

      expect(updatedCard._id.toString()).toBe(card._id.toString());
      expect(updatedCard.prompt).toBe(update.prompt);
    });
  });

  describe('removeOne', async () => {
    test('finds doc by id and removes it', async () => {
      let deck = await Deck.create({ name: 'test-deck' });
      let deletedDeck = await removeOne(Deck)(deck._id);
      expect(deletedDeck._id.toString()).toBe(deck._id.toString());
    });
  });

  describe('removeMany', async () => {
    test('finds an array of docs by criteria and removes them', async () => {
      let deck = await Deck.create({ name: 'test-deck' });
      await createTestCard('test-prompt1', deck._id);
      await createTestCard('test-prompt2', deck._id);
      let criteria = { deck: deck._id };
      let result = await removeMany(Card)(criteria);

      expect(result.deletedCount).toBe(2);
    })
  })

});

// ************

async function createTestCard(promptName, deckId) {
  let now = Math.floor(new Date().getTime() / HOUR_IN_MILIS);
  
  let card = await Card.create({
    prompt: 'test-prompt',
    target: 'test-target',
    timesCorrect: 0,
    timeAdded: now,
    nextReview: now,
    deck: deckId
  });

  return card;
}