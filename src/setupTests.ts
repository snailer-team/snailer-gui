import '@testing-library/jest-dom'

// JSDOM polyfills
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined
}
