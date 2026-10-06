# Leaf Doctor

React Native (Expo) app that diagnoses plant diseases from a leaf photo using the free Plant.id health-assessment API (Kindwise).

## Setup
1. `npm install`
2. Get a free API key at https://admin.kindwise.com and copy `.env.example` to `.env`, then set `EXPO_PUBLIC_PLANTID_API_KEY`.
3. `npx expo start` and scan the QR code with Expo Go (or press `w` for web).

The free tier is limited (a small one-time credit allowance, ~50 credits). The key is bundled into the app, so this is for personal use; put a proxy in front for public release.

`src/services/diseaseApi.ts` exposes a `DiseaseService` interface, so another provider (e.g. Hugging Face) can be swapped in.
