'use strict';

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { registerPrompt, prompt } from 'inquirer';

registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

import cardCtrlrs from '../resources/card/card.controller';
import deckCtrlrs from '../resources/deck/deck.controller';

import { 
  isCreatingAnother,
  getDeckProperties,
  getSelectedDecks, 
  asyncForEach,
  fuzzySearch 
} from './shared';

var writeFile = promisify(fs.writeFile);

// Walks a user through adding a card to a deck
// 1) Present user with list of decks to choose from
// 2) After deck choice, present user with card creation prompts
// 3) Create card in database
// 4) Ask if user wants to create another card immediately
async function addCard(_, deckId) {
  // if this is the first card being added for a particular session
  // of card adding, we must retrieve the deckID manually
  if (!deckId) {
    // retrieve all decks from database
    var decks = await deckCtrlrs.getMany({});
    // prompt user with deck choices and get answer
    let message = "You've chosen to add one or more cards. Which deck would you like to add the card(s) to?";
    let deckType = 'autocomplete';
    let selectedDeck = await getSelectedDecks(decks, message, deckType);

    // check if user wants to exit
    if (selectedDeck.decks == '** exit **') {
      console.log('Exiting...');
      process.exit();
    }

    // get deck properties for future use
    var [deckId, deckName] = await getDeckProperties(decks, selectedDeck);
    console.log(
      'Now you get to create your card! Fill in the following details.'
    );
  }

  // now lets get the details for the new card
  var cardAnswers = await prompt([
    {
      type: 'input',
      name: 'prompt',
      message: 'Prompt (you can think of this as the front of the card)',
      validate: function(value) {
        var pass = value.trim().match(/^.+/);
        if (pass) {
          return true;
        }
        return 'Sorry, you must enter a prompt for the card.';
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
  let cardDetails = {
    deck: deckId,
    prompt: cardAnswers.prompt,
    target: cardAnswers.target
  };

  if (cardAnswers.promptExample != '') {
    cardDetails['promptExample'] = cardAnswers.promptExample;
  }

  if (cardAnswers.targetExample != '') {
    cardDetails['targetExample'] = cardAnswers.targetExample;
  }

  try {
    await cardCtrlrs.createOne(cardDetails);
    console.log(`Card successfully added. Now you can (s)tudy it!`);
  } catch (err) {
    console.log(`Error encountered while creating card: ${err}.\nExiting.`);
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
  let deckMessage = "You've chosen to delete one or more cards. From which deck would you like to delete the card(s)?";
  let deckType = 'autocomplete';
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
  let cardMessage = 'Choose the card(s) you wish to delete (you can filter cards by typing)';
  let cardType = 'checkbox-plus';
  var selectedCards = await getSelectedCards(cards, cardMessage, cardType);

  // check if user wants to go back or exit
  if (selectedCards.cards.includes('<-- go back to decks')) {
    await deleteCards();
  }
  if (selectedCards.cards.includes('** exit **')) {
    console.log('Exiting...');
    process.exit();
  }

  // confirm user wants to delete the selected card(s)
  var isSure = await prompt([
    {
      type: 'confirm',
      name: 'deleteCards',
      message: `You've chosen to delete the following cards: ${selectedCards.cards.join(', ')}. This cannot be undone. Are you sure this is what you want to do?`,
      default: false
    }
  ]);

  if (isSure.deleteCards) {
    // we'll determine our card IDs based on their prompt values
    // so let's first parse it out
    let cardPrompts = selectedCards.cards.map(function parsePrompt(card) {
      return card.split(' -->')[0];
    })
  
    try {
      await attemptCardDelete(cardPrompts, cards);
      console.log('Card(s) successfully deleted.');
    } catch (err) {
      console.log(err);
    }
  }

  process.exit();
}

// helper function to delete the selected cards from the deck
async function attemptCardDelete(cardPrompts, cards) {
  // loop over each card prompt...
  await asyncForEach(cardPrompts, async function deleteCardById(cardPrompt) {
    // ...determine its mongodb ID...
    let cardId =  cards.filter(card => card.prompt == cardPrompt).map(card => card._id)[0];
    // ...and call the remove query
    try {
      await cardCtrlrs.removeOne(cardId);
    } catch(err) {
      throw new Error(`Error encountered while deleting card(s): ${err}.\nExiting.`);
    }
  })
}

// Walks user through editing a card's details
// 1) Prompt user with list of decks to choose from
// 2) Prompt user with list of associated cards to choose from
// 3) Prompt user with card details to change
// 4) Update card details in database
async function editCardDetails () {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});
  // prompt user with deck choices and get answer
  let deckMessage = "You've chosen to edit a card's details. In which deck is the card located?";
  let deckType = 'autocomplete';
  let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

  // check if user wants to exit
  if (selectedDeck.decks == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }

  // get deck properties for future use
  var [deckId] = await getDeckProperties(decks, selectedDeck)

  // retrieve cards associated with deck ID from database
  var cards = await cardCtrlrs.getMany({ deck: deckId });
  // prompt user to select card
  let cardMessage = "You've chosen to edit a card. Which card would you like to edit?";
  let cardType = 'autocomplete';
  let selectedCard = await getSelectedCards(cards, cardMessage, cardType);

  // check if user wants to go back or exit
  if (selectedCard.cards == '<-- go back to decks') {
    await editCardDetails();
  }
  if (selectedCard.cards == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }
  
  // parse out card prompt and use it to retrieve card details from database
  var cardPrompt = selectedCard.cards.split(' -->')[0];
  var cardDetails = await cardCtrlrs.getOne({prompt: cardPrompt});

  // present user with details to edit
  var cardAnswers = await prompt([
    {
      type: 'input',
      name: 'prompt',
      message: 'Card prompt',
      default: cardDetails.prompt,
      validate: function(value) {
        var pass = value.trim().match(/^.+/);
        if (pass) {
          return true;
        }
        return 'Sorry, you must enter a prompt for the card.';
      }
    },
    {
      type: 'input',
      name: 'promptExample',
      message: 'Prompt example (optional)',
      default: cardDetails['promptExample'] ? cardDetails.promptExample : ''
    },
    {
      type: 'input',
      name: 'target',
      message: 'Card target',
      default: cardDetails.target,
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
      default: cardDetails['targetExample'] ? cardDetails.targetExample : ''
    }
  ]);

  // create our object we will use to update the card in the database
  let newCardDetails = {
    prompt: cardAnswers.prompt,
    target: cardAnswers.target
  }
  if (cardAnswers.promptExample != '') {
    newCardDetails['promptExample'] = cardAnswers.promptExample;
  }
  if (cardAnswers.targetExample != '') {
    newCardDetails['targetExample'] = cardAnswers.targetExample;
  }

  // attempt to update card in database
  try {
    await cardCtrlrs.updateOne(cardDetails._id, newCardDetails);
    console.log('Card successfully updated!')
  } catch (err) {
    console.log(`Error encountered while updating card: ${err}.\nExiting.`);
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
    // retrieve all decks from database
    var decks = await deckCtrlrs.getMany({});
    // prompt user with deck choices and get answer
    let deckMessage = "Choose a deck to browse its cards.";
    let deckType = 'autocomplete';
    let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

    // check if user wants to exit
    if (selectedDeck.decks == '** exit **') {
      console.log('Exiting...');
      process.exit();
    }

    // get deck properties for future use
    var [deckId, deckName] = await getDeckProperties(decks, selectedDeck);
  }

  // retrieve all associated cards from database
  var cards = await cardCtrlrs.getMany({ deck: deckId });
  // prompt user to select card
  let cardMessage = 'Choose a card to view its details.';
  let cardType = 'autocomplete';
  let selectedCard = await getSelectedCards(cards, cardMessage, cardType);

  // check if user wants to go back or exit
  if (selectedCard.cards == '<-- go back to decks') {
    await browseCards();
  }
  if (selectedCard.cards == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }

  // parse out card prompt and use it to retrieve card details from database
  var cardPrompt = selectedCard.cards.split(' -->')[0];
  var cardDetails = await cardCtrlrs.getOne({prompt: cardPrompt});

  // show user card details
  console.log(
    `Card details...
    Prompt: ${cardDetails.prompt}
    Example: ${cardDetails['promptExample'] ? cardDetails.promptExample : ''}
    Target: ${cardDetails.target}
    Example: ${cardDetails['targetExample'] ? cardDetails.targetExample : ''}`
  );

  // determine if user wants to continue browsing the deck  
  let answer = await prompt([
    {
      type: 'confirm',
      name: 'continue',
      message: `Would you like to continue browsing ${deckName}?`,
      default: true
    }
  ])

  if (answer.continue) {
    await browseCards(_, deckId);
  }
  
  process.exit();
}

// Walks user through exporting a deck of cards
// 1) Present user with choice of decks
// 2) Prompt user for path to export to (default is the file's current dir)
// 3) Retrieve cards associated with deck from db
// 4) Attempt to write JSON.stringify'd cards to export path
async function exportCards () {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});
  // prompt user with deck choices and get answer
  let deckMessage = "You've chosen to export a deck of cards. Which deck would you like to export?";
  let deckType = 'autocomplete';
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
      name: 'location',
      message: 'Where do you wish to export the cards?',
      default: __dirname
    }
  ]);

  let exportPath = path.join(answer.location, `${deckName.split(' ').join('-')}-export.json`);
  console.log(`Exporting ${deckName} to ${exportPath}`);

  // query db for associated cards and format them 
  let cards = await cardCtrlrs.getMany({ deck: deckId });
  let formattedCards = cards.map(function format(card) {
    return {
      prompt: card.prompt,
      promptExample: card['promptExample'] ? card.promptExample : '',
      target: card.target,
      targetExample: card['targetExample'] ? card.targetExample : ''
    }
  })

  // attempt to write JSON.stringify'd cards to export path
  try {
    await writeFile(exportPath, JSON.stringify(formattedCards));
    console.log(`Deck ${deckName} successfully exported to ${exportPath}`);
  } catch (err) {
    console.log(`Error exporting deck: ${err}.\nExiting.`);
  }

  process.exit();
}

// *********** general helper functions *************

async function getSelectedCards(cards, message, type) {
  var choices = cards.map(function cardsToChoices(card) {
    return `${card.prompt} --> ${card.target}`;
  });

  choices.push('<-- go back to decks', '** exit **');
  
  return await prompt([
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
}


export { 
  addCard, 
  deleteCards, 
  editCardDetails, 
  browseCards,
  exportCards
};