import { IW, IH, GAME_WIDTH, GAME_HEIGHT, ZOMBIES_PER_WAVE, PI2, recalcSize, GRID_CELL, GRID_COLS, GRID_ROWS } from './config.js';
import { saveData, loadData, dist2, randRange } from './utils.js';
import { audio } from './audio.js';
import { keys, mouseX, mouseY, mouseDown, mouseJustPressed, initInput, resetJustPressed } from './input.js';
import { Player, turrets, updateTurrets, drawTurrets } from './entities/player.js';
import { zombies, Zombie, spawnZombie, cleanupZombies, clearZombies } from './entities/zombie.js';
import { bullets, acidProjectiles, updateBullet, updateAcid, drawBullet, drawAcid, cleanupBullets, clearBullets } from './entities/bullet.js';
import { pickups, updatePickups, drawPickup, clearPickups } from './entities/pickup.js';
import { powerups, updatePowerups, drawPowerUp, clearPowerups } from './entities/powerup.js';
import { hazards, createAcidPool, createBarrel, updateHazards, drawHazard, clearHazards } from './entities/hazard.js';
import { particles, floatingTexts, updateParticlesAndTexts, drawParticle, drawBloodPools, updateBloodPools, spawnParticles, clearAll } from './systems/particles.js';
import { SpatialGrid } from './systems/spatial-grid.js';
import { comboSystem } from './systems/combo.js';
import { initLighting, addLight, drawLighting } from './systems/lighting.js';
import { triggerShake, getShakeOffset, triggerDamageVignette, triggerHitStop, getHitStopTimer, updateEffects, drawScreenEffects, drawVignette } from './systems/effects.js';
import { waveState, resetWaves, advanceWave, updateWaveTransition } from './systems/waves.js';
import { updateKillFeed, addKillFeed } from './systems/killfeed.js';
import { drawCrosshair } from './renderer.js';
import { TileMap } from './map/TileMap.js';
import { drawHUD } from './ui/hud.js';
import { drawShopUI, handleShopClick } from './ui/shop.js';
import { drawStartUI, drawGameOverUI, drawPauseUI, handlePauseClick, drawSettingsUI, handleSettingsClick, drawPerkSelectUI, handlePerkClick, generatePerkChoices, pushFps, drawPerfMonitor, showPerfMonitor, setMenuMouse } from './ui/menus.js';
import { GameFlow, FlowState } from './flow/GameFlow.js';
import { drawTitleScreen, drawCharSelect, drawStageSelect, drawResultsScreen } from './flow/screens.js';
import { CHARACTERS } from './data/characters.js';
import { STAGES } from './data/stages.js';
import { TransitionManager } from './effects/Transitions.js';
import { Tutorial } from './tutorial/Tutorial.js';
import { perf } from './systems/performance.js';
import { achievements } from './systems/achievements.js';

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function setupCanvases() {
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  ctx.imageSmoothingEnabled = false;
}

setupCanvases();
initLighting(canvas);

let zombieGrid = new SpatialGrid(GRID_CELL, GRID_COLS, GRID_ROWS);
let tileMap = new TileMap('graveyard');

function handleResize() {
  // Canvas dimensions are fixed at 640×360, CSS transform handles scaling
  // SpatialGrid dimensions are also fixed, no rebuild needed
  zombieGrid = new SpatialGrid(GRID_CELL, GRID_COLS, GRID_ROWS);
}

window.addEventListener('resize', handleResize);
initInput(canvas);

// Game flow
const flow = new GameFlow();
flow.loadProgress();
const transition = new TransitionManager();
const tutorial = new Tutorial();
achievements.load();

// Game state
let player = null;
let score = 0;
let kills = 0;
let gameTime = 0;
let lastTime = performance.now();
let accumulatedShopKey = false;
let accumulatedEscKey = false;
let heartbeatTimer = 0;

// Flow screen layout data
let titleLayout = null;
let charSelectLayout = null;
let stageSelectLayout = null;
let resultsLayout = null;

// Expose for UI modules
window.__game = { zombies, bullets, particles, pickups, player: null };

