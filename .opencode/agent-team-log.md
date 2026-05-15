# Agent Team 共享日志

> **项目**：Pixel Zombie Hunter — 全面游戏体验优化
> **创建时间**：2026-05-15 17:09
> **当前轮次**：第 1 轮

---

## 📝 经验教训
<!-- 首轮，暂无 -->

---

## 📋 第1轮计划

### 需求分析
- **一句话总结**：全面升级游戏体验 — 新增近战武器系统、扩展可选职业（法师/精灵王/战士等）、增加僵尸种类与技能、丰富僵尸攻击方式
- **涉及模块**：玩家实体、僵尸实体、武器数据、角色数据、波次系统、商店UI、HUD、主循环碰撞检测
- **技术栈**：Vanilla JS (ES Modules), Canvas 2D, Vite
- **项目类型**：**混合项目**（有接口模块：实体间碰撞/调用关系；无接口模块：UI风格、数据配置）

---

### 规范定义

#### 接口规范（模块间调用关系）

```typescript
// === 近战武器接口 ===
// src/entities/melee-weapon.js
export class MeleeWeapon {
  constructor(config: { name, damage, range, arc, cooldown, knockback, color })
  attack(player, zombies): HitResult[]  // 返回被击中的僵尸列表
  draw(ctx, player)
}

// === 职业特殊技能接口 ===
// src/data/characters.js 扩展
// special 字段新增类型: 'mage_fireball' | 'elf_summon' | 'warrior_rage' | 'dodge' | 'turret'
// Player.activateAbility() 中新增 case 分支

// === 僵尸技能接口 ===
// src/entities/zombie.js 扩展
// Zombie.update() 中新增技能行为:
// - charge(): 冲锋（加速冲向玩家）
// - summonMinion(): 召唤小僵尸
// - selfDestruct(): 自爆（已有 exploder，需扩展为新技能类型）
// - teleport(): 瞬移到玩家附近
// - freezeAura(): 冰冻光环（减速范围内玩家）
```

#### 接口调用关系表（🔑 防止集成断裂）

| 被调接口 | 提供方 | 调用方 | 调用时机 | 必须调用的位置 |
|---------|--------|--------|---------|-------------|
| MeleeWeapon.attack() | Dev-1 | Dev-4 (main.js) | 玩家按鼠标右键/近战键时 | `updateGame()` 中新增近战攻击分支 |
| MeleeWeapon.draw() | Dev-1 | Dev-4 (main.js) | 每帧渲染 | `render()` 中 player.draw() 之后 |
| Player.activateAbility() 新 case | Dev-2 | Dev-4 (main.js) | 玩家按空格/Shift | `Player.update()` 中已有调用点 |
| Zombie 新技能 update | Dev-3 | Dev-4 (main.js) | 每帧僵尸更新 | `Zombie.update()` 中 boss AI 之后 |
| 新僵尸 spawn | Dev-3 | Dev-4 (main.js) | 波次生成 | `spawnZombie()` 中新增类型判定 |
| 新职业数据 | Dev-2 | Dev-4 (main.js) | 游戏初始化 | `initGame()` 中已有调用点 |
| 近战武器商店项 | Dev-1 | Dev-5 (shop.js) | 商店购买 | `handleShopClick()` 中新增 type='melee' |

#### 🔑 关键语义约束

| 约束规则 | 说明 |
|---------|------|
| **近战攻击范围判定** | 使用扇形判定（arc 角度 + range 半径），不是矩形。从玩家 aimAngle 方向展开 arc/2 到 ±arc/2 |
| **近战攻击冷却** | 独立于枪械射速，使用 `meleeCooldown` 字段，初始 0，攻击后设为 weapon.cooldown |
| **职业技能不覆盖** | 新职业的 special 值必须是唯一字符串，Player.activateAbility() 用 else-if 链，不能破坏现有 dodge/turret |
| **僵尸技能触发条件** | 每个技能有最小距离阈值和冷却时间，防止僵尸同时使用多个技能 |
| **召唤物归属** | 召唤的小僵尸计入僵尸总数上限（MAX_ZOMBIES=150），死亡时不掉落金币 |
| **近战武器与枪械共存** | 玩家可同时拥有枪械和近战武器，鼠标左键=枪械，鼠标右键/Tab=近战 |

