// tests/utils/youtube-utils.test.js
const { describe, test, expect, beforeEach } = require('@jest/globals');
const { YouTubeSummarizerServer } = require('../../index.js');

describe('YouTube Utils', () => {
  let server;

  beforeEach(() => {
    server = new YouTubeSummarizerServer();
  });

  describe('extractVideoId', () => {
    test('should extract video ID from standard watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from shortened URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should extract video ID from /v/ URL', () => {
      const url = 'https://www.youtube.com/v/dQw4w9WgXcQ';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should handle URLs without protocol', () => {
      const url = 'youtube.com/watch?v=dQw4w9WgXcQ';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should handle URLs with additional parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should return null for invalid URLs', () => {
      expect(server.extractVideoId('https://example.com')).toBeNull();
      expect(server.extractVideoId('not-a-url')).toBeNull();
      expect(server.extractVideoId('')).toBeNull();
    });
  });

  describe('formatTimestamp', () => {
    test('should format seconds into MM:SS', () => {
      expect(server.formatTimestamp(0)).toBe('0:00');
      expect(server.formatTimestamp(59)).toBe('0:59');
      expect(server.formatTimestamp(60)).toBe('1:00');
      expect(server.formatTimestamp(125)).toBe('2:05');
    });

    test('should format seconds into HH:MM:SS for hours', () => {
      expect(server.formatTimestamp(3600)).toBe('1:00:00');
      expect(server.formatTimestamp(3661)).toBe('1:01:01');
      expect(server.formatTimestamp(7325)).toBe('2:02:05');
    });

    test('should handle decimal seconds', () => {
      expect(server.formatTimestamp(59.9)).toBe('0:59');
      expect(server.formatTimestamp(60.1)).toBe('1:00');
    });
  });

  describe('groupTranscriptIntoSections', () => {
    test('should group transcript into sections based on time', () => {
      const transcript = [
        { text: 'First', offset: 0, duration: 5000 },
        { text: 'Second', offset: 5000, duration: 5000 },
        { text: 'Third', offset: 130000, duration: 5000 },
        { text: 'Fourth', offset: 135000, duration: 5000 }
      ];

      const sections = server.groupTranscriptIntoSections(transcript, 120); // 2 minutes

      expect(sections).toHaveLength(2);
      expect(sections[0].text).toBe('First Second');
      expect(sections[0].startTime).toBe(0);
      expect(sections[0].endTime).toBe(130000);

      expect(sections[1].text).toBe('Third Fourth');
      expect(sections[1].startTime).toBe(130000);
      expect(sections[1].endTime).toBe(140000);
    });

    test('should handle single section', () => {
      const transcript = [
        { text: 'First', offset: 0, duration: 5000 },
        { text: 'Second', offset: 5000, duration: 5000 }
      ];

      const sections = server.groupTranscriptIntoSections(transcript, 120);

      expect(sections).toHaveLength(1);
      expect(sections[0].text).toBe('First Second');
    });

    test('should handle empty transcript', () => {
      const sections = server.groupTranscriptIntoSections([], 120);
      expect(sections).toHaveLength(0);
    });
  });

  describe('splitIntoReadableParagraphs', () => {
    test('should split transcript into paragraphs', () => {
      const transcript = [
        { text: 'First sentence.' },
        { text: 'Second sentence.' },
        { text: 'Third sentence.' },
        { text: 'Fourth sentence.' },
        { text: 'Fifth sentence.' }
      ];

      const paragraphs = server.splitIntoReadableParagraphs(transcript);

      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0]).toBe('First sentence. Second sentence. Third sentence. Fourth sentence.');
      expect(paragraphs[1]).toBe('Fifth sentence.');
    });

    test('should handle sentences with different punctuation', () => {
      const transcript = [
        { text: 'Question?' },
        { text: 'Exclamation!' },
        { text: 'Statement.' },
        { text: 'Another one.' }
      ];

      const paragraphs = server.splitIntoReadableParagraphs(transcript);

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0]).toBe('Question. Exclamation. Statement. Another one.');
    });

    test('should filter out empty sentences', () => {
      const transcript = [
        { text: 'First.' },
        { text: '' },
        { text: 'Second.' }
      ];

      const paragraphs = server.splitIntoReadableParagraphs(transcript);

      expect(paragraphs[0]).toContain('First');
      expect(paragraphs[0]).toContain('Second');
    });

    test('should handle empty transcript', () => {
      const paragraphs = server.splitIntoReadableParagraphs([]);
      expect(paragraphs).toHaveLength(0);
    });
  });
});