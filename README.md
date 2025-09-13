<div align="center">

  <h1>
    <img src="public/favicon.png" alt="OpenGPT" width="64" height="64" align="absmiddle"> OpenGPT
  </h1>
  <p style="margin-top: 4px;">Experiment with open-source AI models</p>

[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black?style=flat-square&logo=next.js)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=flat-square&logo=react)](https://reactjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/) [![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com/) [![AI SDK](https://img.shields.io/badge/AI_SDK-5.0.34-FF6154?style=flat-square&logo=vercel)](https://sdk.vercel.ai/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/) [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

<br />

A modern AI playground that combines the **development experience of Next.js** with the **performance of Cloudflare Workers** platform. Experiment with 50+ open-source AI models, including GPT-OSS, Leonardo, Llama, Qwen, Gemini, DeepSeek, and more. Features text-to-speech with multiple voices and real-time speech-to-text transcription.

</div>

<div align="center">

[![OpenGPT Demo](https://img.youtube.com/vi/r96QMlmngN4/maxresdefault.jpg)](https://www.youtube.com/shorts/r96QMlmngN4)

_Click to watch the demo video_

</div>

## **Why OpenGPT?**

<div align="center">

### 🏆 **Best of Both Worlds**

**Development Experience** 💻 + **Deployment Performance** ⚡

</div>

OpenGPT leverages three core technologies to deliver an exceptional AI development experience:

### 🔧 **Core Technologies**

| Technology                   | What it brings                                   | Why it matters                                                              |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| **🔗 OpenNext**              | Seamless Next.js → Cloudflare Workers deployment | Deploy Next.js apps globally with the most affordable edge compute offering |
| **🤖 AI SDK v5**             | Universal AI framework with streaming support    | Connect to any AI provider with type-safe, streaming APIs                   |
| **☁️ Cloudflare Workers AI** | Global AI inference                              | Sub-100ms latency worldwide with 50+ open-source models                     |

## 🌟 **Features**

### 💬 **Multi-Modal AI Interface**

- **Chat Mode**: Conversational AI with 30+ text generation models
- **Image Mode**: High-quality image generation with 5+ image models
- **Text-to-Speech (TTS)**: Voice synthesis with multiple speaker options
- **Speech-to-Text (STT)**: Real-time audio transcription with visual feedback
- **Seamless Switching**: Toggle between modes without losing context

### 🧠 **Advanced Reasoning Support**

- **Thinking Process Visualization**: See how AI models reason through problems
- **Collapsible Reasoning**: Clean UI that shows/hides reasoning on demand
- **Universal Compatibility**: Works with any AI model that supports reasoning tokens

### 🎨 **Modern User Experience**

- **AI Elements UI**: Professional, accessible components built with [AI Elements](https://ai-sdk.dev/elements/overview)
- **Responsive Design**: Mobile-first responsive interactions
- **Real-time Streaming**: See responses as they're generated

### 🔧 **Developer Experience**

- **Type Safety**: Full TypeScript support
- **One-Command Deploy**: `pnpm deploy` to Cloudflare Workers globally

## 🚀 **Getting Started**

### Installation

```bash

# Clone the repository
git clone https://github.com/devhims/opengpt.git
cd opengpt

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see OpenGPT in action! 🎉

### Environment Setup

1. **Create `.dev.vars`** for local development:

```bash
# .dev.vars (not committed to git)
NEXTJS_ENV=development
```

2. **For production secrets**:

```bash
wrangler secret put NEXTJS_ENV
```

## 🛠️ **Available Scripts**

| Command           | Description                                     |
| ----------------- | ----------------------------------------------- |
| `pnpm dev`        | Start development server with Turbopack         |
| `pnpm build`      | Build the Next.js application                   |
| `pnpm preview`    | Preview the Cloudflare Workers build locally    |
| `pnpm deploy`     | Build and deploy to Cloudflare Workers globally |
| `pnpm lint`       | Run ESLint with TypeScript rules                |
| `pnpm format`     | Format code with Prettier                       |
| `pnpm cf-typegen` | Generate Cloudflare binding types               |

## 🤖 **Supported AI Models**

### Text Generation (30+ Models)

- **GPT-OSS**: OpenAI-compatible 20B and 120B variants
- **Meta Llama**: 4 Scout 17B, 3.3 70B, 3.1 family (6 variants), 3.2 family (3 variants), 3.0 family (3 variants)
- **Google Gemma**: 3 12B IT, 7B IT, and LoRA variants (4 total)
- **Mistral**: Small 3.1 24B, 7B v0.1/v0.2 variants (5 total)
- **Qwen**: QWQ 32B, 2.5 Coder 32B, and 1.5 family variants (6 total)
- **DeepSeek**: R1 Distill Qwen 32B, Math 7B, Coder variants (4 total)

### Image Generation (5+ Models)

- **Black Forest Labs**: FLUX-1-Schnell (fast, high-quality text-to-image)
- **Leonardo AI**: Lucid Origin and Phoenix 1.0
- **Stability AI**: Stable Diffusion XL Base 1.0
- **ByteDance**: Stable Diffusion XL Lightning (ultra-fast generation)

### Speech & Audio (3+ Models)

- **Text-to-Speech (TTS)**:
  - **Deepgram Aura-1**: 12+ expressive voices (Luna, Athena, Zeus, Angus, etc.)
  - **MeloTTS**: Multi-language support (EN, ES, FR, ZH, JP, KR) with regional accents
- **Speech-to-Text (STT)**:
  - **Deepgram Nova-3**: High-accuracy real-time transcription with punctuation

## 🏗️ **Architecture**

OpenGPT showcases a modern, production-ready architecture with comprehensive request handling:

```mermaid
flowchart TD
    User[👤 User] --> UI[🎨 Next.js Frontend]
    UI --> ModeToggle{Mode Selection}

    ModeToggle -->|💬 Chat| ChatPath[Chat Request Path]
    ModeToggle -->|🖼️ Image| ImagePath[Image Request Path]
    ModeToggle -->|🗣️ Speech| SpeechPath[Speech Request Path]

    ChatPath --> ChatAPI[📡 /api/chat]
    ImagePath --> ImageAPI[📡 /api/image]
    SpeechPath --> SpeechAPI["📡 /api/speech-to-text | /api/text-to-speech"]

    ChatAPI --> RateLimit1[🚫 Rate Limiter]
    ImageAPI --> RateLimit2[🚫 Rate Limiter]
    SpeechAPI --> RateLimit3[🚫 Rate Limiter]

    RateLimit1 --> RateCheck1{Rate OK?}
    RateLimit2 --> RateCheck2{Rate OK?}
    RateLimit3 --> RateCheck3{Rate OK?}

    RateCheck1 -->|❌| RateError1[429 Error]
    RateCheck1 -->|✅| ChatProcessing[🤖 Chat Processing]

    RateCheck2 -->|❌| RateError2[429 Error]
    RateCheck2 -->|✅| ImageProcessing[🎨 Image Processing]

    RateCheck3 -->|❌| RateError3[429 Error]
    RateCheck3 -->|✅| SpeechProcessing[🗣️ Speech Processing]

    ChatProcessing --> ModelType{Model Type}
    ModelType -->|Standard| AISDKPath[🔧 AI SDK v5 + workers-ai-provider]
    ModelType -->|GPT-OSS| DirectPath[🎯 Direct env.AI.run]

    ImageProcessing --> ImageAI[🎨 Direct env.AI.run]
    SpeechProcessing --> SpeechAI[🗣️ Direct env.AI.run]

    AISDKPath --> WorkersAI1[☁️ Cloudflare Workers AI]
    DirectPath --> WorkersAI2[☁️ Cloudflare Workers AI]
    ImageAI --> WorkersAI3[☁️ Cloudflare Workers AI]
    SpeechAI --> WorkersAI4[☁️ Cloudflare Workers AI]

    WorkersAI1 --> Streaming[🌊 Real-time Streaming]
    WorkersAI2 --> Batch[📋 Batch Processing + Emulated Stream]
    WorkersAI3 --> ImageResponse[📸 Generated Image]
    WorkersAI4 --> SpeechResponse[🔊 Audio/Text Response]

    Streaming --> ParseReasoning[🧠 Parse Reasoning]
    Batch --> ParseReasoning

    ParseReasoning --> ChatSuccess[✅ Chat Response]
    ImageResponse --> ImageSuccess[✅ Image Response]
    SpeechResponse --> SpeechSuccess[✅ Speech Response]

    RateError1 --> ErrorUI[🎨 Error Display]
    RateError2 --> ErrorUI
    RateError3 --> ErrorUI

    ChatSuccess --> ResponseUI[📥 Response Display]
    ImageSuccess --> ResponseUI
    SpeechSuccess --> ResponseUI
```

### Key Implementation Details

**Chat Route Processing:**

- **Standard Models**: Uses AI SDK v5 with `workers-ai-provider` wrapper for streaming
- **GPT-OSS Models**: Direct `env.AI.run` call with emulated streaming via `createUIMessageStream`
- **All models**: Connect to the same Cloudflare Workers AI backend

**Image Route Processing:**

- **All Image Models**: Direct `env.AI.run` call (no AI SDK wrapper needed)
- **Response Handling**: Supports both base64 and binary stream responses
- **Format Conversion**: Automatic conversion to both base64 and Uint8Array for frontend compatibility

**Speech Route Processing:**

- **Speech-to-Text**: Direct `env.AI.run` call with `@cf/deepgram/nova-3` model
- **Text-to-Speech**: Direct `env.AI.run` call with `@cf/deepgram/aura-1` or `@cf/myshell-ai/melotts` models
- **Audio Processing**: WebM/MP4 audio file handling with automatic format detection
- **Voice Options**: 12+ Aura-1 speakers, multi-language MeloTTS with regional accents

**Rate Limiting:**

- **Shared Infrastructure**: Both routes use the same `checkRateLimit` utility
- **Per-endpoint Limits**: Separate daily limits for chat (20), image (5), and speech (10) requests
- **Storage**: Hybrid Upstash Redis + Cloudflare KV fallback

### Request Processing Flow

1. **Frontend Validation**: Client-side input validation and optional rate limit pre-checking
2. **Rate Limiting**: IP-based daily limits (20 chat, 5 image, 10 speech requests) with Redis/KV storage
3. **Model Routing**: Smart routing between Standard Models (streaming) and GPT-OSS Models (batch)
4. **AI Processing**: Direct Cloudflare Workers AI integration with optimized parameters
5. **Response Handling**: Reasoning token parsing, format conversion, and UI display

## 🚀 **Deployment**

```bash
# Build and deploy in one command
pnpm deploy

# Or step by step
pnpm build
npx wrangler deploy
```

### Environment Variables

| Variable                   | Description                    |
| -------------------------- | ------------------------------ |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis URL (optional)   |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token (optional) |

### Adding New Models

1. **Add model to constants**:

```typescript
// src/constants/index.ts
export const CLOUDFLARE_AI_MODELS = {
  textGeneration: [
    // Add your new model here
    '@cf/vendor/new-model',
    // ... existing models
  ] as const,
  imageGeneration: [
    // For image models
  ] as const,
  speech: [
    // For speech-to-text models
  ] as const,
  textToSpeech: [
    // For text-to-speech models
  ] as const,
};
```

2. **Update utility functions**:

```typescript
// src/constants/index.ts
export function getTextGenerationModels(): readonly string[] {
  return CLOUDFLARE_AI_MODELS.textGeneration;
}

export function getSpeechModels(): readonly string[] {
  return CLOUDFLARE_AI_MODELS.speech;
}

export function getTextToSpeechModels(): readonly string[] {
  return CLOUDFLARE_AI_MODELS.textToSpeech;
}
```

3. **Test the integration**:

```bash
pnpm dev
# Test the new model in the UI
```

## 🤝 **Contributing**

We welcome contributions!

### Quick Start for Contributors

```bash
# Fork the repo and clone your fork
git clone https://github.com/devhims/opengpt.git

# Create a feature branch
git checkout -b feature/new-feature

# Make your changes and test
pnpm dev

# Run linting and formatting
pnpm lint
pnpm format

# Commit using conventional commits
git commit -m "feat: add new feature"

# Push and create a PR
git push origin feature/new-feature
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with Tailwind class sorting
- **Linting**: ESLint with Next.js rules

## 📄 **License**

This project is licensed under the MIT License.

<div align="center">

**Made with ❤️ for the AI community**

⭐ **Star this repo** if you find it useful!

</div>