---

### 风格规范（数据配置 & UI）

| 维度 | 规范 |
|------|------|
| **近战武器颜色** | 刀=#CCCCCC, 斧=#8B4513, 剑=#B0C4DE, 锤=#696969 — 像素风，4-6px 宽 |
| **新职业颜色** | 法师=#9C27B0(紫), 精灵王=#4CAF50(绿), 战士=#F44336(红) — 与现有角色不冲突 |
| **新僵尸颜色** | 冲锋=#FF6F00(橙), 召唤师=#673AB7(深紫), 自爆=#FF1744(亮红), 冰冻=#00BCD4(青) |
| **技能特效** | 统一使用现有 particles 系统，颜色与技能类型匹配 |
| **UI 文本** | 全部中文，字体 Courier New monospace，与现有 HUD 一致 |
| **数据文件格式** | 与现有 data.js / characters.js 一致的 JS 对象导出 |

---

### 模块划分

| 模块 | Developer | 文件范围 | 依赖规范 |
|------|-----------|---------|---------|
| **M1: 近战武器系统** | Dev-1 | `src/entities/melee-weapon.js`（新建）, `src/data.js` 扩展 WEAPON_DATA | 接口规范：MeleeWeapon 类 |
| **M2: 新职业系统** | Dev-2 | `src/data/characters.js` 扩展, `src/entities/player.js` 新增 ability case | 接口规范：special 类型扩展 |
| **M3: 新僵尸与技能** | Dev-3 | `src/data.js` 扩展 ZOMBIE_TYPES, `src/entities/zombie.js` 新增技能逻辑 | 接口规范：僵尸技能行为 |
| **M4: 主循环集成** | Dev-4 | `src/main.js` 修改（碰撞检测、渲染、输入处理） | 接口调用关系表 |
| **M5: 商店 & HUD 适配** | Dev-5 | `src/ui/shop.js` 扩展, `src/ui/hud.js` 扩展（近战武器槽、技能冷却显示） | 风格规范 + 接口规范 |

---

### 并行策略

**Wave 1（可完全并行）：**
- Dev-1 创建 `melee-weapon.js` 并扩展 `data.js` 武器数据
- Dev-2 扩展 `characters.js` 新增职业 + `player.js` 新增技能 case
- Dev-3 扩展 `data.js` 僵尸类型 + `zombie.js` 新增技能逻辑

**Wave 2（依赖 Wave 1）：**
- Dev-4 在 `main.js` 中集成近战碰撞、新僵尸生成、新职业初始化
- Dev-5 在 `shop.js` 和 `hud.js` 中添加近战武器购买和显示

---

### 文件归属表

| 文件路径 | 归属 Developer | 操作 |
|---------|---------------|------|
| `src/entities/melee-weapon.js` | Dev-1 | 新建 |
| `src/data.js` (WEAPON_DATA 近战部分) | Dev-1 | 修改 |
| `src/data/characters.js` | Dev-2 | 修改（新增职业） |
| `src/entities/player.js` (activateAbility 新 case) | Dev-2 | 修改 |
| `src/data.js` (ZOMBIE_TYPES 扩展) | Dev-3 | 修改 |
| `src/entities/zombie.js` (新技能逻辑) | Dev-3 | 修改 |
| `src/main.js` (近战碰撞、渲染、输入) | Dev-4 | 修改 |
| `src/ui/shop.js` (近战武器商店项) | Dev-5 | 修改 |
| `src/ui/hud.js` (近战武器槽、技能冷却) | Dev-5 | 修改 |

---

### 集成责任人
- **集成负责人**：Dev-4（负责 main.js 的玩家-僵尸-武器全链路集成）
- **集成检查**：所有模块完成后，Dev-4 验证：
  - 近战武器能正确命中僵尸并造成伤害
  - 新职业技能正常触发且不影响现有职业
  - 新僵尸技能在正确条件下触发
  - 商店可购买近战武器
  - HUD 正确显示所有新元素

