
// MATH 

function Vector_add(v1, v2) { return { x: v1.x + v2.x, y: v1.y + v2.y }; }
function Vector_dot(v1, v2) { return (v1.x * v2.x) + (v1.y * v2.y); }
function Vector_reflect(velocity, normal) {
    let dot = Vector_dot(velocity, normal);
    return { x: velocity.x - 2 * dot * normal.x, y: velocity.y - 2 * dot * normal.y };
}

function formatTime(totalSeconds) {
    let m = Math.floor(totalSeconds / 60), s = Math.floor(totalSeconds % 60), ms = Math.floor((totalSeconds % 1) * 100);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s + ":" + (ms < 10 ? "0" : "") + ms;
}

function lerpAngle(current, target, speed) {
    let diff = target - current;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return current + diff * speed;
}

function get_line_intersection(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
    let s1_x = p1_x - p0_x, s1_y = p1_y - p0_y, s2_x = p3_x - p2_x, s2_y = p3_y - p2_y;
    let denominator = (-s2_x * s1_y + s1_x * s2_y);
    if (denominator === 0) return null;
    let s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / denominator;
    let t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / denominator;
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) return { x: p0_x + (t * s1_x), y: p0_y + (t * s1_y), distance: t };
    return null;
}

function check_line_of_sight(startX, startY, targetX, targetY, walls) {
    for (let w of walls) {
        let lines = [[w.x, w.y, w.x + w.w, w.y], [w.x, w.y + w.h, w.x + w.w, w.y + w.h], [w.x, w.y, w.x, w.y + w.h], [w.x + w.w, w.y, w.x + w.w, w.y + w.h]];
        for (let l of lines) if (get_line_intersection(startX, startY, targetX, targetY, l[0], l[1], l[2], l[3])) return false;
    }
    return true; 
}

function resolve_circle_aabb_collision(px, py, radius, walls) {
    let newX = px, newY = py;
    for (let wall of walls) {
        let closestX = Math.max(wall.x, Math.min(newX, wall.x + wall.w));
        let closestY = Math.max(wall.y, Math.min(newY, wall.y + wall.h));
        let dx = newX - closestX, dy = newY - closestY, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius && dist > 0) {
            let overlap = radius - dist;
            newX += (dx / dist) * overlap;
            newY += (dy / dist) * overlap;
        }
    }
    return { x: newX, y: newY };
}

// AUDIO & CANVAS 

const bgm = {
    menu: new Audio('menu_theme.mp3'), level1: new Audio('level1_theme.mp3'), level2: new Audio('level2_theme.mp3'), boss: new Audio('boss_theme.mp3'), victory:new Audio('victory.mp3'), defeat:new Audio('defeat.mp3'), currentTrack: null,
    playTrack: function(trackName) {
        if (this.currentTrack === this[trackName]) return;
        if (this.currentTrack) { this.currentTrack.pause(); this.currentTrack.currentTime = 0; }
        if (this[trackName]) { this.currentTrack = this[trackName]; this.currentTrack.loop = true; this.currentTrack.volume = 0.4; this.currentTrack.play().catch(e => {}); }
    }
};

const sfx = {
    teleportSound: new Audio('teleport.mp3'), shootSound: new Audio('shoot.mp3'), hitSound: new Audio('hit.mp3'), explosionSound: new Audio('explosion.mp3'), pickupSound: new Audio('pickup.mp3'), ricochetSound: new Audio('ricochet.mp3'),
    play: function(audio, vol) { let c = audio.cloneNode(true); c.volume = vol; c.play(); },
    teleport: function() { this.play(this.teleportSound, 0.8); }, shoot: function() { this.play(this.shootSound, 0.5); }, hit: function() { this.play(this.hitSound, 0.6); }, explosion: function() { this.play(this.explosionSound, 0.8); }, pickup: function() { this.play(this.pickupSound, 0.7); }, ricochet: function() { this.play(this.ricochetSound, 0.3); }
};

const lightCanvas = document.createElement('canvas'); const lightCtx = lightCanvas.getContext('2d');
lightCanvas.width = window.innerWidth; lightCanvas.height = window.innerHeight;
window.addEventListener('resize', () => { lightCanvas.width = window.innerWidth; lightCanvas.height = window.innerHeight; });


// INPUT HANDLING

