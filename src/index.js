#!/usr/bin/env node

'use strict';

import program from 'commander';

import configureDb from './prompts/db';

import { 
  createDeck, 
  deleteDecks, 
  editDeckDetails
} from './prompts/deck';

import { 
  addCard, 
  deleteCards,
  editCardDetails,
  browseCards,
  exportCards
} from './prompts/card';

import { connectAppToDB } from './utils/db';

program
  .version('1.0.0', '-v, --version')
  .description('Never Forget CLI');

program
  .command('configure')
  .alias('c')
  .description('configure a new database')
  .action(configureDb);

program
  .command('createdeck')
  .alias('cd')
  .description('create a new deck')
  .action(createDeck);

program
  .command('addcard')
  .alias('a')
  .description('add a card')
  .action(addCard);

program
  .command('delcards')
  .alias('dc')
  .description('delete one or more cards')
  .action(deleteCards);

program
  .command('deldecks')
  .alias('dd')
  .description('delete one or more decks')
  .action(deleteDecks);

program
  .command('editdeck')
  .alias('ed')
  .description('edit deck details (name / description)')
  .action(editDeckDetails);

program
  .command('editcard')
  .alias('ec')
  .description('edit card details (prompt, target, etc.)')
  .action(editCardDetails);

program
  .command('browse')
  .alias('b')
  .description('browse cards')
  .action(browseCards);

program
  .command('export')
  .alias('ex')
  .description('export a deck of cards')
  .action(exportCards);

start();

// **********************

async function start () {
  if (!process.argv[2].match(/^(c|configure|-h|--help)$/)) {
    try {
      await connectAppToDB();
    } catch(err) {
      console.log(err);
      process.exit();
    }
  }
  program.parse(process.argv);
}
