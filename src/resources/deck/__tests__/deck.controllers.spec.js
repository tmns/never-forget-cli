import controllers from '../deck.controllers';
import { isFunction } from 'lodash';

describe('deck controllers', () => {
  test('has crud controllers', () => {
    var crudMethods = [
      'removeMany',
      'removeOne',
      'updateOne',
      'getMany',
      'getOne',
      'createOne'
    ];

    crudMethods.forEach(name =>
      expect(isFunction(controllers[name])).toBe(true)
    );
  });
});