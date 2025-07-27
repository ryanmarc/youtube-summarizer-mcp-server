// tests/setup.js
const { jest } = require('@jest/globals');

// Mock the MCP SDK modules
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn()
}));

jest.mock('youtube-caption-extractor', () => ({
  getSubtitles: jest.fn()
}));

// Create mock data generators
const createMockTranscript = (items = 5) => {
  const transcript = [];
  for (let i = 0; i < items; i++) {
    transcript.push({
      text: `This is transcript segment ${i + 1}.`,
      start: (i * 10).toString(),
      dur: '10'
    });
  }
  return transcript;
};

const createMockServer = () => {
  const mockSetRequestHandler = jest.fn();
  const mockConnect = jest.fn().mockResolvedValue(undefined);

  return {
    setRequestHandler: mockSetRequestHandler,
    connect: mockConnect,
    _handlers: new Map()
  };
};

module.exports = {
  createMockTranscript,
  createMockServer
};