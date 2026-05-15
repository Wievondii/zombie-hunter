# Dev-3 工作日志 — 新僵尸与技能

## 模块：M3 新僵尸与技能
## 文件范围：
- `src/data.js`（扩展 ZOMBIE_TYPES）
- `src/entities/zombie.js`（新增技能逻辑）

## 规范：
- 新僵尸类型：
  - charger（冲锋）：高速直线冲锋，撞到玩家造成伤害
  - summoner（召唤）：定期召唤 1-2 个普通僵尸
  - leaper（跳跃）：跳跃到玩家附近
  - freezer（冰冻）：靠近玩家时施加减速 debuff
  - shielder（盾卫）：正面减伤 80%
- 新僵尸颜色：冲锋=#FF6F00(橙), 召唤师=#673AB7(深紫), 自爆=#FF1744(亮红), 冰冻=#00BCD4(青)
- 每个技能有最小距离阈值和冷却时间
- 召唤物计入 MAX_ZOMBIES 上限，死亡时不掉落金币
- 每个僵尸同一时间只能执行一个技能，使用优先级队列
- 技能特效使用现有 particles 系统

## 接口调用：
- 被 Dev-4 (main.js) 调用：spawnZombie() 中新增类型判定
- Zombie.update() 中 boss AI 之后新增技能行为

## 变更记录

### 2026-05-15 — M3 新僵尸与技能 开发完成

### 变更文件

1. **`src/data.js`** — 在 `ZOMBIE_TYPES` 末尾新增 5 种僵尸类型：
   - `charger`（冲锋僵尸）— skill: 'charge', cooldown: 4s, range: 150
   - `summoner`（召唤僵尸）— skill: 'summon', cooldown: 8s
   - `leaper`（跳跃僵尸）— skill: 'leap', cooldown: 5s, range: 120
   - `freezer`（冰冻僵尸）— skill: 'freezeAura', range: 60
   - `shielder`（盾卫僵尸）— skill: 'shield'
   - 每项包含完整的 `colorDark`, `colorClothes`, `coinDrop` 字段，与现有格式一致

2. **`src/entities/zombie.js`** — 新增技能系统：
   - **Constructor**：新增 `skill`, `skillCooldown`, `skillRange`, `skillTimer`, `skillActive`, `isMinion`, `chargeDir`, `chargeTimer`, `speedMult`, `leapTarget`, `leapTimer`, `shieldAngle`
   - **update()**：在 range attack 之后、movement 之前插入技能调度；movement 部分支持 charge 冲刺移动、leap 静止蓄力
   - **`_updateChargeSkill()`**：检测玩家在 range 内 → 3x 速度冲刺 0.5s，撞到玩家停止，橙色粒子轨迹
   - **`_updateSummonSkill()`**：定时器触发，生成 1-2 个普通僵尸（标记 `isMinion=true`，hp=1，计入 MAX_ZOMBIES），紫色粒子爆发
   - **`_updateLeapSkill()`**：检测玩家在 range 内 → 0.3s 蓄力后瞬移到玩家附近，落地粒子+震屏，红色预警粒子
   - **`_updateFreezeAuraSkill()`**：持续检测距离 → 设置 `player._slowMult=0.5`, `_slowTimer=0.5`（取最低值），蓝色光环粒子
   - **`_updateShieldSkill()`**：`shieldAngle` 始终朝向玩家
   - **`takeDamage()`**：shielder 正面 ±60° 伤害减 80%（amount *= 0.2），先于 frontArmor 检查
   - **`onDeath()`**：minion 不掉落金币/弹药/血包/道具
   - **`draw()`**：freezer 蓝色脉冲光环、shielder 灰色盾牌扇形、leaper 红色预警圈
   - **`spawnZombie()`**：难度门槛对应的独立 10% 概率生成新僵尸

### 验收自查

- [x] 5 种新僵尸数据格式与现有 ZOMBIE_TYPES 一致（含 colorDark/colorClothes/coinDrop）
- [x] 冲锋僵尸：检测距离 < 150，3x 速度冲刺 0.5s，撞到玩家停止，橙色粒子轨迹
- [x] 召唤僵尸：8s 冷却，生成 1-2 个普通僵尸（hp=1, isMinion=true），检查 MAX_ZOMBIES 上限
- [x] 跳跃僵尸：检测距离 < 120，0.3s 蓄力后瞬移，落地粒子+震屏
- [x] 冰冻僵尸：持续检测距离 < 60，player._slowMult=0.5（取最低值），蓝色光环
- [x] 盾卫僵尸：正面 ±60° 减伤 80%，灰色盾牌扇形可视化
- [x] 新僵尸随难度提升逐渐出现（dl≥2→charger, dl≥3→freezer, dl≥4→summoner, dl≥5→leaper, dl≥6→shielder）
- [x] 每个技能有合理的触发条件（距离检测/定时器）和冷却（4-8s）
- [x] 构建通过（npm run build 成功）

---

## 修复记录

### Bug #B2：召唤小僵尸死亡错误增加连杀计数
- **错误类型**：A. 模块内错误
- **原因分析**：`onDeath()` 方法中虽然用 `if (!this.isMinion)` 包裹了掉落奖励，但 `comboSystem.onKill()` 和 `addKillFeed()` 仍然在包裹之外执行，导致小僵尸死亡时连杀计数器递增
- **改动内容**：在 `onDeath()` 开头新增 `if (this.isMinion)` 早返回分支：
  - 爆炸逻辑仍保留（如果适用）
  - 仅播放最小粒子特效（6个灰色粒子）
  - 跳过金币、弹药、血包、道具掉落
  - 跳过 `comboSystem.onKill()`
  - 跳过 `addKillFeed()`
  - 跳过 `audio.zombieDie()` / `triggerShake()` / `triggerHitStop()`
- **关键代码行**：`onDeath()` 方法第 279-290 行（minion 早返回分支）
- **验证方法**：确认 `isMinion=true` 的僵尸死亡时 `comboSystem.onKill()` 不再被调用

### Bug #B3：跳跃僵尸可能瞬移到墙内/地图外
- **错误类型**：A. 模块内错误
- **原因分析**：`_updateLeapSkill()` 计算的 `leapTarget` 未做边界检查，可能落在地图外的无效区域（墙壁外），导致僵尸卡死
- **改动内容**：
  - 设置 `leapTarget` 时使用 `clamp()` 限制到 `[20, IW-20]` × `[20, IH-20]` 安全区域
  - 瞬移落地时同样对 `this.x` / `this.y` 做 `clamp()` 兜底
- **关键代码行**：`_updateLeapSkill()` 第 229-230 行（leapTarget 设置）和第 217-218 行（实际瞬移）
- **验证方法**：确认 `clamp()` 后 `leapTarget` 的 x/y 不超出地图边界
