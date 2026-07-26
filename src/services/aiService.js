// aiService.js — Manages AI conversation history, cooldowns, and API calls.
// Uses OpenAI-compatible API (requires OPENAI_API_KEY env var).

import axios from 'axios';
import { logger } from '../utils/logger.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-3.5-turbo';
const MAX_HISTORY = 10;        // messages kept per user (5 exchanges)
const COOLDOWN_MS = 5_000;     // 5 s between AI requests per user
const SYSTEM_PROMPT = 'You are a helpful, friendly Discord bot assistant. Keep replies concise and clear.';

// Per-user conversation history: Map<userId, Array<{role, content}>>
const histories = new Map();

// Per-user last-used timestamp for cooldown
const cooldowns = new Map();

// Owner-controlled global on/off toggle (default: enabled)
let aiEnabled = true;

/** Returns true if the AI feature is currently enabled by an owner. */
export function isAiEnabled() {
  return aiEnabled;
}

/** Toggle AI on/off. Returns the new state. */
export function toggleAi(enabled) {
  aiEnabled = (typeof enabled === 'boolean') ? enabled : !aiEnabled;
  return aiEnabled;
}

/**
 * Check cooldown for a user.
 * @returns {{ ok: boolean, remaining: number }} remaining is ms left if not ok.
 */
export function checkCooldown(userId) {
  const last = cooldowns.get(userId) || 0;
  const remaining = COOLDOWN_MS - (Date.now() - last);
  if (remaining > 0) return { ok: false, remaining };
  return { ok: true, remaining: 0 };
}

/** Reset a user's conversation history. */
export function resetHistory(userId) {
  histories.delete(userId);
}

/**
 * Send a message to the AI and get a reply.
 * Manages conversation history and cooldown recording.
 *
 * @param {string} userId
 * @param {string} userMessage
 * @returns {Promise<string>} The AI reply text.
 */
export async function chat(userId, userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Ask the bot owner to set it up.');
  }

  // Build messages array
  const history = histories.get(userId) || [];
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage.substring(0, 1000) },
  ];

  const response = await axios.post(
    OPENAI_API_URL,
    { model: MODEL, messages, max_tokens: 500, temperature: 0.7 },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 20_000,
    }
  );

  const reply = response.data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('Empty response from AI.');

  // Persist history (bounded)
  history.push({ role: 'user', content: userMessage.substring(0, 1000) });
  history.push({ role: 'assistant', content: reply });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  histories.set(userId, history);

  // Record cooldown
  cooldowns.set(userId, Date.now());

  logger.info('AI chat response generated', { userId, tokens: response.data.usage?.total_tokens });
  return reply;
}
