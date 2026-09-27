# Dastavez AI — Urdu Script & Document Localizer

**Dastavez AI** (دستاویز) is a specialized, web-based document localization and translation tool built with Google AI Studio and the Gemini API. It transforms Roman Urdu, English, and informal text into formal, executive-ready Urdu and English documents tailored for Pakistani business, academic, and administrative workflows.

---

## Key Features

- **Linguistic Precision & Local Register Control:** Converts raw drafts, meeting notes, and Roman Urdu into clean, formal Urdu or executive-level English with adjustable stylistic registers (e.g., *Plain & Direct*, *Executive Legal/Formal*).
- **Curated Document Dockets:** Pre-configured templates for common local use cases:
  - Proposal (Roman Urdu to Executive English)
  - Research (English to Formal Urdu)
  - Commercial (Invoice Letters to Urdu)
  - Minutes (Operational Action Points)
  - Legal (Rental / Service Contract Clauses)
  - Official Press (Urdu to Global English)
- **Live Visual Font Switching:** Real-time font preview and switching for Latin/English text using editorial typefaces (*Cormorant Garamond*, *Plus Jakarta Sans*, and *Cinzel*).
- **One-Click Print-to-PDF:** Native, publication-ready PDF export utilizing print-optimized page breaks, clean margins, and automated UI chrome hiding (`window.print()`).
- **Dynamic LTR / RTL & Raw/Rendered View Toggles:** Effortless switching between Right-to-Left and Left-to-Right layouts, as well as raw Markdown or rendered document previews.

---

## Tech Stack

- **Frontend:** Single-file HTML5, CSS3, JavaScript (ES6+)
- **Styling & Design System:** Custom Heritage Manuscript theme (Warm Ivory, Charcoal, Terracotta Ink) with embedded Google Fonts
- **AI Core:** Google AI Studio / Gemini API
- **Deployment:** Zero-dependency single static file (compatible with Netlify, Vercel, or local browser hosting)

---

## Getting Started

### Prerequisites
An active Gemini API key from [Google AI Studio](https://aistudio.google.com/).

### Running Locally
1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox, Safari).
3. Enter your Gemini API key when prompted in the application interface.
4. Select a document docket or paste your source text to begin localization.

---

## PDF Export Instructions

1. Generate or review your localized document in the **Localized Output** pane.
2. Select your desired English display font from the toolbar dropdown.
3. Click the **Print / Export PDF** button.
4. In your browser's print preview dialog:
   - Destination: **Save as PDF**
   - Paper Size: **A4**
   - Background Graphics: **Enabled**
5. Save your document.

---

## License & Attribution

Designed and developed for regional document processing and bilingual communication workflows using Google AI tools.
