import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react-x';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig([
  { ignores: ['build/**', 'dist/**', 'coverage/**'] },
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      // Existing boundary types can be tightened separately from tooling modernization.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-x': react, 'react-hooks': hooks },
    rules: {
      'react-x/no-missing-key': 'error',
      'react-x/no-duplicate-key': 'error',
      'react-x/no-direct-mutation-state': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  { files: ['*.{js,ts}'], languageOptions: { globals: globals.node } },
]);