---

### 详细任务分解

#### Dev-1: 近战武器系统
1. **创建 MeleeWeapon 类** (`src/entities/melee-weapon.js`)
   - 属性：name, damage, range, arc(扇形角度), cooldown, knockback, color, icon
   - 方法：`attack(player, zombies)` — 扇形范围判定，返回命中列表
   - 方法：`draw(ctx, player)` — 绘制武器挥砍特效
   - 验收：独立测试可命中范围内僵尸，造成击退效果

2. **扩展武器数据** (`src/data.js`)
   - 新增近战武器：`melee_knife`（刀，快/低伤）, `melee_axe`（斧，慢/高伤/大击退）, `melee_sword`（剑，均衡）
   - 验收：数据可被 MeleeWeapon 正确读取

#### Dev-2: 新职业系统
1. **新增职业数据** (`src/data/characters.js`)
   - **法师**：hp=70, speed=170, damageMult=1.5, special='mage_fireball'（发射火球，CD=4s）
   - **精灵王**：hp=90, speed=190, special='elf_summon'（召唤精灵助战，CD=12s）
   - **战士**：hp=200, speed=150, armorMult=0.7, special='warrior_rage'（短时间减伤+近战伤害翻倍，CD=8s）
   - 验收：角色选择界面正常显示新职业

2. **扩展 Player 技能** (`src/entities/player.js`)
   - `activateAbility()` 新增 mage_fireball / elf_summon / warrior_rage case
   - 法师火球：创建特殊子弹（爆炸+燃烧效果）
   - 精灵王召唤：生成友方单位（类似 turret 但可移动）
   - 战士狂暴：临时 buff（减伤+近战伤害翻倍）
   - 验收：每个技能可正常触发，冷却计时正确

#### Dev-3: 新僵尸与技能
1. **新增僵尸类型** (`src/data.js`)
   - `charger`（冲锋僵尸）：高速直线冲锋，撞到玩家造成伤害
   - `summoner`（召唤僵尸）：定期召唤 1-2 个普通僵尸
   - `leaper`（跳跃僵尸）：跳跃到玩家附近
   - `freezer`（冰冻僵尸）：靠近玩家时施加减速 debuff
   - `shielder`（盾卫僵尸）：正面减伤 80%
   - 验收：数据格式与现有 ZOMBIE_TYPES 一致

2. **实现僵尸技能** (`src/entities/zombie.js`)
   - `Zombie.update()` 中根据 type 执行特殊行为
   - 冲锋：检测到玩家在范围内时加速冲刺，有冷却
   - 召唤：定时器触发，在周围生成普通僵尸（计入 MAX_ZOMBIES）
   - 跳跃：随机跳跃到玩家附近位置
   - 冰冻光环：持续检测距离，对范围内玩家施加 `_slowMult`
   - 验收：每个技能有合理的触发条件和冷却

#### Dev-4: 主循环集成
1. **近战输入处理** (`src/main.js`)
   - 新增鼠标右键/Tab 键检测，触发近战攻击
   - 调用 MeleeWeapon.attack() 并处理命中结果
   - 验收：按键触发近战，命中僵尸造成伤害

2. **近战碰撞集成** (`src/main.js`)
   - 在 `updateGame()` 中新增近战-僵尸碰撞逻辑
   - 处理击退效果、伤害计算（含 crit）
   - 验收：近战命中后僵尸扣血、击退、死亡正常

3. **近战渲染集成** (`src/main.js`)
   - 在 `render()` 中 player.draw() 后调用 MeleeWeapon.draw()
   - 验收：挥砍特效正确显示

4. **新僵尸生成集成** (`src/entities/zombie.js` spawnZombie)
   - 在 `spawnZombie()` 中根据 difficultyLevel 概率生成新僵尸类型
   - 验收：新僵尸随难度提升逐渐出现

#### Dev-5: 商店 & HUD 适配
1. **商店扩展** (`src/ui/shop.js`)
   - 在 SHOP_ITEMS 中新增近战武器购买项
   - 处理购买逻辑：玩家获得近战武器槽位
   - 验收：可购买近战武器，显示"已拥有"状态

