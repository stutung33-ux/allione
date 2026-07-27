/**
 * autosendSessions.js
 *
 * Shared singleton store for the active AutoSend session.
 * Both /autosend and /autostop import from here so they
 * always reference the same session object.
 *
 * Only one AutoSend session may be active at a time (global,
 * not per-channel). The owner must wait for it to finish or
 * manually /autostop it before starting another.
 */

/**
 * @typedef {Object} AutoSendSession
 * @property {string}  channelId       - ID of the channel receiving messages
 * @property {string}  ownerId         - Discord user ID that started the session
 * @property {number}  current         - Index of the message currently being sent (1-based)
 * @property {number}  total           - Total messages to send
 * @property {number}  delayMs         - Milliseconds to wait between messages
 * @property {boolean} running         - True while the loop is active
 * @property {boolean} cancelled       - Set to true by /autostop to abort the loop
 */

/** @type {AutoSendSession | null} */
let activeSession = null;

/** Returns the current session, or null if none is active. */
export function getSession() {
    return activeSession;
}

/** Creates and stores a new session; throws if one already exists. */
export function createSession(data) {
    if (activeSession) {
        throw new Error('An AutoSend session is already active.');
    }
    activeSession = { ...data, running: true, cancelled: false };
    return activeSession;
}

/** Removes the active session from memory. */
export function clearSession() {
    activeSession = null;
}