function initGame(characterId) {
  const ch = CHARACTERS[characterId] || CHARACTERS.soldier;
  player = new Player();
  window.__game.player = player;
  // Apply character stats
  player.hp = ch.hp;
  player.maxHp = ch.hp;
  player.speed = ch.speed;
  player.damageMult = ch.damageMult;
  player.armorMult = ch.armorMult;
  player.coinMult = ch.coinMult;
  player.fireRateMult = ch.fireRateMult;
  player.maxAmmo = ch.maxAmmo;
  player.weapons = [...ch.startWeapons];
  player.characterId = characterId;
  player.special = ch.special || null;
  player.abilityMaxCooldown = ch.special === 'dodge' ? 2.5 : ch.special === 'turret' ? 8 : 3;

  clearBullets(); clearZombies(); clearPickups(); clearPowerups(); clearHazards(); clearAll();
  turrets.length = 0;
  score = 0; kills = 0; gameTime = 0; heartbeatTimer = 0;
  resetWaves();
  comboSystem.reset();
}

function startStage(stageId) {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) return;
  tileMap = new TileMap(stage.biome);
  flow.selectedStage = stage;
  initGame(flow.selectedCharacter);
  tutorial.activeStep = 0;
  tutorial.timer = 0;
  tutorial.completed = false;
  tutorial.triggerEvent('start');
  transition.fadeIn(0.3);
  flow.goTo(FlowState.PLAYING);
  audio.resume();
  audio.startMusic();
  audio.startAmbient();
}

function endStage(won) {
  audio.stopMusic();
  audio.stopAmbient();
  flow.totalKills += kills;
  achievements.updateStats({
    totalKills: achievements.stats.totalKills + kills,
    maxWave: Math.max(achievements.stats.maxWave, waveState.number),
    maxCoins: Math.max(achievements.stats.maxCoins, player.coins),
    weaponsOwned: Math.max(achievements.stats.weaponsOwned, player.weapons.length),
  });
  if (won && flow.selectedStage) {
    // Unlock next stage
    const nextId = flow.selectedStage.id + 1;
    if (STAGES.find((s) => s.id === nextId)) {
      flow.unlockStage(nextId);
    }
    flow.metaCoins += Math.floor(score * 0.1);
  }
  if (!won) { flow.totalDeaths++; achievements.updateStats({ totalDeaths: achievements.stats.totalDeaths + 1 }); }
  flow.saveProgress();

  // Save high score
  const sd = loadData();
  if (score > (sd?.highScore || 0)) {
    saveData({ highScore: score, settings: { masterVol: audio.masterVol, sfxVol: audio.sfxVol, musicVol: audio.musicVol } });
  }

  flow.goTo(FlowState.RESULTS, {
    won,
    score,
    wave: waveState.number,
    kills,
    coins: player.coins,
    time: gameTime,
  });
}

// ==================== GAME LOOP ====================
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (dt > 0.2) dt = 0.2;
  if (dt <= 0) dt = 0.016;
  pushFps(dt);
  perf.update(dt);

  setMenuMouse(mouseX, mouseY);

  // State-specific input handling
  handleInput();

  // Hit stop
  if (getHitStopTimer() > 0) { updateEffects(dt); transition.update(dt); render(); resetJustPressed(); return; }

  // Update
  if (flow.state === FlowState.PLAYING) {
    gameTime += dt;
    updateGame(dt);
    tutorial.update(dt);
  }

  updateEffects(dt);
  transition.update(dt);
  achievements.update(dt);
  render();
  resetJustPressed();
}

