export default class DifficultyManager {
  constructor() {
    this.baseSettings = {
      platformDistance: 5,
      heightVariation: 1,
      platformWidth: 2.5,
      platformDepth: 2.5,
      rotationRange: Math.PI / 20,
      lateralVariation: 2,
      difficultyIncreaseDistance: 125,
    };

    this.distanceTraveled = 0;
    this.difficultyLevel = 0;
    this.maxDifficultyLevel = 14;
  }
  updateDifficulty(playerZ) {
    if (this.isTestMode) this.difficultyLevel = this.testDifficultyLevel;
    else {
      this.distanceTraveled = Math.abs(playerZ);
      this.difficultyLevel = Math.min(
        this.maxDifficultyLevel,
        Math.floor(
          this.distanceTraveled / this.baseSettings.difficultyIncreaseDistance
        )
      );
    }

    return {
      platformDistance: this.calculatePlatformDistance(),
      heightVariation: this.calculateHeightVariation(),
      platformSize: this.calculatePlatformSize(),
      rotationRange: this.calculateRotationRange(),
      lateralVariation: this.calculateLateralVariation(),
      shape: this.selectPlatformShape(),
    };
  }
  calculatePlatformDistance() {
    return (
      this.baseSettings.platformDistance * (1 + this.difficultyLevel * 0.1)
    );
  }
  calculateHeightVariation() {
    return (
      this.baseSettings.heightVariation * (1 + this.difficultyLevel * 0.15)
    );
  }
  calculatePlatformSize() {
    const scaleFactor = Math.max(0.6, 1 - this.difficultyLevel * 0.04);
    return {
      width: this.baseSettings.platformWidth * scaleFactor,
      depth: this.baseSettings.platformDepth * scaleFactor,
    };
  }
  calculateRotationRange() {
    return this.baseSettings.rotationRange * (1 + this.difficultyLevel * 0.2);
  }
  calculateLateralVariation() {
    return (
      this.baseSettings.lateralVariation * (1 + this.difficultyLevel * 0.1)
    );
  }
  selectPlatformShape() {
    const shapes = ["cube"];
    if (this.difficultyLevel >= 2) shapes.push("sphere");
    if (this.difficultyLevel >= 4) shapes.push("cylinder");
    if (this.difficultyLevel >= 6) shapes.push("pyramid");

    return shapes[Math.floor(Math.random() * shapes.length)];
  }
}