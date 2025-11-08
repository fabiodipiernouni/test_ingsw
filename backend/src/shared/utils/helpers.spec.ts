/**
 * Test suite for helper functions
 * Testing with R-WECT (Robustness Worst-case Execution Coverage Testing)
 */

import { describe, it, expect } from '@jest/globals';
import { isInRange, isStringInLengthRange, calculateTotalPages } from './helpers';

describe('isInRange', () => {
  
  it('TC1: should throw error when min > max', () => {
    expect(() => isInRange(0, 2, 1)).toThrow();
  });

  it('TC2: should return true when value is within range', () => {
    const result = isInRange(2, 1, 3);
    expect(result).toBe(true);
  });

  it('TC3: should return false when value is less than min', () => {
    const result = isInRange(1, 2, 3);
    expect(result).toBe(false);
  });

  it('TC4: should return false when value is greater than max', () => {
    const result = isInRange(4, 2, 3);
    expect(result).toBe(false);
  });

});

describe('isStringInLengthRange', () => {
  
  it('TC1: should throw error when minLength is not an integer', () => {
    expect(() => isStringInLengthRange("prova", 0.1, 1)).toThrow();
  });

  it('TC2: should throw error when minLength is negative', () => {
    expect(() => isStringInLengthRange("prova", -1, 1)).toThrow();
  });

  it('TC3: should throw error when maxLength is not an integer', () => {
    expect(() => isStringInLengthRange("prova", 1, 0.1)).toThrow();
  });

  it('TC4: should throw error when maxLength is negative', () => {
    expect(() => isStringInLengthRange("prova", 1, -1)).toThrow();
  });

  it('TC5: should throw error when minLength > maxLength', () => {
    expect(() => isStringInLengthRange("prova", 2, 1)).toThrow();
  });

  it('TC6: should return false when string length is less than minLength', () => {
    const result = isStringInLengthRange("prova", 6, 7);
    expect(result).toBe(false);
  });

  it('TC7: should return false when string length is less than minLength', () => {
    const result = isStringInLengthRange("prova", 2, 3);
    expect(result).toBe(false);
  });

  it('TC8: should return true when string length is within range', () => {
    const result = isStringInLengthRange("prova", 3, 6);
    expect(result).toBe(true);
  });

});

describe('calculateTotalPages', () => {
  
  it('TC1: should throw error when totalCount is not an integer', () => {
    expect(() => calculateTotalPages(0.1, 1)).toThrow();
  });

  it('TC2: should throw error when totalCount is negative', () => {
    expect(() => calculateTotalPages(-1, 1)).toThrow();
  });

  it('TC3: should throw error when limit is not an integer', () => {
    expect(() => calculateTotalPages(10, 0.1)).toThrow();
  });

  it('TC4: should throw error when limit is negative', () => {
    expect(() => calculateTotalPages(10, -1)).toThrow();
  });

  it('TC5: should return correct number of pages', () => {
    const result = calculateTotalPages(12, 3);
    expect(result).toBe(4);
  });

});
