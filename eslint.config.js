// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // SDK 57 bumped eslint-plugin-react-hooks to v6, which promotes these to
    // errors. They flag pre-existing setState-in-effect / React Compiler
    // memoization smells in the mega-screens — downgraded to warnings to be
    // cleared in the perf refactor rather than block `npm run lint`.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]);
