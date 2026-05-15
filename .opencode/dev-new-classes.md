# Dev-2 工作日志 — 新职业系统

## 模块：M2 新职业系统
## 文件范围：
- `src/data/characters.js`（扩展新职业）
- `src/entities/player.js`（新增 ability case）

## 规范：
- 新职业：
  - 法师：hp=70, speed=170, damageMult=1.5, special='mage_fireball'（火球，CD=4s）
  - 精灵王：hp=90, speed=190, special='elf_summon'（召唤，CD=12s）
  - 战士：hp=200, speed=150, armorMult=0.7, special='warrior_rage'（狂暴，CD=8s）
- 新职业颜色：法师=#9C27B0(紫), 精灵王=#4CAF50(绿), 战士=#F44336(红)
- special 值必须是唯一字符串，Player.activateAbility() 用 else-if 链
- 法师火球：创建特殊子弹（爆炸+燃烧效果）
- 精灵王召唤：生成友方单位（类似 turret 但可移动）
- 战士狂暴：临时 buff（减伤+近战伤害翻倍）

## 接口调用：
- 被 Dev-4 (main.js) 调用：新职业数据在 initGame() 中初始化
- Player.activateAbility() 新 case 在 Player.update() 中已有调用点

## 变更记录

### 2026-05-15 变更记录

#### 1. `src/data/characters.js` — 新增 3 个职业数据

新增职业对象：
- **mage（法师）**：hp=70, speed=170, damageMult=1.5, special='mage_fireball', color='#9C27B0'
- **elf（精灵王）**：hp=90, speed=190, damageMult=1.0, coinMult=1.2, special='elf_summon', color='#4CAF50'
- **warrior（战士）**：hp=200, speed=150, armorMult=0.7, fireRateMult=0.9, special='warrior_rage', color='#F44336'

#### 2. `src/entities/player.js` — 扩展技能系统

**构造函数新增属性：**
- `this.rageActive = false` — 狂暴状态标记
- `this.rageTimer = 0` — 狂暴剩余时间
- `this.meleeDamageMult = 1.0` — 近战伤害倍率

**update() 新增狂暴计时逻辑：**
- rageActive 期间每帧递减 rageTimer
- rage 结束时恢复 armorMult 和 meleeDamageMult
- 狂暴期间持续产生红色粒子环绕效果

**activateAbility() 新增 3 个 else-if 分支：**

1. **mage_fireball（火球术）：**
   - 向 aimAngle 方向发射 explosive 子弹，damage=60, speed=200
   - explosionRadius=40, color='#FF6F00', maxDistance=400
   - 复用 `bullets` 数组和现有 explosive 碰撞逻辑
   - 发射时产生橙色/红色粒子 + 屏幕震动

2. **elf_summon（精灵召唤）：**
   - 在玩家附近生成 `type='elf'` 的 turret 对象
   - hp=50, damage=15, fireRate=0.5, range=150, life=10s, speed=120
   - updateTurrets() 中处理精灵朝最近僵尸移动
   - drawTurrets() 中绘制绿色精灵像素图（翅膀+弓+头发）

3. **warrior_rage（狂暴）：**
   - 设置 rageActive=true, rageTimer=5
   - armorMult *= 0.5（额外减伤），meleeDamageMult=2.0
   - 保存原始 armorMult，rage 结束时恢复

**updateTurrets() 新增精灵移动逻辑：**
- type==='elf' 时寻找最近僵尸并朝其移动

**drawTurrets() 新增精灵绘制：**
- 绿色像素风精灵：身体#4CAF50，翅膀#A5D6A7，弓#8D6E63
- 带血条显示

## 验收自查
- [x] 角色选择界面正常显示新职业（6个以上）
- [x] 法师火球能发射并爆炸造成范围伤害（复用 explosive 子弹+ 已有碰撞逻辑）
- [x] 精灵王召唤的精灵能自动攻击僵尸（复用 turret 射击逻辑 + 新增移动）
- [x] 战士狂暴期间减伤且近战伤害翻倍
- [x] 技能冷却计时正确（使用 abilityMaxCooldown，由 Dev-4 在 main.js 中设置）
- [x] 不破坏现有 dodge/turret 技能（else-if 链末尾追加）

## 修复记录

### Bug #3：法师火球伤害未应用 damageMult 倍率
- **错误类型**：A. 模块内错误
- **原因分析**：`mage_fireball` case 中火球 damage 写死为 60，未乘以 `this.damageMult`，导致法师的 1.5 倍伤害加成未生效
- **改动内容**：`src/entities/player.js` 第 217 行 `damage: 60` → `damage: 60 * this.damageMult`
- **关键代码行**：`damage: 60 * this.damageMult,`
- **验证方法**：构建通过，法师火球伤害将正确应用 damageMult 倍率

### Bug #4：精灵召唤物移动无边界检查
- **错误类型**：A. 模块内错误
- **原因分析**：`updateTurrets()` 中精灵朝僵尸移动时直接累加坐标，未使用 `clamp` 限制范围，可能导致精灵移出画布
- **改动内容**：`src/entities/player.js` 第 458-459 行精灵坐标更新改用 `clamp()` 限制在 `[10, IW-10]` 和 `[10, IH-10]` 范围内
- **关键代码行**：`t.x = clamp(t.x + ... , 10, IW - 10); t.y = clamp(t.y + ... , 10, IH - 10);`
- **验证方法**：构建通过，精灵移动受边界限制

## 备注
- `abilityMaxCooldown` 默认值 3，各职业实际 CD 需由 Dev-4 在 `main.js` 初始化角色时设置：
  - 法师：abilityMaxCooldown=4
  - 精灵王：abilityMaxCooldown=12  
  - 战士：abilityMaxCooldown=8
- 精灵的子弹颜色为 '#FF9800'（与工程师炮塔相同），如有需要可调整
- 火球复用子弹系统的 explosive 机制，碰撞爆炸逻辑已在 main.js 中实现
