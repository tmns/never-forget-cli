'use strict;'

import fs from 'fs';
import path from 'path';
import program from 'commander';
import { prompt } from 'inquirer';
import { promisify } from 'util';

import connect from './connect';

var readFile = promisify(fs.readFile);

const defaultDbUrl = 'mongodb://localhost:27017/neverForgetDB';

program
  .version('1.0.0', '-v, --version')
  .description('Never Forget CLI');

// program
  // .command('')

// async function connectDb () {
//   try {
//     const dbUrl = await readFile(path.join(__dirname, 'config', 'dbUrl'), { encoding: 'utf-8' });
//     await connect(dbUrl);
//     console.log(`connected to ${dbUrl}`);
//   } catch (err) {
//     if (err.code == 'ENOENT') {
//       prompt([
//         {
//           type: 'list',
//           name: 'setUpDb',
//           message: `We looked for the database config file 'dbUrl' in ${path.join(__dirname, 'config')} but couldn't locate it. What would you like to do?`,
//           choices: [
//             'Use the default (mongodb://localhost:27017/neverForgetDB)',
//             'Use my own'
//           ]
//         }
//       ])
//       .then(answer => {
//         console.log(JSON.stringify(answer, null, '  '));
//       })
//     }
//   }
// }

program
  .command('configure')
  .alias('c')
  .description('configure database')
  .action(configureDb);

async function configureDb () {
  var answer = await prompt([
    {
      type: 'list',
      name: 'dbOption',
      message: "You've chosen to manually configure the database URL. Would you like to use the default or your own?",
      choices: [
        `Use the default (${defaultDbUrl})`,
        'Use my own'
      ]
    }
  ]);

  if (answer.dbOption == 'Use my own') {
    let answer = await prompt([
      {
        type: 'input',
        name: 'dbUrl',
        message: 'What is the URL of the database you wish to use? (eg. mongodb://[username:password@]host[:port][/[database])',
        default: function () {
          return defaultDbUrl;
        },
        validate: function (value) {
          var pass = value.match(/^mongodb:\/\/.+/);
          if (pass) {
            return true;
          }
          return 'You need to provide a valid mongodb url.';
        }
      }
    ])

    connect(answer.dbUrl);
  } else {
    connect(defaultDbUrl);
  }
  
  console.log(answer);
  
}

program.parse(process.argv)
// connectDb();
// promptIt();