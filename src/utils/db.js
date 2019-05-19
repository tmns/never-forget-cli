'use strict;'

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import mongoose from 'mongoose';

var readFile = promisify(fs.readFile);

const defaultDbUrl = 'mongodb://localhost:27017/neverForgetDB';
const dbUrlPath = path.join(__dirname, '../config', 'dbUrl');

async function connectAppToDB() {
  // if db isn't configured, return immediately
  if (!(await isDbConfigured())) {
    throw new Error('Database not configured. Exiting.');
  }

  try {
    var dbUrl = await readFile(dbUrlPath, {
      encoding: 'utf-8'
    });
  } catch (err) {
    throw new Error(`Error reading database config file: ${err}\nExiting.`);
  }

  try {
    await attemptConnection(dbUrl);
    console.log('Successfully connected to database.');
  } catch (err) {
    throw new Error(`Error connecting to database: ${err}\nExiting.`);
  }
}

async function isDbConfigured() {
  try {
    await readFile(dbUrlPath, {
      encoding: 'utf-8'
    });
    return true;
  } catch (err) {
    console.log(err)

    if (err.code == 'ENOENT') {
      return false;
    }
  }
}

async function attemptConnection(url) {
  try {
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useCreateIndex: true
    });
  } catch (err) {
    throw new Error('Could not connect to database');
  }
}

export { defaultDbUrl, dbUrlPath, attemptConnection, connectAppToDB };
