'use strict;'

import { registerPrompt, prompt } from 'inquirer';
import fuzzy from 'fuzzy';

registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

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
      type: 'autocomplete',
      name: 'deck',
      message:
        "You've chosen to edit a deck. Which deck would you like to edit?",
      pageSize: 10,
      source: function(answersSoFar, input) {
        return fuzzySearch(answersSoFar, input, choices);
      }
    }
  ]);

  // parse out the deck name and description...
  let deckName = deckAnswer.deck;
  let deckDescription = '';
  if (deckName.includes(':')) {
    deckName = deckAnswer.deck.split(':')[0];
    deckDescription = deckAnswer.deck.split(':')[1];
  }

  // ...and return the deck ID to be used for the create query
  let deckId = decks.filter(deck => deck.name == deckName).map(deck => deck._id)[0];

  return [deckId, deckName, deckDescription];
}

// async version of forEAch
async function asyncForEach(array, callback) {
  for (let i = 0; i < array.length; i++) {
    await callback(array[i], i, array);
  }
}

function fuzzySearch(answersSoFar, input, choices) {
  input = input || '';

  return new Promise(function(resolve) {
    var fuzzyResult = fuzzy.filter(input, choices);

    var data = fuzzyResult.map(function(element) {
      return element.original;
    });

    resolve(data);
  })
}

export { 
  isCreatingAnother, 
  decksToChoices, 
  retrieveDeckId, 
  asyncForEach,
  fuzzySearch
};