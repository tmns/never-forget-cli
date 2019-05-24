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
  exportCards,
  importCards
} from './prompts/card';

import { studyCards } from './prompts/study';

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
  .command('import')
  .alias('i')
  .description('import one or more cards into a deck')
  .action(importCards);

program
  .command('export')
  .alias('ex')
  .description('export a deck of cards')
  .action(exportCards);

program
  .command('study')
  .alias('s')
  .description('study cards scheduled for review')
  .action(studyCards);

start();

// **********************

async function start () {
  // if no command or option was passed, present user with welcome message and help text
  if (process.argv.length < 3) {
    console.log('\nWelcome to the Never Forget CLI!\nFor help with how to use this program, see below:\n')
    program.parse([process.argv[0], process.argv[1], '-h']);
    process.exit();
  }

  // if neither help nor database config was chosen, attempt to connect database
  if (!process.argv[2].match(/^(c|configure|-h|--help)$/)) {
    try {
      await connectAppToDB();
    } catch (err) {
      console.log(err);
      process.exit();
    }
  }

  // parse arguments into commander
  program.parse(process.argv);

  // if an invalid command was given, let the user know
  var validCommands = program.commands.map(cmd => cmd._name);
  var invalidCommands = program.args.filter(arg => !validCommands.includes(arg._name));

  if (invalidCommands.length > 0) {
    console.log(`\nInvalid command(s): ${invalidCommands.join(', ')}. See --help for a list of available commands.\n`);
    process.exit();
  }
}