window.addEventListener('keydown', function(e) {
    gameState.keys[e.code] = true;
    
    if (e.code === 'KeyR' && (gameState.gameOver || gameState.isPaused || gameState.gameWon)) {
        Object.assign(gameState, { gameOver: false, isPaused: false, score: 0, flashlight: true, gameWon: false, timer: 0, currentLevel: 1, rooms: [], bullets: [], items: [], upgrades: { damage: 0, speed: 0, health: 0, multi: 1, lightActive: false } });
        Object.assign(gameState.player, { health: 100, maxHealth: 100, goop: 0, speed: 200, x: 800, y: 600, potions: { speed: 0, shield: 0, invis: 0 }, activeBuffs: { speed: 0, shield: 0, invis: 0 }});
        if (bgm.playTrack) bgm.playTrack('level1');
        
        gameState.walls = [
            { x: 600, y: 680, w: 400, h: 20 }, { x: 180, y: 350, w: 130, h: 20 }, { x: 980, y: 450, w: 20, h: 80 }, { x: 980, y: 600, w: 20, h: 100 }, { x: 100, y: 800, w: 900, h: 20 }, { x: 980, y: 700, w: 20, h: 120 }, { x: 600, y: 450, w: 20, h: 80 }, { x: 600, y: 600, w: 20, h: 100 }, { x: 600, y: 450, w: 150, h: 20 }, { x: 850, y: 450, w: 150, h: 20 }, { x: 80, y: 50, w: 20, h: 770 }, {x: 1450, y: 50, w: 20, h: 770 }, { x: 1000, y: 800, w: 450, h: 20 }, { x: 1000, y: 50, w: 450, h: 20 }, { x: 1000, y: 680, w: 150, h: 20 }, { x: 1300, y: 550, w: 150, h: 20 }, { x: 1000, y: 450, w: 150, h: 20 }, {x: 1150, y: 400, w: 20, h: 70 }, { x: 1270, y: 400, w: 180, h: 20 }, { x: 300, y: 450, w: 120, h: 20 }, { x: 500, y: 450, w: 120, h: 20 }, { x: 300, y: 680, w: 320, h: 20 }, { x: 300, y: 450, w: 20, h: 70 }, { x: 300, y: 600, w: 20, h: 80 }, { x: 300, y: 250, w: 20, h: 200 }, { x: 300, y: 250, w: 120, h: 20 }, { x: 100, y: 50, w: 350, h: 20 }, { x: 100, y: 680, w: 70, h: 20 }, { x: 230, y: 680, w: 70, h: 20 }, { x: 730, y: 250, w: 20, h: 220 }, { x: 850, y: 250, w: 20, h: 220 }, { x: 400, y: 50, w: 800, h: 20 }, { x: 400, y: 50, w: 20, h: 220 }, { x: 1180, y: 50, w: 20, h: 220 }, { x: 400, y: 250, w: 350, h: 20 }, { x: 850, y: 250, w: 350, h: 20 }, { x: 600, y: 120, w: 60, h: 60 }, { x: 940, y: 120, w: 60, h: 60 }, { x: 170, y: 550, w: 60, h: 60 }, { x: 200, y: 120, w: 60, h: 60 }
        ];
        gameState.rooms = [
            { trigger: { x: 300, y: 280, w: 450, h: 180 }, doors: [{ x: 420, y: 450, w: 80, h: 20 }, { x: 730, y: 270, w: 20, h: 80 }], isLocked: false, isCleared: false },
            { trigger: { x: 100, y: 50, w: 300, h: 300 }, doors: [{ x: 100, y: 350, w: 80, h: 20 }], isLocked: false, isCleared: false },
            { trigger: { x: 100, y: 700, w: 500, h: 100 }, doors: [{ x: 170, y: 680, w: 60, h: 20 }, { x: 600, y: 700, w: 20, h: 100 }], isLocked: false, isCleared: false },
            { trigger: { x: 850, y: 250, w: 300, h: 200 }, doors: [{ x: 1150, y: 270, w: 20, h: 130 }], isLocked: false, isCleared: false }
        ];
        gameState.exitZone = { x: 740, y: 70, w: 160, h: 50 };
        EnemyFactory.spawnWave(gameState);
    }
    
    if (e.code === 'KeyM') gameState.isMarketplaceOpen = !gameState.isMarketplaceOpen;
    if (e.code === 'Escape' && gameState.gameStarted && !gameState.gameOver && !gameState.gameWon) {
        gameState.isPaused = !gameState.isPaused;
        if (!gameState.isPaused) gameState.lastTime = performance.now();
    }
    if (!gameState.upgrades) {
        gameState.upgrades = { damage: 0, speed: 0, health: 0, multi: 1, lightActive: false };
        gameState.player.maxHealth = 100;
    }
    let p = gameState.player, u = gameState.upgrades;
    if (!p.potions) p.potions = { speed: 0, shield: 0, invis: 0 };
    if (!p.activeBuffs) p.activeBuffs = { speed: 0, shield: 0, invis: 0 };

    if (gameState.isMarketplaceOpen && u) {
        if (e.code === 'Digit1' && p.goop >= 30 && u.damage < 2) { p.goop -= 30; u.damage++; }
        if (e.code === 'Digit2' && p.goop >= 30 && u.speed < 2) { p.goop -= 30; u.speed++; p.speed += 50; }
        if (e.code === 'Digit3' && p.goop >= 40 && u.health < 2) { p.goop -= 40; u.health++; p.maxHealth += 25; p.health = p.maxHealth; }
        if (e.code === 'Digit4' && p.goop >= 80 && u.multi < 3) { p.goop -= 80; u.multi++; }
        if (e.code === 'Digit5' && p.goop >= 20 && !u.lightActive) { p.goop -= 20; u.lightActive = true; u.lightTimer = 3.0; gameState.flashlight = false; }
        if (e.code === 'Digit6' && p.goop >= 20) { p.goop -= 20; p.potions.speed++; }
        if (e.code === 'Digit7' && p.goop >= 30) { p.goop -= 30; p.potions.shield++; }
        if (e.code === 'Digit8' && p.goop >= 30) { p.goop -= 30; p.potions.invis++; }
    }

    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && p.potions.speed > 0 && p.activeBuffs.speed <= 0) { p.potions.speed--; p.activeBuffs.speed = 5.0; sfx.pickup(); }
    if (e.code === 'KeyQ' && p.potions.shield > 0 && p.activeBuffs.shield <= 0) { p.potions.shield--; p.activeBuffs.shield = 5.0; sfx.pickup(); }
    if (e.code === 'KeyE' && p.potions.invis > 0 && p.activeBuffs.invis <= 0) { p.potions.invis--; p.activeBuffs.invis = 5.0; sfx.pickup(); }
});
window.addEventListener('keyup', e => gameState.keys[e.code] = false);
window.addEventListener('mousemove', e => { gameState.mouse.screenX = e.clientX; gameState.mouse.screenY = e.clientY; });
window.addEventListener('mousedown', function(e) {
    if (!gameState.gameStarted) { bgm.playTrack('level1'); gameState.gameStarted = true; gameState.lastTime = performance.now(); return; }
    if (gameState.isPaused) return;
    gameState.mouse.clicked = true;
    
    let rect = canvas.getBoundingClientRect(), clickX = e.clientX - rect.left, clickY = e.clientY - rect.top;
    if (clickX >= 10 && clickX <= 50 && clickY >= 105 && clickY <= 145) { gameState.isMarketplaceOpen = !gameState.isMarketplaceOpen; return; }
    if (gameState.isMarketplaceOpen) {
        if (clickX >= 60 && clickX <= 510 && clickY >= 105 && clickY <= 465) return; 
        else gameState.isMarketplaceOpen = false;
    }

    let u = gameState.upgrades || { damage: 0, multi: 1 }, numBullets = u.multi, baseDamage = 25 + (u.damage * 10), spread = 0.2;
    for (let i = 0; i < numBullets; i++) {
        let finalAngle = gameState.player.angle + (i - (numBullets - 1) / 2) * spread;
        gameState.bullets.push({ x: gameState.player.x, y: gameState.player.y, vx: Math.cos(finalAngle) * 500, vy: Math.sin(finalAngle) * 500, radius: 4, bounces: 4, isEnemyBullet: false, damage: baseDamage });
    }

    if (!gameState.particles) gameState.particles = [];
    for(let s = 0; s < 8; s++) {
        let pSpread = (Math.random() - 0.5) * 0.6, spd = 150 + Math.random() * 250;
        gameState.particles.push({ x: gameState.player.x + Math.cos(gameState.player.angle) * gameState.player.radius, y: gameState.player.y + Math.sin(gameState.player.angle) * gameState.player.radius, vx: Math.cos(gameState.player.angle + pSpread) * spd, vy: Math.sin(gameState.player.angle + pSpread) * spd, life: 0.05 + Math.random() * 0.1, maxLife: 0.15, color: '#00ffff', size: 2 + Math.random() * 2 });
    }
    sfx.shoot();
});
window.addEventListener('mouseup', e => gameState.mouse.clicked = false);

