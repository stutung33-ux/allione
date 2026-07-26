// AI command — prefix: xai <message> | slash: /ai message:<text>
// Special values: "reset" clears conversation history; "toggle" (owner) enables/disables the feature.

import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { isBotOwner } from '../../config/bot.js';
import {
  isAiEnabled,
  toggleAi,
  checkCooldown,
  resetHistory,
  chat,
} from '../../services/aiService.js';

export default {
  category: 'AI',

  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Chat with the AI assistant')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Your message — or type "reset" to clear history / "toggle" (owner) to enable/disable')
        .setRequired(true)
        .setMaxLength(1000)),

  // ── Slash entry point ─────────────────────────────────────────────────────
  async execute(interaction) {
    const message = interaction.options.getString('message').trim();
    return dispatch(interaction, message);
  },

  // ── Prefix entry point: xai <anything> ───────────────────────────────────
  // Joins ALL args so "xai explain javascript closures" works as a full sentence.
  async prefixExecute(interaction) {
    const raw = interaction.options._hoistedOptions
      .map(o => o.value)
      .join(' ')
      .trim();

    if (!raw) {
      return InteractionHelper.safeReply(interaction, {
        embeds: [createEmbed({
          title: 'AI Chat',
          description: [
            '**Usage**',
            '`xai <message>` — ask the AI anything',
            '`xai reset` — clear your conversation history',
            '`xai toggle` — (owner) enable or disable AI',
          ].join('\n'),
          color: 'info',
        })],
      });
    }

    return dispatch(interaction, raw);
  },
};

// ── Shared dispatch ───────────────────────────────────────────────────────────

async function dispatch(interaction, message) {
  const lower = message.toLowerCase();
  if (lower === 'reset') return handleReset(interaction);
  if (lower === 'toggle') return handleToggle(interaction);
  return handleChat(interaction, message);
}

async function handleToggle(interaction) {
  if (!isBotOwner(interaction.user.id)) {
    return InteractionHelper.safeReply(interaction, {
      embeds: [createEmbed({ title: 'Permission Denied', description: 'Only bot owners can toggle the AI feature.', color: 'error' })],
    });
  }
  const enabled = toggleAi();
  return InteractionHelper.safeReply(interaction, {
    embeds: [createEmbed({
      title: 'AI Feature',
      description: `AI chat has been **${enabled ? 'enabled ✅' : 'disabled ❌'}**.`,
      color: enabled ? 'success' : 'warning',
    })],
  });
}

async function handleReset(interaction) {
  resetHistory(interaction.user.id);
  return InteractionHelper.safeReply(interaction, {
    embeds: [createEmbed({
      title: 'Conversation Reset',
      description: 'Your conversation history has been cleared. Starting fresh!',
      color: 'success',
    })],
  });
}

async function handleChat(interaction, message) {
  if (!isAiEnabled()) {
    return InteractionHelper.safeReply(interaction, {
      embeds: [createEmbed({ title: 'AI Disabled', description: 'The AI feature is currently disabled by the bot owner.', color: 'warning' })],
    });
  }

  const cd = checkCooldown(interaction.user.id);
  if (!cd.ok) {
    const secs = Math.ceil(cd.remaining / 1000);
    return InteractionHelper.safeReply(interaction, {
      embeds: [createEmbed({
        title: 'Slow Down!',
        description: `Please wait **${secs}s** before sending another message.`,
        color: 'warning',
      })],
    });
  }

  // Defer so the API call (up to ~20 s) doesn't time out the interaction.
  await InteractionHelper.safeDefer(interaction);

  try {
    const reply = await chat(interaction.user.id, message);
    return InteractionHelper.safeEditReply(interaction, {
      embeds: [createEmbed({
        title: '🤖 AI Response',
        description: reply.substring(0, 4096),
        color: 'primary',
        fields: [{ name: 'Your message', value: message.substring(0, 1024), inline: false }],
        footer: 'xai reset — clear conversation history',
      })],
    });
  } catch (err) {
    logger.error('AI command error:', err);
    const isConfig = err.message?.includes('OPENAI_API_KEY');
    return InteractionHelper.safeEditReply(interaction, {
      embeds: [createEmbed({
        title: 'AI Error',
        description: isConfig
          ? '`OPENAI_API_KEY` is not set. Ask the bot owner to add it to the environment secrets.'
          : `Something went wrong: ${err.message || 'Unknown error'}`,
        color: 'error',
      })],
    });
  }
}