function handleInput() {
  // Shop toggle (only during PLAYING)
  if (keys['e'] && !accumulatedShopKey) {
    accumulatedShopKey = true;
    if (flow.state === FlowState.PLAYING) flow.goTo(FlowState.SHOP);
    else if (flow.state === FlowState.SHOP) flow.state = FlowState.PLAYING;
  }
  if (!keys['e']) accumulatedShopKey = false;

  // ESC toggle
  if (keys['escape'] && !accumulatedEscKey) {
    accumulatedEscKey = true;
    if (flow.state === FlowState.PLAYING) flow.goTo(FlowState.PAUSED);
    else if (flow.state === FlowState.PAUSED) flow.state = FlowState.PLAYING;
    else if (flow.state === FlowState.SHOP) flow.state = FlowState.PLAYING;
    else if (flow.state === FlowState.SETTINGS) flow.state = flow.prevState;
    else if (flow.state === FlowState.PERK_SELECT) flow.state = FlowState.PLAYING;
    else if (flow.state === FlowState.CHAR_SELECT || flow.state === FlowState.STAGE_SELECT) flow.goTo(FlowState.TITLE);
  }
  if (!keys['escape']) accumulatedEscKey = false;

  // F11
  if (keys['f11']) { keys['f11'] = false; if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); }

  // Click handling
  if (!mouseJustPressed) return;

  switch (flow.state) {
    case FlowState.TITLE:
      if (titleLayout) {
        for (let i = 0; i < titleLayout.btns.length; i++) {
          if (titleLayout.hovereds[i]) {
            audio.click();
            if (i === 0) flow.goTo(FlowState.CHAR_SELECT);
            else if (i === 1) { flow.dailyMode = true; flow.goTo(FlowState.CHAR_SELECT); }
            else if (i === 2) { flow.prevState = FlowState.TITLE; flow.goTo(FlowState.SETTINGS); }
            break;
          }
        }
      }
      break;

    case FlowState.CHAR_SELECT:
      if (charSelectLayout) {
        for (let i = 0; i < charSelectLayout.chars.length; i++) {
          if (charSelectLayout.hovereds[i]) {
            audio.click();
            flow.selectedCharacter = charSelectLayout.chars[i].id;
            flow.goTo(FlowState.STAGE_SELECT);
            break;
          }
        }
        if (charSelectLayout.backHovered) { audio.click(); flow.goTo(FlowState.TITLE); }
      }
      break;

    case FlowState.STAGE_SELECT:
      if (stageSelectLayout) {
        for (let i = 0; i < STAGES.length; i++) {
          if (stageSelectLayout.hovereds[i] && flow.isStageUnlocked(STAGES[i].id)) {
            audio.click();
            startStage(STAGES[i].id);
            break;
          }
        }
        if (stageSelectLayout.backHovered) { audio.click(); flow.goTo(FlowState.CHAR_SELECT); }
      }
      break;

    case FlowState.PLAYING:
      break;

    case FlowState.SHOP:
      handleShopClick(mouseX, mouseY, player);
      break;

    case FlowState.PAUSED: {
      const result = handlePauseClick(mouseX, mouseY);
      if (result === 0) flow.state = FlowState.PLAYING;
      else if (result === 1) { flow.prevState = FlowState.PAUSED; flow.goTo(FlowState.SETTINGS); }
      else if (result === 2) { endStage(false); }
      break;
    }

    case FlowState.SETTINGS:
      handleSettingsClick(mouseX, mouseY);
      break;

    case FlowState.PERK_SELECT:
      if (handlePerkClick(mouseX, mouseY, player)) flow.state = FlowState.PLAYING;
      break;

    case FlowState.RESULTS:
      if (resultsLayout?.hovered) {
        audio.click();
        flow.goTo(FlowState.STAGE_SELECT);
      }
      break;

    case FlowState.GAMEOVER:
      endStage(false);
      break;
  }
}

