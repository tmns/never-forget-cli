module.exports = {
  parserOptions: {
    sourceType: 'module'
  },
  parser: 'babel-eslint',
  env: {
    node: true
  },
  extends: [
    'standard',
    'plugin:jest/recommended'
  ],
  plugins: ['jest'],
  rules: {
    'promise/catch-or-return': 'error',
    'no-unexpected-multiline': 0,
    'jest/valid-describe': 0,
    'semi': 0,
    'space-before-function-paren': 0,
    'quotes': 0,
    'no-trailing-spaces': 0,
    'padded-blocks': 0,
    'one-var': 0,
    'eqeqeq': 0,
    'eol-last': 0,
    'brace-style': 0
  }
}