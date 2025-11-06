import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatResponseForCSV } from '../csv-export-utils';

// Mock formatTimeFromSeconds
vi.mock('../session-utils', () => ({
  formatTimeFromSeconds: (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  },
}));

describe('formatResponseForCSV', () => {
  it('should return empty string for null', () => {
    expect(formatResponseForCSV(null, 'string')).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(formatResponseForCSV(undefined, 'string')).toBe('');
  });

  it('should format string response', () => {
    expect(formatResponseForCSV('Test response', 'string')).toBe('Test response');
    expect(formatResponseForCSV('Test response', 'text')).toBe('Test response');
  });

  it('should format number response', () => {
    expect(formatResponseForCSV(123, 'number')).toBe('123');
    expect(formatResponseForCSV(0, 'number')).toBe('0');
    expect(formatResponseForCSV(-5, 'number')).toBe('-5');
  });

  it('should format string numbers', () => {
    expect(formatResponseForCSV('123', 'number')).toBe('123');
    expect(formatResponseForCSV('0', 'counter')).toBe('0');
  });

  it('should format boolean response', () => {
    expect(formatResponseForCSV(true, 'boolean')).toBe('Sí');
    expect(formatResponseForCSV(false, 'boolean')).toBe('No');
    expect(formatResponseForCSV('true', 'boolean')).toBe('Sí');
    expect(formatResponseForCSV('false', 'boolean')).toBe('No');
  });

  it('should handle boolean string that is not true/false', () => {
    expect(formatResponseForCSV('maybe', 'boolean')).toBe('maybe');
  });

  it('should format radio response', () => {
    expect(formatResponseForCSV('Option A', 'radio')).toBe('Option A');
  });

  it('should format checkbox response as array', () => {
    expect(formatResponseForCSV(['option1', 'option2'], 'checkbox')).toBe('option1, option2');
    expect(formatResponseForCSV(['single'], 'checkbox')).toBe('single');
    expect(formatResponseForCSV([], 'checkbox')).toBe('');
  });

  it('should parse checkbox JSON string', () => {
    expect(formatResponseForCSV('["option1","option2"]', 'checkbox')).toBe('option1, option2');
    expect(formatResponseForCSV('[]', 'checkbox')).toBe('');
  });

  it('should format timer response', () => {
    const timerData = [
      { alias: 'Cycle 1', seconds: 60 },
      { alias: 'Cycle 2', seconds: 120 },
    ];
    const result = formatResponseForCSV(timerData, 'timer');
    expect(result).toContain('Cycle 1');
    expect(result).toContain('Cycle 2');
    expect(result).toContain('1:00');
    expect(result).toContain('2:00');
  });

  it('should parse timer JSON string', () => {
    const timerJson = '[{"alias":"Cycle 1","seconds":60}]';
    const result = formatResponseForCSV(timerJson, 'timer');
    expect(result).toContain('Cycle 1');
    expect(result).toContain('1:00');
  });

  it('should handle timer without alias', () => {
    const timerData = [{ seconds: 60 }];
    const result = formatResponseForCSV(timerData, 'timer');
    expect(result).toContain('Ciclo 1');
    expect(result).toContain('1:00');
  });

  it('should handle timer without seconds', () => {
    const timerData = [{ alias: 'Cycle 1' }];
    const result = formatResponseForCSV(timerData, 'timer');
    expect(result).toContain('Cycle 1');
    expect(result).toContain('Sin duración');
  });

  it('should format voice response', () => {
    expect(formatResponseForCSV('[Audio: test.mp3]', 'voice')).toBe('Audio grabado');
    expect(formatResponseForCSV('Some text [Audio: recording.wav] more text', 'voice')).toBe('Audio grabado');
  });

  it('should handle voice response without audio', () => {
    expect(formatResponseForCSV('No audio here', 'voice')).toBe('');
  });

  it('should handle counter type', () => {
    expect(formatResponseForCSV(5, 'counter')).toBe('5');
    expect(formatResponseForCSV('10', 'counter')).toBe('10');
  });

  it('should handle invalid number for counter', () => {
    expect(formatResponseForCSV('not a number', 'counter')).toBe('');
  });

  it('should handle unknown question type with string', () => {
    expect(formatResponseForCSV('test', 'unknown_type')).toBe('test');
  });

  it('should handle unknown question type with object', () => {
    const obj = { key: 'value' };
    expect(formatResponseForCSV(obj, 'unknown_type')).toBe(JSON.stringify(obj));
  });
});
