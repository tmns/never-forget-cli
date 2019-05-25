'use strict';

import { validateName } from '../deck';

describe('deck prompts helper functions', () => {
  describe('validateName', () => {
    test('returns true give a valid deck name during creating', () => {
      let decks = [
        {
          name: 'different-name1'
        },
        {
          name: 'different-name2'
        }
      ];
      let value = 'test-name';
      let result = validateName(null, decks)(value);
      expect(result).toBe(true);
    })

    test('returns error string when given empty name during creating', () => {
      let errorString = 'Sorry, you must give the deck a unique name (and the ":" character is not allowed).';
      let decks = [
        {
          name: 'different-name1'
        },
        {
          name: 'different-name2'
        }
      ];
      let value = '';
      let result = validateName(null, decks)(value);
      expect(result).toBe(errorString);      
    })

    test('returns error string when given a name that already exists during creating', () => {
      let errorString = 'Sorry, you must give the deck a unique name (and the ":" character is not allowed).';
      let decks = [
        {
          name: 'same-name'
        },
        {
          name: 'different-name'
        }
      ];
      let value = 'same-name';
      let result = validateName(null, decks)(value);
      expect(result).toBe(errorString);       
    });

    test('returns true when given a unique name during editing', () => {
      let deckName = 'test-name'      
      let decks = [
        {
          name: 'different-name1'
        },
        {
          name: 'different-name2'
        }
      ];
      let value = 'new-name';
      let result = validateName(deckName, decks)(value);
      expect(result).toBe(true);
    });

    test('returns true when given the same name as the current name during editing', () => {
      let deckName = 'test-name'      
      let decks = [
        {
          name: 'different-name1'
        },
        {
          name: 'different-name2'
        }
      ];
      let value = 'test-name';
      let result = validateName(deckName, decks)(value);
      expect(result).toBe(true);
    });

    test('returns true when given the a name (different from the current name) that already exists during editing', () => {
      let errorString = 'Sorry, you must give the deck a unique name (and the ":" character is not allowed).';
      let deckName = 'test-name'      
      let decks = [
        {
          name: 'different-name'
        },
        {
          name: 'same-name'
        }
      ];
      let value = 'same-name';
      let result = validateName(deckName, decks)(value);
      expect(result).toBe(errorString);
    });     
  })
})