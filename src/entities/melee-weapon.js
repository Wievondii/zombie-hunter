import { normalizeAngle } from '../utils.js';
import { WEAPON_DATA } from '../data.js';

/**
 * 玩家当前装备的近战武器数组。
 * Dev-5 (shop.js) 购买后 push 武器实例至此；
 * Dev-4 (main.js) 攻击时从此读取当前近战武器。
 */
export const meleeWeapons = [];

export class MeleeWeapon {
  /**
   * @param {Object} config
   * @param {string} config.name
   * @param {number} config.damage
   * @param {number} config.range      — 扇形半径 (px)
   * @param {number} config.arc        — 扇形弧度 (rad)
   * @param {number} config.cooldown   — 攻击冷却 (秒)
   * @param {number} config.knockback  — 击退力度
   * @param {string} config.color      — 武器/特效颜色
   */
  constructor(config) {
    this.name = config.name;
    this.damage = config.damage;
    this.range = config.range;
    this.arc = config.arc;
    this.cooldown = config.cooldown;
    this.knockback = config.knockback;
    this.color = config.color;
    this.icon = config.icon || null;
    this.weaponKey = config.weaponKey || null;

    // 运行时状态
    this.swingTimer = 0;    // 挥砍动画剩余时间 (秒)
    this.swingAngle = 0;    // 挥砍时的瞄准方向
    this._currentCooldown = 0;
  }

  /**
   * 每帧更新冷却与挥砍计时（由 main.js 每帧调用）。
   * @param {number} dt
   */
  update(dt) {
    if (this.swingTimer > 0) this.swingTimer = Math.max(0, this.swingTimer - dt);
    if (this._currentCooldown > 0) this._currentCooldown = Math.max(0, this._currentCooldown - dt);
  }

  /**
   * 执行扇形范围攻击。
   * 使用 SpatialGrid.query() 做空间索引查询，只遍历候选僵尸。
   *
   * @param {Player} player
   * @param {Array}  zombies   — 僵尸数组（备用，优先使用 grid）
   * @param {SpatialGrid} grid — 空间网格，用于范围查询
   * @returns {Array<{zombie, damage, knockback}>} 命中列表
   */
  attack(player, zombies, grid) {
    if (this._currentCooldown > 0) return [];

    const results = [];
    const px = player.x;
    const py = player.y;
    const aimAngle = player.aimAngle;
    const halfArc = this.arc / 2;
    const rangeSq = this.range * this.range;

    // 通过 SpatialGrid 获取 range 内所有实体
    const candidates = grid ? grid.query(px, py, this.range) : zombies;

    for (const zombie of candidates) {
      if (!zombie.alive) continue;

      const dx = zombie.x - px;
      const dy = zombie.y - py;
      const distSq = dx * dx + dy * dy;

      // 距离判定
      if (distSq > rangeSq) continue;

      // 角度判定
      const angleToZombie = Math.atan2(dy, dx);
      const angleDiff = normalizeAngle(angleToZombie - aimAngle);
      if (Math.abs(angleDiff) > halfArc) continue;

      results.push({
        zombie,
        damage: this.damage,
        knockback: this.knockback,
      });
    }

    // 触发挥砍动画
    this.swingTimer = 0.2;
    this.swingAngle = aimAngle;
    this._currentCooldown = this.cooldown;

    return results;
  }

  /**
   * 绘制武器挥砍特效。
   * @param {CanvasRenderingContext2D} ctx
   * @param {Player} player
   */
  draw(ctx, player) {
    const px = player.x | 0;
    const py = player.y | 0;

    // --- 挥砍弧线特效 ---
    if (this.swingTimer > 0) {
      const halfArc = this.arc / 2;
      const progress = 1 - (this.swingTimer / 0.2); // 0→1 渐隐
      const alpha = 0.4 * (1 - progress);
      const arcRadius = this.range * 0.8;
      const startAngle = this.swingAngle - halfArc;
      const endAngle = this.swingAngle + halfArc;

      ctx.save();

      // 填充扇形（半透明）
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, arcRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // 弧线描边
      ctx.globalAlpha = Math.min(1, alpha * 1.5);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, arcRadius, startAngle, endAngle);
      ctx.stroke();

      ctx.restore();
    }

    // --- 武器本体（像素风） ---
    // 挥砍时跟随 swingAngle（攻击瞬间的方向），未挥砍时跟随玩家实时朝向
    const weaponAngle = this.swingTimer > 0 ? this.swingAngle : player.aimAngle;
    this._drawWeaponSprite(ctx, px, py, weaponAngle);
  }

  /**
   * 绘制像素风武器精灵。
   * 4-6px 宽的简易 blade + handle。
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} px 玩家像素坐标 x
   * @param {number} py 玩家像素坐标 y
   * @param {number} angle 武器朝向角度
   */
  _drawWeaponSprite(ctx, px, py, angle) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    // 刀身：4px 宽 × 8px 长
    ctx.fillStyle = this.color;
    ctx.fillRect(-2, -10, 4, 8);

    // 护手
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(-3, -2, 6, 1);

    // 刀柄
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(-1, -1, 2, 4);

    ctx.restore();
  }
}
