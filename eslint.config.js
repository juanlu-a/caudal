const expo = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = [
  ...expo,
  {
    // Los nativos se regeneran con prebuild y el resto es salida de builds:
    // nada de eso es código que se escriba a mano.
    ignores: ['ios/**', 'android/**', 'build/**', '.expo/**', '.test-build/**'],
  },
  {
    // Los scripts corren en Node, no en el teléfono: sin esto `Buffer` y
    // `process` quedan como identificadores no definidos.
    files: ['scripts/**', '*.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Los tests también corren en Node, con el runner que trae de fábrica.
    files: ['**/__tests__/**'],
    languageOptions: { globals: globals.node },
  },
];
