import Game from "./classes/Game.js";
import {
  createStarField,
  createCosmicEffects,
  updateTipText,
  createPlatforms,
  animatePlatforms,
} from "./ui.js";

const game = new Game();

const platformContainer = document.querySelector(".platform-container");
const platformCount = 12;

for (let i = 0; i < platformCount; i++) {
  const platform = document.createElement("div");
  platform.className = "platform";

  platform.style.left = `${Math.random() * 80 + 10}%`;
  platform.style.top = `${Math.random() * 80 + 10}%`;

  platform.style.animationDelay = `${Math.random() * 2}s`;

  const rotateY = Math.random() * 360;
  const rotateX = Math.random() * 20 - 10;
  platform.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;

  platformContainer.appendChild(platform);
}

const tips = [
  "The further you go, the more challenging it gets!",
  "Be careful not to stay on a platform too long, or you might fall!",
  "Press SHIFT while moving to sprint",
  "Look ahead to plan your next move",
  "Each fall is a lesson - keep trying!",
  "Momentum is key for long jumps",
  "Time your jumps carefully to reach distant platforms!",
];

const tipText = document.querySelector(".tip-text");

updateTipText(tipText, tips);

createPlatforms(platformContainer);
setInterval(animatePlatforms, 3000);

createStarField();
createCosmicEffects();