function advanceLevel() {
    let state = gameState; state.currentLevel++;
    if (state.currentLevel === 2) {
        bgm.playTrack('level2');
        state.walls = [
            { x: 600, y: 680, w: 400, h: 20 }, { x: 180, y: 350, w: 130, h: 20 }, { x: 980, y: 450, w: 20, h: 80 }, { x: 980, y: 450, w: 20, h: 250 }, { x: 100, y: 900, w: 900, h: 20 }, { x: 980, y: 700, w: 20, h: 120 }, { x: 600, y: 450, w: 20, h: 80 }, { x: 600, y: 600, w: 20, h: 100 }, { x: 600, y: 450, w: 150, h: 20 }, { x: 600, y: 800, w: 20, h: 100 }, { x: 850, y: 450, w: 150, h: 20 }, { x: 80, y: 50, w: 20, h: 850 }, {x: 1450, y: 50, w: 20, h: 850 }, { x: 1000, y: 900, w: 450, h: 20 }, { x: 1000, y: 50, w: 450, h: 20 }, { x: 1000, y: 680, w: 150, h: 20 }, { x: 1300, y: 550, w: 150, h: 20 }, { x: 1000, y: 450, w: 150, h: 20 }, {x: 1150, y: 400, w: 20, h: 70 }, { x: 1270, y: 400, w: 180, h: 20 }, { x: 300, y: 450, w: 120, h: 20 }, { x: 500, y: 450, w: 120, h: 20 }, { x: 300, y: 680, w: 320, h: 20 }, { x: 300, y: 450, w: 20, h: 70 }, { x: 300, y: 600, w: 20, h: 80 }, { x: 300, y: 250, w: 20, h: 200 }, { x: 300, y: 250, w: 120, h: 20 }, { x: 100, y: 50, w: 350, h: 20 }, { x: 100, y: 680, w: 70, h: 20 }, { x: 230, y: 680, w: 70, h: 20 }, { x: 730, y: 350, w: 20, h: 100 }, { x: 850, y: 250, w: 20, h: 220 }, { x: 400, y: 50, w: 800, h: 20 }, { x: 400, y: 50, w: 20, h: 220 }, { x: 1180, y: 50, w: 20, h: 220 }, { x: 400, y: 250, w: 350, h: 20 }, { x: 700, y: 250, w: 350, h: 20 }, { x: 600, y: 120, w: 60, h: 60 }, { x: 940, y: 120, w: 60, h: 60 }, { x: 170, y: 550, w: 60, h: 60 }, { x: 200, y: 120, w: 60, h: 60 }
        ];
        state.rooms = [
            { trigger: { x: 300, y: 280, w: 450, h: 180 }, doors: [{ x: 420, y: 450, w: 80, h: 20 }, { x: 730, y: 270, w: 20, h: 80 }], isLocked: false, isCleared: false },
            { trigger: { x: 100, y: 50, w: 300, h: 300 }, doors: [{ x: 100, y: 350, w: 80, h: 20 }], isLocked: false, isCleared: false },
            { trigger: { x: 100, y: 700, w: 500, h: 200 }, doors: [{ x: 170, y: 680, w: 60, h: 20 }, { x: 600, y: 700, w: 20, h: 100 }], isLocked: false, isCleared: false }
        ];
        state.exitZone = { x: 1000, y: 70, w: 180, h: 60 };
        gameState.player.x = 800; gameState.player.y = 500;
    } else if (state.currentLevel === 3) {
        bgm.playTrack('boss');
        state.walls = [
            { x: 400, y: 200, w: 1200, h: 40 }, { x: 400, y: 1600, w: 1200, h: 40 }, { x: 360, y: 200, w: 40, h: 1440 }, { x: 1600, y: 200, w: 40, h: 1440 },
            { x: 700, y: 700, w: 100, h: 100 }, { x: 1200, y: 700, w: 100, h: 100 }, { x: 700, y: 1100, w: 100, h: 100 }, { x: 1200, y: 1100, w: 100, h: 100 }
        ];
        state.exitZone = { x: 900, y: 250, w: 200, h: 80 }; 
        gameState.player.x = 1000; gameState.player.y = 1500; 
    } else if (state.currentLevel > 3) { state.gameWon = true; return; }

    state.bullets = []; state.items = []; EnemyFactory.spawnWave(state);
}


// UPDATE LOGIC