2. **HUD 扩展** (`src/ui/hud.js`)
   - 武器栏显示近战武器（带图标）
   - 新增技能冷却显示（在 HUD 底部或侧边）
   - 验收：近战武器在武器栏可见，技能冷却倒计时正确

---

### 整体验收标准
- [ ] 近战武器可装备、可攻击、有挥砍特效、造成击退
- [ ] 法师可发射火球（范围爆炸），精灵王可召唤助战单位，战士可开启狂暴
- [ ] 角色选择界面显示所有新旧职业（至少 6 个）
- [ ] 至少 5 种新僵尸类型在游戏中出现
- [ ] 冲锋僵尸会冲刺、召唤僵尸会生成小怪、冰冻僵尸会减速玩家
- [ ] 商店可购买近战武器
- [ ] HUD 显示近战武器槽和技能冷却
- [ ] 游戏帧率稳定（60fps），无内存泄漏
- [ ] 所有新系统与现有系统（波次、商店、连击、成就）兼容

---

### 风险提示
- **风险1**：近战武器扇形判定性能 — 僵尸数量多时遍历开销大 → **应对**：使用已有的 SpatialGrid 做范围查询，不要遍历全部 zombies 数组
- **风险2**：召唤物导致僵尸数量爆炸 — 召唤僵尸无限生成小怪 → **应对**：召唤物计入 MAX_ZOMBIES 上限，召唤前检查数量
- **风险3**：新职业技能与现有系统冲突 — 法师火球与现有子弹系统不兼容 → **应对**：复用 bullet.js 的 acidProjectiles 数组或新建 meleeProjectiles 数组
- **风险4**：main.js 过度膨胀 — Dev-4 的修改使 main.js 更加臃肿 → **应对**：将近战碰撞逻辑提取为独立函数，不要全部写在 updateGame() 中
- **风险5**：僵尸技能 AI 复杂度 — 多个技能同时触发导致行为混乱 → **应对**：每个僵尸同一时间只能执行一个技能，使用优先级队列

---
✅ 计划完成

---

## 🔍 第1轮审查

### 审查结论
**❌ 需修改** — 发现 4 个 BLOCKER 级别问题必须修复后才能进入测试

### 模块审查结果

| 模块 | 审查员 | 结论 | BLOCKER | WARNING | SUGGESTION |
|------|--------|------|---------|---------|------------|
| M1: 近战武器系统 | Reviewer | ❌ | 1 | 1 | 2 |
| M2: 新职业系统 | Reviewer | ⚠️ | 0 | 2 | 0 |
| M3: 新僵尸与技能 | Reviewer | ❌ | 2 | 1 | 0 |
| M4: 主循环集成 | Reviewer | ❌ | 1 | 0 | 0 |
| M5: 商店 & HUD 适配 | Reviewer | ⚠️ | 0 | 2 | 1 |

### 🔴 严重问题（必须修复）

| # | 文件 | 位置 | 问题描述 | 建议修复方案 | 责任 Developer |
|---|------|------|----------|-------------|---------------|
| B1 | `melee-weapon.js` | 第148行 `_drawWeaponSprite` | 武器精灵使用 `this.swingAngle` 旋转，但未攻击时 `swingAngle=0`（固定向右），不跟随玩家瞄准方向 | `draw()` 方法中调用 `_drawWeaponSprite` 时传入 `player.aimAngle`，或 `_drawWeaponSprite` 默认使用 `player.aimAngle` | Dev-1 |
| B2 | `zombie.js` | 第312行 `onDeath()` | 召唤小僵尸(`isMinion=true`)死亡时仍调用 `comboSystem.onKill()`，错误增加连杀计数 | 在 `comboSystem.onKill()` 调用前添加 `if (!this.isMinion)` 检查 | Dev-3 |
| B3 | `zombie.js` | 第217-218行 `_updateLeapSkill` | 跳跃僵尸瞬移到 `leapTarget` 位置时未检查是否合法（可能在墙内/地图外） | 瞬移后使用 `clamp()` 限制在合法范围内，或检查 `tileMap.isWalkable()` | Dev-3 |
| B4 | `main.js` | 第229行 `handleInput` | Tab 键使用持续状态 `keys['tab']` 而非 just-pressed，按住 Tab 会每帧尝试攻击（虽然 cooldown 阻止实际攻击，但逻辑不干净） | 引入 `tabJustPressed` 变量追踪，或在 Tab 分支执行后设置 `keys['tab'] = false` | Dev-4 |

