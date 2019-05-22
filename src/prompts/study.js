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
  var [deckId] = await getDeckProperties(decks, selectedDeck);

  // get cards scheduled for review
  let tomorrow = Math.floor(new Date().getTime() / DAY_IN_MILIS) + 1;
  var overDueCards = await cardCtrls.getMany({ deck: deckId, nextReview: { $lt: tomorrow }});

  var numCards = Object.keys(overDueCards).length;
  // if there are no overdue cards, prompt user if they want to choose a different deck to study
  if (numCards == 0) {
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
      message: `Great choice! You have ${numCards} cards to review in this deck. How many cards do you want to study?`,
      default: numCards < 15 ? numCards : 15;
    }
  ]);

  // sort cards by date in ascending order (ie, oldest card first)
  // and set the amount presented to user's limit
  let cardsToStudy = overDueCards.sort((a, b) => a.dateAdded - b.dateAdded).slice(0, answer.limit)

  // quiz user with cards and retrieve the score given to each card by the user
  await quizUserAndGetScores(cardsToStudy);

  process.exit();
}

// helper function to perform database update query for card progreess
async function attemptUpdateProgress(card, cardScore) {
  // calculate the new progress values
  let today = Math.floor(new Date().getTime() / DAY_IN_MILIS);
  let { nextReview, timesCorrect } = getNewProgressValues(cardScore, card.timesCorrect, today);

  // attempt database update query
  try {
    await cardCtrls.updateOne(card._id, { nextReview, timesCorrect });
    console.log(`Card progress updated. This card is scheduled for another review in ${nextReview - today} day(s).`)
  } catch (err) {
    throw new Error(`Error encountered while updating card progress: ${err}.\nExiting...`);
  }
}

// Helper function to calculate the new progress values of card
// ie, updated review date and number of consecutive times correct
// adapted from: https://github.com/lo-tp/memory-scheduler
function getNewProgressValues(score, timesCorrect, now) {
  // our setup intervals and scores to change intervals
  var intervals = [1, 2, 3, 8, 17];
  var scoreToIntervalChange = [-3, -1, 1];

  // determine if user knew the card immediately
  // ie gave a score equal to the length of score intervals array
  var knewImmediately = false;
  if (score == scoreToIntervalChange.length - 1) {
    knewImmediately = true;
  }

  // determine next review date
  var nextReview = now + 1;
  if (knewImmediately && timesCorrect < intervals.length) {
    nextReview = now + intervals[timesCorrect];
  }

  // determine new timesCorrect, if less than 0, normalize to 0
  var timesCorrect = timesCorrect + scoreToIntervalChange[score];
  if (timesCorrect < 0) {
    timesCorrect = 0;
  }
  
  return {
    nextReview,
    timesCorrect
  }
}

// Helper function to quiz user on cards and determine user's confidence
// with each card (ie the card's score)
async function quizUserAndGetScores(overDueCards) {
  // define our card metrics
  // ie, how a user rates their confidence for each card
  var cardMetrics = [
    "I couldn't recall it at all.",
    "I recalled it after thinking a bit.",
    "I recalled it immediately!"
  ]

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
          cardMetrics[0],
          cardMetrics[1],
          cardMetrics[2]
        ]
      }
    ]);

    // attempt to update card progress in database
    try {
      await attemptUpdateProgress(card, cardMetrics.indexOf(answer.score));
    } catch(err) {
      console.log(err);
    }
  })
}

export { DAY_IN_MILIS, studyCards };