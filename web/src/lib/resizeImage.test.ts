import { describe, expect, it } from 'vitest'
import { fitWithin } from './resizeImage'

describe('fitWithin', () => {
  it('scales a large landscape photo down to 1600 px wide', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
  })
  it('scales a portrait photo by its height', () => {
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })
  it('never upscales', () => {
    expect(fitWithin(640, 480)).toEqual({ width: 640, height: 480 })
  })
})
