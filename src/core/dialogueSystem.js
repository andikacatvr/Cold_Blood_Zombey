/**
 * COLD BLOOD ZOMBEY - STORY DIALOGUE SYSTEM
 * Handles interactive NPC dialogues (Old Thomas, Darrell, Mrs. Eleanor, Edward)
 * Advances through multi-line discussions with Kristin's forensic reactions.
 */

import { Sfx } from '../audio/sfx.js';

export let isDialogueActive = false;
let currentNPC = null;
let currentLineIdx = 0;
let onFinishCallback = null;

export function isStoryDialogueOpen() {
  return isDialogueActive;
}

export function openStoryDialogue(npc, onComplete = null) {
  if (!npc || !npc.dialog) return;

  isDialogueActive = true;
  currentNPC = npc;
  currentLineIdx = 0;
  onFinishCallback = onComplete;

  const overlay = document.getElementById('story-dialogue-overlay');
  const speakerEl = document.getElementById('story-dialog-speaker');
  const titleEl = document.getElementById('story-dialog-title');
  const contentEl = document.getElementById('story-dialog-content');
  const kristinBox = document.getElementById('story-dialog-kristin-box');
  const kristinText = document.getElementById('story-dialog-kristin-text');

  if (speakerEl) speakerEl.textContent = npc.dialog.speaker;
  if (titleEl) titleEl.textContent = npc.title || '';
  if (contentEl) contentEl.textContent = `"${npc.dialog.lines[0]}"`;

  if (kristinBox) {
    if (npc.dialog.kristinResponse) {
      kristinBox.style.display = 'block';
      if (kristinText) kristinText.textContent = `"${npc.dialog.kristinResponse}"`;
    } else {
      kristinBox.style.display = 'none';
    }
  }

  if (overlay) {
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
  }

  // Release pointer lock so user can interact/read
  try {
    if (document.exitPointerLock) document.exitPointerLock();
  } catch (e) {}

  if (Sfx && Sfx.playSmallBell) Sfx.playSmallBell(1900, 0.4);
}

export function advanceStoryDialogue() {
  if (!isDialogueActive || !currentNPC) return;

  currentLineIdx++;
  const lines = currentNPC.dialog.lines;

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

  if (finishedNPC) {
    finishedNPC.talked = true;
  }

  if (typeof onFinishCallback === 'function') {
    const cb = onFinishCallback;
    onFinishCallback = null;
    cb(finishedNPC);
  }

  // Re-request pointer lock for FPS gameplay
  try {
    document.body.requestPointerLock();
  } catch (e) {}
}

export function initDialogueSystem() {
  const closeBtn = document.getElementById('story-dialog-close-btn');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      advanceStoryDialogue();
    };
  }

  window.addEventListener('keydown', (e) => {
    if (isDialogueActive) {
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        advanceStoryDialogue();
      } else if (e.code === 'Escape') {
        closeStoryDialogue();
      }
    }
  });
}
