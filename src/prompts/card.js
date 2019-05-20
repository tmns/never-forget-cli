'use strict;';

import { registerPrompt, prompt } from 'inquirer';
import fuzzy from 'fuzzy';

registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

import cardCtrlrs from '../resources/card/card.controller';
import { 
  isCreatingAnother,
  retrieveDeckId, 
  asyncForEach 
} from './shared';

// Walks a user through adding a card to a deck
// 1) Present user with list of decks to choose from
// 2) After deck choice, present user with card creation prompts
// 3) Create card in database
// 4) Ask if user wants to create another card immediately
async function addCard(_, deckId) {
  // if this is the first card being added for a particular session
  // of card adding, we must retrieve the deckID manually
  if (!deckId) {
    // retrieve deck ID
    var deckId = await retrieveDeckId();
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
      console.log('Adding another card...');
      await addCard(_, deckId);
    }

  process.exit();
}

// Walks the user through deleting one or more cards
// 1) Present user with list of decks to choose from
// 2) After deck is chosen, present user with list of (filterable) cards
// 3) Remove chosen card(s)
async function deleteCards() {
  // retrieve deck ID
  var deckId = await retrieveDeckId();

  var cards = await cardCtrlrs.getMany({ deck: deckId });
  
  var choices = cards.map(function cardsToChoices(card) {
    return `${card.prompt} --> ${card.target}`;
  })

  var selectedCards = await prompt([
    {
      type: 'checkbox-plus',
      name: 'cards',
      message: 'Choose the card(s) you wish to delete (you can filter cards by typing)',
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

export { addCard, deleteCards };