'use strict';

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { registerPrompt, prompt } from 'inquirer';

import cardCtrlrs from '../resources/card/card.controllers';
import deckCtrlrs from '../resources/deck/deck.controllers';

import {
  isCreatingAnother,
  getDeckProperties,
  getSelectedDecks,
  asyncForEach,
  fuzzySearch
} from './shared';

import {
  ADD_CARDS_WHICH_DECK,
  DEL_CARDS_WHICH_DECK,
  DEL_CARDS_WHICH_CARD,
  EDIT_CARD_WHICH_DECK,
  EDIT_CARD_WHICH_CARD,
  BROWSE_CARDS_WHICH_DECK,
  BROWSE_CARDS_WHICH_CARD,
  EXPORT_CARDS_WHICH_DECK,
  IMPORT_CARDS_WHICH_DECK
} from '../utils/promptMessages';

import { SINGLE_CHOICE, MULTIPLE_CHOICE } from '../utils/promptTypes';

import { HOUR_IN_MILIS } from './study';

registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

var writeFile = promisify(fs.writeFile);
var readFile = promisify(fs.readFile);

// Walks a user through adding a card to a deck
// 1) Present user with list of decks to choose from
// 2) After deck choice, present user with card creation prompts
// 3) Create card in database
// 4) Ask if user wants to create another card immediately
async function addCard(_, deckId) {
  // if this is the first card being added for a particular session
  // of card adding, we must retrieve the deckID manually
  if (!deckId) {
    var deckName;
    // retrieve all decks from database
    var decks = await deckCtrlrs.getMany({});
    // prompt user with deck choices and get answer
    let deckMessage = ADD_CARDS_WHICH_DECK;
    let deckType = SINGLE_CHOICE;
    let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

    // check if user wants to exit
    if (selectedDeck.decks == '** exit **') {
      console.log('Exiting...');
      process.exit();
    }

    // get deck properties for future use
    [deckId, deckName] = await getDeckProperties(decks, selectedDeck);
    console.log(
      '\nNow you get to create your card! Fill in the following details.\n'
    );
  }

  // now lets get the details for the new card
  var cardAnswers = await prompt([
    {
      type: 'input',
      name: 'prompt',
      message: 'Prompt (you can think of this as the front of the card)',
      validate: async function(value) {
        var pass = value.trim().match(/^.+/);

        // retrieve all cards from database to test if card prompt already exists
        let cards = await cardCtrlrs.getMany({ deck: deckId });
        let cardPrompts = cards.map(card => card.prompt);

        let alreadyExist = cardPrompts.includes(value);

        if (pass && !alreadyExist) {
          return true;
        }

        return 'Sorry, you must enter a unique prompt for the card.';
      }
    },
    {
      type: 'input',
      name: 'promptExample',
      message:
        "A second detail for the prompt (eg an example sentence using the prompt's value, optional)"
    },
    {
      type: 'input',
      name: 'target',
      message: 'Target (you can think of this as the back of the card)',
      validate: function(value) {
        var pass = value.trim().match(/^.+/);
        if (pass) {
          return true;
        }
        return 'Sorry, you must enter a target for the card.';
      }
    },
    {
      type: 'input',
      name: 'targetExample',
      message: 'A second detail for the target (optional)'
    }
  ]);

  // create the card details object we'll use for the query
  let cardForQuery = prepareCardForQuery(deckId)(cardAnswers);

  try {
    await cardCtrlrs.createOne(cardForQuery);
    console.log(`Card successfully added. Now you can (s)tudy it!`);
  } catch (err) {
    console.log(`Error encountered while creating card: ${err}.\nExiting...`);
    process.exit();
  }

  // does user want to create another card now?
  if (await isCreatingAnother('card')) {
    console.log(`Adding another card to ${deckName}...`);
    await addCard(_, deckId);
  }

  process.exit();
}

