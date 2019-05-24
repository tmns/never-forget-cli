'use strict';

import { registerPrompt, prompt } from 'inquirer';

import deckCtrlrs from '../resources/deck/deck.controllers';
import cardCtrlrs from '../resources/card/card.controllers';

import { 
  isCreatingAnother,
  promptConfirm,
  asyncForEach,
  getSelectedDecks,
  getDeckProperties
} from './shared';

import { 
  DEL_DECK_WHICH_DECK,
  EDIT_DECK_WHICH_DECK 
} from '../utils/strings';

import {
  SINGLE_CHOICE,
  MULTIPLE_CHOICE
} from '../utils/promptTypes';

registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

// Walks the user through creating a deck of flash cards
// 1) Ask user for deck name and description
// 2) Create deck in database
// 3) Ask user if they want to create another deck immediately
async function createDeck() {
  // get list of decks for unique deck name validation
  let decks = await deckCtrlrs.getMany({});

  // prompt user to input deck name and description
  let details = await promptCreateDeck(decks);

  // attempt to create deck in db
  try {
    await deckCtrlrs.createOne(details);
    console.log(
      `Deck "${
        details.name
      }" successfully created. Now you can (i)mport or (a)dd some cards to it!`
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
  if (selectedDecks.includes('** exit **')) {
    console.log('Exiting...');
    process.exit();
  }

  // check if user didn't choose any decks
  if (selectedDecks.length == 0) {
    console.log(`You didn't choose a deck. If this was a mistake, next time make sure you use the <space> key to select a deck.\nExiting...`);
    process.exit();
  }

  // parse deck names
  let deckNames = selectedDecks.map(function parseDeckName(deck) {
    if (deck.includes(':')) {
      return deck.split(':')[0];
    }
    return deck;
  })

  // prompt the user for confirmation
  let message = 
  `You've chosen to delete the following deck(s): ${deckNames.join(', ')}. 
  This will permenantly remove both the decks and their containing cards. Are you sure this is what you want to do?`;
  let defaultVal = false;
  let isSure = await promptConfirm(message, defaultVal);

  if (isSure) {
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
      await cardCtrlrs.removeMany({ deck: deckId });
    } catch (err) {
      throw new Error(`Error encountered while deleting deck's cards: ${err}.\nExiting...`);
    }
    // ... remove decks
    try {
      await deckCtrlrs.removeOne(deckId);
    } catch (err) {
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
  if (selectedDeck == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }
  
  // get deck properties for future use  
  var [deckId, deckName, deckDescription] = await getDeckProperties(decks, selectedDeck);

  console.log(`You've chosen to edit the details of ${deckName}...`);

  // prompt user for deck name and description
  let details = await promptEditDeck(deckName, deckDescription, decks);

  // attempt to udpate deck in db
  try {
    await deckCtrlrs.updateOne(deckId, details);
    console.log(`Deck "${deckName}" successfully updated.`);
  } catch (err) {
    console.log(`Error encountered while updating deck: ${err}.\nExiting`)
  }

  process.exit();
}

// ******************* HELPER FUNCTIONS *******************

// prompts user for deck name and description
async function promptCreateDeck(decks) {
  var answers = await prompt([
    {
      type: 'input',
      name: 'deckName',
      message: "You've chosen to create a deck. What do you want to name it?",
      validate: validateDeckName(null, decks)
    },
    {
      type: 'input',
      name: 'deckDescription',
      message: 'Provide a description for your new deck (optional)',
      validate: validateDeckDescription
    }
  ]);

  return {
    name: answers.deckName.trim(), 
    description: answers.deckDescription.trim()
  }
}

// prompts user for new deck name and description
async function promptEditDeck(deckName, deckDescription, decks) {
  var answers = await prompt([
    {
      type: 'input',
      name: 'deckName',
      message: 'Deck name',
      default: deckName,
      validate: validateDeckName(deckName, decks)
    },
    {
      type: 'input',
      name: 'deckDescription',
      message: 'Deck description (optional)',
      default: deckDescription,
      validate: validateDeckDescription
    }
  ]);

  return { 
    name: answers.deckName.trim(), 
    description: answers.deckDescription.trim()
  };
}

// validates desired deck name
function validateDeckName(deckName, decks) {
  return async function validate(value) {
    // due to how we parse decks during card adding, we can't allow ':'
    var pass = value.trim().match(/^(?!.*:.*)^.+/);

    // create list of deck names to check if new name already exists
    var deckNames = decks.map(deck => deck.name);

    // check if value already exists
    // ie, if a deck already exists with the desired name
    // first we assume it doesn't...
    var alreadyExist = false;
    // ...if deckName was not passed, this means we're creating and simply
    // check if value already exists
    if (!deckName) {
      alreadyExist = deckNames.includes(value);
    } else {
      // we're editing a card and so we must also check if the value is the current deckName
      alreadyExist = deckNames.includes(value) && value != deckName;
    }

    if (pass && !alreadyExist) {
      return true;
    }
    
    return 'Sorry, you must give the deck a unique name (and the ":" character is not allowed).';
  }
}

// validates desired deck description
function validateDeckDescription(value) {
  var pass = value.trim().match(/^(?!.*:.*)^.*/); // due to how we parse decks during card adding, we can't allow ':'
  if (pass) {
    return true;
  }
  return 'Sorry,  the ":" character is not allowed.';
}

export { createDeck, deleteDecks, editDeckDetails };