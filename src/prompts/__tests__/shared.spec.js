'use strict';

import { getDeckProps } from '../shared';

import { Deck } from '../../resources/deck/deck.model';
import { getMany } from '../../utils/crud';

describe('getDeckProps', async () => {
  test('returns the properties for a given deck with both name and description and list of decks', async () => {
    await Deck.create({ name: 'deck1', description: 'desc' });
    let deck = await Deck.create({ name: 'deck2', description: 'desc' });
    let decks = await getMany(Deck)({});
    let selectedDeck = 'deck2: desc';
    let [deckId, deckName, deckDescription] = getDeckProps(decks, selectedDeck);

    expect(deckId.toString()).toBe(deck._id.toString());
    expect(deckName).toBe(deck.name);
    expect(deckDescription).toBe(deck.description);
  });

  test('returns the properties for a given deck with only name and list of decks', async () => {
    let deck = await Deck.create({ name: 'deck1', description: '' });
    await Deck.create({ name: 'deck2', description: 'desc' });
    let decks = await getMany(Deck)({});
    let selectedDeck = 'deck1';
    let [deckId, deckName, deckDescription] = getDeckProps(decks, selectedDeck);

    expect(deckId.toString()).toBe(deck._id.toString());
    expect(deckName).toBe(deck.name);
    expect(deckDescription).toBe(deck.description);
  });
})