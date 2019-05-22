# Never Forget CLI

A CLI version of *Never Forget*, a spaced repetition learning app. 

It makes heavy use of [Inquirer](https://github.com/SBoudrias/Inquirer.js) and [Commander](https://github.com/tj/commander.js) to interact with the user and make the experience pleasant.

So far, the following functionality has been implemented:
* Create deck
* Create card
* Browse decks
* Browse cards
* Edit deck
* Edit card
* Delete deck
* Delete card
* Import cards
* Export cards
* Study cards (basic)

The following functionality remains:
* Study cards (spaced repitition)

To install, `cd` to project root and run:
```
$ npm install
```

You can then run the the CLI with the help option for details on how to use the api:
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
If you want to go beyond this however, you will need to set up a Mongo database, as that's what the app uses for data storage. You can either opt for a local database or something like Atlas. 

Once you have the database connection string, you can either run `yarn start c` to have the app configure the database itself or save the string to `src/dist/config/dbUrl`. After that, you should be ready to rock!

That's it for now. Feedback and contributions are welcome!