// Walks the user through deleting one or more cards
// 1) Present user with list of decks to choose from
// 2) After deck is chosen, present user with list of (filterable) cards
// 3) Prompt user for confirmation to delete
// 4) Delete chosen card(s)
async function deleteCards() {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});
  // prompt user with deck choices and get answer
  let deckMessage = DEL_CARDS_WHICH_DECK;
  let deckType = SINGLE_CHOICE;
  let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

  // check if user wants to exit
  if (selectedDeck.decks == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }

  // get deck properties for future use
  var [deckId] = await getDeckProperties(decks, selectedDeck);

  // retrieve all associated cards from database
  var cards = await cardCtrlrs.getMany({ deck: deckId });
  // prompt user to select card
  let cardMessage = DEL_CARDS_WHICH_CARD;
  let cardType = MULTIPLE_CHOICE;
  var selectedCards = await getSelectedCards(cards, cardMessage, cardType);

  // check if user wants to go back or exit
  if (selectedCards.includes('<-- go back to decks')) {
    await deleteCards();
  }
  if (selectedCards.includes('** exit **')) {
    console.log('Exiting...');
    process.exit();
  }
  // check if user didn't choose any cards
  if (selectedCards.length == 0) {
    console.log(
      `You didn't choose a card. If this was a mistake, next time make sure you use the <space> key to select a card.\nExiting...`
    );
    process.exit();
  }

  // confirm user wants to delete the selected card(s)
  var isSure = await prompt([
    {
      type: 'confirm',
      name: 'deleteCards',
      message: `You've chosen to delete the following card(s): ${selectedCards.join(
        ', '
      )}. This cannot be undone. Are you sure this is what you want to do?`,
      default: false
    }
  ]);

  if (isSure.deleteCards) {
    // we'll determine our card IDs based on their prompt values
    // so let's first parse it out
    let cardPrompts = selectedCards.map(function parsePrompt(card) {
      return card.split(' -->')[0];
    });

    try {
      await attemptCardsDelete(cardPrompts, cards);
      console.log('Card(s) successfully deleted.');
    } catch (err) {
      console.log(err);
    }
  } else {
    console.log('Card deletion cancelled.\nExiting...');
  }

  process.exit();
}

// helper function to delete the selected cards from the deck
async function attemptCardsDelete(cardPrompts, cards) {
  // loop over each card prompt...
  await asyncForEach(cardPrompts, async function deleteCardById(cardPrompt) {
    // ...determine its mongodb ID...
    let cardId = cards
      .filter(card => card.prompt == cardPrompt)
      .map(card => card._id)[0];
    // ...and call the remove query
    try {
      await cardCtrlrs.removeOne(cardId);
    } catch (err) {
      throw new Error(
        `Error encountered while deleting card(s): ${err}.\nExiting...`
      );
    }
  });
}

// Walks user through editing a card's details
// 1) Prompt user with list of decks to choose from
// 2) Prompt user with list of associated cards to choose from
// 3) Prompt user with card details to change
// 4) Update card details in database
async function editCardDetails() {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});
  // prompt user with deck choices and get answer
  let deckMessage = EDIT_CARD_WHICH_DECK;
  let deckType = SINGLE_CHOICE;
  let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

  // check if user wants to exit
  if (selectedDeck.decks == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }

  // get deck properties for future use
  var [deckId] = await getDeckProperties(decks, selectedDeck);

  // retrieve cards associated with deck ID from database
  var cards = await cardCtrlrs.getMany({ deck: deckId });
  // prompt user to select card
  let cardMessage = EDIT_CARD_WHICH_CARD;
  let cardType = SINGLE_CHOICE;
  let selectedCard = await getSelectedCards(cards, cardMessage, cardType);

  // check if user wants to go back or exit
  if (selectedCard == '<-- go back to decks') {
    await editCardDetails();
  }
  if (selectedCard == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }

  // get necessary card properties
  var [
    cardId,
    cardPrompt,
    promptExample,
    cardTarget,
    targetExample
  ] = getCardProperties(selectedCard, cards);

  // present user with details to edit
  var cardAnswers = await prompt([
    {
      type: 'input',
      name: 'prompt',
      message: 'Card prompt',
      default: cardPrompt,
      validate: function(value) {
        var pass = value.trim().match(/^.+/);

        // create list of card propmts to check if new prompt already exists
        let cardPrompts = cards.map(card => card.prompt);

        let alreadyExist = false;
        if (value != cardPrompt && cardPrompts.includes(value)) {
          alreadyExist = true;
        }

        if (pass && !alreadyExist) {
          return true;
        }

        return 'Sorry, you must enter a prompt for the card.';
      }
    },
    {
      type: 'input',
      name: 'promptExample',
      message: 'Prompt example (optional)',
      default: promptExample
    },
    {
      type: 'input',
      name: 'target',
      message: 'Card target',
      default: cardTarget,
      validate: function(value) {
        var pass = value.trim().match(/^.+/);
        if (pass) {
          return true;
        }
        return 'Sorry, you must enter a target for the card.';
      }
    },
    {
      type: 'input',
      name: 'targetExample',
      default: targetExample
    }
  ]);

  // create our object we will use to update the card in the database
  let newCardDetails = prepareCardForQuery(null)(cardAnswers);

  // attempt to update card in database
  try {
    await cardCtrlrs.updateOne(cardId, newCardDetails);
    console.log('Card successfully updated!');
  } catch (err) {
    console.log(`Error encountered while updating card: ${err}.\nExiting...`);
  }

  process.exit();
}

