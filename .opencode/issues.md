# Issues Notepad

## 2026-05-15 第1轮审查 — 近战武器方向错误

**现象：**
- 近战武器在未攻击时始终指向右方（角度0），不跟随玩家瞄准方向

**原因：**
- `melee-weapon.js` 第148行 `_drawWeaponSprite` 使用 `this.swingAngle` 旋转画布
- `swingAngle` 初始值为0，仅在 `attack()` 时被设置为 `player.aimAngle`
- 攻击结束后 `swingTimer` 归0，但 `swingAngle` 保持最后攻击方向

**解决方案：**
- `draw()` 方法中调用 `_drawWeaponSprite(ctx, px, py, player.aimAngle)`
- 或 `_drawWeaponSprite` 内部使用 `player.aimAngle` 作为默认方向

**责任 Developer：** Dev-1

---

## 2026-05-15 第1轮审查 — 召唤小僵尸增加连杀计数

**现象：**
- 召唤僵尸死亡时错误地增加玩家连杀计数

**原因：**
- `zombie.js` 第312行 `onDeath()` 末尾无条件调用 `comboSystem.onKill(this.x, this.y)`
- `isMinion` 检查只跳过金币/道具掉落（第288行），但没跳过连杀计数

**解决方案：**
- 在 `comboSystem.onKill()` 调用前添加 `if (!this.isMinion)` 检查
- 或在 `onDeath()` 开头添加 `if (this.isMinion) { /* 简化死亡逻辑 */ return; }`

**责任 Developer：** Dev-3

---

## 2026-05-15 第1轮审查 — 跳跃僵尸瞬移位置不合法

**现象：**
- 跳跃僵尸可能瞬移到墙内或地图外

**原因：**
- `zombie.js` 第217-218行直接设置 `this.x = this.leapTarget.x; this.y = this.leapTarget.y`
- 没有使用 `clamp()` 或检查 `tileMap.isWalkable()`

**解决方案：**
- 瞬移后使用 `clamp()` 限制在合法范围内：`this.x = clamp(this.x, 10, IW - 10)`
- 或检查目标位置是否可走，不可走则选择备选位置

**责任 Developer：** Dev-3

---

## 2026-05-15 第1轮审查 — Tab 键缺少防抖

**现象：**
- 按住 Tab 键会每帧尝试近战攻击

**原因：**
- `main.js` 第229行使用 `keys['tab']`（持续状态）而非 just-pressed 变量
- 虽然 `attack()` 内部有 cooldown 检查，但逻辑不干净

**解决方案：**
- 引入 `tabJustPressed` 模块变量，在 `gameLoop` 末尾重置
- 或在 Tab 分支执行后设置 `keys['tab'] = false`

**责任 Developer：** Dev-4
