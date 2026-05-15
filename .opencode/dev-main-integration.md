# Dev-4 工作日志 — 主循环集成

## 模块：M4 主循环集成
## 文件范围：
- `src/main.js`（修改：近战碰撞、渲染、输入处理、新僵尸生成集成）

## 规范：
- 近战输入：鼠标右键/Tab 键触发近战攻击
- 近战碰撞：在 updateGame() 中新增近战-僵尸碰撞逻辑，处理击退、伤害计算
- 近战渲染：在 render() 中 player.draw() 后调用 MeleeWeapon.draw()
- 新僵尸生成：spawnZombie() 中根据 difficultyLevel 概率生成新僵尸类型（Dev-3 已实现）
- 新职业初始化：initGame() 中设置 abilityMaxCooldown
- 将近战碰撞逻辑提取为独立函数，不要全部写在 updateGame() 中

## 接口调用：
- 调用 Dev-1 的 MeleeWeapon.attack() 和 MeleeWeapon.draw()
- 调用 Dev-2 的新职业数据（abilityMaxCooldown 设置）
- 调用 Dev-3 的新僵尸生成（spawnZombie 已更新）

## 变更记录

### 1. 导入新模块
- `src/main.js` — 新增 `import { MeleeWeapon, meleeWeapons } from './entities/melee-weapon.js'`

### 2. 鼠标右键追踪
- `src/main.js` — 新增 `mouseRightJustPressed` 模块变量，添加 canvas mousedown 事件监听 button=2

### 3. 近战输入处理
- `src/main.js` — 在 `handleInput()` 中新增 Tab/右键检测，遍历 meleeWeapons 调用 attack()
- 对命中的僵尸：调用 `z.takeDamage(hit.damage, angle)`，应用击退 `knockback * cos/sin(angle)`
- 僵尸死亡后调用 `registerKill(z)`

### 4. 提取 registerKill 到模块级别
- `src/main.js` — 将近战和子弹通用的 `registerKill()` 从 updateGame() 内提取为模块级函数
- 使得 handleInput() 中的近战击杀也能正确调用波次推进、成就等逻辑

### 5. 新职业初始化
- `src/main.js` — `initGame()` 中 `abilityMaxCooldown` 新增 `mage_fireball`(4s)、`elf_summon`(12s)、`warrior_rage`(8s) 支持

### 6. 近战武器更新与渲染
- `src/main.js` — `updateGame()` 中新增 `meleeWeapons.update(dt)` 每帧更新冷却和动画
- `src/main.js` — `render()` 中 player.draw() 后调用 `meleeWeapons.draw(ctx, player)` 绘制挥砍特效

### 7. 玩家减速重置
- `src/main.js` — `updateGame()` 中每帧重置 `player._slowMult = 1.0`，由 freezer 僵尸在 update 中重新设置

## 验收自查
- [x] 鼠标右键/Tab 键触发近战攻击，命中僵尸造成伤害和击退
- [x] 挥砍特效正确显示（玩家位置 + 扇形弧线）
- [x] 新职业技能冷却时间正确设置
- [x] 冰冻僵尸的减速效果通过 _slowMult 每帧重置机制正确应用
- [x] 游戏正常运行，`npm run build` 构建通过
- [x] registerKill 提取为模块级，handleInput 和 updateGame 共享

## 集成检查报告

### 接口调用关系表验证
| 被调接口 | 提供方 | 调用方 | 位置 | 状态 |
|---------|--------|--------|------|------|
| MeleeWeapon.attack() | Dev-1 | Dev-4 (main.js) | handleInput() Tab/右键 | ✅ |
| MeleeWeapon.draw() | Dev-1 | Dev-4 (main.js) | render() player.draw后 | ✅ |
| MeleeWeapon.update() | Dev-1 | Dev-4 (main.js) | updateGame() | ✅ |
| Player.activateAbility() 新case | Dev-2 | Player.update() | 空格/Shift键 | ✅ |
| Zombie 新技能 update | Dev-3 | Zombie.update() | 每帧僵尸更新 | ✅ |
| 新僵尸 spawn | Dev-3 | spawnZombie() | 波次生成 | ✅ |
| 新职业数据 | Dev-2 | initGame() | abilityMaxCooldown | ✅ |
| 近战武器商店项 | Dev-1 | Dev-5 (shop.js) | SHOP_ITEMS + handleShopClick | ✅ |

