# YouTube Video Summarizer MCP Server

[![npm version](https://badge.fury.io/js/@ryanmarc%2Fyoutube-summarizer-mcp-server.svg)](https://badge.fury.io/js/@ryanmarc%2Fyoutube-summarizer-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@ryanmarc/youtube-summarizer-mcp-server.svg)](https://www.npmjs.com/package/@ryanmarc/youtube-summarizer-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@ryanmarc/youtube-summarizer-mcp-server.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ryanmarc/youtube-summarizer-mcp-server/pulls)

An MCP (Model Context Protocol) server that allows allows access to YouTube video transcripts for summarization and analysis. Perfect for creating summaries, outlines, and extracting key insights from video content.

## 🚀 Features

- Extract captions/transcripts from YouTube videos using youtube-caption-extractor
- Support for multiple languages (English, Spanish, French, etc.)
- Provide structured transcript data for analysis
- Get basic video information (duration, word count, etc.)
- Handle various transcript formats (plain text or structured)
- Optional timestamp inclusion
- Robust error handling for various failure scenarios
- Works with both auto-generated and manual captions

## 📋 Prerequisites

- Node.js 18.0.0 or higher

## 📦 Installation

### Method 1: Install from npm (Recommended)

```bash
npm install -g @ryanmarc/youtube-summarizer-mcp-server
```

### Method 2: Local Setup

1. Clone or create this project in a directory:
```bash
mkdir youtube-summarizer-mcp-server
cd youtube-summarizer-mcp-server
```

2. Save the provided code files (`index.js`, `package.json`)

3. Install dependencies:
```bash
npm install
```

## ⚙️ Configuration

### For Global Installation (Method 1)
Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "youtube-summarizer": {
      "command": "youtube-summarizer-mcp-server"
    }
  }
}
```

### For Local Development (Method 2)
```json
{
  "mcpServers": {
    "youtube-summarizer": {
      "command": "node",
      "args": ["/absolute/path/to/your/youtube-summarizer-mcp-server/index.js"]
    }
  }
}
```

**Important**: Replace `/absolute/path/to/your/youtube-summarizer-mcp-server/index.js` with the actual absolute path to your index.js file.

Restart your MCP client after configuration.

## 🎯 Usage

Once configured, you can ask to summarize YouTube videos. The server provides transcript data to create summaries. Here are example requests:

### Basic Summary Request
```
Summarize this YouTube video: https://www.youtube.com/watch?v=VIDEO_ID
```

### Detailed Analysis Request
```
Please analyze this YouTube video and create a comprehensive outline with key points: https://www.youtube.com/watch?v=VIDEO_ID
```

### Request with Different Language
```
Get the transcript of this Spanish video: https://www.youtube.com/watch?v=VIDEO_ID
```

### Request with Timestamps
```
Get the transcript of this video with timestamps and summarize the main topics: https://www.youtube.com/watch?v=VIDEO_ID
```

### Video Information
```
What's the basic information about this YouTube video: https://www.youtube.com/watch?v=VIDEO_ID
```

## 🛠️ Available Tools

The MCP server provides these tools:

1. **get_youtube_transcript**: Extracts and formats video captions/transcripts
   - Options: include timestamps, plain or structured format, language selection

2. **get_youtube_video_info**: Gets basic video information
   - Returns: duration, word count, transcript availability

## 🔗 Supported URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`

## 📊 Detail Levels

Create summaries at different levels of detail based on how you ask:

- **Brief**: Ask for a "quick summary" or "brief overview"
- **Detailed**: Ask for a "detailed analysis" or "comprehensive summary"
- **Comprehensive**: Ask for "in-depth analysis" or "thorough breakdown"

The level of detail depends on how you phrase your request.

## ❗ Error Handling

The server handles various error conditions:
- Invalid YouTube URLs
- Videos with disabled transcripts
- Videos without available transcripts
- API failures

## 🧪 Development

### Running Tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

### Development Mode
```bash
npm run dev
```

## 🐛 Troubleshooting

### Server Not Starting
- Check that Node.js version is 18.0.0 or higher
- Ensure all dependencies are installed (`npm install`)
- Verify the path in configuration is absolute and correct

### API Errors
- Check your internet connection
- Verify the MCP server is running correctly

### Transcript Errors
- Some videos may not have captions/transcripts available
- Auto-generated captions may not be available for all languages
- Private or age-restricted videos may not work
- The server uses youtube-caption-extractor for reliable caption extraction

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push <remote> feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/sdk) by Anthropic
- Uses [youtube-caption-extractor](https://www.npmjs.com/package/youtube-caption-extractor) for reliable transcript extraction

## 📞 Support

- 🐛 [Report Issues](https://github.com/ryanmarc/youtube-summarizer-mcp-server/issues)


---


⭐ *If this project helped you, please consider giving it a star!* ⭐
