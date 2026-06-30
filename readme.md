<div align="center">

# 🔗 WebhookLab — Webhook Inspection & Testing Gateway

**Test webhooks without deploying. Inspect, replay, transform, share.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
</div>

## 📖 What is WebhookLab?

Testing webhooks is a nightmare. You deploy first, expose an endpoint, debug signing issues, replay payloads manually. Ngrok/RequestBin just forward — no inspection, no replay, no team collaboration.

WebhookLab is a **persistent webhook gateway** for development and testing. Receive webhooks, inspect them in real-time, verify signatures, replay with edits, transform between formats, and share sessions with your team.

## ✨ Features

- 🔗 **Persistent Endpoints** — No expiration like RequestBin. URLs stay alive.
- ⚡ **WebSocket Live Feed** — Incoming webhooks appear instantly, terminal-style UI
- 🕵️ **Auto-Detect Provider** — Stripe, GitHub, Shopify, Slack → parse + verify signatures
- 🔄 **Payload Replay** — Resend with modified values to test edge cases
- 🔀 **Transform Engine** — Convert Stripe webhook → Slack message, GitHub → Discord, custom templates
- 👥 **Team Sharing** — Invite teammates to session, real-time collaboration
- ⏱️ **Retry Simulator** — Test how your app handles delayed/failed webhooks
- 🔍 **Search & Filter** — Search by content, header, timestamp, export as JSON/HAR
- 🌓 **Dark/Light Theme** — Glassmorphism UI

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│                 WebhookLab                     │
├──────────────┬──────────────┬────────────────┤
│   Frontend   │   Backend    │   Real-time    │
│  Next.js 14  │  API Routes  │  WebSocket     │
│  Terminal UI │  Prisma ORM  │  Live Feed     │
│  Framer      │  SQLite      │  Broadcast     │
└──────────────┴──────────────┴────────────────┘
```

## 🚀 Quick Start

```bash
git clone https://github.com/adlptv/webhooklab.git
cd webhooklab
pnpm install
pnpm dev
# → http://localhost:3000
```

Docker:
```bash
docker-compose up
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/endpoints` | List/create endpoints |
| GET/DELETE | `/api/endpoints/[id]` | Get/delete endpoint |
| GET | `/api/endpoints/[id]/requests` | List requests |
| GET | `/api/endpoints/[id]/requests/[reqId]` | Request detail |
| POST | `/api/endpoints/[id]/requests/[reqId]/replay` | Replay request |
| POST | `/api/endpoints/[id]/requests/[reqId]/transform` | Transform payload |
| POST | `/api/webhooks/[id]` | Webhook receiver (catch-all) |

## 🔐 Supported Providers

| Provider | Signature Verification | Auto-Detect |
|----------|----------------------|-------------|
| Stripe | ✅ `Stripe-Signature` | ✅ |
| GitHub | ✅ `X-Hub-Signature-256` | ✅ |
| Shopify | ✅ `X-Shopify-Hmac-SHA256` | ✅ |
| Slack | ✅ `X-Slack-Signature` | ✅ |

## 🔒 Security

- ✅ Zod validation all routes
- ✅ Webhook signature verification for all providers
- ✅ Rate limiting
- ✅ Helmet.js headers
- ✅ No secret logging

## 📄 License

MIT © [adlptv](https://github.com/adlptv)

---

⭐ Star to support the project!