function update(dt) {
    if (!gameState.gameStarted || gameState.isPaused || gameState.gameOver || gameState.gameWon) return;

    if (gameState.timer === undefined) gameState.timer = 0;
    gameState.timer += dt;

    let p = gameState.player, buffs = p.activeBuffs || { speed: 0, shield: 0, invis: 0 };
    if (buffs.speed > 0) buffs.speed -= dt;
    if (buffs.shield > 0) buffs.shield -= dt;
    if (buffs.invis > 0) buffs.invis -= dt;

    if (gameState.upgrades && gameState.upgrades.lightActive) {
        gameState.upgrades.lightTimer -= dt;
        if (gameState.upgrades.lightTimer <= 0) { gameState.upgrades.lightActive = false; gameState.flashlight = true; }
    }

    let speed = p.speed * (buffs.speed > 0 ? 2.5 : 1) * dt;
    if (gameState.keys['KeyW'] || gameState.keys['ArrowUp']) p.y -= speed;
    if (gameState.keys['KeyS'] || gameState.keys['ArrowDown']) p.y += speed;
    if (gameState.keys['KeyA'] || gameState.keys['ArrowLeft']) p.x -= speed;
    if (gameState.keys['KeyD'] || gameState.keys['ArrowRight']) p.x += speed;

    let resolved = resolve_circle_aabb_collision(p.x, p.y, p.radius, gameState.walls);
    p.x = resolved.x; p.y = resolved.y;

    let cx = p.x - canvas.width / 2, cy = p.y - canvas.height / 2;
    if (gameState.mouse.screenX !== undefined) { gameState.mouse.x = gameState.mouse.screenX + cx; gameState.mouse.y = gameState.mouse.screenY + cy; }
    p.angle = Math.atan2(gameState.mouse.y - p.y, gameState.mouse.x - p.x);

    updateRooms();
    updateEnemies(dt);
    updateBullets(dt);
    updateParticles(dt);
    updateItems();

    if (gameState.exitZone && gameState.enemies.length === 0) {
        let ez = gameState.exitZone, dx = p.x - Math.max(ez.x, Math.min(p.x, ez.x + ez.w)), dy = p.y - Math.max(ez.y, Math.min(p.y, ez.y + ez.h));
        if ((dx * dx + dy * dy) < (p.radius * p.radius)) { sfx.teleport(); advanceLevel(); }
    }
}

function updateRooms() {
    if (!gameState.rooms) return;
    for (let r of gameState.rooms) {
        if (r.isCleared) continue;
        let inZone = (gameState.player.x > r.trigger.x && gameState.player.x < r.trigger.x + r.trigger.w && gameState.player.y > r.trigger.y && gameState.player.y < r.trigger.y + r.trigger.h);
        if (inZone && !r.isLocked) {
            r.isLocked = true;
            for(let d of r.doors) { d.isDoor = true; gameState.walls.push(d); }
        }
        if (r.isLocked) {
            let alive = 0;
            for (let e of gameState.enemies) if (e.x > r.trigger.x && e.x < r.trigger.x + r.trigger.w && e.y > r.trigger.y && e.y < r.trigger.y + r.trigger.h) alive++;
            if (alive === 0) { r.isLocked = false; r.isCleared = true; gameState.walls = gameState.walls.filter(w => !w.isDoor); }
        }
    }
}

function updateEnemies(dt) {
    let p = gameState.player, invis = (p.activeBuffs && p.activeBuffs.invis > 0), shielded = (p.activeBuffs && p.activeBuffs.shield > 0);
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        let e = gameState.enemies[i], dx = p.x - e.x, dy = p.y - e.y, dist = Math.sqrt(dx*dx + dy*dy), ang = Math.atan2(dy, dx);
        
        let diff = ang - e.angle;
        while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
        
        let fov = (e.type === 'sniper') ? (Math.PI / 3) : (Math.PI * 0.7);
        let inCone = Math.abs(diff) < (fov / 2);
        if (e.type === 'boss' || e.type === 'explosive' || e.type === 'cloaked') inCone = true;
        
        let canSee = inCone && check_line_of_sight(e.x, e.y, p.x, p.y, gameState.walls) && !invis;
        if (canSee) e.angle = lerpAngle(e.angle, ang, 5 * dt); 
        else if (e.type !== 'boss') e.angle += Math.sin((performance.now() / 600) + e.x) * 1.2 * dt;

        let moving = false;
        if (e.type === 'rusher' && dist < 200 && canSee) { e.x += Math.cos(e.angle)*e.speed*dt; e.y += Math.sin(e.angle)*e.speed*dt; moving = true; if(!shielded && dist < e.radius + p.radius) p.health -= 0.2; }
        else if (e.type === 'turret') {
            e.fireCooldown -= dt;
            if (dist < 300 && canSee) { e.angle = ang; if (e.fireCooldown <= 0 && !e.isBursting) { e.isBursting = true; e.burstShots = 3; e.burstTimer = 0; } }
            if (e.isBursting) {
                e.burstTimer -= dt;
                if (e.burstTimer <= 0) {
                    gameState.bullets.push({ x: e.x, y: e.y, vx: Math.cos(e.angle + (Math.random()-0.5)*0.25)*450, vy: Math.sin(e.angle + (Math.random()-0.5)*0.25)*450, radius: 5, bounces: 1, isEnemyBullet: true, damage: 8 });
                    e.burstShots--; e.burstTimer = 0.15;
                    if (e.burstShots <= 0) { e.isBursting = false; e.fireCooldown = 2.0; }
                }
            }
        }
        else if (e.type === 'sniper') {
            e.fireCooldown -= dt;
            if (dist < 750 && canSee) {
                if (e.fireCooldown > 0.5) e.angle = ang;
                if (e.fireCooldown <= 0) { gameState.bullets.push({ x: e.x, y: e.y, vx: Math.cos(e.angle)*1200, vy: Math.sin(e.angle)*1200, radius: 3, bounces: 0, isEnemyBullet: true, damage: 25 }); e.fireCooldown = 3.5; }
            }
        }
        else if (e.type === 'dasher') {
            e.dashCooldown -= dt;
            if (dist < 200 && canSee) {
                if (e.dashCooldown <= 0) { e.isDashing = true; e.dashCooldown = 2.5; }
                let s = e.isDashing ? e.speed * 4 : e.speed;
                if (e.isDashing && e.dashCooldown < 2.2) e.isDashing = false;
                e.x += Math.cos(e.angle)*s*dt; e.y += Math.sin(e.angle)*s*dt; moving = true;
            }
            if(!shielded && dist < e.radius + p.radius) p.health -= 0.5;
        }
        else if (e.type === 'explosive') {
            if (dist < 350 && e.explodeTimer === -1 && canSee) { e.x += Math.cos(e.angle)*e.speed*dt; e.y += Math.sin(e.angle)*e.speed*dt; moving = true; if(dist < 60) e.explodeTimer = 0.6; }
            if (e.explodeTimer > -1) {
                e.explodeTimer -= dt; e.color = (Math.floor(e.explodeTimer * 10) % 2 === 0) ? 'white' : 'crimson';
                if (e.explodeTimer <= 0) { sfx.explosion(); if (dist < 120 && !shielded) p.health -= 15; gameState.enemies.splice(i, 1); continue; }
            }
        }
        else if (e.type === 'cloaked') {
            if (dist < 150 && canSee) { e.isVisible = true; e.x += Math.cos(e.angle)*e.speed*dt; e.y += Math.sin(e.angle)*e.speed*dt; moving = true; if(dist < e.radius + p.radius && !shielded) p.health -= 0.3; } else e.isVisible = false;
        }
        else if (e.type === 'boss') {
            e.attackCooldown -= dt; e.spawnCooldown -= dt;
            e.x += Math.cos(e.angle)*e.speed*dt; e.y += Math.sin(e.angle)*e.speed*dt; moving = true;
            if (canSee) {
                if (e.attackCooldown <= 0) { for (let j=0; j<8; j++) gameState.bullets.push({ x: e.x, y: e.y, vx: Math.cos(e.angle + j*Math.PI/4)*350, vy: Math.sin(e.angle + j*Math.PI/4)*350, radius: 8, bounces: 1, isEnemyBullet: true, damage: 20 }); e.attackCooldown = 2.5; }
                if (e.spawnCooldown <= 0) { if (gameState.enemies.length < 15) { gameState.enemies.push(EnemyFactory.createExplosive(e.x-60, e.y), EnemyFactory.createExplosive(e.x+60, e.y)); } e.spawnCooldown = 7.0; }
            }
            if(!shielded && dist < e.radius + p.radius) p.health -= 2.0;
        }

        if (moving) { let res = resolve_circle_aabb_collision(e.x, e.y, e.radius, gameState.walls); e.x = res.x; e.y = res.y; }
    }
    if (p.health <= 0) { p.health = 0; gameState.gameOver = true; }
}