// Walks user through browsing cards
// 1) Present user with list of decks
// 2) Present user with list of cards associated with chosen deck
// 3) Upon card selection, present use with card details
// 4) Repeat if user wants to continue browsing (with same deck)
async function browseCards(_, deckId) {
  // if this is the first card being displayed for a particular session
  // of card browsing, we must retrieve the deckID manually
  if (!deckId) {
    var deckName;
    // retrieve all decks from database
    var decks = await deckCtrlrs.getMany({});
    // prompt user with deck choices and get answer
    let deckMessage = BROWSE_CARDS_WHICH_DECK;
    let deckType = SINGLE_CHOICE;
    let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

    // check if user wants to exit
    if (selectedDeck.decks == '** exit **') {
      console.log('Exiting...');
      process.exit();
    }

    // get deck properties for future use
    [deckId, deckName] = await getDeckProperties(decks, selectedDeck);
  }

  // retrieve all associated cards from database
  var cards = await cardCtrlrs.getMany({ deck: deckId });
  // prompt user to select card
  let cardMessage = BROWSE_CARDS_WHICH_CARD;
  let cardType = SINGLE_CHOICE;
  let selectedCard = await getSelectedCards(cards, cardMessage, cardType);

  // check if user wants to go back or exit
  if (selectedCard == '<-- go back to decks') {
    await browseCards();
  }
  if (selectedCard == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }

  // get necessary card properties
  var [
    ,
    cardPrompt,
    promptExample,
    cardTarget,
    targetExample
  ] = getCardProperties(selectedCard, cards);

  console.log(
    `\nCard details...
    Prompt: ${cardPrompt}
    Example: ${promptExample}
    Target: ${cardTarget}
    Example: ${targetExample}\n`
  );

  // determine if user wants to continue browsing the deck
  let answer = await prompt([
    {
      type: 'confirm',
      name: 'continue',
      message: `Would you like to continue browsing ${deckName}?`,
      default: true
    }
  ]);

  if (answer.continue) {
    await browseCards(_, deckId);
  }

  process.exit();
}

// Walks user through exporting a deck of cards
// 1) Present user with choice of decks
// 2) Prompt user for path to export to (default is index.js's current dir)
// 3) Retrieve cards associated with deck from db
// 4) Attempt to write JSON.stringify'd cards to export path
async function exportCards() {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});
  // prompt user with deck choices and get answer
  let deckMessage = EXPORT_CARDS_WHICH_DECK;
  let deckType = SINGLE_CHOICE;
  let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

  // check if user wants to exit
  if (selectedDeck.decks == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }

  // get deck properties for future use
  var [deckId, deckName] = await getDeckProperties(decks, selectedDeck);

  // determine export path
  var answer = await prompt([
    {
      type: 'input',
      name: 'exportPath',
      message: 'Where do you wish to export the cards?',
      default: path.join('.')
    }
  ]);

  let exportPath = path.join(
    answer.exportPath,
    `${deckName.split(' ').join('-')}-export.json`
  );
  console.log(`Exporting cards from deck "${deckName}" to ${exportPath}`);

  // query db for associated cards and format them
  let cards = await cardCtrlrs.getMany({ deck: deckId });
  let formattedCards = cards.map(function format(card) {
    return {
      prompt: card.prompt,
      promptExample: card.promptExample,
      target: card.target,
      targetExample: card.targetExample
    };
  });

  // attempt to write JSON.stringify'd cards to export path
  try {
    await writeFile(exportPath, JSON.stringify(formattedCards));
    console.log(
      `Cards from deck "${deckName}" successfully exported to ${exportPath}`
    );
  } catch (err) {
    console.log(`Error exporting cards from deck: ${err}.\nExiting...`);
  }

  process.exit();
}

