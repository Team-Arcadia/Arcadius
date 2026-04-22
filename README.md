# Arcadius Bot

**Latest Version: 1.6.0** | **Status: Active Development** 🚀  
**Last Updated: 2026-04-12** | **Node.js:** 18+ | **discord.js:** 13.17.1

**(EN)** Arcadius is an advanced Discord bot powered by Google Gemini AI, designed to animate and manage the Arcadia server with intelligent conversations, persistent memory, dynamic server integration, and intelligent help detection with LLM-based keyword matching.

**(FR)** Arcadius est un bot Discord avancé propulsé par l'IA Google Gemini, conçu pour animer et gérer le serveur Arcadia avec des conversations intelligentes, une mémoire persistante, une intégration dynamique du serveur et une détection d'aide intelligente avec correspondance de mots-clés basée sur LLM.

## ✨ Features / Fonctionnalités

- **🤖 AI Chat (Gemini 3.1 Flash Lite / Gemma 3)**: Context-aware conversations with intelligent failover between models.
- **💾 Memory System**: Advanced memory management for user interactions and personalized responses.
- **🔗 Server Integration**: Integration with server data (mods, links, status, server list).
- **🚨 Help Detection**: Intelligent help detection system with LLM integration for command recognition and customizable responses.
- **🔑 Keyword Detection**: Advanced keyword matching system with LLM analysis for improved accuracy and coverage.
- **🔄 Robust Failover**: Automatic switching between multiple API keys and models to ensure reliability (Multi-key support with pool management).
- **📊 Advanced Logging**: Comprehensive logging system with color-coded output and file persistence.
- **⚡ Performance Optimized**: Built with Node.js for high performance and low latency responses.
- **🛡️ Rate Limiting**: Smart rate limiting for message handling to prevent spam and abuse.
- **🌐 Multi-Provider Support**: Support for multiple LLM providers through unified pool management.

## Installation

### Prerequisites / Prérequis

