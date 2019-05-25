# Never Forget CLI

A CLI version of *Never Forget*, a spaced repetition learning app. 

It makes heavy use of [Inquirer](https://github.com/SBoudrias/Inquirer.js) and [Commander](https://github.com/tj/commander.js) to interact with the user and make the experience pleasant.

For the Spaced Repetition functionality I worked off of and adapted / modified the [memory-scheduler](https://github.com/lo-tp/memory-scheduler) algorithm. At the moment, the adapted version uses hour-based intervals rather than day-based. You can change this by playing with the values in `src/prompts/study.js`.

## Features
So far, all of the main functionality has been implemented. You can:
* Create a deck
* Create a card
* Browse decks
* Browse cards
* Edit a deck
* Edit a card
* Delete a deck
* Delete a card
* Import cards
* Export cards
* Study cards

Todo:
* Test and observe behavior over an extended period of time to fine tune intervals (personal goal)

## Build 
To build, `cd` to project root and run:
```
$ yarn install && yarn build
```
This should install dependencies and then output a transpiled version of index.js to `src/dist`. From there you can run the app directly (`node index.js [command]`) or you can  use `yarn start [command]` as shown in the next section.

## Usage

First, you can run the app with the help option for details on how to use its api:
```
$ yarn start -h
Usage: index [options] [command]

Never Forget CLI

Options:
  -v, --version  output the version number
  -h, --help     output usage information

Commands:
  configure|c    configure a new database
  createdeck|cd  create a new deck
  deldecks|dd    delete one or more decks
  editdeck|ed    edit deck details (name / description)
  addcard|a      add a card
  delcards|dc    delete one or more cards
  editcard|ec    edit card details (prompt, target, etc.)
  browse|b       browse cards
  import|i       import one or more cards into a deck
  export|ex      export a deck of cards
  study|s        study cards scheduled for review
```
If you want to go beyond this however, you will need access to a Mongo database, as that's what the app uses for data storage. You can either opt for a local database or something like Atlas. 

Once you have the database connection string, you can either run `yarn start c` to have the app configure the database itself or save the string to `./config/dbUrl`. After that, you should be ready to roll!

## License
This library may be used under the WTFPL - or, if you take issue with that, consider it to be under the CC0.

## Contributing
Feedback and contributions are welcome. Feel free to create issues, fork, submit pull requests, etc. 

To run tests, simply execute the following in the project root:
```
$ yarn test
```