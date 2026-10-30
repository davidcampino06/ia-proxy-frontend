# IA Proxy Frontend

React + Vite client for the AI consumption platform with a rate limiting and quota Proxy.
It talks to [ia-proxy-backend](https://github.com/davidcampino06/ia-proxy-backend).

## Features

- Chat-like interface to send prompts to the AI service.
- Token quota progress bar (used vs. available), refreshed after every request.
- Requests-per-minute counter with a countdown until the reset.
- When the rate limit is reached (HTTP 429) the send button is disabled with a countdown.
- When the monthly quota is used up (HTTP 402) an upgrade modal with a simulated payment opens.
- Usage bar chart for the last 7 days (Chart.js).
- Current plan badge with a different color for FREE, PRO and ENTERPRISE.
- Token estimator shown before sending a prompt (1 token ≈ 4 characters).

## Run locally

```bash
npm install
npm run dev
```

By default it calls `http://localhost:8080`. To point to another backend create a `.env` file:

```
VITE_API_URL=https://your-backend.up.railway.app
```

## Deploy to Vercel

1. Import the `ia-proxy-frontend` repository in Vercel (framework preset: Vite).
2. Add the environment variable `VITE_API_URL` with the Railway backend URL.
3. Deploy.