- **Node.js** 18+ and **pnpm** (or npm)
- **Discord Bot Token** from [Discord Developer Portal](https://discord.com/developers/applications)
- **Google Gemini API Key(s)** from [Google AI Studio](https://aistudio.google.com)

### Setup

**(EN)**

1.  Clone the repository: `git clone <repository-url> && cd Bot-Arcadius-JS`
2.  Install dependencies: `pnpm install` (or `npm install`)
3.  Create a `.env` file (see Configuration section below)
4.  Run the bot: `pnpm start` (or `npm start`)

**(FR)**

1.  Clonez le dépôt : `git clone <repository-url> && cd Bot-Arcadius-JS`
2.  Installez les dépendances : `pnpm install` (ou `npm install`)
3.  Créez un fichier `.env` (voir la section Configuration ci-dessous)
4.  Lancez le bot : `pnpm start` (ou `npm start`)

### .env Configuration

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
ARCADIUS_CHANNEL_ID=1367176787867471883

# Main Gemini API Keys (with fallback support)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY_2=your_second_gemini_api_key_optional
GEMINI_API_KEY_3=your_third_gemini_api_key_optional

# Memory Pool (dedicated key for memory operations)
GEMINI_API_KEY_MEMORY=your_memory_gemini_api_key_here

# LLM Providers for Help Detection (optional, uses main keys if not set)
GROQ_API_KEY=optional_groq_api_key
OPENROUTER_API_KEY=optional_openrouter_api_key

# Logging Configuration
LOG_LEVEL=info
```

### Supported Models / Modèles Supportés

#### Primary Models (Gemini API)

The bot automatically tries available models in this priority order:

- **gemini-3.1-flash-lite** (Recommended) - Fast & efficient for conversations
- gemini-3.1-flash
- gemini-pro

#### Fallback Models (Gemma Series)

- gemma-3-27b-it
- gemma-3-12b-it
- gemma-3-4b-it
- gemma-3-2b-it
- gemma-3-1b-it

#### Help Detection Models

- Uses Gemini by default
- Falls back to Groq or OpenRouter if configured
- Automatically selects best available model based on detection criteria

## Project Structure / Structure du Projet

```
Bot-Arcadius-JS/
├── main.js                      # Main bot entry point
├── INDEX.js                     # Test entry point
├── check-help-detection-setup.js # Verify help detection configuration
├── test-llm-connection.js       # Test LLM provider connectivity
├── package.json
├── modules/
│   ├── arcadiusConfig.js        # Configuration manager
│   ├── arcadiusMessageHandler.js # Message handling & routing
│   ├── arcadiusReadyHandler.js  # Bot ready event handler
│   ├── commandsHandler.js       # Command processing & dispatch
│   ├── dataManager.js           # Data persistence & management
│   ├── geminiPool.js            # Gemini API client pool with multi-key failover
│   ├── llmProviderPool.js       # Multi-provider LLM pool management
│   ├── generationService.js     # Content generation with intelligent failover
│   ├── helpDetectionHandler.js  # Help request detection & processing
│   ├── keywordHandler.js        # Keyword matching & detection with LLM
│   ├── InteractionHandler.js    # Discord interaction handling
│   ├── logger.js                # Advanced logging system (color-coded)
│   ├── memoryService.js         # User memory management & recall
│   ├── promptBuilder.js         # Dynamic prompt generation
│   ├── readyHandler.js          # Startup initialization
│   └── serverStatus.js          # Server status monitoring
├── docs/                        # Comprehensive documentation
│   ├── INSTALLATION_GUIDE.md    # Detailed setup instructions
│   ├── HELP_DETECTION_README.md # Help detection quickstart
│   ├── HELP_DETECTION_GUIDE.md  # Help detection usage guide
│   ├── HELP_DETECTION_TECHNICAL.md # Technical details
│   ├── ARCADIUS_ARCHITECTURE.md # System architecture overview
│   ├── ADVANCED_USE_CASES.md    # Advanced usage scenarios
│   └── SYSTEM_SUMMARY.md        # System capabilities summary
├── data/                        # Data storage
│   ├── keywords.json           # Keyword definitions & responses
│   ├── links.json              # Server links
│   ├── mods.json               # Server mods database
│   ├── responses.json          # Bot response templates
│   ├── server_info.json        # Server information
│   └── prompt_config.json      # Prompt configurations
└── CHANGELOG.md                # Version history
```

## 📚 Key Systems Explained

### Help Detection System

Automatically detects when users ask for help and routes them appropriately with LLM-based analysis for context understanding.

### Keyword Detection System

Uses LLM analysis to recognize user intents beyond simple keyword matching, enabling more accurate and contextual responses.

### Memory Pool System

Dedicated API key pool for memory operations, ensuring reliability of user profiling and persistent interactions.

### Multi-Provider LLM Pool

Supports multiple LLM providers with automatic failover, allowing flexibility in API key usage and provider selection.

## 🔧 Requirements / Prérequis

- **Node.js** 18+ (tested with latest LTS)
- **pnpm** 10.32.0+ (or npm 8+)
- **discord.js** 13.17.1 (included in dependencies)
- **@google/generative-ai** 0.24.1+ (for Gemini API access)

## 📖 Documentation

For detailed information, refer to the following guides in the `docs/` folder:

- [Help Detection Setup](./HELP_DETECTION_SETUP.md) - **⭐ START HERE** - Complete setup and examples
- [Installation Guide](./docs/INSTALLATION_GUIDE.md) - Complete setup walkthrough
- [Help Detection README](./docs/HELP_DETECTION_README.md) - Quick start for help detection
- [Help Detection Implementation](./docs/HELP_DETECTION_IMPLEMENTATION.md) - How it works on Discord
- [Architecture Overview](./docs/ARCADIUS_ARCHITECTURE.md) - System design and flow
- [Advanced Use Cases](./docs/ADVANCED_USE_CASES.md) - Complex scenarios and customization

## Authors / Auteurs

- **vyrriox** - _Creator & Lead Developer_
- **NotFound** - _Contributor_

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history and release notes.