function updateGame(dt) {
  // Stage complete timer
  if (waveState.stageCompleteTimer > 0) {
    waveState.stageCompleteTimer -= dt;
    if (waveState.stageCompleteTimer <= 0) { endStage(true); return; }
  }

  // Wave transition
  if (waveState.isTransition) {
    updateWaveTransition(dt);
    updateParticlesAndTexts(dt);
    updateBloodPools(dt);
    updatePickups(dt, player);
    updatePowerups(dt, player, waveState);
    return;
  }

  player.update(dt);
  // Tile collision
  const resolved = tileMap.resolveCollision(player.x, player.y, player.width / 2);
  player.x = resolved.x;
  player.y = resolved.y;
  updateEffects(dt);

  // Low HP heartbeat
  if (player.alive && player.hp < player.maxHp * 0.25) {
    heartbeatTimer += dt;
    if (heartbeatTimer >= 1.2) { heartbeatTimer = 0; audio.heartbeat(); }
  } else { heartbeatTimer = 0; }

  comboSystem.update(dt);
  updateKillFeed(dt);

  // Zombie spawning
  waveState.spawnTimer -= dt;
  if (waveState.spawnTimer <= 0 && player.alive) {
    waveState.spawnTimer = waveState.spawnInterval * (0.7 + Math.random() * 0.6);

    // Boss wave: spawn the stage boss once
    if (waveState.bossWave && !waveState.bossSpawned && flow.selectedStage?.boss) {
      const bossType = flow.selectedStage.boss;
      const z = new Zombie(bossType, IW / 2, 50);
      zombies.push(z);
      waveState.bossSpawned = true;
      audio.bossRoar();
      triggerShake(10, 0.5);
      addKillFeed(`⚠ BOSS 出现: ${z.bossName || bossType}!`, '#FF1744');
    } else if (!waveState.bossWave) {
      spawnZombie(player);
      if (waveState.difficultyLevel >= 3 && Math.random() < 0.3) waveState.pendingSpawns.push({ delay: 0.15 + Math.random() * 0.3, count: 1 });
      if (waveState.difficultyLevel >= 5 && Math.random() < 0.15) waveState.pendingSpawns.push({ delay: 0.2 + Math.random() * 0.2, count: 2 });
    }
  }

  // Process delayed spawns
  for (let i = waveState.pendingSpawns.length - 1; i >= 0; i--) {
    waveState.pendingSpawns[i].delay -= dt;
    if (waveState.pendingSpawns[i].delay <= 0) {
      const count = waveState.pendingSpawns[i].count;
      for (let j = 0; j < count; j++) { if (flow.state === FlowState.PLAYING && player.alive) spawnZombie(player); }
      waveState.pendingSpawns.splice(i, 1);
    }
  }

  // Hazard spawning
  const hc = 0.002 + waveState.number * 0.0003;
  if (Math.random() < hc && hazards.length < 5) {
    const hx = randRange(50, IW - 50), hy = randRange(50, IH - 50);
    if (tileMap.isWalkable(hx, hy)) hazards.push(createAcidPool(hx, hy));
  }
  if (Math.random() < 0.001 + waveState.number * 0.0002 && hazards.length < 8) {
    const hx = randRange(50, IW - 50), hy = randRange(50, IH - 50);
    if (tileMap.isWalkable(hx, hy)) hazards.push(createBarrel(hx, hy));
  }

  // Update entities
  for (const z of zombies) {
    if (!z.alive) continue;
    z.update(dt, player.x, player.y);
    const zr = tileMap.resolveCollision(z.x, z.y, z.size / 2);
    z.x = zr.x; z.y = zr.y;
  }
  for (const b of bullets) { if (b.alive) { updateBullet(b, dt); if (b.alive && tileMap.isWall(b.x, b.y)) b.alive = false; } }
  for (const a of acidProjectiles) { if (a.alive) { updateAcid(a, dt); if (a.alive && tileMap.isWall(a.x, a.y)) a.alive = false; } }

  // Spatial grid
  zombieGrid.clear();
  for (const z of zombies) if (z.alive) zombieGrid.insert(z);

  // Helper: register a zombie kill (score, kills, wave progress, boss check)
  function registerKill(z) {
    score += comboSystem.addScore(z.xpValue);
    kills++;
    waveState.killed++;
    if (kills === 5) tutorial.triggerEvent('kill5');
    z.onDeath(player);
    achievements.updateStats({ totalKills: achievements.stats.totalKills + 1, maxCombo: comboSystem.count });
    if (z.boss && waveState.bossWave) {
      waveState.bossWave = false;
      flow.unlockStage((flow.selectedStage?.id || 1) + 1);
      flow.metaCoins += Math.floor(score * 0.15);
      addKillFeed('★ BOSS 击败! 关卡完成! ★', '#FFD700');
      waveState.stageCompleteTimer = 2;
      achievements.updateStats({ bossKills: achievements.stats.bossKills + 1, fastestClear: gameTime });
    }
    if (waveState.killed >= ZOMBIES_PER_WAVE) {
      if (waveState.number === 1) tutorial.triggerEvent('wave2');
      if (waveState.number === 4) tutorial.triggerEvent('wave5');
      const stageBoss = flow.selectedStage?.boss || null;
      advanceWave(player, generatePerkChoices, () => { flow.goTo(FlowState.PERK_SELECT); }, stageBoss, () => {
        // Non-boss stage complete
        flow.unlockStage((flow.selectedStage?.id || 1) + 1);
        flow.metaCoins += Math.floor(score * 0.15);
        addKillFeed('★ 关卡完成! ★', '#FFD700');
        waveState.stageCompleteTimer = 2;
      });
    }
  }

  // Bullet-zombie collision
  for (const b of bullets) {
    if (!b.alive) continue;
    const nearby = zombieGrid.query(b.x, b.y, 30);
    for (const z of nearby) {
      if (!z.alive) continue;
      const dx = b.x - z.x, dy = b.y - z.y;
      const hitDist = z.size / 2 + 3;
      if (dx * dx + dy * dy < hitDist * hitDist) {
        z.takeDamage(b.damage, Math.atan2(dy, dx));
        if (!b.penetrating) {
          b.alive = false;
          // Explosive bullet: damage nearby zombies
          if (b.explosive) {
            const radius = b.explosionRadius || 50;
            audio.explosion(); triggerShake(6, 0.2);
            spawnParticles(b.x, b.y, 20, ['#FF5722', '#FF9800', '#FFEB3B', '#FFF'], 200, 0.4, 3);
            addLight(b.x, b.y, radius * 2, '#FF5722', 0.5);
            for (const oz of zombies) {
              if (!oz.alive || oz === z) continue;
              if (dist2(oz.x, oz.y, b.x, b.y) < radius * radius) {
                oz.takeDamage(b.damage * 0.6);
                if (!oz.alive) registerKill(oz);
              }
            }
            if (player.alive && dist2(player.x, player.y, b.x, b.y) < radius * radius) player.takeDamage(10);
          }
        }
        if (!z.alive) registerKill(z);
        break;
      }
    }
  }

  // Acid projectile-player collision
  for (const a of acidProjectiles) {
    if (!a.alive || !player.alive || player.invincibleTimer > 0) continue;
    if (dist2(player.x, player.y, a.x, a.y) < 14 * 14) { player.takeDamage(a.damage); a.alive = false; triggerDamageVignette(0.5); }
  }

  // Hazard updates
  updateHazards(dt, player);

  // Turret updates
  updateTurrets(dt, zombies, bullets);

  // Zombie-player collision
  if (player.alive && player.invincibleTimer <= 0) {
    for (const z of zombies) {
      if (!z.alive) continue;
      const dx = player.x - z.x, dy = player.y - z.y;
      const hitDist = player.width / 2 + z.size / 2;
      if (dx * dx + dy * dy < hitDist * hitDist) {
        player.takeDamage(z.damage);
        triggerDamageVignette(0.5);
        const pushDist = 25; const angle = Math.atan2(dy, dx);
        z.x -= Math.cos(angle) * pushDist; z.y -= Math.sin(angle) * pushDist;
        if (!player.alive) { flow.goTo(FlowState.GAMEOVER); audio.zombieDie(); triggerShake(15, 0.6); }
        break;
      }
    }
  }

  // Zombie-turret collision
  for (const t of turrets) {
    if (!t.alive) continue;
    for (const z of zombies) {
      if (!z.alive) continue;
      const dx = t.x - z.x, dy = t.y - z.y;
      if (dx * dx + dy * dy < 20 * 20) {
        t.hp -= z.damage * dt * 2;
        if (t.hp <= 0) { t.alive = false; break; }
      }
    }
  }

  // Cleanup (swap-and-pop)
  cleanupBullets();
  cleanupZombies(player);
  for (let i = pickups.length - 1; i >= 0; i--) { if (!pickups[i].alive) { pickups[i] = pickups[pickups.length - 1]; pickups.pop(); } }
  for (let i = powerups.length - 1; i >= 0; i--) { if (!powerups[i].alive) { powerups[i] = powerups[powerups.length - 1]; powerups.pop(); } }
  for (let i = hazards.length - 1; i >= 0; i--) { if (!hazards[i].alive) { hazards[i] = hazards[hazards.length - 1]; hazards.pop(); } }
  if (particles.length > perf.maxParticles) particles.length = perf.maxParticles;

  // Lights
  if (player.muzzleFlash.timer > 0) addLight(player.muzzleFlash.x, player.muzzleFlash.y, 50, '#FFAA00', 0.5);
  for (const z of zombies) if (z.alive && z.boss) addLight(z.x, z.y - 5, 30, '#FF0000', 0.3);

  updateParticlesAndTexts(dt);
  updateBloodPools(dt);
  updatePickups(dt, player);
  updatePowerups(dt, player, waveState);
}

