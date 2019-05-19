#!/usr/bin/env node

'use strict;'

import fs from 'fs';
import path from 'path';
import program from 'commander';
import { prompt } from 'inquirer';
import { promisify } from 'util';

import connect from './connect';

var readFile = promisify(fs.readFile);
var writeFile = promisify(fs.writeFile);
var mkdir = promisify(fs.mkdir);

const defaultDbUrl = 'mongodb://localhost:27017/neverForgetDB';

program
  .version('1.0.0', '-v, --version')
  .description('Never Forget CLI');

program
  .command('configure')
  .alias('c')
  .description('configure database')
  .action(configureDb);

program
  .command('createdeck')
  .alias('cd')
  .description('create a new deck')
  .action(createDeck);

  
// **********************

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
    await connect(url);
    let answer = await prompt([
      {
        type: 'confirm',
        name: 'saveToFile',
        message: `Test connection to ${url} successful. Would you like to save the database URL to ${path.join(__dirname, 'config', 'dbUrl')}?`,
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
        await writeFile(path.join(__dirname, 'config', 'dbUrl'), url, 'utf-8');
        console.log(`Successfully saved ${url} to ${path.join(__dirname, 'config', 'dbUrl')}. Your database has been configured!`);
      } catch (err) {
        console.error(`The following error occurred when attempting to save the URL: ${err}.\nDatabase has not been configured.`);
        return;
      }
    } else {
      console.log('You chose to not safe the database URL. Configuration not successful.');
      return;
    }

  } catch (err) {
    console.error(`Could not connect to ${url}. Please check it is valid and try again. Exiting.`);
    return;
  }
}

// walks the user through creating a deck of flash cards
// 1) ask user for deck name
// 2) ask user if they wish to import cards into deck
// 3) if yes, move onto import cards logic
// 4) if no, ask user if they wish to add cards now
// 5) if yes, move onto add cards logic
async function createDeck () {
  if (!(await isDbConfigured())) {
    console.log('Database not configured. Exiting.');
    return;
  }

  else {
    console.log('lets create a deck!')
  }
}

async function isDbConfigured () {
  try {
    await readFile(path.join(__dirname, 'config', 'dbUrl'), { encoding: 'utf-8' });
    return true;
  } catch (err) {
    if (err.code == 'ENOENT') {
      return false;
    }
  }
}

program.parse(process.argv)