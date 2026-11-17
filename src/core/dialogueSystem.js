/**
 * COLD BLOOD ZOMBEY - STORY DIALOGUE SYSTEM
 * Handles interactive NPC dialogues (Old Thomas, Darrell, Mrs. Eleanor, Edward)
 * Advances through multi-line discussions with Kristin's forensic reactions.
 */

import { Sfx } from '../audio/sfx.js';

export let isDialogueActive = false;
let currentNPC = null;
let currentLineIdx = 0;
let currentActiveLines = [];
let onFinishCallback = null;
let lastOpenTime = 0;

export function isStoryDialogueOpen() {
  return isDialogueActive;
}

export function openStoryDialogue(npc, onComplete = null) {
  if (!npc || !npc.dialog) return;

  isDialogueActive = true;
  currentNPC = npc;
  currentLineIdx = 0;
  onFinishCallback = onComplete;
  lastOpenTime = performance.now();

  const overlay = document.getElementById('story-dialogue-overlay');
  const speakerEl = document.getElementById('story-dialog-speaker');
  const titleEl = document.getElementById('story-dialog-title');
  const contentEl = document.getElementById('story-dialog-content');
  const kristinBox = document.getElementById('story-dialog-kristin-box');
  const kristinText = document.getElementById('story-dialog-kristin-text');

  // Determine lines (initial vs repeated interview)
  if (npc.talked && npc.dialog.repeatLines) {
    currentActiveLines = npc.dialog.repeatLines;
  } else {
    currentActiveLines = npc.dialog.lines;
  }

  const kristinLine = (npc.talked && npc.dialog.repeatKristinResponse)
    ? npc.dialog.repeatKristinResponse
    : npc.dialog.kristinResponse;

  if (speakerEl) speakerEl.textContent = npc.dialog.speaker;
  if (titleEl) titleEl.textContent = npc.title || '';
  if (contentEl) contentEl.textContent = `"${currentActiveLines[0]}"`;

  if (kristinBox) {
    if (kristinLine) {
      kristinBox.style.display = 'block';
      if (kristinText) kristinText.textContent = `"${kristinLine}"`;
    } else {
      kristinBox.style.display = 'none';
    }
  }

  // Hide nearby prompts & banners so dialogue is crystal clear
  const promptEl = document.getElementById('npc-interaction-prompt');
  if (promptEl) promptEl.style.display = 'none';

  const kristinBanner = document.getElementById('kristin-npc-banner');
  if (kristinBanner) kristinBanner.style.display = 'none';

  if (overlay) {
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'auto';
  }

  if (Sfx && Sfx.playSmallBell) Sfx.playSmallBell(1900, 0.4);
}

export function advanceStoryDialogue() {
  if (!isDialogueActive || !currentNPC) return;

  // Prevent instant skipping on the same frame it was opened
  if (performance.now() - lastOpenTime < 180) return;

  currentLineIdx++;
  const lines = currentActiveLines || currentNPC.dialog.lines;

  if (currentLineIdx < lines.length) {
    const contentEl = document.getElementById('story-dialog-content');
    if (contentEl) contentEl.textContent = `"${lines[currentLineIdx]}"`;
    if (Sfx && Sfx.playSmallBell) Sfx.playSmallBell(2200, 0.35);
  } else {
    closeStoryDialogue();
  }
}

export function closeStoryDialogue() {
  if (!isDialogueActive) return;
  isDialogueActive = false;

  const overlay = document.getElementById('story-dialogue-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  const finishedNPC = currentNPC;
  currentNPC = null;
  currentLineIdx = 0;
  currentActiveLines = [];

  if (finishedNPC) {
    finishedNPC.talked = true;
  }

  if (typeof onFinishCallback === 'function') {
    const cb = onFinishCallback;
    onFinishCallback = null;
    cb(finishedNPC);
  }

  // Re-request pointer lock for FPS gameplay if game is running
  try {
    if (document.body && document.body.requestPointerLock) {
      document.body.requestPointerLock();
    }
  } catch (e) {}
}

export function initDialogueSystem() {
  const overlay = document.getElementById('story-dialogue-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      advanceStoryDialogue();
    });
  }

  const closeBtn = document.getElementById('story-dialog-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      advanceStoryDialogue();
    });
  }

  // Interactive Prompt (Click or Touch)
  const promptEl = document.getElementById('npc-interaction-prompt');
  if (promptEl) {
    promptEl.style.pointerEvents = 'auto';
    promptEl.style.cursor = 'pointer';

    const onPromptClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (typeof window.__triggerInteract === 'function') {
        window.__triggerInteract();
      }
    };

    promptEl.addEventListener('click', onPromptClick);
    promptEl.addEventListener('touchend', onPromptClick);
  }
}