// Walks user through importing a deck of cards
// 1) Present user with choice of decks
// 2) Prompt user for path to import from (default is index.js's current dir)
// 3) Retrieve to read JSON.parse'd cards
// 4) Create a card in the database for each card
async function importCards() {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});
  // prompt user with deck choices and get answer
  let deckMessage = IMPORT_CARDS_WHICH_DECK;
  let deckType = SINGLE_CHOICE;
  let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

  // check if user wants to exit
  if (selectedDeck.decks == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }

  // get deck properties for future use
  var [deckId, deckName] = await getDeckProperties(decks, selectedDeck);

  // determine import path
  var answer = await prompt([
    {
      type: 'input',
      name: 'importPath',
      message: 'From which file would you like to import the card(s)?',
      default: path.join(`./${deckName.split(' ').join('-')}-export.json`)
    }
  ]);

  let importPath = path.join(answer.importPath);
  console.log(`Importing card(s) from ${importPath} to deck "${deckName}"...`);

  // attempt read from provided path
  try {
    var importedCards = JSON.parse(await readFile(importPath));
  } catch (err) {
    console.log(`Error importing deck: ${err}.\nExiting...`);
    process.exit();
  }

  // prepare cards for create db queries
  let cardsForQuery = importedCards.map(prepareCardForQuery(deckId));

  // attempt create query against db
  try {
    await attemptCardsImport(cardsForQuery);
    console.log('Card(s) successfully imported.');
  } catch (err) {
    console.log(err);
  }

  process.exit();
}

// helper function to loop through cards and execute create queries against the db
async function attemptCardsImport(cards) {
  await asyncForEach(cards, async function createCard(card) {
    try {
      await cardCtrlrs.createOne(card);
    } catch (err) {
      throw new Error(
        `Error encountered while adding card(s): ${err}.\nExiting...`
      );
    }
  });
}

// *********** general helper functions *************

// prompt user with list of available cards and returns selected card
async function getSelectedCards(cards, message, type) {
  var choices = cards.map(function cardsToChoices(card) {
    return `${card.prompt} --> ${card.target}`;
  });

  choices.push('<-- go back to decks', '** exit **');

  var selectedCards = await prompt([
    {
      type: type,
      name: 'cards',
      message: message,
      pageSize: 10,
      highlight: true,
      searchable: true,
      source: function(answersSoFar, input) {
        return fuzzySearch(answersSoFar, input, choices);
      }
    }
  ]);

  return selectedCards.cards;
}

// Helper function to parse out card properties
function getCardProperties(selectedCard, cards) {
  // parse out card prompt and use it to determine card details
  var cardPrompt = selectedCard.split(' -->')[0],
    cardDetails = cards.filter(card => card.prompt == cardPrompt)[0],
    cardId = cardDetails._id,
    promptExample = cardDetails.promptExample,
    cardTarget = cardDetails.target,
    targetExample = cardDetails.targetExample;

  return [cardId, cardPrompt, promptExample, cardTarget, targetExample];
}

// Takes a plain card object and prepares it for making a create query
function prepareCardForQuery(deckId) {
  return function prepare(cardObject) {
    var now = Math.floor(new Date().getTime() / HOUR_IN_MILIS),
      cardForQuery = {
        prompt: cardObject.prompt,
        promptExample: cardObject.promptExample,
        target: cardObject.target,
        targetExample: cardObject.targetExample,
        timeAdded: now,
        nextReview: now,
        timesCorrect: 0
      };

    if (deckId !== null) {
      cardForQuery['deck'] = deckId;
    }

    return cardForQuery;
  };
}

export {
  addCard,
  deleteCards,
  editCardDetails,
  browseCards,
  exportCards,
  importCards
};
