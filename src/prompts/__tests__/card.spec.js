'use strict';

import { 
  prepareCardForQuery,
  validatePrompt,
  getCardProps
 } from '../card';

import { getMany } from '../../utils/crud';

import { HOUR_IN_MILIS } from '../study';

import { Card } from '../../resources/card/card.model';
import { Deck } from '../../resources/deck/deck.model';

let now = Math.floor(new Date().getTime() / HOUR_IN_MILIS);

describe('card prompts helper functions', () => {
  describe('prepareCardForQuery', async () => {
    test('returns a card object ready for create query given a deck id and raw card answer object with all details filled in', async () => {
      expect.assertions(8);
      let deck = await Deck.create({ name: 'test-deck' });
      let isAdding = true;
      let cardObject = {
        prompt: 'test-prompt',
        promptExample: 'test-prompt-ex',
        target: 'test-target',
        targetExample: 'test-target-ex'
      };
      let cardForQuery = prepareCardForQuery(deck._id, isAdding)(cardObject);
      expect(cardForQuery.prompt).toBe('test-prompt');
      expect(cardForQuery.promptExample).toBe('test-prompt-ex');
      expect(cardForQuery.target).toBe('test-target');
      expect(cardForQuery.targetExample).toBe('test-target-ex');
      expect(cardForQuery.timeAdded).toBe(now);
      expect(cardForQuery.nextReview).toBe(now);
      expect(cardForQuery.intervalProgress).toBe(0);
      expect(cardForQuery.deck).toBe(deck._id);
    })

    test('returns a card object ready for create query given a deck id and raw card answer object with extra white space in answers', async () => {
      expect.assertions(8);
      let deck = await Deck.create({ name: 'test-deck' });
      let isAdding = true;
      let cardObject = {
        prompt: 'test-prompt              ',
        promptExample: '           test-prompt-ex',
        target: ' test-target  ',
        targetExample: '   test-target-ex '
      };
      let cardForQuery = prepareCardForQuery(deck._id, isAdding)(cardObject);
      expect(cardForQuery.prompt).toBe('test-prompt');
      expect(cardForQuery.promptExample).toBe('test-prompt-ex');
      expect(cardForQuery.target).toBe('test-target');
      expect(cardForQuery.targetExample).toBe('test-target-ex');
      expect(cardForQuery.timeAdded).toBe(now);
      expect(cardForQuery.nextReview).toBe(now);
      expect(cardForQuery.intervalProgress).toBe(0);
      expect(cardForQuery.deck).toBe(deck._id);
    })

    test('returns a card object ready for create query given a deck id and raw card answer object with only prompt and target filled', async () => {
      expect.assertions(8);
      let deck = await Deck.create({ name: 'test-deck' });
      let isAdding = true;
      let cardObject = {
        prompt: 'test-prompt',
        promptExample: '',
        target: 'test-target',
        targetExample: ''
      };
      let cardForQuery = prepareCardForQuery(deck._id, isAdding)(cardObject);
      expect(cardForQuery.prompt).toBe('test-prompt');
      expect(cardForQuery.promptExample).toBe('');
      expect(cardForQuery.target).toBe('test-target');
      expect(cardForQuery.targetExample).toBe('');
      expect(cardForQuery.timeAdded).toBe(now);
      expect(cardForQuery.nextReview).toBe(now);
      expect(cardForQuery.intervalProgress).toBe(0);
      expect(cardForQuery.deck).toBe(deck._id);
    })

    test('returns a card object ready for update query given a raw card answer object with all values filled', async () => {
      expect.assertions(8);
      let isAdding = false;
      let cardObject = {
        prompt: 'test-prompt',
        promptExample: 'test-prompt-ex',
        target: 'test-target',
        targetExample: 'test-target-ex'
      };
      let cardForQuery = prepareCardForQuery(null, isAdding)(cardObject);
      expect(cardForQuery.prompt).toBe('test-prompt');
      expect(cardForQuery.promptExample).toBe('test-prompt-ex');
      expect(cardForQuery.target).toBe('test-target');
      expect(cardForQuery.targetExample).toBe('test-target-ex');
      expect(cardForQuery.timeAdded).toBe(undefined);
      expect(cardForQuery.nextReview).toBe(undefined);
      expect(cardForQuery.intervalProgress).toBe(undefined);
      expect(cardForQuery.deck).toBe(undefined);
    })
  })

  describe('validatePrompt', () => {
    test('returns true given a valid prompt during creating', () => {
      let cards = [
        {
          prompt: 'different-prompt1'
        },
        {
          prompt: 'different-prompt2'
        }
      ];
      let value = 'test-prompt';
      let result = validatePrompt(null, cards)(value);
      expect(result).toBe(true);
    });

    test('returns error string when given an empty prompt during creating', () => {
      let errorString = 'Sorry, you must enter a unique prompt for the card.';
      let cards = [
        {
          prompt: 'different-prompt1'
        },
        {
          prompt: 'different-prompt2'
        }
      ];
      let value = '';
      let result = validatePrompt(null, cards)(value);
      expect(result).toBe(errorString);
    });

    test('returns error string when given a prompt that already exists during creating', () => {
      let errorString = 'Sorry, you must enter a unique prompt for the card.';
      let cards = [
        {
          prompt: 'same-prompt'
        },
        {
          prompt: 'different-prompt'
        }
      ];
      let value = 'same-prompt';
      let result = validatePrompt(null, cards)(value);
      expect(result).toBe(errorString);
    });


    test('returns true when given a unique prompt during editing', () => {
      let cardPrompt = 'test-prompt'      
      let cards = [
        {
          prompt: 'different-prompt1'
        },
        {
          prompt: 'different-prompt2'
        }
      ];
      let value = 'new-prompt';
      let result = validatePrompt(cardPrompt, cards)(value);
      expect(result).toBe(true);
    });

    test('returns true when given the same prompt as the current prompt during editing', () => {
      let cardPrompt = 'test-prompt'      
      let cards = [
        {
          prompt: 'different-prompt1'
        },
        {
          prompt: 'different-prompt2'
        }
      ];
      let value = 'test-prompt';
      let result = validatePrompt(cardPrompt, cards)(value);
      expect(result).toBe(true);
    });

    test('returns error string when given a prompt (different from the current prompt) that already exists during editing', () => {
      let errorString = 'Sorry, you must enter a unique prompt for the card.';
      let cardPrompt = 'test-prompt'      
      let cards = [
        {
          prompt: 'different-prompt'
        },
        {
          prompt: 'same-prompt'
        }
      ];
      let value = 'same-prompt';
      let result = validatePrompt(cardPrompt, cards)(value);
      expect(result).toBe(errorString);
    });
  });

  describe('getCardProps', async () => {
    test('returns the properties for a given card and list of cards', async () => {
      expect.assertions(5);
      let deck = await Deck.create({ name: 'test-deck' });
      await Card.create({
        prompt: 'test-prompt1',
        promptExample: 'test-prompt-ex',
        target: 'test-target',
        targetExample: 'test-target-ex',
        intervalProgress: 3,
        timeAdded: now,
        nextReview: now,
        deck: deck._id
      });
      let card = await Card.create({
        prompt: 'test-prompt2',
        promptExample: 'test-prompt-ex',
        target: 'test-target',
        targetExample: 'test-target-ex',
        intervalProgress: 3,
        timeAdded: now,
        nextReview: now,
        deck: deck._id
      });
      let cards = await getMany(Card)({ deck: deck._id });
      let selectedCard = 'test-prompt2 --> test-target';
      let cardProps = getCardProps(selectedCard, cards);
      expect(cardProps.prompt).toBe(card.prompt);
      expect(cardProps.promptExample).toBe(card.promptExample);
      expect(cardProps.target).toBe(card.target);
      expect(cardProps.targetExample).toBe(card.targetExample);
      expect(cardProps.id.toString()).toBe(card._id.toString());
    })
  })
})