# 📜 Quest Generator — EQF Quest Builder

A web-based quest file builder for the [Endless Online](https://endless-online.com/) MMORPG, generating `.eqf` (Endless Quest Format) files with AI-powered generation, customizable templates, and real-time validation.

![Quest Generator Screenshot](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- **AI-Powered Generation** — Describe your quest in plain English and let Google Gemini generate a complete EQF file
- **Template Builder** — Choose from 6 pre-built quest templates (Kill Count, Fetch, Escort, Dialog, Delivery, Exploration) and customize parameters
- **Real-Time Validation** — Instant structural validation with error/warning feedback
- **Syntax Highlighting** — Color-coded EQF preview with keyword, string, number, and state highlighting
- **Pub File Parsing** — Upload your game's binary pub files (`.eif`, `.enf`, `.esf`, `.ecf`) for accurate item/NPC/spell/class IDs via [eolib](https://github.com/cirras/eolib-ts)
- **Reference Panel** — Browse NPCs, Items, Spells, Classes, Actions, and Rules with search and click-to-copy
- **Quest Refinement** — Iteratively refine AI-generated quests with follow-up instructions
- **Export** — Copy to clipboard or download as `.eqf` file

## 🚀 Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- A Google AI API key from [Google AI Studio](https://aistudio.google.com/apikey) (for AI generation)

### Installation

```bash
# Clone the repository
git clone https://github.com/Connor93/quest-generator.git
cd quest-generator

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173/`.

### Production Build

```bash
npm run build
npm run preview
```

## 📖 Usage

### 1. AI Generation
1. Open **⚙️ Settings** and paste your Google AI API key
2. Type a quest description in the prompt area (e.g., *"Create a quest where a blacksmith asks the player to collect 10 Iron Ore and return for a reward"*)
3. Click **✨ Generate with AI**
4. Use the **Refine** input to iterate on the result

### 2. Template Builder
1. Click **📋 Use Template**
2. Select a template (Kill Count, Fetch, Escort, etc.)
3. Fill in the parameters (NPC IDs, item IDs, quantities)
4. Click **🔨 Build from Template**

### 3. Pub File Loading
1. Open **⚙️ Settings**
2. Drag-and-drop your pub files into the upload area, or click to browse
   - Supported: `dat001.eif`, `dtn001.enf`, `dsl001.esf`, `dat001.ecf`
3. Data persists across sessions — upload files incrementally
4. The **📖 Reference** panel will show full game data with stats (HP, EXP, DMG, etc.)
5. AI generation will use your real game data for accurate ID references

### 4. Reference & Export
- Click **📖 Reference** to browse/search game entities — click any entry to copy its ID
- The **EQF Preview** panel validates your quest in real-time
- Use **📋 Copy** or **💾 Download** to export the final `.eqf` file

## 🏗️ Architecture

```
src/
├── main.js              # App entry — UI events, file upload, panels
├── quest-data.js        # EQF actions/rules definitions, system prompt
├── reference-data.js    # Dynamic game data (fallback defaults + parsed pub data)
├── pub-loader.js        # eolib-based binary pub file parsing
├── eqf-generator.js     # EQF formatting + syntax highlighting
├── eqf-validator.js     # Structural validation
├── quest-builder.js     # Template-based quest generation
├── gemini-service.js    # Google Gemini API integration
└── style.css            # Dark fantasy UI theme
```

## 🛠️ Tech Stack

- **[Vite](https://vitejs.dev/)** — Build tool & dev server
- **[eolib](https://github.com/cirras/eolib-ts)** — Endless Online protocol library for pub file parsing
- **[Google Gemini API](https://ai.google.dev/)** — AI quest generation
- **Vanilla JS/CSS** — No framework dependencies

## 📄 License

MIT
