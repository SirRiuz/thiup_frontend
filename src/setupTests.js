// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill de webcrypto (CSPRNG) para jsdom: el código del gateway usa
// crypto.getRandomValues, presente en navegadores reales pero ausente en
// algunas versiones de jsdom. En Node viene en crypto.webcrypto.
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
  // eslint-disable-next-line global-require
  globalThis.crypto = require('crypto').webcrypto;
}