// ==================== RENDER ====================
function render() {
  ctx.clearRect(0, 0, IW, IH);
  const shake = getShakeOffset();

  // Flow-screen states that draw on top of the game
  switch (flow.state) {
    case FlowState.TITLE:
      titleLayout = drawTitleScreen(ctx, mouseX, mouseY);
      return;

    case FlowState.CHAR_SELECT:
      charSelectLayout = drawCharSelect(ctx, mouseX, mouseY);
      return;

    case FlowState.STAGE_SELECT:
      stageSelectLayout = drawStageSelect(ctx, mouseX, mouseY, flow.unlockedStages);
      return;

    case FlowState.RESULTS:
      resultsLayout = drawResultsScreen(ctx, mouseX, mouseY, flow.currentData || { won: false, score: 0, wave: 0, kills: 0, coins: 0, time: 0 });
      return;
  }

  // Game rendering (PLAYING, SHOP, PAUSED, PERK_SELECT, SETTINGS)
  ctx.save(); ctx.translate(shake.x, shake.y);

  tileMap.draw(ctx);
  drawBloodPools(ctx);
  for (const h of hazards) if (h.alive) drawHazard(ctx, h);
  for (const pk of pickups) if (pk.alive) drawPickup(ctx, pk);
  for (const p of powerups) if (p.alive) drawPowerUp(ctx, p);
  for (const z of zombies) if (z.alive) z.draw(ctx);
  drawTurrets(ctx);
  if (player?.alive) player.draw(ctx);
  for (const b of bullets) if (b.alive) drawBullet(ctx, b);
  for (const a of acidProjectiles) if (a.alive) drawAcid(ctx, a);
  for (const p of particles) if (p.alive) drawParticle(ctx, p);
  for (const ft of floatingTexts) {
    if (!ft.alive) continue;
    const alpha = ft.life / ft.maxLife;
    ctx.globalAlpha = alpha; ctx.fillStyle = ft.color;
    ctx.font = 'bold 9px Courier New,monospace'; ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x | 0, ft.y | 0); ctx.textAlign = 'start'; ctx.globalAlpha = 1;
  }
  ctx.restore();

  drawLighting(player);
  drawScreenEffects(ctx, player);
  drawVignette(ctx);

  // HUD/Overlay layer — draw AFTER lighting so it's not obscured by light-canvas
  if ((flow.state === FlowState.PLAYING || flow.state === FlowState.SHOP) && player?.alive) drawCrosshair(ctx, mouseX, mouseY);
  if (flow.state === FlowState.PLAYING) drawHUD(ctx, player, gameTime, score, kills);
  if (waveState.isTransition && flow.state === FlowState.PLAYING) {
    const a = Math.min(1, waveState.transitionTimer);
    ctx.fillStyle = `rgba(255,215,0,${a * 0.5})`; ctx.fillRect(0, IH / 2 - 25, IW, 50);
    ctx.fillStyle = `rgba(0,0,0,${a * 0.7})`; ctx.fillRect(0, IH / 2 - 22, IW, 44);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 18px Courier New,monospace'; ctx.textAlign = 'center';
    ctx.fillText(`波次 ${waveState.number}`, IW / 2, IH / 2 + 6); ctx.textAlign = 'start';
  }
  if (flow.state === FlowState.SHOP) drawShopUI(ctx, player);
  if (flow.state === FlowState.PAUSED) drawPauseUI(ctx, waveState.number, score, player);
  if (flow.state === FlowState.SETTINGS) drawSettingsUI(ctx, mouseX, mouseY);
  if (flow.state === FlowState.PERK_SELECT) drawPerkSelectUI(ctx, mouseX, mouseY);
  tutorial.draw(ctx);
  achievements.draw(ctx, IW, IH);
  transition.draw(ctx);
  drawPerfMonitor(ctx);
}

// ==================== ERROR BOUNDARY ====================
window.addEventListener('error', (e) => {
  try {
    const errInfo = { msg: e.message, src: e.filename, line: e.lineno, col: e.colno, time: Date.now() };
    localStorage.setItem('zombie_hunter_crash', JSON.stringify(errInfo));
  } catch (_) {}
});
window.addEventListener('unhandledrejection', (e) => {
  try {
    const errInfo = { msg: String(e.reason), time: Date.now() };
    localStorage.setItem('zombie_hunter_crash', JSON.stringify(errInfo));
  } catch (_) {}
});

// Disable console in production
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  const noop = () => {};
  ['log', 'warn', 'info', 'debug'].forEach(m => { console[m] = noop; });
}

// ==================== START ====================
flow.goTo(FlowState.TITLE);
lastTime = performance.now();
requestAnimationFrame(gameLoop);

console.log('%c🧟 僵尸猎人 v3.0', 'color:#FF4444;font-size:16px;font-weight:bold');
console.log('%c🎮 WASD移动 | 鼠标瞄准射击 | 1-4切换武器 | E商店 | ESC暂停', 'color:#FFD700;font-size:11px');
