'use strict';

import { prompt } from 'inquirer';

import deckCtrlrs from '../resources/deck/deck.controller';
import cardCtrls from '../resources/card/card.controller';

import { STUDY_CARDS_WHICH_DECK } from '../utils/promptMessages';
import { SINGLE_CHOICE } from '../utils/promptTypes';

import { 
  getSelectedDecks,
  getDeckProperties,
  asyncForEach
} from './shared';

const DAY_IN_MILIS = 24 * 60 * 60 * 1000;

var cardMetrics = new Map();
cardMetrics.set("I couldn't recall it at all", -3);
cardMetrics.set("I recalled it after thinking a bit", -1);
cardMetrics.set("I recalled it instantly", 1);

async function studyCards () {
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});
  // prompt user with deck choices and get answer
  let deckMessage = STUDY_CARDS_WHICH_DECK;
  let deckType = SINGLE_CHOICE;
  let selectedDeck = await getSelectedDecks(decks, deckMessage, deckType);

  // check if user wants to exit
  if (selectedDeck.decks == '** exit **') {
    console.log('Exiting...');
    process.exit();
  }
  
  // get deck properties for future use
  var [deckId, deckName] = await getDeckProperties(decks, selectedDeck);

  let tomorrow = Math.round(new Date().getTime() / DAY_IN_MILIS) + 1;
  var overDueCards = await cardCtrls.getMany({ deck: deckId, nextReview: { $lt: tomorrow }});  

  // if there are no overdue cards, prompt user if they want to choose a different deck to study
  if (Object.keys(overDueCards).length == 0) {
    let answer = await prompt([
      {
        type: 'confirm',
        name: 'chooseOther',
        message: "There are no cards in this deck scheduled for review. Would you like to study a different deck?",
        default: true
      }
    ]);

    if (answer.chooseOther) {
      await studyCards();
    } else {
      console.log('Exiting...');
      process.exit();
    }
  }

  // determine how many cards the user wants to study
  var answer = await prompt([
    {
      type: 'input',
      name: 'limit',
      message: `Great choice! You have ${Object.keys(overDueCards).length} cards to review in this deck. How many cards do you want to study?`,
      default: 5
    }
  ]);

  // sort cards by date in ascending order (ie, oldest card first)
  // and set the amount presented to user's limit
  var cardsToStudy = overDueCards.sort((a, b) => a.dateAdded - b.dateAdded).slice(0, answer.limit)

  // quiz user with cards and retrieve the score given to each card by the user
  var cardScores = {};
  await quizUserAndGetScores(cardsToStudy, cardScores);

  // TODO: IMPLEMENT SR LEARNING
  console.log(cardScores);

  process.exit();
}

// Helper function to quiz user on cards and determine user's confidence
// with each card (ie the card's score)
async function quizUserAndGetScores(overDueCards, cardScores) {
  // loop through all cards
  await asyncForEach(overDueCards, async function quizUser(card) {  
    // show the card front
    console.log(
      `Card front...
      Prompt: ${card.prompt}
      Example: ${card['promptExample'] ? card.promptExample : ''}`
    );

    await prompt([
      {
        type: 'input',
        name: 'flipCard',
        message: "Press the <enter> key when you're ready to flip the card."
      }
    ])

    // show the card back
    console.log(
      `Card back...
      Target: ${card.target}
      Example: ${card['targetExample'] ? card.targetExample : ''}`
    )

    // detmine user's confidence with the card
    let answer = await prompt([
      {
        type: 'list',
        name: 'score',
        message: 'How quickly did you recall this card?',
        choices: [
          "I couldn't recall it at all",
          "I recalled it after thinking a bit",
          "I recalled it instantly"
        ]
      }
    ]);

    // set the card's score (to be used for spaced repitition calculation)
    cardScores[`${card._id}`] = cardMetrics.get(answer.score);
  })
}

export { DAY_IN_MILIS, studyCards };