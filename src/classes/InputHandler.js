export default class InputHandler {
  constructor() {
    this.keys = [];

    this.addListeners();
  }
  addListeners() {
    window.addEventListener("keydown", ({ code }) => {
      if (
        (code === "KeyW" ||
          code === "KeyS" ||
          code === "KeyA" ||
          code === "KeyD" ||
          code === "ShiftLeft" ||
          code === "Space") &&
        !this.keys.includes(code)
      ) {
        this.keys.push(code);
      }
    });

    window.addEventListener("keyup", ({ code }) => {
      if (this.keys.includes(code))
        this.keys.splice(this.keys.indexOf(code), 1);
    });
  }
}