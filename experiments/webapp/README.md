# Magentic UI Webapp

A web application for analyzing and browsing experimental run data with interactive dashboards and message visualization. This application helps researchers and developers explore, analyze, and understand the performance of AI agents and experimental systems.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- pnpm (recommended) or npm

### Installation

1. Clone the repository and navigate to the webapp directory:
```bash
git clone https://github.com/microsoft/magentic-ui.git
cd magentic-ui/experiments/webapp
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) to view the application.

## Features

### Data Import

Load multiple run directories for comparison

### Message Browser

Browse side-by-side chat histories to deep-dive into task successes & failures across systems and configurations.

### Data Analysis

Run LLM-as-a-judge analyses for a run and get actionable suggestions for improving the system prompt.

## Configuration

### Environment Setup

Create a `.env.local` file:

```env
# API Configuration
OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```
