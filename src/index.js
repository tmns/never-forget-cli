#!/usr/bin/env node

'use strict;'

import program from 'commander';

import { 
  configureDb,
  createDeck
} from './utils/prompts';

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

start();

// **********************

async function start () {
  if (process.argv[2] != 'configure' && process.argv[2] != 'c') {
    try {
      await connectAppToDB();
    } catch(err) {
      console.log(err);
      process.exit();
    }
  }
  program.parse(process.argv);
}
