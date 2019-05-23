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

const HOUR_IN_MILIS = 60 * 60 * 1000;

// Walk the user through a card study session
// 1) Present user with list of decks to choose from
// 2) Retrieve associated cards scheduled for review
// 3) Present user with each card's front & back
// 4) Determine how well the user knows the particular card
// 5) Calculate new card progress details
// 6) Update card progress data in db
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
  let now = Math.floor(new Date().getTime() / HOUR_IN_MILIS);
  var overDueCards = await cardCtrls.getMany({ deck: deckId, nextReview: { $lte: now }});

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
      default: numCards < 15 ? numCards : 15
    }
  ]);

  // sort cards by date in ascending order (ie, oldest card first)
  // and set the amount presented to user's limit
  let cardsToStudy = overDueCards.sort((a, b) => a.timeAdded - b.timeAdded).slice(0, answer.limit)

  // quiz user with cards and retrieve the score given to each card by the user
  try {
    await quizUserAndGetScores(cardsToStudy);
    console.log(`\nGreat job! You studied ${numCards} card(s)!\nDon't forget to check back soon to keep studying cards scheduled for review!\n`)
  } catch(err) {
    console.log(err);
  }
  

  process.exit();
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
      `\nCard front...
      Prompt: ${card.prompt}
      Example: ${card.promptExample}\n`
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
      `\nCard back...
      Target: ${card.target}
      Example: ${card.targetExample}\n`
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
      throw new Error(err);
    }
  })
}

// helper function to perform database update query for card progreess
async function attemptUpdateProgress(card, cardScore) {
  // calculate the new progress values
  let now = Math.floor(new Date().getTime() / HOUR_IN_MILIS);
  let { nextReview, timesCorrect } = getNewProgressValues(cardScore, card.timesCorrect, now);

  // construct next time for review string
  let nextTime = nextReview - now;
  let nextTimeString = `${nextTime} hours`;
  if (nextTime > 24) {
    nextTimeString = `${Math.floor(nextTime / 24)} day(s)`;
  }

  // attempt database update query
  try {
    await cardCtrls.updateOne(card._id, { nextReview, timesCorrect });
    console.log(`Card progress updated. This card is scheduled for another review in ${nextTimeString}.`)
  } catch (err) {
    throw new Error(`Error encountered while updating card progress: ${err}.\nExiting...`);
  }
}

// Helper function to calculate the new progress values of card
// ie, updated review date and number of consecutive times correct
// adapted from: https://github.com/lo-tp/memory-scheduler
function getNewProgressValues(score, timesCorrect, now) {
  // our setup intervals and scores to change intervals
  var intervals = [2, 4, 6, 16, 34];
  var scoreToIntervalChange = [-3, -1, 1];

  // determine if user knew the card immediately
  // ie gave a score equal to the length of score intervals array
  var knewImmediately = false;
  if (score == scoreToIntervalChange.length - 1) {
    knewImmediately = true;
  }

  // determine next review date
  var nextReview = now + 2;
  if (knewImmediately) {
    if (timesCorrect < intervals.length) {
      nextReview = now + intervals[timesCorrect];
    }
    else if (timesCorrect >= intervals.length) {
      nextReview = now + (intervals.slice(-1) * ((timesCorrect + 1) - intervals.length));
    }
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

export { HOUR_IN_MILIS, studyCards };