### 🟡 警告（建议修复）

| # | 文件 | 位置 | 问题描述 | 建议修复方案 | 责任 Developer |
|---|------|------|----------|-------------|---------------|
| W1 | `player.js` | 第253行 `warrior_rage` | 狂暴持续5秒但CD仅8秒，覆盖率62.5%可能过高 | 确认设计意图，考虑持续3-4秒或CD延长至10秒 | Dev-2 |
| W2 | `shop.js` | 第49行 owned 检查 | `MeleeWeapon` 构造函数没有 `weaponKey` 属性，购买时才设置。手动创建的实例可能缺少此字段导致重复购买 | 在 `MeleeWeapon` 构造函数中初始化 `this.weaponKey = config.weaponKey || null` | Dev-1 |
| W3 | `zombie.js` | 第705-710行 `spawnZombie` | 新僵尸类型共享同一个 `nr = Math.random()`，总概率10%而非"每种10%独立概率" | 若设计为每种独立10%，应使用独立 `Math.random()` 调用；若设计为总共10%，更新注释 | Dev-3 |
| W4 | `hud.js` | 第244行 | `meleeWeapons && meleeWeapons.length > 0` 中 `meleeWeapons` 是 const 数组永远 truthy，`&&` 冗余 | 简化为 `if (meleeWeapons.length > 0)` | Dev-5 |

### 🟢 建议（可选优化）

| # | 文件 | 位置 | 问题描述 | 建议修复方案 | 责任 Developer |
|---|------|------|----------|-------------|---------------|
| S1 | `data.js` | 第34-36行 | 近战武器数据缺少 `icon` 字段（计划中提到此属性） | 添加 `icon` 字段或从计划中移除此要求 | Dev-1 |
| S2 | `hud.js` | 第277-281行 | 技能冷却显示位置可能与波次进度条重叠 | 调整 Y 坐标或添加间距 | Dev-5 |
| S3 | `melee-weapon.js` | 第59行 | `results` 数组使用 push 可能多次扩容 | 预分配容量（影响极小，可选） | Dev-1 |

### 亮点
- ✅ 近战武器使用 SpatialGrid 做范围查询，性能优化到位
- ✅ 召唤物正确标记 `isMinion=true` 且不掉落金币/道具
- ✅ 盾卫僵尸的正面减伤逻辑正确（±60° 判定 + 角度归一化）
- ✅ 战士狂暴状态有完整的粒子特效 + 屏幕边框视觉反馈
- ✅ 法师火球复用现有 explosive 子弹系统，避免重复代码
- ✅ 精灵召唤复用 turret 系统并新增移动逻辑，设计合理
- ✅ 冰冻僵尸的减速机制通过每帧重置 + 光环检测实现，逻辑清晰
- ✅ 商店 owned 检查、canAfford、maxUpgrade 等状态判断完善
- ✅ HUD 近战武器槽使用紫色背景区分枪械，视觉设计合理
- ✅ `registerKill` 提取为模块级函数，近战和子弹击杀共享逻辑

### 审查结论
发现 4 个 BLOCKER 级别问题需要修复：
1. **B1**: 近战武器精灵方向不跟随玩家瞄准 — 视觉断裂
2. **B2**: 召唤小僵尸死亡增加连杀计数 — 游戏逻辑错误
3. **B3**: 跳跃僵尸可能瞬移到非法位置 — 可能导致卡死
4. **B4**: Tab 键缺少防抖 — 输入处理不干净

以上问题修复后可重新提交审查。WARNING 级别问题建议一并修复。

构建验证：✅ `npm run build` 通过（42 modules transformed）

---

## 🧪 第1轮测试
<!-- 测试员写入 -->

---

## 📊 Agent 状态（历史）
