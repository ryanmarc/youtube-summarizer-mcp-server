// tests/handlers/tool-handlers.test.js
const { describe, test, expect, beforeEach } = require('@jest/globals');
const { YouTubeSummarizerServer } = require('../../index.js');
const { getSubtitles } = require('youtube-caption-extractor');

jest.mock('youtube-caption-extractor');

describe('Tool Handlers', () => {
  let server;
  const mockVideoId = 'dQw4w9WgXcQ';
  const mockUrl = `https://www.youtube.com/watch?v=${mockVideoId}`;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new YouTubeSummarizerServer();
  });

  describe('handleGetTranscript', () => {
    const mockTranscript = [
      { text: 'Hello world', start: '0', dur: '2' },
      { text: 'This is a test', start: '2', dur: '3' },
      { text: 'Final segment', start: '5', dur: '2' }
    ];

    beforeEach(() => {
      getSubtitles.mockResolvedValue(mockTranscript);
    });

    test('should return plain text transcript without timestamps', async () => {
      const result = await server.handleGetTranscript({
        url: mockUrl,
        format: 'plain',
        include_timestamps: false
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Hello world This is a test Final segment');
    });

    test('should return plain text transcript with timestamps', async () => {
      const result = await server.handleGetTranscript({
        url: mockUrl,
        format: 'plain',
        include_timestamps: true
      });

      expect(result.content[0].text).toContain('[0:00] Hello world');
      expect(result.content[0].text).toContain('[0:02] This is a test');
      expect(result.content[0].text).toContain('[0:05] Final segment');
    });

    test('should return structured transcript without timestamps', async () => {
      const result = await server.handleGetTranscript({
        url: mockUrl,
        format: 'structured',
        include_timestamps: false
      });

      const text = result.content[0].text;
      expect(text).toContain('# YouTube Video Transcript');
      expect(text).toContain(`**Video URL:** ${mockUrl}`);
      expect(text).toContain('**Estimated Duration:** 0:07');
      expect(text).toContain('**Transcript Segments:** 3');
      expect(text).toContain('**Segment 1:**');
    });

    test('should return structured transcript with timestamps', async () => {
      const result = await server.handleGetTranscript({
        url: mockUrl,
        format: 'structured',
        include_timestamps: true
      });

      const text = result.content[0].text;
      expect(text).toContain('### Section 1 (0:00 - 0:07)');
      expect(text).toContain('Hello world This is a test Final segment');
    });

    test('should handle different languages', async () => {
      await server.handleGetTranscript({
        url: mockUrl,
        language: 'es'
      });

      expect(getSubtitles).toHaveBeenCalledWith({
        videoID: mockVideoId,
        lang: 'es'
      });
    });

    test('should use default values when not provided', async () => {
      await server.handleGetTranscript({ url: mockUrl });

      expect(getSubtitles).toHaveBeenCalledWith({
        videoID: mockVideoId,
        lang: 'en'
      });
    });

    test('should throw error for invalid URL', async () => {
      await expect(server.handleGetTranscript({ url: 'invalid-url' }))
        .rejects.toThrow('Invalid YouTube URL');
    });

    test('should suppress console output during transcript fetch', async () => {
      const suppressSpy = jest.spyOn(server, 'suppressConsoleOutput');
      const restoreSpy = jest.spyOn(server, 'restoreConsoleOutput');

      await server.handleGetTranscript({ url: mockUrl });

      expect(suppressSpy).toHaveBeenCalled();
      expect(restoreSpy).toHaveBeenCalled();
    });
  });

  describe('handleGetVideoInfo', () => {
    const mockTranscript = [
      { text: 'Hello world test', start: '0', dur: '2' },
      { text: 'This is another test', start: '2', dur: '3' },
      { text: 'Final segment here', start: '5', dur: '2' }
    ];

    beforeEach(() => {
      getSubtitles.mockResolvedValue(mockTranscript);
    });

    test('should return video information', async () => {
      const result = await server.handleGetVideoInfo({ url: mockUrl });

      const text = result.content[0].text;
      expect(text).toContain('# YouTube Video Information');
      expect(text).toContain(`**Video ID:** ${mockVideoId}`);
      expect(text).toContain(`**URL:** ${mockUrl}`);
      expect(text).toContain('**Estimated Duration:** 0:07');
      expect(text).toContain('**Transcript Segments:** 3');
      expect(text).toContain('**Estimated Word Count:** 10');
      expect(text).toContain('**Transcript Available:** Yes');
    });

    test('should calculate word count correctly', async () => {
      const result = await server.handleGetVideoInfo({ url: mockUrl });

      // Count words: "Hello world test" (3) + "This is another test" (4) + "Final segment here" (3) = 10
      const text = result.content[0].text;
      expect(text).toContain('**Estimated Word Count:** 10');
    });

    test('should throw error for invalid URL', async () => {
      await expect(server.handleGetVideoInfo({ url: 'invalid-url' }))
        .rejects.toThrow('Invalid YouTube URL');
    });
  });

  describe('getTranscript error handling', () => {
    test('should handle no captions error', async () => {
      getSubtitles.mockRejectedValue(new Error('could not find captions'));

      await expect(server.getTranscript(mockVideoId))
        .rejects.toThrow('No transcript found for this video');
    });

    test('should handle video unavailable error', async () => {
      getSubtitles.mockRejectedValue(new Error('Video unavailable'));

      await expect(server.getTranscript(mockVideoId))
        .rejects.toThrow('This video is unavailable');
    });

    test('should handle invalid video ID error', async () => {
      getSubtitles.mockRejectedValue(new Error('Video not found'));

      await expect(server.getTranscript(mockVideoId))
        .rejects.toThrow('Invalid video ID or video not found');
    });

    test('should handle generic errors', async () => {
      getSubtitles.mockRejectedValue(new Error('Network error'));

      await expect(server.getTranscript(mockVideoId))
        .rejects.toThrow('Failed to fetch transcript: Network error');
    });

    test('should handle empty subtitles array', async () => {
      getSubtitles.mockResolvedValue([]);

      await expect(server.getTranscript(mockVideoId))
        .rejects.toThrow('No transcript found for this video. Captions may be disabled or unavailable.');
    });

    test('should handle null subtitles', async () => {
      getSubtitles.mockResolvedValue(null);

      await expect(server.getTranscript(mockVideoId))
        .rejects.toThrow('No transcript found for this video. Captions may be disabled or unavailable.');
    });
  });
});