function updateBullets(dt) {
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        let b = gameState.bullets[i], hit = false, norm = { x: 0, y: 0 };
        b.x += b.vx * dt; b.y += b.vy * dt;
        
        for (let w of gameState.walls) {
            if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
                hit = true;
                let dL = Math.abs(b.x - w.x), dR = Math.abs(b.x - (w.x + w.w)), dT = Math.abs(b.y - w.y), dB = Math.abs(b.y - (w.y + w.h)), min = Math.min(dL, dR, dT, dB);
                if (min === dL) norm = {x:-1, y:0}; else if (min === dR) norm = {x:1, y:0}; else if (min === dT) norm = {x:0, y:-1}; else norm = {x:0, y:1};
                b.x += norm.x * 2; b.y += norm.y * 2; break;
            }
        }

        let destroyed = false;
        if (b.isEnemyBullet) {
            let dx = gameState.player.x - b.x, dy = gameState.player.y - b.y, dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < gameState.player.radius + b.radius) {
                destroyed = true;
                if (gameState.player.activeBuffs && gameState.player.activeBuffs.shield > 0) sfx.ricochet(); 
                else { gameState.player.health -= (b.damage || 5); sfx.hit(); if (gameState.player.health <= 0) { gameState.player.health = 0; gameState.gameOver = true; } }
            }
        } else {
            for (let k = gameState.enemies.length - 1; k >= 0; k--) {
                let e = gameState.enemies[k], dx = e.x - b.x, dy = e.y - b.y;
                if (Math.sqrt(dx*dx + dy*dy) < e.radius + b.radius) {
                    e.health -= b.damage; destroyed = true;
                    if (e.health <= 0) {
                        gameState.score = (gameState.score || 0) + (e.type==='boss'?5000: e.type==='rusher'?50: (e.type==='dasher'||e.type==='explosive'?100:150));
                        if (!gameState.particles) gameState.particles = [];
                        for(let s=0; s<15; s++) gameState.particles.push({ x: e.x, y: e.y, vx: Math.cos(Math.random()*Math.PI*2)*(50+Math.random()*200), vy: Math.sin(Math.random()*Math.PI*2)*(50+Math.random()*200), life: 0.3+Math.random()*0.3, maxLife: 0.6, color: e.color, size: 3+Math.random()*3 });
                        
                        let dropC = (e.type==='rusher')?0.3:(e.type==='sniper'||e.type==='turret')?0.7:0.45, healA = (e.type==='rusher')?15:(e.type==='sniper'||e.type==='turret')?45:25;
                        if (!gameState.items) gameState.items = [];
                        if (Math.random() < dropC) gameState.items.push({ type:'health', x: e.x, y: e.y, radius: 10, heal: healA });
                        gameState.items.push({ type: 'goop', x: e.x + (Math.random()*20-10), y: e.y + (Math.random()*20-10), radius: 7, value: (e.type==='rusher')?5:(e.type==='sniper'||e.type==='turret')?30:15 });
                        gameState.enemies.splice(k, 1);
                    }
                    break;
                }
            }
        }

        if (destroyed) { gameState.bullets.splice(i, 1); continue; }
        if (hit) {
            b.bounces--; sfx.ricochet();
            for(let s=0; s<5; s++) gameState.particles.push({ x: b.x, y: b.y, vx: norm.x*150+(Math.random()-0.5)*150, vy: norm.y*150+(Math.random()-0.5)*150, life: 0.15+Math.random()*0.15, maxLife: 0.3, color: '#ffff00', size: 2+Math.random()*2 });
            if (b.bounces <= 0) { gameState.bullets.splice(i, 1); continue; } 
            else { let ref = Vector_reflect({x: b.vx, y: b.vy}, norm); b.vx = ref.x; b.vy = ref.y; }
        }
    }
}

function updateParticles(dt) {
    if (!gameState.particles) return;
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        let p = gameState.particles[i]; p.life -= dt;
        if (p.life <= 0) { gameState.particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; p.size *= 0.95; 
    }
}

