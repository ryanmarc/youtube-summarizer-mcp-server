#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require("@modelcontextprotocol/sdk/types.js");
const { getSubtitles } = require('youtube-caption-extractor');

class YouTubeSummarizerServer {
  constructor() {
    this.server = new Server(
      {
        name: "youtube-summarizer-server",
        version: "0.1.1",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  suppressConsoleOutput() {
    // Store original methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug,
      info: console.info
    };

    // Store original process methods
    this.originalProcess = {
      stdout: process.stdout.write,
      stderr: process.stderr.write
    };

    // Replace console methods with no-ops
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    console.debug = () => {};
    console.info = () => {};

    // Replace process stdout/stderr writes
    process.stdout.write = () => true;
    process.stderr.write = () => true;
  }

  restoreConsoleOutput() {
    // Restore console methods
    if (this.originalConsole) {
      Object.assign(console, this.originalConsole);
    }

    // Restore process methods
    if (this.originalProcess) {
      process.stdout.write = this.originalProcess.stdout;
      process.stderr.write = this.originalProcess.stderr;
    }
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_youtube_transcript",
            description: "Extract transcript from a YouTube video for summarization and analysis",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "YouTube video URL",
                },
                include_timestamps: {
                  type: "boolean",
                  description: "Whether to include timestamps with the transcript",
                  default: false
                },
                format: {
                  type: "string",
                  enum: ["plain", "structured"],
                  description: "Format of the returned transcript",
                  default: "structured"
                },
                language: {
                  type: "string",
                  description: "Language code for transcript (e.g., 'en', 'es', 'fr')",
                  default: "en"
                }
              },
              required: ["url"],
            },
          },
          {
            name: "get_youtube_video_info",
            description: "Get basic information about a YouTube video (title, duration estimate from transcript)",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "YouTube video URL",
                }
              },
              required: ["url"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === "get_youtube_transcript") {
          return await this.handleGetTranscript(args);
        } else if (name === "get_youtube_video_info") {
          return await this.handleGetVideoInfo(args);
        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error; // Preserve original McpError
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute ${name}: ${error.message}`
        );
      }
    });
  }

  async handleGetTranscript(args) {
    const { url, include_timestamps = false, format = "structured", language = "en" } = args;

    // Extract video ID from URL
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid YouTube video URL.");
    }

    // Get transcript
    const transcript = await this.getTranscript(videoId, language);

    // Format the transcript based on requested format
    let formattedTranscript;

    if (format === "plain") {
      if (include_timestamps) {
        formattedTranscript = transcript.map(item =>
          `[${this.formatTimestamp(item.offset / 1000)}] ${item.text}`
        ).join(' ');
      } else {
        formattedTranscript = transcript.map(item => item.text).join(' ');
      }
    } else { // structured format
      const totalDuration = Math.max(...transcript.map(item => item.offset + item.duration));
      const videoLength = this.formatTimestamp(totalDuration / 1000);

      let structuredContent = `# YouTube Video Transcript\n\n`;
      structuredContent += `**Video URL:** ${url}\n`;
      structuredContent += `**Estimated Duration:** ${videoLength}\n`;
      structuredContent += `**Transcript Segments:** ${transcript.length}\n\n`;
      structuredContent += `## Transcript Content\n\n`;

      if (include_timestamps) {
        // Group transcript into time-based sections (every ~2 minutes)
        const sections = this.groupTranscriptIntoSections(transcript, 120); // 2 minutes

        sections.forEach((section, index) => {
          const startTime = this.formatTimestamp(section.startTime / 1000);
          const endTime = this.formatTimestamp(section.endTime / 1000);
          structuredContent += `### Section ${index + 1} (${startTime} - ${endTime})\n\n`;
          structuredContent += section.text + '\n\n';
        });
      } else {
        // Split into paragraphs based on natural breaks
        const paragraphs = this.splitIntoReadableParagraphs(transcript);
        paragraphs.forEach((paragraph, index) => {
          structuredContent += `**Segment ${index + 1}:**\n${paragraph}\n\n`;
        });
      }

      formattedTranscript = structuredContent;
    }

    return {
      content: [
        {
          type: "text",
          text: formattedTranscript,
        },
      ],
    };
  }

  async handleGetVideoInfo(args) {
    const { url } = args;

    // Extract video ID from URL
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL. Please provide a valid YouTube video URL.");
    }

    // Get transcript to calculate basic info
    const transcript = await this.getTranscript(videoId, 'en');

    const totalDuration = Math.max(...transcript.map(item => item.offset + item.duration));
    const videoLength = this.formatTimestamp(totalDuration / 1000);
    const wordCount = transcript.reduce((count, item) => count + item.text.split(' ').length, 0);

    const info = {
      videoId: videoId,
      url: url,
      estimatedDuration: videoLength,
      transcriptSegments: transcript.length,
      estimatedWordCount: wordCount,
      transcriptAvailable: true
    };

    return {
      content: [
        {
          type: "text",
          text: `# YouTube Video Information\n\n` +
                `**Video ID:** ${info.videoId}\n` +
                `**URL:** ${info.url}\n` +
                `**Estimated Duration:** ${info.estimatedDuration}\n` +
                `**Transcript Segments:** ${info.transcriptSegments}\n` +
                `**Estimated Word Count:** ${info.estimatedWordCount}\n` +
                `**Transcript Available:** ${info.transcriptAvailable ? 'Yes' : 'No'}\n\n` +
                `This video has an available transcript and can be summarized.`,
        },
      ],
    };
  }

  extractVideoId(url) {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^&\n?#]+)/,
      /(?:https?:\/\/)?youtu\.be\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  async getTranscript(videoId, language = 'en') {
    try {
      // Completely suppress all console output and process writes
      this.suppressConsoleOutput();

      // Use youtube-caption-extractor
      const subtitles = await getSubtitles({
        videoID: videoId,
        lang: language
      });

      if (!subtitles || subtitles.length === 0) {
        throw new Error('No captions found for this video');
      }

      return subtitles.map(item => ({
        text: item.text,
        offset: parseFloat(item.start) * 1000, // Convert to milliseconds
        duration: parseFloat(item.dur) * 1000  // Convert to milliseconds
      }));

    } catch (error) {
      const message = (error && typeof error === 'object' && 'message' in error)
        ? error.message
        : String(error);

      if (message.includes('could not find captions') ||
          message.includes('No captions found') ||
          message.includes('transcript not available')) {
        throw new Error('No transcript found for this video. Captions may be disabled or unavailable.');
      } else if (message.includes('Video unavailable') ||
                message.includes('private') ||
                message.includes('does not exist')) {
        throw new Error('This video is unavailable (may be private, deleted, or restricted)');
      } else if (message.includes('invalid') ||
                message.includes('not found')) {
        throw new Error('Invalid video ID or video not found');
      } else {
        throw new Error(`Failed to fetch transcript: ${message}`);
      }
    } finally {
      this.restoreConsoleOutput();
    }
  }

  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  groupTranscriptIntoSections(transcript, sectionLengthSeconds) {
    const sections = [];
    let currentSection = {
      startTime: 0,
      endTime: 0,
      text: ''
    };

    for (const item of transcript) {
      if (currentSection.text === '') {
        currentSection.startTime = item.offset;
      }

      // If we've exceeded the section length, start a new section
      if (item.offset - currentSection.startTime > sectionLengthSeconds * 1000) {
        currentSection.endTime = item.offset;
        sections.push({...currentSection});
        currentSection = {
          startTime: item.offset,
          endTime: 0,
          text: item.text
        };
      } else {
        currentSection.text += (currentSection.text ? ' ' : '') + item.text;
      }
    }

    // Add the last section
    if (currentSection.text) {
      currentSection.endTime = transcript[transcript.length - 1].offset +
                              transcript[transcript.length - 1].duration;
      sections.push(currentSection);
    }

    return sections;
  }

  splitIntoReadableParagraphs(transcript) {
    const fullText = transcript.map(item => item.text).join(' ');

    // Split into sentences and group them into paragraphs
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = [];
    let currentParagraph = '';
    const sentencesPerParagraph = 4; // Adjust as needed

    for (let i = 0; i < sentences.length; i++) {
      currentParagraph += sentences[i].trim();
      currentParagraph += '. ';

      if ((i + 1) % sentencesPerParagraph === 0 || i === sentences.length - 1) {
        if (currentParagraph.trim()) {
          paragraphs.push(currentParagraph.trim());
        }
        currentParagraph = '';
      }
    }

    return paragraphs;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Export the class for testing
module.exports = { YouTubeSummarizerServer };

// Start the server only when run directly (not when imported)
if (require.main === module) {
  const server = new YouTubeSummarizerServer();
  server.run().catch(console.error);
}