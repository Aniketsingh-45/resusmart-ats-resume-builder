<div align="center">

# ✨ ResuSmart — AI-Powered ATS Resume Builder & Career Suite

**Next-Generation Career Acceleration Platform with Multi-Template Engine, Real-Time ATS Scoring, AI Chatbot Assistant, Certificate Intelligence & Pixel-Perfect Multi-Page PDF Generation.**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-v12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)](LICENSE)

[Key Features](#-key-features) • [10 Curated Templates](#-10-curated-templates) • [AI Career Intelligence](#-ai-career-intelligence--chatbot) • [Getting Started](#-getting-started) • [Environment Setup](#-environment-configuration) • [Project Structure](#-project-structure) • [Author](#-author)

---

</div>

## 🚀 Overview

**ResuSmart** is a state-of-the-art, full-lifecycle ATS (Applicant Tracking System) resume builder and career command center. Over 75% of resumes are eliminated by automated applicant tracking filters before ever reaching a human recruiter. ResuSmart levels the playing field by combining generative AI intelligence, dynamic multi-page layouts, deep ATS scoring algorithms, and interactive previewing to build recruiter-ready resumes in minutes.

Whether you are an aspiring software engineer, seasoned executive, data scientist, or recent graduate, ResuSmart equips you with the tools needed to pass screening algorithms with top percentile scores and land dream interviews.

---

## ✨ Key Features

### 🤖 AI Career Intelligence & Chatbot
- **Interactive AI Assistant & Chatbot**: Intelligent chatbot assistant integrated into the studio for real-time phrasing suggestions, section guidance, and personalized career advice.
- **Real-Time ATS Scoring Engine**: Instant 0–100 ATS scoring with breakdown of keyword density, formatting compliance, action verb strength, and success probability.
- **Job Description Matcher (Gap Analysis)**: Paste any target job description to get instant keyword gap analysis, missing industry skills, and tailored suggestions to maximize alignment.
- **STAR-Method Achievement Polisher**: Transform basic duty bullet points into quantifiable, high-impact achievements using action verbs (e.g., *Architected*, *Spearheaded*, *Optimized*).
- **One-Click ATS Optimizer**: Automatically standardize formatting, enrich keywords, and optimize descriptions across all sections while retaining factual accuracy.
- **AI Magic Write**: Instantly draft executive summaries, role descriptions, and project highlights tailored to your industry.

### 📥 Smart Multi-Source Import
- **PDF Resume Parser**: Upload any existing PDF resume to auto-populate the editor using advanced client-side PDF.js parsing combined with AI structuring.
- **AI Vision Image Extraction**: Upload screenshot images (PNG/JPEG) of resumes; vision models accurately transcribe and categorize every section into structured data.
- **GitHub Repository Sync**: Enter any GitHub username to automatically fetch public repositories, detect tech stacks, and populate formatted project cards.
- **LinkedIn Profile Sync**: Input a LinkedIn handle/URL to extract relevant professional milestones and skill summaries.

### 📄 10 Curated & Adaptive Templates
- **Pixel-Perfect Scaling Canvas**: Real-time zoom and scaling controls (50% to 150%) for fluid on-screen editing.
- **Multi-Page Dynamic Layout Engine**: Seamless multi-page document pagination with print-optimized CSS rules (`@media print`, `page-break-inside: avoid`).
- **Interactive Hyperlinks Preserved**: All links (`mailto:`, `tel:`, LinkedIn, GitHub, demo websites, portfolio links) remain fully clickable in both live preview and exported PDFs.
- **High-Resolution Photo Cropper**: Interactive 360° image rotation and aspect-ratio cropper powered by `react-easy-crop` for templates with profile images.
- **Comprehensive Personal & Indian Details Block**: Optional support for Father's name, DOB, marital status, nationality, domicile, category, masked Aadhaar ID, multilingual proficiencies, hobbies, and legal declarations.

### 🎓 Certificate Intelligence Engine
- **Role-Based ROI Certification Advisor**: Discover top industry certifications tailored to your target job title that offer the highest salary impact and hiring ROI.
- **Skill Gap Bridge**: Connect missing resume keywords with recommended accredited courses and verifiable certifications.
- **Free Learning Roadmaps**: Direct links to free, high-quality course materials, documentation, and official exam guides.

### 🎨 Deep Design Archetypes
- **12 Professional Color Palettes**: Slate, Indigo, Electric Blue, Emerald, Crimson, Amber, Violet, Cyan, Rose, Midnight, Dark Forest, plus Custom Color Picker.
- **8 Modern Typography Pairings**: Inter, Roboto, Outfit, Montserrat, Source Sans Pro, Playfair Display, Merriweather, JetBrains Mono.
- **Density & Spacing Controls**: Switch between compact, standard, and loose section spacing to fit content into exactly 1 or 2 pages.
- **Seamless Dark & Light Themes**: Full dark/light mode toggle with persistent local preferences and smooth glassmorphic interface.

### 📊 Career Command Center Dashboard
- **Application & Interview Tracker**: Log applications sent, track scheduled interviews, and monitor your personal interview conversion rate.
- **Cloud Firestore Real-Time Sync**: Automatically save resume drafts to your private Firebase account with instant synchronization across devices.

---

## 🎨 10 Curated Templates

| Template | Style Archetype | Best Suited For | Key Characteristics |
| :--- | :--- | :--- | :--- |
| **Modern Professional** | Left Accent Sidebar | Software Engineers, Tech Leads, PMs | High contrast sidebar, skill chips, modern badge layout |
| **Classic Chronological** | Centered Traditional | Finance, Consulting, Legal, Academics | Traditional serif/sans flow, clean horizontal section rules |
| **Student Entry-Level** | Education-First | New Graduates, Internships, Students | Prioritizes academics, coursework, projects & certifications |
| **Creative Vibrant** | Banner Gradient Header | Designers, Marketers, Creative Directors | Eye-catching header, bold color accents, portfolio focus |
| **Executive Minimal** | Typographic Hierarchy | Senior Executives, VPs, Directors | Clean, elegant whitespace with subtle corporate styling |
| **Minimalist Clean** | Monospaced Section Dividers | Minimalist, ATS-First Applications | Ultra-clean layout designed for 100% ATS parser compatibility |
| **Tech Focused** | Terminal / Hacker Aesthetic | DevOps, SREs, Backend Specialists | Terminal tags, monospace typography, code-style badges |
| **Modern Creative** | Narrative Hero Layout | Full-Stack Developers, Product Architects | Narrative project cards, dual-tone badges, modern typography |
| **Professional Photo** | Profile Header with Photo | Media, Hospitality, International Roles | Integrated avatar with circular/square crop and social links |
| **Executive Pro** | Premium Split Layout | C-Suite, Enterprise Architects, Founders | Executive summary card, prominent metrics, dual column split |

---

## 🛠️ Technology Stack

```
resusmart/
├── Frontend: React 19 • TypeScript 5.8 • TailwindCSS v4 • Framer Motion • Lucide React
├── PDF & Media: PDF.js • react-easy-crop • Native Canvas / Window Print API
├── Backend & Database: Firebase v12 (Auth, Cloud Firestore)
├── AI Intelligence: OpenRouter API • Google Gemini 2.5 Flash / GPT-4o-mini
└── Tooling: Vite 6.2 • TSX • Express Middleware
```

---

## 📁 Project Structure

```bash
resusmart_-ats-resume-builder/
├── public/
│   ├── favicon.svg             # Modern vector SVG favicon with AI insignia
│   └── _redirects              # SPA routing redirects for Netlify/Cloudflare
├── src/
│   ├── components/
│   │   ├── CertificateEngine.tsx # Certification intelligence & ROI analyzer
│   │   ├── Dashboard.tsx         # Career analytics & resume management
│   │   ├── Layout.tsx            # Navigation, brand header & view switcher
│   │   ├── ResumeEditor.tsx      # Comprehensive multi-tab resume builder
│   │   ├── ResumePreview.tsx     # 10 dynamic templates & canvas renderer
│   │   └── ThemeToggle.tsx       # Smooth Dark/Light mode theme switch
│   ├── config/
│   │   └── firebase.ts           # Firebase configuration
│   ├── context/
│   │   └── ThemeContext.tsx      # Theme context provider
│   ├── services/
│   │   └── aiService.ts          # AI models, ATS analysis, parser & chatbot
│   ├── types/
│   │   └── index.ts              # TypeScript schemas for resumes & users
│   ├── utils/
│   │   ├── cn.ts                 # Classname utility
│   │   └── url.ts                # URL normalizer & clickable link formatter
│   ├── App.tsx                   # Main application router & auth handler
│   ├── firebase.ts               # Firebase initialization & exports
│   ├── index.css                 # Global CSS & print stylesheet rules
│   └── main.tsx                  # React DOM root entrypoint
├── index.html                    # HTML entry with Open Graph & Favicon tags
├── server.ts                     # Express server & local development wrapper
├── vite.config.ts                # Vite build & TailwindCSS configuration
└── package.json                  # Dependencies and scripts
```

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** / **pnpm**
- Firebase Project (for Auth & Firestore)
- OpenRouter or Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/Aniketsingh-45/resusmart_-ats-resume-builder.git
cd resusmart_-ats-resume-builder
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:
```env
# AI Intelligence API Configuration
VITE_AI_API_KEY="your_openrouter_or_gemini_api_key"
VITE_AI_BASE_URL="https://openrouter.ai/api/v1"
VITE_AI_MODEL="openai/gpt-4o-mini"
GEMINI_API_KEY="your_gemini_api_key"

# Firebase Client Configuration (Optional for Cloud Sync)
VITE_FIREBASE_API_KEY="your_firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
```

### 4. Start the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` (or the port specified in terminal) in your browser.

---

## 📦 Build & Deployment

### Production Build
Compile the optimized production bundle:
```bash
npm run build
```

### Preview Production Build
Test the production build locally:
```bash
npm run preview
```

### Type Checking
Run TypeScript validation without emitting files:
```bash
npm run lint
```

### Deploying to Netlify / Vercel
1. Set the build command to `npm run build`.
2. Set the publish directory to `dist`.
3. Add your environment variables in the hosting provider's dashboard.
4. The included `public/_redirects` file handles client-side routing automatically.

---

## 🔒 Security & Privacy

- **Data Privacy**: Resume content and personal identifiable information (PII) are stored directly in your authenticated Firebase Cloud Firestore account under user-isolated collections.
- **Secret Isolation**: All API keys and environment variables are loaded via Vite's `import.meta.env` and excluded from version control via `.gitignore`.
- **ATS Compliance**: All exported resumes use standard semantic hierarchy and embed clean text streams, ensuring total legibility for all corporate ATS parsers (Workday, Taleo, Greenhouse, Lever, iCIMS).

---

## 👤 Author

**Aniket Singh**
- **GitHub**: [@Aniketsingh-45](https://github.com/Aniketsingh-45)
- **Project Repository**: [resusmart_-ats-resume-builder](https://github.com/Aniketsingh-45/resusmart_-ats-resume-builder)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.