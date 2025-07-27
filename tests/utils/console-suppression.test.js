// tests/utils/console-suppression.test.js
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { YouTubeSummarizerServer } = require('../../index.js');

describe('Console Suppression', () => {
  let server;
  let originalConsole;
  let originalProcess;

  beforeEach(() => {
    server = new YouTubeSummarizerServer();

    // Store original methods before any suppression
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug,
      info: console.info
    };

    originalProcess = {
      stdout: process.stdout.write,
      stderr: process.stderr.write
    };
  });

  afterEach(() => {
    // Restore original methods after each test
    Object.assign(console, originalConsole);
    process.stdout.write = originalProcess.stdout;
    process.stderr.write = originalProcess.stderr;
  });

  test('should suppress all console methods', () => {
    server.suppressConsoleOutput();

    // Test that console methods are replaced with no-ops
    expect(console.log).not.toBe(originalConsole.log);
    expect(console.error).not.toBe(originalConsole.error);
    expect(console.warn).not.toBe(originalConsole.warn);
    expect(console.debug).not.toBe(originalConsole.debug);
    expect(console.info).not.toBe(originalConsole.info);

    // Test that they don't throw errors when called
    expect(() => console.log('test')).not.toThrow();
    expect(() => console.error('test')).not.toThrow();
  });

  test('should suppress process stdout and stderr', () => {
    server.suppressConsoleOutput();

    // Test that process methods are replaced
    expect(process.stdout.write).not.toBe(originalProcess.stdout);
    expect(process.stderr.write).not.toBe(originalProcess.stderr);

    // Test that they return true (indicating success)
    expect(process.stdout.write('test')).toBe(true);
    expect(process.stderr.write('test')).toBe(true);
  });

  test('should restore all console methods', () => {
    server.suppressConsoleOutput();
    server.restoreConsoleOutput();

    // Test that console methods are restored
    expect(console.log).toBe(originalConsole.log);
    expect(console.error).toBe(originalConsole.error);
    expect(console.warn).toBe(originalConsole.warn);
    expect(console.debug).toBe(originalConsole.debug);
    expect(console.info).toBe(originalConsole.info);
  });

  test('should restore process stdout and stderr', () => {
    server.suppressConsoleOutput();
    server.restoreConsoleOutput();

    // Test that process methods are restored
    expect(process.stdout.write).toBe(originalProcess.stdout);
    expect(process.stderr.write).toBe(originalProcess.stderr);
  });

  test('should handle multiple suppress/restore cycles', () => {
    // First cycle
    server.suppressConsoleOutput();
    expect(console.log).not.toBe(originalConsole.log);
    server.restoreConsoleOutput();
    expect(console.log).toBe(originalConsole.log);

    // Second cycle
    server.suppressConsoleOutput();
    expect(console.log).not.toBe(originalConsole.log);
    server.restoreConsoleOutput();
    expect(console.log).toBe(originalConsole.log);
  });

  test('should store original methods in instance properties', () => {
    server.suppressConsoleOutput();

    expect(server.originalConsole).toBeDefined();
    expect(server.originalConsole.log).toBe(originalConsole.log);
    expect(server.originalProcess).toBeDefined();
    expect(server.originalProcess.stdout).toBe(originalProcess.stdout);
  });
});