function updateItems() {
    if (!gameState.items) return;
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        let it = gameState.items[i], dx = gameState.player.x - it.x, dy = gameState.player.y - it.y;
        if (Math.sqrt(dx*dx + dy*dy) < gameState.player.radius + it.radius) {
            sfx.pickup();
            if (it.type === 'health') { gameState.player.health += it.heal; if (gameState.player.health > (gameState.player.maxHealth || 100)) gameState.player.health = gameState.player.maxHealth || 100; } 
            else if (it.type === 'goop') { gameState.player.goop = (gameState.player.goop || 0) + it.value; }
            gameState.items.splice(i, 1);
        }
    }
}


// RENDER LOGIC

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameState.gameStarted || gameState.gameOver || gameState.gameWon) {
        ctx.fillStyle = gameState.gameWon ? 'rgba(0, 20, 10, 0.9)' : (gameState.gameOver ? 'rgba(20, 0, 0, 0.9)' : '#050510'); 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        
        if (!gameState.gameStarted) {
            ctx.strokeStyle = '#111122'; ctx.lineWidth = 1; for(let i=0; i<=canvas.width; i+=50){ ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); } for(let j=0; j<=canvas.height; j+=50){ ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke(); }
            ctx.fillStyle = '#00ffff'; ctx.font = 'bold 60px Courier New'; ctx.fillText("DArk: Echo Sector", canvas.width / 2, canvas.height / 2 - 40);
            ctx.fillStyle = `rgba(0, 255, 102, ${0.5 + Math.abs(Math.sin(performance.now() / 300)) * 0.5})`; ctx.font = 'bold 24px Courier New'; ctx.fillText("> CLICK TO START MISSION <", canvas.width / 2, canvas.height / 2 + 40);
        } else {
            ctx.fillStyle = gameState.gameWon ? '#00ff66' : '#ff3333'; ctx.font = 'bold 50px Courier New'; ctx.fillText(gameState.gameWon ? "MISSION ACCOMPLISHED" : "PLAYER DEFEATED", canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = 'white'; ctx.font = '20px Courier New'; ctx.fillText(gameState.gameWon ? "Enemies Have Been Neutralised!" : "Press R to Restart", canvas.width / 2, canvas.height / 2 + 30);
            if (gameState.gameWon) {
                ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 35px Courier New'; ctx.fillText("FINAL SCORE: " + (gameState.score || 0), canvas.width / 2, canvas.height / 2 + 80);
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 25px Courier New'; ctx.fillText("CLEAR TIME: " + formatTime(gameState.timer || 0), canvas.width / 2, canvas.height / 2 + 120);
            }
        }
        ctx.textAlign = 'left'; return; 
    }

    let cx = gameState.player.x - canvas.width / 2, cy = gameState.player.y - canvas.height / 2;
    ctx.save(); ctx.translate(-cx, -cy);

    // Grid
    ctx.strokeStyle = '#111122'; ctx.lineWidth = 1;
    for(let i=0; i<=2000; i+=50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 2000); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(2000, i); ctx.stroke(); }

    // Walls & Doors
    ctx.fillStyle = '#4a1515'; ctx.strokeStyle = '#c23b3b'; ctx.lineWidth = 2;
    for (let w of gameState.walls) { if (w.isDoor) continue; ctx.fillRect(w.x, w.y, w.w, w.h); ctx.strokeRect(w.x, w.y, w.w, w.h); }
    if (gameState.rooms) for (let r of gameState.rooms) if (r.isLocked) { ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 4; for (let d of r.doors) { ctx.fillRect(d.x, d.y, d.w, d.h); ctx.beginPath(); ctx.setLineDash([10, 5]); ctx.lineDashOffset = -performance.now() / 20; ctx.strokeRect(d.x, d.y, d.w, d.h); ctx.setLineDash([]); } }

    // Exit
    if (gameState.exitZone) {
        let ex = gameState.exitZone, clr = (gameState.enemies.length === 0);
        ctx.fillStyle = clr ? 'rgba(0, 255, 100, 0.2)' : 'rgba(100, 0, 0, 0.2)'; ctx.strokeStyle = clr ? '#00ff66' : '#ff3333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.rect(ex.x, ex.y, ex.w, ex.h); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'white'; ctx.font = 'bold 16px Courier New'; ctx.fillText(clr ? "EXTRACTION OPEN" : "ZONE LOCKED", ex.x + 10, ex.y + 35);
    }

    // Items
    if (gameState.items) for (let it of gameState.items) {
        ctx.save(); ctx.translate(it.x, it.y + Math.sin(performance.now()/200)*3);
        if (it.type === 'health') { ctx.scale(0.8, 0.8); ctx.beginPath(); ctx.moveTo(0, -3); ctx.bezierCurveTo(10, -15, 25, -3, 0, 15); ctx.bezierCurveTo(-25, -3, -10, -15, 0, -3); ctx.fillStyle = '#00ff66'; ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 15; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); } 
        else if (it.type === 'goop') { ctx.beginPath(); ctx.arc(0, 0, it.radius + Math.abs(Math.sin(performance.now()/150))*2, 0, Math.PI*2); ctx.fillStyle = '#9d00ff'; ctx.shadowColor = '#d000ff'; ctx.shadowBlur = 12; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, it.radius/2, 0, Math.PI*2); ctx.fillStyle = '#00ffff'; ctx.fill(); }
        ctx.restore();
    }

    // Enemies & UI
    for (let e of gameState.enemies) {
        if (e.type === 'cloaked' && !e.isVisible && gameState.flashlight !== false) continue;
        
        // Vision Cones & Lasers
        if (e.health > 0 && e.type !== 'boss' && e.type !== 'explosive' && e.type !== 'cloaked') {
            let fov = (e.type==='sniper') ? (Math.PI/3) : (Math.PI*0.7), dist = (e.type==='sniper')?450:(e.type==='turret')?300:250;
            ctx.beginPath(); ctx.moveTo(e.x, e.y);
            for(let j=0; j<=20; j++) {
                let rAng = e.angle - (fov/2) + (j/20)*fov, rEnd = { x: e.x + Math.cos(rAng)*dist, y: e.y + Math.sin(rAng)*dist }, cInt = null, minD = 1;
                for(let w of gameState.walls) for(let l of [[w.x, w.y, w.x+w.w, w.y], [w.x, w.y+w.h, w.x+w.w, w.y+w.h], [w.x, w.y, w.x, w.y+w.h], [w.x+w.w, w.y, w.x+w.w, w.y+w.h]]) { let i = get_line_intersection(e.x, e.y, rEnd.x, rEnd.y, l[0], l[1], l[2], l[3]); if(i && i.distance < minD) { minD = i.distance; cInt = i; } }
                ctx.lineTo(cInt ? cInt.x : rEnd.x, cInt ? cInt.y : rEnd.y);
            }
            ctx.closePath(); ctx.fillStyle = 'rgba(255, 0, 0, 0.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)'; ctx.lineWidth = 1; ctx.stroke();
        }
        if (e.type === 'sniper' && e.fireCooldown > 0 && e.fireCooldown < 1.5) { let ints = 1.5 - e.fireCooldown; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.angle)*1000, e.y + Math.sin(e.angle)*1000); ctx.strokeStyle = `rgba(255, 0, 0, ${ints})`; ctx.lineWidth = ints*2; ctx.stroke(); }
        if (e.type === 'turret' && e.fireCooldown > 0 && e.fireCooldown < 0.5) { ctx.beginPath(); ctx.arc(e.x, e.y, e.radius+6, 0, Math.PI*2); ctx.fillStyle = 'rgba(255, 200, 0, 0.4)'; ctx.fill(); }

        // Health Bars
        if (!e.maxHealth) e.maxHealth = e.health;
        if (e.type === 'boss') {
            ctx.beginPath(); ctx.arc(e.x, e.y, e.radius+15, 0, Math.PI*2); ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3; ctx.setLineDash([15, 10]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#440000'; ctx.fillRect(e.x-80, e.y-e.radius-40, 160, 12); ctx.fillStyle = '#ff00ff'; ctx.fillRect(e.x-80, e.y-e.radius-40, 160*(e.health/e.maxHealth), 12); ctx.strokeStyle = '#ffffff'; ctx.strokeRect(e.x-80, e.y-e.radius-40, 160, 12);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'center'; ctx.fillText("OMEGA", e.x, e.y-e.radius-45); ctx.textAlign = 'left';
        } else { ctx.fillStyle = 'red'; ctx.fillRect(e.x-15, e.y-e.radius-12, 30, 4); ctx.fillStyle = 'lime'; ctx.fillRect(e.x-15, e.y-e.radius-12, 30*(e.health/e.maxHealth), 4); }

        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2); ctx.fillStyle = e.color; ctx.fill(); ctx.strokeStyle = 'darkred'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Bullets & Particles
    ctx.fillStyle = 'yellow'; for (let b of gameState.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2); ctx.fill(); }
    if (gameState.particles) for (let p of gameState.particles) { ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill(); }
    ctx.globalAlpha = 1.0;

    // Player
    let p = gameState.player, buffs = p.activeBuffs || { shield: 0, invis: 0 };
    ctx.globalAlpha = (buffs.invis > 0) ? 0.3 : 1.0;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fillStyle = 'white'; ctx.fill(); ctx.strokeStyle = 'cyan'; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1.0;
    if (buffs.shield > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius+10, 0, Math.PI*2); ctx.fillStyle = 'rgba(0, 200, 255, 0.3)'; ctx.fill(); ctx.strokeStyle = '#00c8ff'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.angle)*(p.radius+10), p.y + Math.sin(p.angle)*(p.radius+10)); ctx.strokeStyle = 'cyan'; ctx.lineWidth = 3; ctx.stroke();

    // Raycast Shadows
    if (gameState.flashlight !== false) {
        let fov = (120 * Math.PI)/180, sAng = p.angle - (fov/2), eps = [];
        for(let i=0; i<=60; i++) {
            let a = sAng + (i/60)*fov, rE = { x: p.x + Math.cos(a)*200, y: p.y + Math.sin(a)*200 }, cI = null, mD = 1;
            for(let w of gameState.walls) for(let l of [[w.x, w.y, w.x+w.w, w.y], [w.x, w.y+w.h, w.x+w.w, w.y+w.h], [w.x, w.y, w.x, w.y+w.h], [w.x+w.w, w.y, w.x+w.w, w.y+w.h]]) { let inter = get_line_intersection(p.x, p.y, rE.x, rE.y, l[0], l[1], l[2], l[3]); if(inter && inter.distance < mD) { mD = inter.distance; cI = inter; } }
            eps.push(cI ? cI : rE);
        }
        lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height); lightCtx.fillStyle = '#020205'; lightCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
        lightCtx.globalCompositeOperation = 'destination-out'; lightCtx.beginPath(); lightCtx.moveTo(p.x - cx, p.y - cy);
        for(let e of eps) lightCtx.lineTo(e.x - cx, e.y - cy);
        lightCtx.closePath(); lightCtx.fillStyle = 'white'; lightCtx.fill(); lightCtx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
    if (gameState.flashlight !== false) ctx.drawImage(lightCanvas, 0, 0);


    // UI MENUS
  
    ctx.fillStyle = 'rgba(6, 6, 18, 0.85)'; ctx.strokeStyle = '#5fecff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(260, 10); ctx.lineTo(280, 30); ctx.lineTo(280, 95); ctx.lineTo(30, 95); ctx.lineTo(10, 75); ctx.closePath(); ctx.fill(); ctx.stroke();
    
    let hp = Math.ceil(p.health), mHp = p.maxHealth || 100, hpC = hp<=25?'#ff3333':hp<=50?'#ffcc00':'#00ff66';
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px Courier New'; ctx.fillText("HEALTH", 25, 30); ctx.fillStyle = hpC; ctx.textAlign = 'right'; ctx.fillText(hp+"/"+mHp, 260, 30); ctx.textAlign = 'left';
    ctx.fillStyle = '#222233'; ctx.fillRect(25, 40, 200, 12); ctx.fillStyle = hpC; ctx.shadowColor = hpC; ctx.shadowBlur = 10; ctx.fillRect(25, 40, Math.max(0, (hp/mHp)*235), 12); ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(25, 40, 235, 12);
    
    ctx.beginPath(); ctx.arc(35, 75, 5 + Math.abs(Math.sin(performance.now()/200))*1.5, 0, Math.PI*2); ctx.fillStyle = '#9d00ff'; ctx.shadowColor = '#d000ff'; ctx.shadowBlur = 8; ctx.fill(); ctx.beginPath(); ctx.arc(35, 75, 2.5, 0, Math.PI*2); ctx.fillStyle = '#00ffff'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#d000ff'; ctx.font = 'bold 18px Courier New'; ctx.fillText("GOOP:" + (p.goop||0), 55, 81);

    ctx.fillStyle = 'rgba(6, 6, 18, 0.85)'; ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(canvas.width-240, 10); ctx.lineTo(canvas.width-10, 10); ctx.lineTo(canvas.width-10, 50); ctx.lineTo(canvas.width-220, 50); ctx.lineTo(canvas.width-240, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00ff66'; ctx.font = 'bold 22px Courier New'; ctx.textAlign = 'right'; ctx.fillText("SCORE: " + (gameState.score||0), canvas.width-25, 36);

    ctx.fillStyle = 'rgba(6, 6, 18, 0.85)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(canvas.width/2-80, 0); ctx.lineTo(canvas.width/2+80, 0); ctx.lineTo(canvas.width/2+60, 40); ctx.lineTo(canvas.width/2-60, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Courier New'; ctx.textAlign = 'center'; ctx.fillText(formatTime(gameState.timer||0), canvas.width/2, 28); ctx.textAlign = 'left';

    let u = gameState.upgrades || { damage: 0, speed: 0, health: 0, multi: 1, lightActive: false };
    ctx.fillStyle = gameState.isMarketplaceOpen ? '#d000ff' : 'rgba(6, 6, 18, 0.85)'; ctx.strokeStyle = '#d000ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(10, 105, 40, 40); ctx.fill(); ctx.stroke(); ctx.fillStyle = gameState.isMarketplaceOpen ? '#ffffff' : '#00ffff'; ctx.font = 'bold 24px Courier New'; ctx.fillText("$", 21, 133);
    
    let iN = ["DMG", "SPD", "HP", "MLT", "LGT"], iV = [u.damage+"/2", u.speed+"/2", u.health+"/2", u.multi+"/3", u.lightActive?"ON":"RDY"], iC = ["#ff3333", "#ffcc00", "#00ff66", "#00ffff", "#ffffff"];
    for (let i=0; i<5; i++) { let icX = 10+(i*45); ctx.fillStyle = 'rgba(6, 6, 18, 0.85)'; ctx.strokeStyle = iC[i]; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(icX, 155, 35, 35); ctx.fill(); ctx.stroke(); ctx.fillStyle = iC[i]; ctx.font = 'bold 10px Courier New'; ctx.fillText(iN[i], icX+6, 169); ctx.fillStyle = '#ffffff'; ctx.fillText(iV[i], icX+8, 183); }

    if (gameState.isMarketplaceOpen) {
        let mX = 60, mY = 105, mW = 450, mH = 360;
        ctx.fillStyle = 'rgba(6, 6, 18, 0.95)'; ctx.strokeStyle = '#d000ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mX, mY); ctx.lineTo(mX+mW, mY); ctx.lineTo(mX+mW, mY+mH-20); ctx.lineTo(mX+mW-20, mY+mH); ctx.lineTo(mX, mY+mH); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#00ffff'; ctx.font = 'bold 18px Courier New'; ctx.fillText("TERMINAL MARKET", mX+20, mY+30); ctx.beginPath(); ctx.moveTo(mX+15, mY+40); ctx.lineTo(mX+mW-15, mY+40); ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)'; ctx.stroke();
        let items = [ { n: "DAMAGE BOOST", c: 30, v: u.damage, m: 2 }, { n: "SPEED BOOST", c: 30, v: u.speed, m: 2 }, { n: "HEALTH BOOST", c: 40, v: u.health, m: 2 }, { n: "MULTI-BULLET", c: 80, v: u.multi, m: 3 }, { n: "MAP SCAN", c: 20, v: u.lightActive?"ACT":0, m: "INF" }, { n: "SPEED POTION", c: 20, v: p.potions.speed, m: "INF" }, { n: "SHIELD POTION", c: 30, v: p.potions.shield, m: "INF" }, { n: "INVIS POTION", c: 30, v: p.potions.invis, m: "INF" } ];
        for (let i=0; i<items.length; i++) {
            let iY = mY+70+(i*35), it = items[i], max = it.m!=="INF" && it.v>=it.m, aff = p.goop>=it.c, unv = max || (i===4 && u.lightActive);
            ctx.fillStyle = unv?'#444':(aff?'#9d00ff':'#880000'); ctx.fillRect(mX+15, iY-12, 12, 12); ctx.fillStyle = 'white'; ctx.font = 'bold 10px Courier New'; ctx.fillText((i+1), mX+18, iY-3);
            ctx.fillStyle = unv?'#666':'#ffffff'; ctx.font = 'bold 14px Courier New'; ctx.fillText(it.n, mX+35, iY-2);
            ctx.fillStyle = max?'#00ffff':(aff?'#00ff66':'#ff3333'); ctx.textAlign = 'right'; ctx.fillText(max?"MAXED":(i===4&&u.lightActive)?"ACTIVE":it.c+"G", mX+mW-15, iY-2); ctx.textAlign = 'left'; 
            ctx.beginPath(); ctx.moveTo(mX+15, iY+5); ctx.lineTo(mX+mW-15, iY+5); ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.stroke();
        }
        ctx.fillStyle = '#888888'; ctx.font = '12px Courier New'; ctx.fillText("Press 1-8 to purchase | Use: Shift(Speed), Q(Shield), E(Inv)", mX+15, mY+mH-15);
    }

    if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 5, 10, 0.75)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ffff'; ctx.font = 'bold 50px Courier New'; ctx.textAlign = 'center'; ctx.fillText("SYSTEM PAUSED", canvas.width/2, canvas.height/2);
        ctx.fillStyle = 'white'; ctx.font = '20px Courier New'; ctx.fillText("Press ESC to resume", canvas.width/2, canvas.height/2+40);
        ctx.fillStyle = '#ff3333'; ctx.fillText("Press R to Restart Mission", canvas.width/2, canvas.height/2+70); ctx.textAlign = 'left'; 
    }
}
