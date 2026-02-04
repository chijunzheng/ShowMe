module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist/', 'coverage/'],
  rules: {
    // Modern React (Vite + JSX transform) doesn't require React in scope.
    'react/react-in-jsx-scope': 'off',
    // Project does not consistently use PropTypes; keep lint signal focused.
    'react/prop-types': 'off',
    // UX copy includes natural punctuation; escaping makes JSX harder to read.
    'react/no-unescaped-entities': 'off',
    // Large codebase: keep unused vars visible without blocking builds.
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
}
