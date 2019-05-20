'use strict;';

import { registerPrompt, prompt } from 'inquirer';
import fuzzy from 'fuzzy';

registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

import deckCtrlrs from '../resources/deck/deck.controller';
import cardCtrlrs from '../resources/card/card.controller';
import { 
  isCreatingAnother, 
  decksToChoices, 
  asyncForEach 
} from './shared';

// Walks the user through creating a deck of flash cards
// 1) Ask user for deck name and description
// 2) Create deck in database
// 3) Ask user if they want to create another deck immediately
async function createDeck() {
  var answers = await prompt([
    {
      type: 'input',
      name: 'deckName',
      message: "You've chosen to create a deck. What do you want to name it?",
      validate: function(value) {
        var pass = value.trim().match(/^(?!.*:.*)^.+/); // due to how we parse decks during card adding, we can't allow ':'
        if (pass) {
          return true;
        }
        return 'Sorry, you must give the deck a name (and the ":" character is not allowed).';
      }
    },
    {
      type: 'input',
      name: 'deckDescription',
      message: 'Provide a description for your new deck (optional)'
    }
  ]);

  let details = { name: answers.deckName };
  if (answers.deckDescription != '') {
    details['description'] = answers.deckDescription;
  }

  try {
    await deckCtrlrs.createOne(details);
    console.log(
      `Deck ${
        details.name
      } successfully created. Now you can (i)mport or (a)dd some cards to it!`
    );
  } catch (err) {
    console.log(`Error encountered while creating deck: ${err}.\nExiting.`);
    process.exit();
  }

  // does user want to create another deck now?
  if (await isCreatingAnother('deck')) {
    await createDeck();
  }

  process.exit(); 
}

// Walks the user through deleting one or more decks
// 1) Preseent user with list of decks to choose from
// 2) After deck choice(s), prompt user with confirmation
// 3) Delete associated cards from database
// 4) Delete decks from database
async function deleteDecks() {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});

  // turn our mongodb object of decks into an array of choices for inquirer
  var choices = decks.map(decksToChoices);

  var selectedDecks = await prompt([
    {
      type: 'checkbox-plus',
      name: 'decks',
      message: "You've chosen to delete one or more decks. Which deck(s) do you wish to delete? (you can filter by typing)",
      pageSize: 10,
      highlight: true,
      searchable: true,
      source: function(answersSoFar, input) {
        input = input || '';

        return new Promise(function(resolve) {
          var fuzzyResult = fuzzy.filter(input, choices);

          var data = fuzzyResult.map(function(element) {
            return element.original;
          });

          resolve(data);
        })
      }
    }
  ]);

  // parse deck names
  let deckNames = selectedDecks.decks.map(function parseDeckName(deck) {
    if (deck.includes(':')) {
      return deck.split(':')[0];
    }
    return deck;
  })

  // prompt the user for confirmation
  var isSure = await prompt([
    {
      type: 'confirm',
      name: 'deleteDecks',
      message: `You've chosen to delete the following decks: ${deckNames.join(', ')}. This will permenantly remove both the decks and their containing cards. Are you sure this is what you want to do?`,
      default: false
    }
  ]);

  if (isSure.deleteDecks) {
    // create list of deck IDs for query
    let deckIds = [];
    deckNames.forEach(function addToDeckIds(deckName) {
      deckIds.push(decks.filter(deck => deck.name == deckName).map(deck => deck._id)[0]);
    })
  
    // atempt delete query
    try {
      await attemptDeckDelete(deckIds);
      console.log('Deck(s) successfully deleted.');
    } catch (err) {
      console.log(err);
    }
  }

 process.exit();    
}

// helper function to delete the selected decks (and their associated cards)
async function attemptDeckDelete(deckIds) {
  // loop over each deck ID
  await asyncForEach(deckIds, async function deleteDeck(deckId) {
    // ... remove cards
    try {
      await cardCtrlrs.removeMany({deck: deckId});
    } catch(err) {
      throw new Error(`Error encountered while deleting deck's cards: ${err}.\nExiting.`);
    }
    // ... remove decks
    try {
      await deckCtrlrs.removeOne(deckId);
    } catch(err) {
      throw new Error(`Error encountered while deleting deck(s): ${err}.\nExiting.`);
    }
  })
}

export { createDeck, deleteDecks };