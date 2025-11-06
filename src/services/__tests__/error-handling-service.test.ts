import { describe, it, expect } from 'vitest';
import {
  createAppError,
  getErrorMessage,
  getErrorType,
  getToastTypeForError,
} from '../error-handling-service';

describe('error-handling-service', () => {
  describe('createAppError', () => {
    it('should create AppError from Error object', () => {
      const error = new Error('Test error');
      const appError = createAppError(error);

      expect(appError.message).toBe('Test error');
      expect(appError.type).toBe('unknown');
    });

    it('should create AppError from string', () => {
      // String is not an Error instance, so it will use fallback
      const appError = createAppError('String error');

      expect(appError.message).toBe('Ocurrió un error inesperado. Por favor, intenta nuevamente.');
      expect(appError.type).toBe('unknown');
    });

    it('should create AppError from unknown type', () => {
      const appError = createAppError({ custom: 'data' });

      expect(appError.message).toBe('Ocurrió un error inesperado. Por favor, intenta nuevamente.');
      expect(appError.type).toBe('unknown');
    });

    it('should include code from Supabase error', () => {
      const error = Object.assign(new Error('Not found'), { code: 'PGRST116' });
      const appError = createAppError(error);

      expect(appError.code).toBe('PGRST116');
      expect(appError.message).toContain('eliminado');
      expect(appError.type).toBe('database');
    });
  });

  describe('getErrorMessage', () => {
    it('should map PGRST116 to user-friendly message', () => {
      const error = Object.assign(new Error('Not found'), { code: 'PGRST116' });
      const message = getErrorMessage(error);

      expect(message).toContain('eliminado');
    });

    it('should map 23503 to integrity error message', () => {
      const error = Object.assign(new Error('Foreign key violation'), { code: '23503' });
      const message = getErrorMessage(error);

      expect(message).toContain('restricciones');
    });

    it('should map 42501 to permission error message', () => {
      const error = Object.assign(new Error('Permission denied'), { code: '42501' });
      const message = getErrorMessage(error);

      expect(message).toContain('permisos');
    });

    it('should return original message for unknown codes if short', () => {
      const error = new Error('Custom error');
      const message = getErrorMessage(error);

      expect(message).toBe('Custom error');
    });

    it('should handle network errors', () => {
      const error = new Error('Network error occurred');
      const message = getErrorMessage(error);

      expect(message).toContain('conexión');
    });

    it('should handle permission errors in message', () => {
      const error = new Error('Permission denied');
      const message = getErrorMessage(error);

      expect(message).toContain('permisos');
    });
  });

  describe('getErrorType', () => {
    it('should return auth for permission errors', () => {
      const error = Object.assign(new Error('Permission denied'), { code: '42501' });
      const type = getErrorType(error);

      expect(type).toBe('auth');
    });

    it('should return network for network errors', () => {
      const error = new Error('Network timeout');
      const type = getErrorType(error);

      expect(type).toBe('network');
    });

    it('should return validation for validation errors', () => {
      const error = Object.assign(new Error('Validation failed'), { code: '23502' });
      const type = getErrorType(error);

      expect(type).toBe('validation');
    });

    it('should return database for database errors', () => {
      const error = Object.assign(new Error('Database error'), { code: 'PGRST116' });
      const type = getErrorType(error);

      expect(type).toBe('database');
    });

    it('should return unknown for errors without code or pattern', () => {
      const error = new Error('Generic error');
      const type = getErrorType(error);

      expect(type).toBe('unknown');
    });
  });

  describe('getToastTypeForError', () => {
    it('should return error for auth type', () => {
      const appError = { type: 'auth', message: 'Test' };
      expect(getToastTypeForError(appError)).toBe('error');
    });

    it('should return warning for validation type', () => {
      const appError = { type: 'validation', message: 'Test' };
      expect(getToastTypeForError(appError)).toBe('warning');
    });

    it('should return error for network type', () => {
      const appError = { type: 'network', message: 'Test' };
      expect(getToastTypeForError(appError)).toBe('error');
    });

    it('should return error for database type', () => {
      const appError = { type: 'database', message: 'Test' };
      expect(getToastTypeForError(appError)).toBe('error');
    });

    it('should return error as default for unknown type', () => {
      const appError = { type: 'unknown', message: 'Test' };
      expect(getToastTypeForError(appError)).toBe('error');
    });
  });
});

