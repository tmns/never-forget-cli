import controllers from '../card.controllers';
import { isFunction } from 'lodash';

describe('card controllers', () => {
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
