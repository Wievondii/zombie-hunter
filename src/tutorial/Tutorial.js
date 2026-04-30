import { IW, IH } from '../config.js';
import { drawText, FONT } from '../ui/TextRenderer.js';

export class Tutorial {
  constructor() {
    this.steps = [
      { text: 'WASD 或方向键移动', trigger: 'start', duration: 4 },
      { text: '鼠标瞄准并点击射击', trigger: 'start', duration: 4, delay: 4 },
      { text: '按 1-4 切换武器', trigger: 'start', duration: 4, delay: 8 },
      { text: '按 E 打开商店购买装备', trigger: 'wave2', duration: 5 },
      { text: '击杀僵尸获取金币和装备', trigger: 'kill5', duration: 5 },
      { text: '每5波可选择永久增益', trigger: 'wave5', duration: 5 },
    ];
    this.activeStep = 0;
    this.timer = 0;
    this.delayTimer = 0;
    this.completed = false;
    this.alpha = 0;
    this.enabled = true;
  }

  disable() { this.enabled = false; }

  triggerEvent(event) {
    if (!this.enabled || this.completed) return;
    for (let i = this.activeStep; i < this.steps.length; i++) {
      if (this.steps[i].trigger === event) {
        this.activeStep = i;
        this.delayTimer = this.steps[i].delay || 0;
        break;
      }
    }
  }

  update(dt) {
    if (!this.enabled || this.completed) return;
    if (this.activeStep >= this.steps.length) { this.completed = true; return; }

    if (this.delayTimer > 0) { this.delayTimer -= dt; return; }

    this.timer += dt;
    const step = this.steps[this.activeStep];

    if (this.timer < 0.5) this.alpha = this.timer / 0.5;
    else if (this.timer < step.duration - 0.5) this.alpha = 1;
    else if (this.timer < step.duration) this.alpha = (step.duration - this.timer) / 0.5;
    else {
      this.timer = 0;
      this.activeStep++;
      this.alpha = 0;
    }
  }

  draw(c) {
    if (!this.enabled || this.completed || this.alpha <= 0) return;
    if (this.activeStep >= this.steps.length) return;

    const step = this.steps[this.activeStep];
    const y = IH * 0.12;
    const size = FONT.BODY();
    const tw = c.measureText(step.text).width || step.text.length * size * 0.6;

    c.fillStyle = `rgba(0,0,0,${this.alpha * 0.65})`;
    c.fillRect(IW / 2 - tw / 2 - 12, y - size - 4, tw + 24, size * 2 + 8);

    drawText(c, step.text, IW / 2, y, {
      size, color: '#FFD700', align: 'center', bold: true, alpha: this.alpha,
    });
  }
}
