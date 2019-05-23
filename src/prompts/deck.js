'use strict';

import { registerPrompt, prompt } from 'inquirer';

registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

import deckCtrlrs from '../resources/deck/deck.controller';
import cardCtrlrs from '../resources/card/card.controller';

import { 
  isCreatingAnother,
  asyncForEach,
  getSelectedDecks,
  getDeckProperties
} from './shared';

import { 
  DEL_DECK_WHICH_DECK,
  EDIT_DECK_WHICH_DECK 
} from '../utils/promptMessages';

import {
  SINGLE_CHOICE,
  MULTIPLE_CHOICE
} from '../utils/promptTypes';

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
      message: 'Provide a description for your new deck (optional)',
      validate: function(value) {
        var pass = value.trim().match(/^(?!.*:.*)^.*/); // due to how we parse decks during card adding, we can't allow ':'
        if (pass) {
          return true;
        }
        return 'Sorry,  the ":" character is not allowed.';
      }
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
    console.log(`Error encountered while creating deck: ${err}.\nExiting...`);
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

  let deckMessage = DEL_DECK_WHICH_DECK;
  let type = MULTIPLE_CHOICE;
  let selectedDecks = await getSelectedDecks(decks, deckMessage, type);

  // check if user wants to exit
  if (selectedDecks.decks.includes('** exit **')) {
    console.log('Exiting...');
    process.exit();
  }

  // check if user didn't choose any decks
  if (selectedDecks.decks.length == 0) {
    console.log(`You didn't choose a deck. If this was a mistake, next time make sure you use the <space> key to select a deck.\nExiting...`);
    process.exit();
  }

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
      message: `You've chosen to delete the following deck(s): ${deckNames.join(', ')}. This will permenantly remove both the decks and their containing cards. Are you sure this is what you want to do?`,
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
  } else {
    console.log('Deck deletion cancelled.\nExiting...')
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
      throw new Error(`Error encountered while deleting deck's cards: ${err}.\nExiting...`);
    }
    // ... remove decks
    try {
      await deckCtrlrs.removeOne(deckId);
    } catch(err) {
      throw new Error(`Error encountered while deleting deck(s): ${err}.\nExiting...`);
    }
  })
}

// Walks user through editing a deck (ie changing its name or description)
// 1) Prompt user with list of decks to choose from
// 2) Prompt user with name and description inputs
// 3) Update deck in database
async function editDeckDetails () {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});
  // prompt user with deck choices and get answer
  let message = EDIT_DECK_WHICH_DECK;
  let type = SINGLE_CHOICE;
  var selectedDeck = await getSelectedDecks(decks, message, type);

  // check if user wants to exit
  if (selectedDeck.decks == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }
  
  // get deck properties for future use  
  var [deckId, deckName, deckDescription] = await getDeckProperties(decks, selectedDeck);

  console.log(`You've chosen to edit the details of ${deckName}...`)

  var answers = await prompt([
    {
      type: 'input',
      name: 'deckName',
      message: 'Deck name',
      default: deckName,
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
      message: 'Deck description (optional)',
      default: deckDescription,
      validate: function(value) {
        var pass = value.trim().match(/^(?!.*:.*)^.*/); // due to how we parse decks during card adding, we can't allow ':'
        if (pass) {
          return true;
        }
        return 'Sorry,  the ":" character is not allowed.';
      }
    }
  ]);

  let details = { name: answers.deckName };
  if (answers.deckDescription != '') {
    details['description'] = answers.deckDescription;
  }

  try {
    await deckCtrlrs.updateOne(deckId, details);
    console.log(`Deck ${deckName} successfully updated.`);
  } catch (err) {
    console.log(`Error encountered while updating deck: ${err}.\nExiting`)
  }

  process.exit();
}

export { createDeck, deleteDecks, editDeckDetails };