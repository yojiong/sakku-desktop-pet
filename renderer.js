const pet = document.querySelector("#pet");
const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;

const states = {
  idle: { row: 0, frames: 6, durations: [280, 110, 110, 140, 140, 320], loop: true },
  runningRight: { row: 1, frames: 8, duration: 120, loop: true },
  runningLeft: { row: 2, frames: 8, duration: 120, loop: true },
  touch: { row: 3, frames: 4, duration: 140, loop: false },
  sakuraHover: { row: 4, frames: 5, duration: 150, loop: true },
  failed: { row: 5, frames: 8, duration: 140, loop: false },
  waiting: { row: 6, frames: 6, duration: 150, loop: false },
  activeTask: { row: 7, frames: 6, duration: 120, loop: false },
  controller: { row: 8, frames: 6, duration: 150, loop: false }
};

let currentState = "idle";
let frameIndex = 0;
let animationTimer = null;
let animationToken = 0;
let pointerDown = false;
let dragged = false;
let startScreenX = 0;
let startScreenY = 0;
let lastScreenX = 0;
let hoverTimer = null;
let inactivityTimer = null;
let randomRunToken = 0;
let spritePixels = null;
let mouseIgnored = false;

const spriteImage = new Image();
spriteImage.src = "./assets/spritesheet.webp";
spriteImage.addEventListener("load", () => {
  const canvas = document.createElement("canvas");
  canvas.width = spriteImage.naturalWidth;
  canvas.height = spriteImage.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(spriteImage, 0, 0);
  spritePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
});

function setMouseIgnored(ignore) {
  if (mouseIgnored === ignore) return;
  mouseIgnored = ignore;
  window.sakku.setMouseIgnored(ignore);
}

function isOpaqueAt(clientX, clientY) {
  if (!spritePixels) return true;
  const rect = pet.getBoundingClientRect();
  if (clientX < rect.left || clientX >= rect.right || clientY < rect.top || clientY >= rect.bottom) {
    return false;
  }

  const localX = Math.max(0, Math.min(FRAME_WIDTH - 1,
    Math.floor((clientX - rect.left) / rect.width * FRAME_WIDTH)));
  const localY = Math.max(0, Math.min(FRAME_HEIGHT - 1,
    Math.floor((clientY - rect.top) / rect.height * FRAME_HEIGHT)));
  const state = states[currentState];
  const atlasX = frameIndex * FRAME_WIDTH + localX;
  const atlasY = state.row * FRAME_HEIGHT + localY;
  const alphaIndex = (atlasY * spriteImage.naturalWidth + atlasX) * 4 + 3;
  return spritePixels[alphaIndex] > 24;
}

window.addEventListener("mousemove", event => {
  if (pointerDown) {
    setMouseIgnored(false);
    return;
  }
  setMouseIgnored(!isOpaqueAt(event.clientX, event.clientY));
});

window.addEventListener("mouseleave", () => {
  if (!pointerDown) setMouseIgnored(true);
});

function drawFrame(state, frame) {
  pet.style.backgroundPosition = `${-frame * FRAME_WIDTH}px ${-state.row * FRAME_HEIGHT}px`;
}

function playState(name, after = "idle") {
  const state = states[name];
  if (!state) return Promise.resolve();

  animationToken += 1;
  const token = animationToken;
  clearTimeout(animationTimer);
  currentState = name;
  frameIndex = 0;
  drawFrame(state, 0);

  return new Promise(resolve => {
    const step = () => {
      if (token !== animationToken) return resolve();
      const delay = state.durations?.[frameIndex] ?? state.duration;
      animationTimer = setTimeout(() => {
        if (token !== animationToken) return resolve();
        frameIndex += 1;
        if (frameIndex >= state.frames) {
          if (state.loop) frameIndex = 0;
          else {
            resolve();
            playState(after);
            return;
          }
        }
        drawFrame(state, frameIndex);
        step();
      }, delay);
    };
    step();
  });
}

async function startRandomRun() {
  randomRunToken += 1;
  const token = randomRunToken;
  const bounds = await window.sakku.getPetBounds();
  const area = await window.sakku.getWorkArea();
  if (!bounds || !area || pointerDown) return;

  const minX = area.x;
  const maxX = area.x + area.width - bounds.width;
  const targetX = minX + Math.random() * Math.max(0, maxX - minX);
  const direction = targetX >= bounds.x ? "runningRight" : "runningLeft";
  playState(direction);

  const distance = targetX - bounds.x;
  const duration = Math.max(800, Math.min(2600, Math.abs(distance) * 3));
  const startedAt = performance.now();

  const tick = now => {
    if (token !== randomRunToken || pointerDown) return;
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    window.sakku.movePet({ x: bounds.x + distance * eased, y: bounds.y });
    if (progress < 1) requestAnimationFrame(tick);
    else playState("idle");
  };
  requestAnimationFrame(tick);
}

pet.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  randomRunToken += 1;
  setMouseIgnored(false);
  pointerDown = true;
  dragged = false;
  startScreenX = event.screenX;
  startScreenY = event.screenY;
  lastScreenX = event.screenX;
  pet.setPointerCapture(event.pointerId);
  pet.classList.add("dragging");
  window.sakku.beginDrag({ x: event.screenX, y: event.screenY });
  resetInactivityTimer();
});

pet.addEventListener("pointermove", event => {
  if (!pointerDown) return;
  const distance = Math.hypot(event.screenX - startScreenX, event.screenY - startScreenY);
  if (distance > 5) dragged = true;
  const deltaX = event.screenX - lastScreenX;
  if (deltaX > 1 && currentState !== "runningRight") playState("runningRight");
  else if (deltaX < -1 && currentState !== "runningLeft") playState("runningLeft");
  lastScreenX = event.screenX;
  window.sakku.drag({ x: event.screenX, y: event.screenY });
});

pet.addEventListener("pointerup", async event => {
  pointerDown = false;
  pet.classList.remove("dragging");
  window.sakku.endDrag();
  try { pet.releasePointerCapture(event.pointerId); } catch {}
  if (dragged) {
    playState("idle");
    return;
  }
  await playState("touch");
  startRandomRun();
});

pet.addEventListener("pointerenter", () => {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    if (!pointerDown && currentState === "idle") playState("sakuraHover");
  }, 250);
});

pet.addEventListener("pointerleave", () => {
  clearTimeout(hoverTimer);
  if (!pointerDown && currentState === "sakuraHover") playState("idle");
});

pet.addEventListener("contextmenu", event => {
  event.preventDefault();
  window.sakku.showContextMenu();
});

window.sakku.onVolumeChanged(() => {
  if (!pointerDown && !currentState.startsWith("running")) playState("controller");
});

window.sakku.onScaleChanged(scale => {
  document.documentElement.style.setProperty("--pet-scale", String(scale));
});

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (!pointerDown && currentState === "idle") {
      playState(Math.random() < 0.75 ? "controller" : "failed");
    }
    resetInactivityTimer();
  }, 45_000);
}

playState("idle");
resetInactivityTimer();
