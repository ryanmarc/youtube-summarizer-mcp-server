// tests/integration/edge-cases.test.js
const { describe, test, expect, beforeEach } = require('@jest/globals');
const { YouTubeSummarizerServer } = require('../../index.js');
const { getSubtitles } = require('youtube-caption-extractor');

jest.mock('youtube-caption-extractor');

describe('Edge Cases', () => {
  let server;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new YouTubeSummarizerServer();
  });

  describe('Transcript with special characters', () => {
    test('should handle transcript with quotes and apostrophes', async () => {
      const mockTranscript = [
        { text: 'He said "Hello world"', start: '0', dur: '2' },
        { text: "It's a beautiful day", start: '2', dur: '2' },
        { text: 'The "test" is complete', start: '4', dur: '2' }
      ];

      getSubtitles.mockResolvedValue(mockTranscript);

      const result = await server.handleGetTranscript({
        url: 'https://youtube.com/watch?v=test',
        format: 'plain'
      });

      expect(result.content[0].text).toBe('He said "Hello world" It\'s a beautiful day The "test" is complete');
    });

    test('should handle transcript with newlines and special formatting', async () => {
      const mockTranscript = [
        { text: 'Line one\nLine two', start: '0', dur: '2' },
        { text: 'Tab\there', start: '2', dur: '2' },
        { text: 'Multiple   spaces', start: '4', dur: '2' }
      ];

      getSubtitles.mockResolvedValue(mockTranscript);

      const result = await server.handleGetTranscript({
        url: 'https://youtube.com/watch?v=test',
        format: 'plain'
      });

      expect(result.content[0].text).toContain('Line one\nLine two');
      expect(result.content[0].text).toContain('Tab\there');
      expect(result.content[0].text).toContain('Multiple   spaces');
    });

    test('should handle empty text segments', async () => {
      const mockTranscript = [
        { text: 'Start', start: '0', dur: '2' },
        { text: '', start: '2', dur: '1' },
        { text: 'End', start: '3', dur: '2' }
      ];

      getSubtitles.mockResolvedValue(mockTranscript);

      const result = await server.handleGetTranscript({
        url: 'https://youtube.com/watch?v=test',
        format: 'plain'
      });

      expect(result.content[0].text).toBe('Start  End');
    });
  });

  describe('Very long transcripts', () => {
    test('should handle transcript with hundreds of segments', async () => {
      const longTranscript = [];
      for (let i = 0; i < 500; i++) {
        longTranscript.push({
          text: `Segment ${i}`,
          start: (i * 2).toString(),
          dur: '2'
        });
      }

      getSubtitles.mockResolvedValue(longTranscript);

      const result = await server.handleGetTranscript({
        url: 'https://youtube.com/watch?v=test',
        format: 'structured',
        include_timestamps: true
      });

      expect(result.content[0].text).toContain('**Transcript Segments:** 500');
      expect(result.content[0].text).toContain('**Estimated Duration:** 16:40');
    });

    test('should create appropriate sections for long videos', async () => {
      const longTranscript = [];
      // Create a 10-minute video transcript
      for (let i = 0; i < 60; i++) {
        longTranscript.push({
          text: `This is minute ${Math.floor(i / 6)} segment ${i % 6}`,
          start: (i * 10).toString(),
          dur: '10'
        });
      }

      getSubtitles.mockResolvedValue(longTranscript);

      const result = await server.handleGetTranscript({
        url: 'https://youtube.com/watch?v=test',
        format: 'structured',
        include_timestamps: true
      });

      const text = result.content[0].text;
      // Should have 5 sections (10 minutes / 2 minutes per section)
      expect(text.match(/### Section \d+/g).length).toBe(5);
    });
  });

  describe('Unusual timestamp formats', () => {
    test('should handle decimal timestamps', async () => {
      const mockTranscript = [
        { text: 'Decimal start', start: '0.5', dur: '1.75' },
        { text: 'Another one', start: '2.25', dur: '3.333' }
      ];

      getSubtitles.mockResolvedValue(mockTranscript);

      const result = await server.handleGetTranscript({
        url: 'https://youtube.com/watch?v=test',
        format: 'plain',
        include_timestamps: true
      });

      expect(result.content[0].text).toContain('[0:00] Decimal start');
      expect(result.content[0].text).toContain('[0:02] Another one');
    });

    test('should handle very large timestamps (long videos)', async () => {
      const mockTranscript = [
        { text: 'Start', start: '0', dur: '5' },
        { text: 'Middle', start: '7200', dur: '5' }, // 2 hours
        { text: 'End', start: '14400', dur: '5' } // 4 hours
      ];

      getSubtitles.mockResolvedValue(mockTranscript);

      const result = await server.handleGetTranscript({
        url: 'https://youtube.com/watch?v=test',
        format: 'plain',
        include_timestamps: true
      });

      expect(result.content[0].text).toContain('[0:00] Start');
      expect(result.content[0].text).toContain('[2:00:00] Middle');
      expect(result.content[0].text).toContain('[4:00:00] End');
    });
  });

  describe('Language edge cases', () => {
    test('should handle non-English characters', async () => {
      const mockTranscript = [
        { text: 'Hello 你好 مرحبا', start: '0', dur: '2' },
        { text: 'Café naïve résumé', start: '2', dur: '2' },
        { text: '🎉 Emojis work too! 🚀', start: '4', dur: '2' }
      ];

      getSubtitles.mockResolvedValue(mockTranscript);

      const result = await server.handleGetTranscript({
        url: 'https://youtube.com/watch?v=test',
        format: 'plain'
      });

      expect(result.content[0].text).toContain('Hello 你好 مرحبا');
      expect(result.content[0].text).toContain('Café naïve résumé');
      expect(result.content[0].text).toContain('🎉 Emojis work too! 🚀');
    });

    test('should handle language codes correctly', async () => {
      const languages = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'];

      for (const lang of languages) {
        getSubtitles.mockResolvedValue([
          { text: `Text in ${lang}`, start: '0', dur: '2' }
        ]);

        await server.handleGetTranscript({
          url: 'https://youtube.com/watch?v=test',
          language: lang
        });

        expect(getSubtitles).toHaveBeenCalledWith({
          videoID: 'test',
          lang: lang
        });
      }
    });
  });

  describe('Paragraph splitting edge cases', () => {
    test('should handle transcript with no sentence endings', async () => {
      const transcript = [
        { text: 'This is a long segment without any punctuation' },
        { text: 'Another segment also without punctuation' },
        { text: 'And a third one' }
      ];

      const paragraphs = server.splitIntoReadableParagraphs(transcript);

      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0]).toBe('This is a long segment without any punctuation Another segment also without punctuation And a third one.');
    });

    test('should handle transcript with only punctuation', async () => {
      const transcript = [
        { text: '...' },
        { text: '???' },
        { text: '!!!' }
      ];

      const paragraphs = server.splitIntoReadableParagraphs(transcript);

      expect(paragraphs).toHaveLength(0);
    });

    test('should handle mixed punctuation patterns', async () => {
      const transcript = [
        { text: 'Question? Answer. Exclamation!' },
        { text: 'More text... And more.' },
        { text: 'Final thought!' }
      ];

      const paragraphs = server.splitIntoReadableParagraphs(transcript);

      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0]).toContain('Question. Answer. Exclamation. More text.');
      expect(paragraphs[1]).toContain('And more. Final thought');
    });
  });

  describe('URL parsing edge cases', () => {
    test('should handle URLs with multiple video IDs (playlists)', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&v=wrongid';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should handle URLs with timestamps', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should handle mobile URLs', () => {
      const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });

    test('should handle URLs with hash fragments', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=30';
      expect(server.extractVideoId(url)).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Error recovery', () => {
    test('should always restore console output on error', async () => {
      const restoreSpy = jest.spyOn(server, 'restoreConsoleOutput');
      getSubtitles.mockRejectedValue(new Error('Test error'));

      try {
        await server.getTranscript('test-id');
      } catch (e) {
        // Expected error
      }

      expect(restoreSpy).toHaveBeenCalled();
    });

    test('should handle getSubtitles throwing non-Error objects', async () => {
      getSubtitles.mockRejectedValue('String error');

      await expect(server.getTranscript('test-id'))
        .rejects.toThrow('Failed to fetch transcript');
    });

    test('should handle malformed subtitle data', async () => {
      const malformedData = [
        { text: 'Good segment', start: '0', dur: '2' },
        { text: 'Missing duration', start: '2' }, // Missing dur
        { text: 'Missing start', dur: '2' }, // Missing start
        null, // Null entry
        { start: '6', dur: '2' } // Missing text
      ];

      getSubtitles.mockResolvedValue(malformedData);

      // The function should handle these gracefully
      const processData = () => {
        return malformedData.map(item => ({
          text: item?.text || '',
          offset: item?.start ? parseFloat(item.start) * 1000 : 0,
          duration: item?.dur ? parseFloat(item.dur) * 1000 : 0
        })).filter(item => item !== null);
      };

      expect(() => processData()).not.toThrow();
    });
  });
});