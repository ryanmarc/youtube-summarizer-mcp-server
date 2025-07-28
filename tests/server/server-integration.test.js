// tests/server/server-integration.test.js
const { describe, test, expect, beforeEach } = require('@jest/globals');
const { YouTubeSummarizerServer } = require('../../index.js');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} = require('@modelcontextprotocol/sdk/types.js');

jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('youtube-caption-extractor');

describe('Server Integration', () => {
  let server;
  let mockServerInstance;
  let handlers;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = new Map();

    mockServerInstance = {
      setRequestHandler: jest.fn((schema, handler) => {
        handlers.set(schema, handler);
      }),
      connect: jest.fn().mockResolvedValue(undefined)
    };

    Server.mockImplementation(() => mockServerInstance);

    server = new YouTubeSummarizerServer();
  });

  describe('Server initialization', () => {
    test('should create server with correct configuration', () => {
      expect(Server).toHaveBeenCalledWith(
        {
          name: 'youtube-summarizer-server',
          version: '0.1.1'
        },
        {
          capabilities: {
            tools: {}
          }
        }
      );
    });

    test('should set up request handlers', () => {
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledWith(
        ListToolsRequestSchema,
        expect.any(Function)
      );
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledWith(
        CallToolRequestSchema,
        expect.any(Function)
      );
    });
  });

  describe('ListTools handler', () => {
    test('should return available tools', async () => {
      const listToolsHandler = handlers.get(ListToolsRequestSchema);
      const result = await listToolsHandler();

      expect(result.tools).toHaveLength(2);

      const transcriptTool = result.tools.find(t => t.name === 'get_youtube_transcript');
      expect(transcriptTool).toBeDefined();
      expect(transcriptTool.description).toContain('Extract transcript from a YouTube video');
      expect(transcriptTool.inputSchema.properties).toHaveProperty('url');
      expect(transcriptTool.inputSchema.properties).toHaveProperty('include_timestamps');
      expect(transcriptTool.inputSchema.properties).toHaveProperty('format');
      expect(transcriptTool.inputSchema.properties).toHaveProperty('language');
      expect(transcriptTool.inputSchema.required).toEqual(['url']);

      const infoTool = result.tools.find(t => t.name === 'get_youtube_video_info');
      expect(infoTool).toBeDefined();
      expect(infoTool.description).toContain('Get basic information about a YouTube video');
      expect(infoTool.inputSchema.properties).toHaveProperty('url');
      expect(infoTool.inputSchema.required).toEqual(['url']);
    });
  });

  describe('CallTool handler', () => {
    let callToolHandler;

    beforeEach(() => {
      callToolHandler = handlers.get(CallToolRequestSchema);
      // Mock the handler methods
      server.handleGetTranscript = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Transcript content' }]
      });
      server.handleGetVideoInfo = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Video info' }]
      });
    });

    test('should handle get_youtube_transcript tool', async () => {
      const request = {
        params: {
          name: 'get_youtube_transcript',
          arguments: { url: 'https://youtube.com/watch?v=test' }
        }
      };

      const result = await callToolHandler(request);

      expect(server.handleGetTranscript).toHaveBeenCalledWith({
        url: 'https://youtube.com/watch?v=test'
      });
      expect(result.content[0].text).toBe('Transcript content');
    });

    test('should handle get_youtube_video_info tool', async () => {
      const request = {
        params: {
          name: 'get_youtube_video_info',
          arguments: { url: 'https://youtube.com/watch?v=test' }
        }
      };

      const result = await callToolHandler(request);

      expect(server.handleGetVideoInfo).toHaveBeenCalledWith({
        url: 'https://youtube.com/watch?v=test'
      });
      expect(result.content[0].text).toBe('Video info');
    });

    test('should throw error for unknown tool', async () => {
      const request = {
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      };

      await expect(callToolHandler(request)).rejects.toThrow(McpError);
      try {
        await callToolHandler(request);
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect(err.code).toBe(ErrorCode.MethodNotFound);
        expect(err.toString()).toContain('Unknown tool: unknown_tool');
      }
    });

    test('should wrap handler errors in McpError', async () => {
      server.handleGetTranscript = jest.fn().mockRejectedValue(
        new Error('Transcript fetch failed')
      );

      const request = {
        params: {
          name: 'get_youtube_transcript',
          arguments: { url: 'https://youtube.com/watch?v=test' }
        }
      };

      await expect(callToolHandler(request)).rejects.toThrow(McpError);
      try {
        await callToolHandler(request);
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect(err.code).toBe(ErrorCode.InternalError);
        expect(err.toString()).toContain('Failed to execute get_youtube_transcript: Transcript fetch failed');
      }
    });
  });

  describe('run method', () => {
    test('should create transport and connect', async () => {
      const mockTransport = {};
      StdioServerTransport.mockImplementation(() => mockTransport);

      await server.run();

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServerInstance.connect).toHaveBeenCalledWith(mockTransport);
    });

    test('should not log errors during run', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await server.run();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});