'use strict';

import mongoose from 'mongoose';

import {
  getOne,
  getMany,
  getManySortLimit,
  createOne,
  updateOne,
  updateMany,
  removeOne,
  removeMany
} from '../crud';

import { Deck } from '../../resources/deck/deck.model';
import { Card } from '../../resources/card/card.model';

// describe('crud controllers', () => {
//   describe('getOne', async () => {

//     test('', async () => {

//       }
//     })
//   })
// } ) 