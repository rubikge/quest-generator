import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/** Genkit instance configured with Google AI (Gemini). Mirrors the kodolom prototype. */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
