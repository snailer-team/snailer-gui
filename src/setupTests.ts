import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Node.js util polyfills for jsdom
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// JSDOM polyfills
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined
}
