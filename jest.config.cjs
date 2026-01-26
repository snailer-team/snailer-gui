/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    // Jest + ESM + TS import path interop
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^react-markdown$': '<rootDir>/src/test/mocks/react-markdown.tsx',
    '^remark-gfm$': '<rootDir>/src/test/mocks/remark-gfm.ts',
    '^@monaco-editor/react$': '<rootDir>/src/test/mocks/monaco-react.tsx',
    '^xterm$': '<rootDir>/src/test/mocks/xterm.ts',
    '^xterm-addon-fit$': '<rootDir>/src/test/mocks/xterm-addon-fit.ts',
    '\\.(css)$': '<rootDir>/src/test/mocks/style.ts',
  },
}
