'use strict;'

import { prompt } from 'inquirer';

import deckCtrlrs from '../resources/deck/deck.controller';

// prompts the user if they wish to create another item immediately
async function isCreatingAnother(item) {
  let answer = await prompt([
    {
      type: 'confirm',
      name: 'addAnother',
      message: `Would you like to create another ${item}?`,
      default: true
    }
  ])

  return answer.addAnother;
}

// formats a deck name and description for presenting the info
// as a choice in a list to the user.
function decksToChoices(deck) {
  let choice = deck.name;
  if (deck.description) {
    choice += `: ${deck.description}`;
  }
  return choice;
}

// Helper function to prompt the user for the deck they wish to edit
// And then retrieve the deck ID from their response
async function retrieveDeckId() {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});

  // turn our mongodb object of decks into an array of choices for inquirer
  var choices = decks.map(decksToChoices);

  // have the user choose which deck to add the card to
  var deckAnswer = await prompt([
    {
      type: 'list',
      name: 'deck',
      message:
        "You've chosen to edit a deck. Which deck would you like to edit?",
      choices: choices
    }
  ]);

  // parse out the deck name...
  let deckName = deckAnswer.deck;
  if (deckName.includes(':')) {
    deckName = deckName.split(':')[0];
  }

  // ...and return the deck ID to be used for the create query
  return decks.filter(deck => deck.name == deckName).map(deck => deck._id)[0];
}

// async version of forEAch
async function asyncForEach(array, callback) {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i, array);
  }
}

export { 
  isCreatingAnother, 
  decksToChoices, 
  retrieveDeckId, 
  asyncForEach 
};