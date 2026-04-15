# Amanah AI

A modern AI-powered halal compliance platform built to help businesses verify and maintain halal standards in their supply chains. Amanah uses Claude AI to provide intelligent product analysis, audit reporting, and compliance tracking.

**Live Demo:** [https://amanah-ai.vercel.app](https://amanah-ai.vercel.app)

## Overview

Amanah AI simplifies halal compliance management by leveraging advanced AI to:
- Analyze product ingredients and certifications against halal standards
- Generate comprehensive audit reports with PDF export
- Track supply chain traceability and compliance history
- Provide real-time compliance recommendations
- Manage batch product assessments and quality checks

Perfect for food manufacturers, retailers, restaurants, and halal certification bodies.

## Features

### 🔍 Intelligent Product Analysis
- AI-powered ingredient verification using Claude API
- Real-time halal compliance checking
- Detailed product analysis with compliance status indicators
- Support for multiple product formats and certifications

### 📋 Audit & Reporting
- Generate professional audit reports in PDF format
- Batch audit capabilities for multiple products
- Comprehensive compliance timelines
- Exportable audit summaries for regulatory documentation

### 📊 Compliance Dashboard
- Visual traceability timeline of supply chain stages
- Compliance status tracking
- Audit history and records
- Real-time compliance metrics and KPIs

### 💬 AI Assistant
- Interactive chat interface with Claude AI
- Instant halal compliance queries
- Personalized compliance recommendations
- Multi-turn conversation support

### 🔐 Enterprise Features
- Secure user authentication and authorization
- Role-based access control
- Rate limiting and DDoS protection
- Data encryption for sensitive information
- Supabase-powered backend

### 📱 Modern UI/UX
- Responsive design for all devices
- Smooth animations and transitions
- Intuitive navigation
- Dark mode optimized interface

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (React 19)
- **UI Components:** shadcn/ui, Base UI
- **Styling:** Tailwind CSS 4, Class Variance Authority
- **Animations:** Framer Motion
- **Visualization:** Recharts
- **PDF Generation:** @react-pdf/renderer

### Backend & Services
- **API:** Anthropic Claude API (claude-opus, claude-sonnet)
- **Authentication & Database:** Supabase
- **Hosting:** Vercel
- **QR Code:** qrcode.react

### Development
- **Language:** TypeScript
- **Linting:** ESLint
- **Build Tool:** Next.js with Turbopack

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Anthropic API key
- Supabase project setup
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/amanah-ai.git
   cd amanah-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```bash
   # Anthropic API
   NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key_here

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Optional: Google Generative AI (for additional features)
   NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
amanah-ai/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Landing page
│   ├── components/       # React components
│   │   ├── ChatWidget.tsx        # AI chat interface
│   │   ├── AuditReportPDF.tsx    # PDF report generator
│   │   ├── traceability-timeline.tsx
│   │   └── ...
│   ├── lib/              # Utility functions & helpers
│   │   ├── supabase.ts           # Supabase client
│   │   ├── checker-logic.ts      # Halal checking logic
│   │   ├── pdf-generator.ts      # PDF utilities
│   │   ├── rate-limit.ts         # Rate limiting
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript types
│   └── proxy.ts          # API proxy
├── public/               # Static assets
├── supabase/             # Supabase configuration
└── package.json          # Dependencies
```

## Usage Examples

### Basic Product Compliance Check
1. Navigate to the application
2. Enter product details (name, ingredients, certifications)
3. Click "Check Compliance"
4. Receive instant AI-powered assessment

### Generate Audit Reports
1. Go to Audit section
2. Select products or batches to audit
3. Click "Generate Report"
4. Download PDF for record-keeping

### Use the AI Assistant
1. Open the chat widget
2. Ask questions about halal compliance
3. Get real-time recommendations
4. Export conversation history if needed

## Deployment

The application is optimized for deployment on Vercel:

```bash
# Deploy to Vercel
vercel deploy
```

### Environment Variables on Vercel
Add the same environment variables in Vercel project settings → Environment Variables.

## API Integration

### Anthropic Claude API
The app uses Claude for intelligent product analysis and compliance checking:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
});

// Check product compliance
const message = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: "Check if this product is halal compliant...",
    },
  ],
});
```

## Security

- All sensitive data is encrypted
- Rate limiting prevents abuse
- Supabase provides secure authentication
- Environment variables keep secrets safe
- Input validation and sanitization implemented

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, questions, or feedback:
- 📧 Email: support@amanah-ai.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/amanah-ai/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/amanah-ai/discussions)

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- AI powered by [Anthropic Claude API](https://anthropic.com)
- Database by [Supabase](https://supabase.com)
- Hosted on [Vercel](https://vercel.com)

---

**Amanah** - Ensuring Halal Compliance with AI ✨
