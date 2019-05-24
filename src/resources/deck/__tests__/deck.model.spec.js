import { Deck } from '../deck.model';

describe('Deck model', () => {
  describe('schema', () => {
    test('name', () => {
      let name = Deck.schema.obj.name;
      expect(name).toEqual({
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 50
      });
    });

    test('description', () => {
      let description = Deck.schema.obj.description;
      expect(description).toEqual({
        type: String,
        maxlength: 100
      });
    });
  });
});
