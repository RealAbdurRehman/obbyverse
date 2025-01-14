export function createStarField() {
  const starsContainer = document.createElement("div");
  starsContainer.className = "stars";

  for (let i = 0; i < 200; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty("--twinkle-duration", `${Math.random() * 3 + 1}s`);
    starsContainer.appendChild(star);
  }

  document.querySelector("#loading-screen").prepend(starsContainer);
}

export function createCosmicEffects() {
  const cosmic = document.createElement("div");
  cosmic.className = "cosmic-background";

  const nebula = document.createElement("div");
  nebula.className = "nebula";

  document.querySelector("#loading-screen").prepend(cosmic);
  document.querySelector("#loading-screen").prepend(nebula);
}

export function updateTipText(tipText, tips) {
  let currentTip = 0;
  setInterval(() => {
    tipText.style.opacity = 0;
    setTimeout(() => {
      currentTip = (currentTip + 1) % tips.length;
      tipText.textContent = tips[currentTip];
      tipText.style.opacity = 1;
    }, 500);
  }, 3000);
}

export function createPlatforms(platformContainer, platformCount = 10) {
  platformContainer.innerHTML = "";
  const zRange = [-300, 100];

  for (let i = 0; i < platformCount; i++) {
    const platform = document.createElement("div");
    platform.className = "platform";

    const bottom = document.createElement("div");
    bottom.className = "platform-bottom";
    platform.appendChild(bottom);

    const col = i % 3;
    const row = Math.floor(i / 3);
    const baseX = col * 30 + Math.random() * 15;
    const baseY = row * 30 + Math.random() * 15;
    const z = zRange[0] + Math.random() * (zRange[1] - zRange[0]);

    const rotateY = Math.random() * 45 - 22.5;
    const rotateX = Math.random() * 45 - 22.5;

    platform.style.left = `${baseX}%`;
    platform.style.top = `${baseY}%`;
    platform.style.transform = `
        translateZ(${z}px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
      `;

    platformContainer.appendChild(platform);
  }
}

export function animatePlatforms() {
  const platforms = document.querySelectorAll(".platform");

  platforms.forEach((platform) => {
    const currentTransform = platform.style.transform;
    const currentZ = parseFloat(
      currentTransform.match(/translateZ\(([-\d.]+)px\)/)?.[1] || 0
    );
    const currentRotateX = parseFloat(
      currentTransform.match(/rotateX\(([-\d.]+)deg\)/)?.[1] || 0
    );
    const currentRotateY = parseFloat(
      currentTransform.match(/rotateY\(([-\d.]+)deg\)/)?.[1] || 0
    );

    const newZ = currentZ + (Math.random() * 40 - 20);
    const newRotateX = currentRotateX + (Math.random() * 10 - 5);
    const newRotateY = currentRotateY + (Math.random() * 10 - 5);

    platform.style.transform = `
        translateZ(${newZ}px)
        rotateX(${newRotateX}deg)
        rotateY(${newRotateY}deg)
      `;
  });
}