'use strict';

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { prompt } from 'inquirer';

import { CANCEL } from '../utils/strings';
import { defaultDbUrl, dbUrlPath, attemptConnection } from '../utils/db';

var writeFile = promisify(fs.writeFile);
var mkdir = promisify(fs.mkdir);

// Walks user through configuring the database
// 1) Prompt user for the database they want to use,
// 2) Save it to a local config file
async function configureDb() {
  var answer = await prompt([
    {
      type: 'list',
      name: 'dbOption',
      message:
        "You've chosen to manually configure the database URL. Would you like to use the default or your own?",
      choices: [
        `Use the default URL (${defaultDbUrl})`, 
        'Use a different URL',
        CANCEL
      ]
    }
  ]);

  if (answer.dbOption == CANCEL) {
    process.exit();
  }

  // the user wants to use a databse string different from the default
  if (answer.dbOption == 'Use a different URL') {
    let answer = await prompt([
      {
        type: 'input',
        name: 'dbUrl',
        message:
          'What is the URL of the database you wish to use? (eg. mongodb://[username:password@]host[:port][/[database])',
        // if the user enters nothing, fall back to using default
        default: function() {
          return defaultDbUrl;
        },
        // simple validation on the URL
        validate: function(value) {
          var pass = value.match(
            /^mongodb(\+srv)?:\/\/(.+:.+@)?.+(:\d{1,5})?\/.+/
          );
          if (pass) {
            return true;
          }
          return 'You need to provide a valid mongodb url.';
        }
      }
    ]);

    return testAndSaveConnection(answer.dbUrl);
  } else {
    return testAndSaveConnection(defaultDbUrl);
  }
}

// Helper function for testing and saving the database URL
// Walks the user through saving the url to a local config file
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
    ]);

    if (answer.saveToFile) {
      try {
        await mkdir(path.join(dbUrlPath, '../'));
      } catch (err) {
        // directory already exists, do nothing
      }

      try {
        await writeFile(dbUrlPath, url, 'utf-8');
        console.log(
          `Successfully saved ${url} to ${dbUrlPath}.\nYour database has been configured!`
        );
      } catch (err) {
        console.error(
          `The following error occurred when attempting to save the URL: ${err}.\nDatabase has not been configured.`
        );
      }
    } else {
      console.log(
        'You chose to not safe the database URL. Configuration not successful.'
      );
    }
  } catch (err) {
    console.error(
      `Could not connect to ${url}. Please check it is valid and try again. Exiting.`
    );
  }
  process.exit();
}

export default configureDb;