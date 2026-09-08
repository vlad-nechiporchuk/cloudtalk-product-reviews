import tseslint from 'typescript-eslint';

export default tseslint.config(
  // eslint.config.mjs itself is plain ESM config, not part of the
  // TypeScript program (it's not in tsconfig.typecheck.json's include) —
  // type-aware linting can't apply to it.
  { ignores: ['dist/**', 'node_modules/**', 'drizzle/**', 'eslint.config.mjs'] },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.typecheck.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
