/**
 * Basic setup verification tests
 */

import fc from 'fast-check'

describe('Project Setup', () => {
  it('should have fast-check working for property-based testing', () => {
    fc.assert(fc.property(
      fc.integer(),
      fc.integer(),
      (a, b) => {
        expect(a + b).toBe(b + a) // Commutative property
      }
    ), { numRuns: 100 })
  })

  it('should have Jest and testing library configured', () => {
    expect(true).toBe(true)
  })

  it('should have localStorage mock available', () => {
    localStorage.setItem('test', 'value')
    expect(localStorage.getItem('test')).toBe('value')
  })

  it('should have AudioContext mock available', () => {
    const audioContext = new AudioContext()
    expect(audioContext).toBeDefined()
    expect(audioContext.createOscillator).toBeDefined()
  })
})