'use strict'

import { registerPrompt, prompt } from 'inquirer';
import fuzzy from 'fuzzy';

import { EXIT } from '../utils/strings'

registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

// prompts the user if they wish to create another item immediately
async function isCreatingAnother(item) {
  let message = `Would you like to create another ${item}?`;
  let defaultVal = false;
  let answer = await promptConfirm(message, defaultVal);

  return answer;
}

// presents the user with a 'confirm' prompt given a message and default answer
async function promptConfirm(message, defaultVal) {
  let answer = await prompt([
    {
      type: 'confirm',
      name: 'value',
      message: message,
      default: defaultVal  
    }
  ])
  return answer.value;
}

// formats a deck name and description for presenting the info
// as a choice in a list to the user.
function deckToChoice(deck) {
  var choice = deck.name;
  if (deck.description != '') {
    choice += `: ${deck.description}`;
  }
  return choice;
}

// Helper function to return a deck's ID, name, and description property
function getDeckProps(decks, selectedDeck) {
  // parse out the deck name and description...
  let deckName = selectedDeck;
  let deckDescription = '';
  if (deckName.includes(':')) {
    deckName = selectedDeck.split(':')[0];
    deckDescription = selectedDeck.split(':')[1].trim();
  }

  // ...and return the deck ID to be used for the create query
  let deckId = decks.filter(deck => deck.name == deckName).map(deck => deck._id)[0];

  return [deckId, deckName, deckDescription];
}

// Helper function to prompt user with deck choices and return selection
async function getSelectedDecks(decks, message, type) {

  var choices = decks.map(deckToChoice);

  choices.push(EXIT);

  var selectedDecks = await prompt([
    {
      type: type,
      name: 'decks',
      message: message,
      pageSize: 10,
      highlight: true,
      searchable: true,
      source: function(answersSoFar, input) {
        return fuzzySearch(answersSoFar, input, choices);
      }
    }
  ]);

  return selectedDecks.decks;
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
  promptConfirm,
  getDeckProps,
  getSelectedDecks, 
  asyncForEach,
  fuzzySearch
};