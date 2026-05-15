# Dev-5 工作日志 — 商店 & HUD 适配

## 模块：M5 商店 & HUD 适配
## 文件范围：
- `src/ui/shop.js`（扩展近战武器商店项）
- `src/ui/hud.js`（扩展近战武器槽、技能冷却显示）
- `src/data.js`（SHOP_ITEMS 新增近战武器项）

## 规范：
- 商店新增近战武器购买项，处理购买逻辑
- HUD 武器栏显示近战武器（带图标）
- 新增技能冷却显示（在 HUD 底部或侧边）
- UI 文本全部中文，字体 Courier New monospace

## 接口调用：
- 读取 Dev-1 的近战武器数据 (WEAPON_DATA 中的 melee_knife/melee_axe/melee_sword)
- 读取 Dev-1 的 MeleeWeapon 类和 meleeWeapons 数组
- 读取 Dev-2 的玩家技能冷却状态 (player.abilityCooldown, player.rageActive)

## 变更记录

### 变更文件

| 文件 | 修改内容 |
|------|---------|
| `src/data.js` | SHOP_ITEMS 数组新增 3 个近战武器购买项（匕首/战斧/长剑） |
| `src/ui/shop.js` | 导入 MeleeWeapon/meleeWeapons；已有的 owned 检查扩展支持 type='melee'；新增 melee 物品描述显示（伤害/范围/CD）；handleShopClick 新增 type='melee' 购买分支（创建 MeleeWeapon 实例并添加到 meleeWeapons 数组） |
| `src/ui/hud.js` | 导入 meleeWeapons；武器栏新增近战武器槽（紫色调区分，显示名称+冷却状态）；新增技能冷却显示（左侧，格式"技能冷却: X.Xs"或"技能: 就绪"）；新增狂暴状态提示（红色文本 + 脉动红色屏幕边框） |

### 商店扩展详情
- 新增 3 个近战武器：匕首(100金)、战斧(200金)、长剑(150金)
- 购买时通过 `new MeleeWeapon(config)` 创建实例，存入 `meleeWeapons` 数组
- 已购买的武器在商店显示"已拥有"状态
- 描述栏显示武器属性：伤害、范围、冷却

### HUD 扩展详情
- **近战武器栏**：置于枪械武器右侧，紫色背景区分，显示武器名和冷却状态（就绪/冷却 X.Xs）
- **技能冷却**：武器栏上方左侧，显示 player.abilityCooldown 倒计时
- **狂暴状态**：武器栏上方左侧，显示"狂暴 X.Xs"红色文本 + 全屏红色脉动边框

## 验收自查
- [x] 商店可购买近战武器，显示"已拥有"状态
- [x] HUD 武器栏显示近战武器（含冷却状态）
- [x] 技能冷却倒计时正确显示
- [x] 狂暴状态有红色边框视觉提示
- [x] `npm run build` 构建通过（已验证）

## 备注
- SHOP_ITEMS 定义在 `data.js` 中（非 shop.js），因此对 data.js 做了修改
- meleeWeapons 数组由 `src/entities/melee-weapon.js` 导出，shop.js push、hud.js 读取
- 近战武器购买后不会自动装备（由 Dev-4 的主循环集成处理右键/Tab近战攻击）
