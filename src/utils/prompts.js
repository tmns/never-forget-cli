'use strict;'

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { prompt } from 'inquirer';

import {
  defaultDbUrl,
  dbUrlPath,
  attemptConnection
} from './db';

import deckCtrlrs from '../resources/deck/deck.controller';
import cardCtrlrs from '../resources/card/card.controller';

var readFile = promisify(fs.readFile);
var writeFile = promisify(fs.writeFile);
var mkdir = promisify(fs.mkdir);


/******************************
 * DATABASE PROMPTS
 ******************************/

// Walks user through configuring the database 
// 1) prompt user for the database they want to use, 
// 2) save it to a local config file
async function configureDb () {
  var answer = await prompt([
    {
      type: 'list',
      name: 'dbOption',
      message: "You've chosen to manually configure the database URL. Would you like to use the default or your own?",
      choices: [
        `Use the default URL (${defaultDbUrl})`,
        'Use a different URL'
      ]
    }
  ]);

  // the user wants to use a databse string different from the default
  if (answer.dbOption == 'Use a different URL') {
    let answer = await prompt([
      {
        type: 'input',
        name: 'dbUrl',
        message: 'What is the URL of the database you wish to use? (eg. mongodb://[username:password@]host[:port][/[database])',
        // if the user enters nothing, fall back to using default
        default: function () {
          return defaultDbUrl;
        },
        // simple validation on the URL
        validate: function (value) {
          var pass = value.match(/^mongodb(\+srv)?:\/\/(.+:.+@)?.+(:\d{1,5})?\/.+/);
          if (pass) {
            return true;
          }
          return 'You need to provide a valid mongodb url.';
        }
      }
    ])      
    
    return testAndSaveConnection(answer.dbUrl);
  } else {
    return testAndSaveConnection(defaultDbUrl);
  }
}

// helper function for testing and saving the database URL
// walks the user through saving the url to a local config file
async function testAndSaveConnection(url) {

  try {
    await attemptConnection(url);
    let answer = await prompt([
      {
        type: 'confirm',
        name: 'saveToFile',
        message: `Test connection to ${url} successful. Would you like to save the database URL to ${dbUrlPath}?`,
        default: true
      }
    ])
  
    if (answer.saveToFile) {
      try {
        await mkdir(path.join(__dirname, 'config'));
      } catch (err) {
        // directory already exists, do nothing
      }

      try {
        await writeFile(dbUrlPath, url, 'utf-8');
        console.log(`Successfully saved ${url} to ${dbUrlPath}.\nYour database has been configured!`);
      } catch (err) {
        console.error(`The following error occurred when attempting to save the URL: ${err}.\nDatabase has not been configured.`);
      }
    } else {
      console.log('You chose to not safe the database URL. Configuration not successful.');
    }

  } catch (err) {
    console.error(`Could not connect to ${url}. Please check it is valid and try again. Exiting.`);
  }
  process.exit();
}

/******************************
 * DECK PROMPTS
 ******************************/

// walks the user through creating a deck of flash cards
// ask user for deck name and description
async function createDeck () {

  var answers = await prompt([
    {
      type: 'input',
      name: 'deckName',
      message: "You've chosen to create a deck. What do you want to name it?",
      validate: function (value) {
        var pass = value.trim().match(/^(?!.*:.*)^.+/); // due to how we parse decks during card adding, we can't allow ':'
        if (pass) {
          return true;
        }
        return 'Sorry, you must give the deck a name (and the ":" character is not allowed).';
      }
    },
    {
      type: 'input',
      name: 'deckDescription',
      message: 'Provide a description for your new deck (optional)' 
    }
  ]);

  let details = { name: answers.deckName };
  if (answers.deckDescription != '') {
    details['description'] = answers.deckDescription;
  }

  try {
    await deckCtrlrs.createOne(details);
    console.log(`Deck ${details.name} successfully created. Now you can (i)mport or (a)dd some cards to it!`);  
  } catch (err) {
    console.log(`Error encountered while creating deck: ${err}.\nExiting.`);
  }

  process.exit();
}

/******************************
 * CARD PROMPTS
 ******************************/

// walks a user through adding a card to a deck
async function addCard () {
  
  // retrieve all decks from database
  var decks = await deckCtrlrs.getMany({});

  // turn our mongodb object of decks into an array of choices for inquirer
  var choices = decks.map(function mapper(deck) {
    let choice = deck.name;
    if (deck.description) {
      choice += `: ${deck.description}`;
    }
    return choice;
  });    

  // have the user choose which deck to add the card to
  var deckAnswer = await prompt([
    {
      type: 'list',
      name: 'deck',
      message: "You've chosen to add a card to a deck. Which deck would you like to add a card to?",
      choices: choices
    }
  ]);

  // parse out the deck name...
  let deckName = deckAnswer.deck;
  if (deckName.includes(':')) {
    deckName = deckName.split(':')[0];
  }
  // ...and retrieve the deck ID to be used for the create query
  var deckId = decks.filter(deck => deck.name == deckName).map(deck => deck._id)[0];

  console.log('Now you get to create your card! Fill in the following details.');

  // now lets get the details for the new card
  var cardAnswers = await prompt([
    {
      type: 'input',
      name: 'prompt',
      message: 'Prompt (you can think of this as the front of the card)',
      validate: function (value) {
        var pass = value.trim().match(/^.+/);
        if (pass) {
          return true;
        }
        return 'Sorry, you must enter a prompt for the card.'
      }
    },
    {
      type: 'input',
      name: 'promptExample',
      message: "A second detail for the prompt (eg an example sentence using the prompt's value, optional)"
    },
    {
      type: 'input',
      name: 'target',
      message: 'Target (you can think of this as the back of the card)',
      validate: function (value) {
        var pass = value.trim().match(/^.+/);
        if (pass) {
          return true;
        }
        return 'Sorry, you must enter a target for the card.'
      }
    },
    {
      type: 'input',
      name: 'targetExample',
      message: "A second detail for the target (optional)"
    }
  ]);

  // create the card details object we'll use for the query
  let cardDetails = {
    deck: deckId,
    prompt: cardAnswers.prompt,
    target: cardAnswers.target
  }
  
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
  }

  process.exit();
}

export { configureDb, createDeck, addCard };
