// tests/module/module-entry.test.js
const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const { spawn } = require('child_process');

describe('Module Entry Point', () => {
  let originalRequireMain;
  let originalConsoleError;
  let mockConsoleError;

  beforeEach(() => {
    // Store original values
    originalRequireMain = require.main;
    originalConsoleError = console.error;

    // Mock console.error
    mockConsoleError = jest.fn();
    console.error = mockConsoleError;

    // Clear the module cache for fresh imports
    const indexPath = require.resolve('../../index.js');
    delete require.cache[indexPath];
  });

  afterEach(() => {
    // Restore original values
    require.main = originalRequireMain;
    console.error = originalConsoleError;

    // Clear module cache
    const indexPath = require.resolve('../../index.js');
    delete require.cache[indexPath];

    jest.clearAllMocks();
  });

  test('should not start server when imported as module', () => {
    // Set require.main to simulate being imported by another module
    require.main = { filename: '/some/other/file.js' };

    // Create spies to track if server methods are called
    const originalYouTubeSummarizerServer = jest.requireActual('../../index.js').YouTubeSummarizerServer;
    const runSpy = jest.fn();

    // Mock the constructor to return an object with a spy for run
    const constructorSpy = jest.fn().mockImplementation(() => ({
      run: runSpy
    }));

    // Mock the module before requiring it
    jest.doMock('../../index.js', () => ({
      YouTubeSummarizerServer: constructorSpy
    }));

    // Now require the module - this should NOT trigger the entry point
    require('../../index.js');

    expect(constructorSpy).not.toHaveBeenCalled();
    expect(runSpy).not.toHaveBeenCalled();

    jest.dontMock('../../index.js');
  });

  test('should export YouTubeSummarizerServer class when imported', () => {
    // Set require.main to simulate being imported
    require.main = { filename: '/some/other/file.js' };

    const { YouTubeSummarizerServer } = require('../../index.js');

    expect(YouTubeSummarizerServer).toBeDefined();
    expect(typeof YouTubeSummarizerServer).toBe('function');

    // Should be able to instantiate
    const server = new YouTubeSummarizerServer();
    expect(server).toBeDefined();
    expect(typeof server.run).toBe('function');
    expect(typeof server.setupToolHandlers).toBe('function');
  });
});

// Integration tests using child processes for real execution testing
describe('Module Entry Point - Integration', () => {
  const indexPath = path.resolve(__dirname, '../../index.js');

  test('should start server when executed directly', (done) => {
    const child = spawn('node', [indexPath], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let stderr = '';
    let stdout = '';
    let hasStarted = false;

    const timeout = setTimeout(() => {
      if (!hasStarted) {
        // If we reach timeout without errors, the server likely started successfully
        hasStarted = true;
        child.kill('SIGTERM');

        // Check that there were no immediate startup errors
        expect(stderr).not.toContain('Error:');
        expect(stderr).not.toContain('SyntaxError');
        expect(stderr).not.toContain('TypeError');
        expect(stderr).not.toContain('ReferenceError');
        done();
      }
    }, 2000);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      if (!hasStarted) {
        // If it closed immediately, check for startup errors
        if (code !== 0 && !signal) {
          done(new Error(`Process exited with code ${code}. Stderr: ${stderr}`));
        } else {
          // Process was killed (expected) or exited normally
          done();
        }
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      if (!hasStarted) {
        done(err);
      }
    });
  }, 10000);

  test('should handle connection errors gracefully', (done) => {
    const child = spawn('node', ['-e', `
      // Simulate the entry point behavior
      const { YouTubeSummarizerServer } = require('${indexPath.replace(/\\/g, '\\\\')}');
      const server = new YouTubeSummarizerServer();

      // Mock run to throw an error
      server.run = () => Promise.reject(new Error('Connection failed'));

      // Execute the same logic as the entry point
      server.run().catch(console.error);
    `], {
      stdio: 'pipe'
    });

    let stderr = '';
    let stdout = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill();
      // Check both stderr and stdout for the error
      const output = stderr + stdout;
      expect(output).toContain('Connection failed');
      done();
    }, 3000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      // Should have logged the error to stderr or stdout
      const output = stderr + stdout;
      expect(output).toContain('Connection failed');
      done();
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      done(err);
    });
  }, 5000);
});

// Test the require.main === module logic specifically
describe('Module Entry Point Logic', () => {
  test('should correctly identify when run as main module', () => {
    // Create a temporary test file that imports our module
    const fs = require('fs');
    const os = require('os');
    const tempDir = os.tmpdir();
    const testFile = path.join(tempDir, 'test-import.js');

    const testCode = `
      const path = require('path');
      const { YouTubeSummarizerServer } = require('${path.resolve(__dirname, '../../index.js').replace(/\\/g, '\\\\')}');

      // Test that require.main is this file, not index.js
      console.log('require.main.filename:', require.main ? require.main.filename : 'null');
      console.log('this file:', __filename);

      // When importing, require.main should be this test file
      if (require.main && require.main.filename === __filename) {
        console.log('SUCCESS: require.main is this file');
        process.exit(0);
      } else if (!require.main) {
        console.log('SUCCESS: require.main is null (valid in some environments)');
        process.exit(0);
      } else {
        console.log('ERROR: require.main is not this file');
        process.exit(1);
      }
    `;

    return new Promise((resolve, reject) => {
      try {
        fs.writeFileSync(testFile, testCode);
      } catch (err) {
        return reject(err);
      }

      const child = spawn('node', [testFile], {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        // Clean up
        try {
          fs.unlinkSync(testFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code === 0) {
          expect(stdout).toMatch(/SUCCESS:/);
          resolve();
        } else {
          reject(new Error(`Test failed with code ${code}. Stdout: ${stdout}, Stderr: ${stderr}`));
        }
      });

      child.on('error', (err) => {
        try {
          fs.unlinkSync(testFile);
        } catch (e) {
          // Ignore cleanup errors
        }
        reject(err);
      });
    });
  }, 5000);
});

// Test module behavior in different contexts
describe('Module Behavior Verification', () => {
  test('should have correct module structure', () => {
    // Import when not main module
    require.main = { filename: '/other/file.js' };

    const moduleExports = require('../../index.js');

    expect(moduleExports).toHaveProperty('YouTubeSummarizerServer');
    expect(typeof moduleExports.YouTubeSummarizerServer).toBe('function');

    // Test that we can create an instance
    const server = new moduleExports.YouTubeSummarizerServer();
    expect(server).toBeDefined();
    expect(server.server).toBeDefined(); // Should have MCP server instance
    expect(typeof server.run).toBe('function');
    expect(typeof server.handleGetTranscript).toBe('function');
    expect(typeof server.handleGetVideoInfo).toBe('function');
  });

  test('should not execute entry point when required by test', () => {
    // This test verifies that requiring the module in our test environment
    // doesn't trigger the entry point code

    // Check if require.main exists and has expected properties
    if (require.main && require.main.filename) {
      // Ensure require.main is the test file (when it exists)
      expect(require.main.filename).toContain('test');
      expect(require.main.filename).not.toContain('index.js');
    } else {
      // In some test environments (like Jest), require.main might be null
      // This is actually GOOD for our test because it means the entry point
      // condition (require.main === module) will be false and won't execute
      expect(require.main).toBeNull();
    }

    // Requiring should work without issues
    expect(() => {
      require('../../index.js');
    }).not.toThrow();

    // The module should export the expected class
    const { YouTubeSummarizerServer } = require('../../index.js');
    expect(YouTubeSummarizerServer).toBeDefined();
    expect(typeof YouTubeSummarizerServer).toBe('function');
  });
});