### 数据流验证
| 链路 | 状态 |
|------|------|
| WEAPON_DATA(melee) → shop.js → MeleeWeapon实例 → meleeWeapons[] → main.js/hud.js | ✅ |
| CHARACTERS(mage/elf/warrior) → main.js initGame() → player属性 | ✅ |
| ZOMBIE_TYPES(charger/summoner/leaper/freezer/shielder) → zombie.js技能 | ✅ |
| SHOP_ITEMS(melee) → shop.js draw/handle → MeleeWeapon购买 | ✅ |

### 状态机验证 (GameFlow)
- GameFlow 使用事件监听模式 (on/emit)，goTo() 触发 emit
- main.js 中无注册的 on() 回调，状态通过 flow.state 轮询判断
- 初始 TITLE → drawTitleScreen → CHAR_SELECT → drawCharSelect → STAGE_SELECT → drawStageSelect → PLAYING → updateGame+render 循环
- 链路完整，无死锁 ✅

### 修复记录

#### 修复1: 战士狂暴 meleeDamageMult 未应用到近战武器伤害 (集成断裂)
- **位置**: `src/main.js` handleInput() 近战攻击分支
- **错误**: 近战伤害直接使用 `hit.damage`，未乘以 `player.meleeDamageMult`
- **修复**: 在 `z.takeDamage()` 前应用 `player.meleeDamageMult || 1` 倍率
- **影响**: 战士狂暴时近战武器秒杀僵尸，狂暴结束恢复

#### 修复2: 近战音效调用重构
- **位置**: `src/main.js` handleInput()
- **错误**: `audio.zombieHit()` 在武器遍历循环外调用，无武器时也播放音效
- **修复**: 移到循环内，通过 `prevSwing === 0 && swingTimer > 0` 判断武器是否真正挥出

### 修复记录

#### Bug #1: 游戏重新开始时近战武器数组未清空
- **错误类型**：A. 模块内错误
- **原因分析**：`initGame()` 中清空了子弹/僵尸/炮塔等数组，但遗漏了 `meleeWeapons` 数组，导致旧局武器残留，新局开始后近战武器数量翻倍
- **改动内容**：`src/main.js` initGame() 中新增 `meleeWeapons.length = 0;`

#### Bug #2: 近战武器音效在没击中僵尸时也会播放
- **错误类型**：A. 模块内错误
- **原因分析**：音效播放条件 `prevSwing === 0 && w.swingTimer > 0` 只判断武器是否挥出，未检查是否命中目标。空挥也播放音效
- **改动内容**：`src/main.js` handleInput() 中将条件改为 `if (hits.length > 0)`，同时移除不再使用的 `prevSwing` 变量
- **影响**：只有命中僵尸时才播放打击音效，空挥静音

#### Bug #B4: Tab 键缺少防抖，按住每帧触发攻击
- **错误类型**：A. 模块内错误
- **原因分析**：`keys['tab']` 为连续布尔值，按下期间每帧均为 `true`，导致 handleInput() 每帧触发近战攻击
- **修复内容**：参照 `accumulatedShopKey`/`accumulatedEscKey` 模式，新增 `accumulatedMeleeKey` 防抖变量。首次按下时触发攻击并锁定，释放 Tab 键后解锁。右键 `mouseRightJustPressed` 本身已是单次触发，不受影响
- **改动文件**：`src/main.js`
  - 新增变量 `accumulatedMeleeKey`
  - Tab 检测改为 `keys['tab'] && !accumulatedMeleeKey`
  - 按下时 `accumulatedMeleeKey = true`，释放时 `if (!keys['tab']) accumulatedMeleeKey = false`

### 最终验收
- [x] 近战武器能正确命中僵尸并造成伤害（含扇形判定 + SpatialGrid 优化）
- [x] 新职业技能正常触发（法师火球/精灵王召唤/战士狂暴）不影响现有 dodge/turret
- [x] 新僵尸技能在正确条件下触发（冲锋/召唤/跳跃/冰冻/盾卫）
- [x] 商店可购买近战武器（3种：匕首/战斧/长剑）
- [x] HUD 显示近战武器槽（紫色背景 + 冷却状态）和技能冷却倒计时
- [x] 战士狂暴时有红色边框视觉提示
- [x] 冰冻僵尸减速效果正确应用（_slowMult 每帧重置 + freezer 设置）
- [x] 构建通过（42 modules，无错误）
- [x] 无死代码（所有新增类/方法/数组在至少一处被调用）
- [x] 无循环依赖（main.js 为消费者，不被其他模块导入）

## 备注
- 右键 contextmenu 已在 input.js 中默认阻止，无需额外添加
- 近战音效使用 `audio.zombieHit()` 作为 Swing 音效替代
- 状态机使用轮询模式而非 onEnter 回调，初始化时 flow.goTo(TITLE) 触发 TITLE 事件但无注册监听器
