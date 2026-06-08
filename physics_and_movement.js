function darkSpaceVector_add(v1, v2) {
    return { 
        x: v1.x + v2.x, 
        y: v1.y + v2.y 
    };

}
function darkSpaceVector_dot(v1,v2){
    return (v1.x*v2.x)+(v1.y*v2.y);
}
//r = v - 2(v.n)n
function darkSpaceVector_reflect(velocity, normal) {
    let dot = darkSpaceVector_dot(velocity, normal);
    return {
        x: velocity.x - 2 * dot * normal.x,
        y: velocity.y - 2 * dot * normal.y
    };
}

// Converts raw seconds into a sleek MM:SS:MS digital format
function formatTime(totalSeconds) {
    let m = Math.floor(totalSeconds / 60);
    let s = Math.floor(totalSeconds % 60);
    let ms = Math.floor((totalSeconds % 1) * 100);
    
    let mStr = (m < 10 ? "0" : "") + m;
    let sStr = (s < 10 ? "0" : "") + s;
    let msStr = (ms < 10 ? "0" : "") + ms;
    
    return mStr + ":" + sStr + ":" + msStr;
}

// Calculates the smoothest, shortest rotational path between two angles
function lerpAngle(current, target, speed) {
    let diff = target - current;
    // Normalize the difference so they don't spin the wrong way!
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return current + diff * speed;
}
// ==========================================
// CUSTOM AUDIO ENGINE (.mp3 / .wav)
// ==========================================

// 1. BACKGROUND MUSIC CONTROLLER
const bgm = {
    menu: new Audio('menu_theme.mp3'),
    level1: new Audio('level1_theme.mp3'),
    level2: new Audio('level2_theme.mp3'),
    boss: new Audio('boss_theme.mp3'),
    victory:new Audio('victory.mp3'),
    defeat:new Audio('defeat.mp3'),
    currentTrack: null,

    playTrack: function(trackName) {
        // Stop whatever is currently playing
      if (this.currentTrack === this[trackName]) return;

        // Stop whatever is currently playing
        if (this.currentTrack) {
            this.currentTrack.pause();
            this.currentTrack.currentTime = 0; 
        }
        // Start the new track and tell it to loop forever
        if (this[trackName]) {
            this.currentTrack = this[trackName];
            this.currentTrack.loop = true;
            this.currentTrack.volume = 0.4; // Background music should be a bit quieter
            this.currentTrack.play().catch(e => console.log("Waiting for user interaction to play audio."));
        }
    }
};

// 2. SOUND EFFECTS (SFX) CONTROLLER
const sfx = {
    teleportSound: new Audio('teleport.mp3'),
    shootSound: new Audio('shoot.mp3'),
    hitSound: new Audio('hit.mp3'),
    explosionSound: new Audio('explosion.mp3'),
    pickupSound: new Audio('pickup.mp3'),
    ricochetSound: new Audio('ricochet.mp3'),
    teleport: function() {
        let clone = this.teleportSound.cloneNode(true);
        clone.volume = 0.8;
        clone.play();
    },
    shoot: function() { 
        // We use cloneNode() so you can fire your gun really fast 
        // and the sounds will overlap naturally instead of cutting each other off!
        let clone = this.shootSound.cloneNode(true);
        clone.volume = 0.5;
        clone.play(); 
    },
    hit: function() { 
        let clone = this.hitSound.cloneNode(true); 
        clone.volume = 0.6;
        clone.play(); 
    },
    explosion: function() { 
        let clone = this.explosionSound.cloneNode(true); 
        clone.volume = 0.8;
        clone.play(); 
    },
    pickup: function() { 
        let clone = this.pickupSound.cloneNode(true);
        clone.volume = 0.7; 
        clone.play(); 
    },
    ricochet: function() { 
        let clone = this.ricochetSound.cloneNode(true); 
        clone.volume = 0.3; // Ricochets should be quiet so they aren't annoying
        clone.play(); 
    }
};

// We keep this empty function so we don't break the 'mousedown' listener
function initAudio() {}






// Create a secondary canvas for shadow rendering
const lightCanvas = document.createElement('canvas');
const lightCtx = lightCanvas.getContext('2d');
// Sync its size to the main game canvas
lightCanvas.width = window.innerWidth;
lightCanvas.height = window.innerHeight;

window.addEventListener('resize', function() {
    lightCanvas.width = window.innerWidth;
    lightCanvas.height = window.innerHeight;
});

//RAYCASTING MATH

function get_line_intersection(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
    let s1_x = p1_x - p0_x; 
    let s1_y = p1_y - p0_y;
    let s2_x = p3_x - p2_x; 
    let s2_y = p3_y - p2_y;
    
    let denominator = (-s2_x * s1_y + s1_x * s2_y);
    if (denominator === 0) return null; // Lines are parallel

    let s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / denominator;
    let t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / denominator;

    // If there is an intersection between the line segments, return the point and distance
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        return { 
            x: p0_x + (t * s1_x), 
            y: p0_y + (t * s1_y), 
            distance: t 
        };
    }
    return null;
}
function check_line_of_sight(startX, startY, targetX, targetY, walls) {
    for (let j = 0; j < walls.length; j++) {
        let w = walls[j];
        // The 4 edges of the wall
        let lines = [
            [w.x, w.y, w.x + w.w, w.y],                 // Top
            [w.x, w.y + w.h, w.x + w.w, w.y + w.h],     // Bottom
            [w.x, w.y, w.x, w.y + w.h],                 // Left
            [w.x + w.w, w.y, w.x + w.w, w.y + w.h]      // Right
        ];

        for (let l of lines) {
            let intersect = get_line_intersection(
                startX, startY, targetX, targetY, 
                l[0], l[1], l[2], l[3]
            );
            // If the line hits ANY wall edge, vision is blocked!
            if (intersect) return false; 
        }
    }
    // If we checked all walls and hit nothing, the path is clear!
    return true; 
}


function resolve_circle_aabb_collision(px, py, radius, walls) {
    let newX = px;
    let newY = py;

    for (let i = 0; i < walls.length; i++) {
        let wall = walls[i];
        
        // Find the closest point on the rectangle to the circle's center
        let closestX = Math.max(wall.x, Math.min(newX, wall.x + wall.w));
        let closestY = Math.max(wall.y, Math.min(newY, wall.y + wall.h));

        // Calculate distance between circle center and closest point on the wall
        let dx = newX - closestX;
        let dy = newY - closestY;
        let distance = Math.sqrt((dx * dx) + (dy * dy));

        // If distance is less than the radius, push the circle out!
        if (distance < radius && distance > 0) {
            let overlap = radius - distance;
            newX += (dx / distance) * overlap;
            newY += (dy / distance) * overlap;
        }
    }
    
    return { x: newX, y: newY };
}
window.addEventListener('keydown', function(e) {
single_global_state_object.keys[e.code] = true;
    
    // RESTART LOGIC
   if (e.code === 'KeyR' && (single_global_state_object.gameOver || single_global_state_object.isPaused || single_global_state_object.gameWon)) {
        // Reset player stats
        single_global_state_object.gameOver = false;
        single_global_state_object.player.health = 100;
        single_global_state_object.player.goop = 0;
        single_global_state_object.player.speed = 200; 
        single_global_state_object.isPaused = false;
        single_global_state_object.score = 0;
        single_global_state_object.flashlight = true;
        single_global_state_object.gameWon = false;
        single_global_state_object.timer = 0;

        // Reset all marketplace upgrades
        single_global_state_object.upgrades = { damage: 0, speed: 0, health: 0, multi: 1, lightActive: false };
        single_global_state_object.player.maxHealth = 100;
        
        if (typeof bgm !== 'undefined' && bgm.playTrack) {
            bgm.playTrack('level1');
        }
        
        // ==========================================
        // HARD RESET: RETURN TO LEVEL 1
        // ==========================================
        single_global_state_object.currentLevel = 1;
        single_global_state_object.rooms = [];
        
        // Rebuild the original Level 1 Map (Echo Sector)
        single_global_state_object.walls = [
           { x: 600, y: 680, w: 400, h: 20 },
                { x: 180, y: 350, w: 130, h: 20 },  
                { x: 980, y: 450, w: 20, h: 80 }, 
                { x: 980, y: 600, w: 20, h: 100 }, 
                { x: 100, y: 800, w: 900, h: 20 },
                 { x: 980, y: 700, w: 20, h: 120 },
            
                { x: 600, y: 450, w: 20, h: 80 },   
                { x: 600, y: 600, w: 20, h: 100 },  
                
                { x: 600, y: 450, w: 150, h: 20 },  
                { x: 850, y: 450, w: 150, h: 20 }, 
                { x: 80, y: 50, w: 20, h: 770 },
                 {x: 1450, y: 50, w: 20, h: 770 },  
                 { x: 1000, y: 800, w: 450, h: 20 },
                 { x: 1000, y: 50, w: 450, h: 20 },
                  { x: 1000, y: 680, w: 150, h: 20 },
                   { x: 1300, y: 550, w: 150, h: 20 }, 
                    { x: 1000, y: 450, w: 150, h: 20 }, 
                    {x: 1150, y: 400, w: 20, h: 70 }, 
                     { x: 1270, y: 400, w: 180, h: 20 },    

                
                
                
                { x: 300, y: 450, w: 120, h: 20 },
                { x: 500, y: 450, w: 120, h: 20 },  
                { x: 300, y: 680, w: 320, h: 20 },  
                { x: 300, y: 450, w: 20, h: 70 },
                { x: 300, y: 600, w: 20, h: 80 },
                { x: 300, y: 250, w: 20, h: 200 },  
                { x: 300, y: 250, w: 120, h: 20 },
                { x: 100, y: 50, w: 350, h: 20 },
                { x: 100, y: 680, w: 70, h: 20 },
                { x: 230, y: 680, w: 70, h: 20 },
                

                
                
                
                { x: 730, y: 250, w: 20, h: 220 },  
                { x: 850, y: 250, w: 20, h: 220 },  

               
                { x: 400, y: 50, w: 800, h: 20 },  
                { x: 400, y: 50, w: 20, h: 220 },  
                { x: 1180, y: 50, w: 20, h: 220 },  
                
                { x: 400, y: 250, w: 350, h: 20 },  
                { x: 850, y: 250, w: 350, h: 20 },  

              
                { x: 600, y: 120, w: 60, h: 60 },   
                { x: 940, y: 120, w: 60, h: 60 }, 
                { x: 170, y: 550, w: 60, h: 60 }, 
                { x: 200, y: 120, w: 60, h: 60 }, 
        ];
         single_global_state_object.rooms =[
            {
           trigger: { x: 300, y: 280, w: 450, h: 180 }, 
                doors: [
                    { x: 420, y: 450, w: 80, h: 20 }, // Plugs the top gap perfectly
                    { x: 730, y: 270, w: 20, h: 80 }   // Plugs the left gap perfectly
                ],
                isLocked: false,
                isCleared: false
            },
               {
           trigger: { x: 100, y: 50, w: 300, h: 300 }, 
                doors: [
                    { x: 100, y: 350, w: 80, h: 20 }, // Plugs the top gap perfectly
                       // Plugs the left gap perfectly
                ],
                isLocked: false,
                isCleared: false
            },
             {
           trigger: { x: 100, y: 700, w: 500, h: 100 }, 
                doors: [
                   { x: 170, y: 680, w: 60, h: 20 }, 
                    { x: 600, y: 700, w: 20, h: 100 },// Plugs the top gap perfectly
                       // Plugs the left gap perfectly
                ],
                isLocked: false,
                isCleared: false
            },
            {
           trigger: { x: 850, y: 250, w: 300, h: 200 }, 
                doors: [
                   { x: 1150, y: 270, w: 20, h: 130 }, 
                   // Plugs the top gap perfectly
                       // Plugs the left gap perfectly
                ],
                isLocked: false,
                isCleared: false
            }
            
        ];
        
        // Restore Map 1 Exit Zone
        single_global_state_object.exitZone = { x: 740, y: 70, w: 160, h: 50 };
        
        // Teleport player back to Map 1 Spawn
        player_position_x = 800; 
        player_position_y = 600;
        
        // Clear all debris and spawn Level 1 enemies
        single_global_state_object.bullets = [];
        single_global_state_object.items = [];
        enemy_manager_singleton_controller_factory.spawnWave(single_global_state_object);
    }
    // MARKETPLACE TOGGLE LOGIC
    if (e.code === 'KeyM') {
        single_global_state_object.isMarketplaceOpen = !single_global_state_object.isMarketplaceOpen;
    }
    if (e.code === 'Escape') {
        // Only allow pause if the game is actively running
        if (single_global_state_object.gameStarted && !single_global_state_object.gameOver && !single_global_state_object.gameWon) {
            single_global_state_object.isPaused = !single_global_state_object.isPaused;
            
            // Reset the time tracker when unpausing so the game doesn't instantly fast-forward!
            if (!single_global_state_object.isPaused) {
                single_global_state_object.lastTime = performance.now();
            }
        }
    }
    let p = single_global_state_object.player;
    if (!p.potions) p.potions = { speed: 0, shield: 0, invis: 0 };
    if (!p.activeBuffs) p.activeBuffs = { speed: 0, shield: 0, invis: 0 };
    // MARKETPLACE PURCHASING LOGIC (1-5 Keys)
    if (single_global_state_object.isMarketplaceOpen && single_global_state_object.upgrades) {
        let u = single_global_state_object.upgrades;
       
        if (!p.potions) p.potions = { speed: 0, shield: 0, invis: 0 };
        
        if (e.code === 'Digit1' && p.goop >= 30 && u.damage < 2) {
            p.goop -= 30; u.damage++;
        }
        if (e.code === 'Digit2' && p.goop >= 30 && u.speed < 2) {
            p.goop -= 30; u.speed++; p.speed += 50; 
        }
        if (e.code === 'Digit3' && p.goop >= 40 && u.health < 2) {
            p.goop -= 40; u.health++; p.maxHealth += 25; p.health = p.maxHealth; // Heals you and raises cap
        }
        if (e.code === 'Digit4' && p.goop >= 80 && u.multi < 3) {
            p.goop -= 80; u.multi++;
        }
        if (e.code === 'Digit5' && p.goop >= 20 && !u.lightActive) {
            p.goop -= 20; 
            u.lightActive = true;
            single_global_state_object.flashlight = false; // Turn off shadows
            
            // Turn shadows back on after 3 seconds
            u.lightTimer = 3.0; // NEW: Set a 3.0 second fuse directly in the state
            
            single_global_state_object.flashlight = false;
        }
        
        if (e.code === 'Digit6' && p.goop >= 20) { p.goop -= 20; p.potions.speed++; }
        if (e.code === 'Digit7' && p.goop >= 30) { p.goop -= 30; p.potions.shield++; }
        if (e.code === 'Digit8' && p.goop >= 30) { p.goop -= 30; p.potions.invis++; }
    }
    
    // SPRINT (Shift Key)
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && p.potions.speed > 0 && p.activeBuffs.speed <= 0) {
        p.potions.speed--;
        p.activeBuffs.speed = 5.0; // 5 Seconds of extreme speed
        sfx.pickup(); 
    }
    // SHIELD (Q Key)
    if (e.code === 'KeyQ' && p.potions.shield > 0 && p.activeBuffs.shield <= 0) {
        p.potions.shield--;
        p.activeBuffs.shield = 5.0; // 5 Seconds of Invincibility
        sfx.pickup();
    }
    // INVISIBILITY (E Key)
    if (e.code === 'KeyE' && p.potions.invis > 0 && p.activeBuffs.invis <= 0) {
        p.potions.invis--;
        p.activeBuffs.invis = 5.0; // 5 Seconds of Ghost mode
        sfx.pickup();
    }
});

window.addEventListener('keyup', function(e) {
    single_global_state_object.keys[e.code] = false;
});

window.addEventListener('mousemove', function(e) {
    single_global_state_object.mouse.screenX= e.clientX;
    single_global_state_object.mouse.screenY = e.clientY;
});

window.addEventListener('mousedown', function(e) {
    // MAIN MENU START LOGIC
    if (!single_global_state_object.gameStarted) {
      bgm.playTrack('level1');
        single_global_state_object.gameStarted = true;
        single_global_state_object.lastTime = performance.now(); // Sync the clock
        return; // Return immediately so we don't shoot a bullet!
    }

    // Prevent shooting your gun if the game is paused!
    if (single_global_state_object.isPaused) return;
    
    single_global_state_object.mouse.clicked = true;
    // Get accurate mouse coordinates relative to the canvas
    let rect = canvas.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;

    // UI COLLISION: Check if player clicked the new Shop Button!
    // The button will be located at X: 10 to 50, Y: 105 to 145
    if (clickX >= 10 && clickX <= 50 && clickY >= 105 && clickY <= 145) {
        single_global_state_object.isMarketplaceOpen = !single_global_state_object.isMarketplaceOpen;
        return; // CRITICAL: Stop the function here so we don't shoot!
    }

    // UI COLLISION: Prevent shooting if clicking inside the open shop panel
    if (single_global_state_object.isMarketplaceOpen) {
        if (clickX >= 60 && clickX <= 310 && clickY >= 105 && clickY <= 365) {
            // Later we will add the logic to buy items here!
            return; 
        }else {
            // NEW: If clicking anywhere else on the screen while the shop is open, CLOSE IT!
            single_global_state_object.isMarketplaceOpen = false;
            // Notice there is no "return;" here, so the code will continue downward and fire the gun!
        }
    }
    // Calculate bullet velocity based on player's aiming angle
    let bulletSpeed = 500;
   // Fetch upgrades safely, default to 0 if not initialized
    let u = single_global_state_object.upgrades || { damage: 0, multi: 1 };
    
    let numBullets = u.multi; 
    let baseDamage = 25 + (u.damage * 10); // Adds 10 damage per level
    let spread = 0.2; // Angle between multi-shot bullets

    for (let i = 0; i < numBullets; i++) {
        // Mathematical formula to center 1, 2, or 3 bullets perfectly!
        let angleOffset = (i - (numBullets - 1) / 2) * spread;
        let finalAngle = single_global_state_object.player.angle + angleOffset;

        let vx = Math.cos(finalAngle) * bulletSpeed;
        let vy = Math.sin(finalAngle) * bulletSpeed;
        
        single_global_state_object.bullets.push({
            x: player_position_x,
            y: player_position_y,
            vx: vx, vy: vy,
            radius: 4, bounces: 4,
            isEnemyBullet: false,
            damage: baseDamage
    });
}


    // NEW: Generate Muzzle Flash Particles!
    if (!single_global_state_object.particles) single_global_state_object.particles = [];
    let pRadius = single_global_state_object.player.radius;
    
    for(let s = 0; s < 8; s++) {
        let spread = (Math.random() - 0.5) * 0.6; // Slight cone spread
        let spd = 150 + Math.random() * 250;
        let aimAngle = single_global_state_object.player.angle;
        
        single_global_state_object.particles.push({
            // Start the flash at the tip of the gun, not inside the player
            x: player_position_x + Math.cos(aimAngle) * pRadius,
            y: player_position_y + Math.sin(aimAngle) * pRadius,
            vx: Math.cos(aimAngle + spread) * spd,
            vy: Math.sin(aimAngle + spread) * spd,
            life: 0.05 + Math.random() * 0.1,
            maxLife: 0.15,
            color: '#00ffff', // Cyan tech flash
            size: 2 + Math.random() * 2
        });
    }
    sfx.shoot();
}); // <--- End of mousedown listener

window.addEventListener('mouseup', function(e) {
    single_global_state_object.mouse.clicked = false;
});

// ==========================================
// LEVEL TRANSITION LOGIC
// ==========================================
function advanceLevel() {
    let state = single_global_state_object;
    state.currentLevel++;

    if (state.currentLevel === 2) {
        // Build Map 2 
        bgm.playTrack('level2');

        state.walls = [
            { x: 600, y: 680, w: 400, h: 20 },
                { x: 180, y: 350, w: 130, h: 20 },  
                { x: 980, y: 450, w: 20, h: 80 }, 
                { x: 980, y: 450, w: 20, h: 250 }, 
                { x: 100, y: 900, w: 900, h: 20 },
                 { x: 980, y: 700, w: 20, h: 120 },
            
                { x: 600, y: 450, w: 20, h: 80 },   
                { x: 600, y: 600, w: 20, h: 100 },  
                
                { x: 600, y: 450, w: 150, h: 20 }, 
                { x: 600, y: 800, w: 20, h: 100 }, 
                { x: 850, y: 450, w: 150, h: 20 }, 
                { x: 80, y: 50, w: 20, h: 850 },
                 {x: 1450, y: 50, w: 20, h: 850 },  
                 { x: 1000, y: 900, w: 450, h: 20 },
                 { x: 1000, y: 50, w: 450, h: 20 },
                  { x: 1000, y: 680, w: 150, h: 20 },
                   { x: 1300, y: 550, w: 150, h: 20 }, 
                    { x: 1000, y: 450, w: 150, h: 20 }, 
                    {x: 1150, y: 400, w: 20, h: 70 }, 
                     { x: 1270, y: 400, w: 180, h: 20 },    

                
                
                
                { x: 300, y: 450, w: 120, h: 20 },
                { x: 500, y: 450, w: 120, h: 20 },  
                { x: 300, y: 680, w: 320, h: 20 },  
                { x: 300, y: 450, w: 20, h: 70 },
                { x: 300, y: 600, w: 20, h: 80 },
                { x: 300, y: 250, w: 20, h: 200 },  
                { x: 300, y: 250, w: 120, h: 20 },
                { x: 100, y: 50, w: 350, h: 20 },
                { x: 100, y: 680, w: 70, h: 20 },
                { x: 230, y: 680, w: 70, h: 20 },
                

                
                
                
                { x: 730, y: 350, w: 20, h: 100 },  
                { x: 850, y: 250, w: 20, h: 220 },  

               
                { x: 400, y: 50, w: 800, h: 20 },  
                { x: 400, y: 50, w: 20, h: 220 },  
                { x: 1180, y: 50, w: 20, h: 220 },  
                
                { x: 400, y: 250, w: 350, h: 20 },  
                { x: 700, y: 250, w: 350, h: 20 },  

              
                { x: 600, y: 120, w: 60, h: 60 },   
                { x: 940, y: 120, w: 60, h: 60 }, 
                { x: 170, y: 550, w: 60, h: 60 }, 
                { x: 200, y: 120, w: 60, h: 60 }, 


               
            
        ];

        state.rooms = [
            {
           trigger: { x: 300, y: 280, w: 450, h: 180 }, 
                doors: [
                    { x: 420, y: 450, w: 80, h: 20 }, // Plugs the top gap perfectly
                    { x: 730, y: 270, w: 20, h: 80 }   // Plugs the left gap perfectly
                ],
                isLocked: false,
                isCleared: false
            },
               {
           trigger: { x: 100, y: 50, w: 300, h: 300 }, 
                doors: [
                    { x: 100, y: 350, w: 80, h: 20 }, // Plugs the top gap perfectly
                       // Plugs the left gap perfectly
                ],
                isLocked: false,
                isCleared: false
            },
             {
           trigger: { x: 100, y: 700, w: 500, h: 200 }, 
                doors: [
                   { x: 170, y: 680, w: 60, h: 20 }, 
                    { x: 600, y: 700, w: 20, h: 100 },// Plugs the top gap perfectly
                       // Plugs the left gap perfectly
                ],
                isLocked: false,
                isCleared: false
            }
            
        ];
        
        // Move the exit to the top of the new arena
        state.exitZone = { x: 1000, y: 70, w: 180, h: 60 };
        
        // Teleport the player safely to the bottom of the arena
        player_position_x = 800;
        player_position_y = 500;

    
    } 
    else if (state.currentLevel === 3) {
        bgm.playTrack('boss');
        // NEW: MAP 3 - THE BOSS ARENA (A massive enclosed square)
        state.walls = [
            { x: 400, y: 200, w: 1200, h: 40 },   // Top Wall
            { x: 400, y: 1600, w: 1200, h: 40 },  // Bottom Wall
            { x: 360, y: 200, w: 40, h: 1440 },   // Left Wall
            { x: 1600, y: 200, w: 40, h: 1440 },  // Right Wall
            
            // Four symmetrical cover pillars for hiding from the boss
            { x: 700, y: 700, w: 100, h: 100 },
            { x: 1200, y: 700, w: 100, h: 100 },
            { x: 700, y: 1100, w: 100, h: 100 },
            { x: 1200, y: 1100, w: 100, h: 100 }
        ];
        
        state.exitZone = { x: 900, y: 250, w: 200, h: 80 }; // Final extraction
        player_position_x = 1000;
        player_position_y = 1500; // Spawn far away at the bottom
        
    } else if (state.currentLevel > 3) {
        // YOU BEAT ALL 3 LEVELS!
        state.gameWon = true; 
        return;
    }

    state.bullets = [];
    state.items = [];
    enemy_manager_singleton_controller_factory.spawnWave(state);
}

   



//UPDATE & RENDER LOOP
// ==========================================
// PHASE 6: ENEMY AI STATE MACHINES
// ==========================================

// ==========================================
// PHASE 6: ENEMY AI STATE MACHINES
// ==========================================
function updateEnemies(dt) {
    let state = single_global_state_object;
   for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        let dx = player_position_x - e.x;
        let dy = player_position_y - e.y;
        let distanceToPlayer = Math.sqrt((dx * dx) + (dy * dy));
        
        // ==========================================
        // NEW: STEALTH & VISION CONE LOGIC
        // ==========================================
        let angleToPlayer = Math.atan2(dy, dx);
        
        // 1. Calculate Angular Difference (Normalize between -PI and PI)
        let angleDiff = angleToPlayer - e.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // 2. Define Field of View (FOV)
        // Snipers have a narrow 60-degree vision, standard enemies have 120-degree vision
        let fov = (e.type === 'sniper') ? (Math.PI / 3) : (Math.PI * 0.7);
        
        // Bosses, Explosive bots, and Cloaked assassins have 360-degree proximity vision
        let inCone = Math.abs(angleDiff) < (fov / 2);
        if (e.type === 'boss' || e.type === 'explosive' || e.type === 'cloaked') inCone = true;

        // 3. Final Detection Check (Must be in cone AND have line of sight)
        let isPlayerInvisible = (state.player.activeBuffs && state.player.activeBuffs.invis > 0);
        let canSeePlayer = inCone && check_line_of_sight(e.x, e.y, player_position_x, player_position_y, state.walls)&& !isPlayerInvisible;

        // 4. Update Enemy Facing Direction
       if (canSeePlayer) {
            // SMOOTH TRACKING: The enemy smoothly turns to aim at you (5x speed)
            e.angle = lerpAngle(e.angle, angleToPlayer, 5 * dt); 
        } else {
            // IDLE PATROL: Smooth security-camera sweeping motion!
            if (e.type !== 'boss') {
                // We use the time and their X coordinate so they don't all sweep in unison
                let time = performance.now() / 600; 
                let uniqueOffset = e.x; 
                
                // Math.sin creates a perfect ease-in and ease-out sweeping motion
                e.angle += Math.sin(time + uniqueOffset) * 1.2 * dt; 
            }
        }
        
        let isMoving = false;

        // 1. RUSHER AI
        if (e.type === 'rusher') {
            if (distanceToPlayer < 200 && canSeePlayer) {
                e.x += Math.cos(e.angle) * e.speed * dt;
                e.y += Math.sin(e.angle) * e.speed * dt;
                isMoving = true;
            }
            if (!state.player.activeBuffs || state.player.activeBuffs.shield <= 0) {if (distanceToPlayer < (e.radius + state.player.radius)) state.player.health -= 0.2; }
        }

        // 2. TURRET AI
        // 2. TURRET AI (Heavy 3-Round Burst Fire)
        else if (e.type === 'turret') {
            e.fireCooldown -= dt;
            
            if (distanceToPlayer < 300 && canSeePlayer) {
                // Track player aim
                e.angle = Math.atan2(dy, dx);
                
                // If ready to fire, trigger the burst state
                if (e.fireCooldown <= 0 && !e.isBursting) {
                    e.isBursting = true;
                    e.burstShots = 3;  // How many bullets in the burst
                    e.burstTimer = 0;
                }
            }
            
            // Handle the rapid-fire burst execution
            if (e.isBursting) {
                e.burstTimer -= dt;
                if (e.burstTimer <= 0) {
                    // Add slight inaccuracy (spread) to the turret
                    let spread = (Math.random() - 0.5) * 0.25; 
                    
                    state.bullets.push({ 
                        x: e.x, y: e.y, 
                        vx: Math.cos(e.angle + spread) * 450, 
                        vy: Math.sin(e.angle + spread) * 450, 
                        radius: 5, bounces: 1, isEnemyBullet: true, damage: 8 
                    });
                    
                    e.burstShots--;
                    e.burstTimer = 0.15; // 0.15 seconds between bullets
                    
                    if (e.burstShots <= 0) {
                        e.isBursting = false;
                        e.fireCooldown = 2.0; // Wait 2 seconds before next burst
                    }
                }
            }
        }

        // 3. SNIPER AI (Laser Telegraph & Delayed Dodge Mechanic)
        else if (e.type === 'sniper') {
            e.fireCooldown -= dt;
            
            if (distanceToPlayer < 750 && canSeePlayer) {
                // IMPORTANT: Only track the player if cooldown is above 0.5.
                // This freezes the sniper's aim half a second before firing, letting you dodge!
                if (e.fireCooldown > 0.5) {
                    e.angle = Math.atan2(dy, dx);
                }
                
                if (e.fireCooldown <= 0) {
                    // Fires an insanely fast, high-damage bullet
                    state.bullets.push({ 
                        x: e.x, y: e.y, 
                        vx: Math.cos(e.angle) * 1200, 
                        vy: Math.sin(e.angle) * 1200, 
                        radius: 3, bounces: 0, isEnemyBullet: true, damage: 25 
                    });
                    e.fireCooldown = 3.5; // Long 3.5 second reload
                }
            }
        }

        // 4. DASHER AI (Bursts of extreme speed)
        else if (e.type === 'dasher') {
            e.dashCooldown -= dt;
            if (distanceToPlayer < 200 && canSeePlayer) {
                let currentSpeed = e.speed;
                if (distanceToPlayer < 200 && e.dashCooldown <= 0) {
                    e.isDashing = true;
                    e.dashCooldown = 2.5; // 2.5 seconds between dashes
                }
                if (e.isDashing) {
                    currentSpeed = e.speed * 4; // 4x speed during dash
                    if (e.dashCooldown < 2.2) e.isDashing = false; // Dash lasts 0.3s
                }
                e.x += Math.cos(e.angle) * currentSpeed * dt;
                e.y += Math.sin(e.angle) * currentSpeed * dt;
                isMoving = true;
            }
            if (!state.player.activeBuffs || state.player.activeBuffs.shield <= 0) {if (distanceToPlayer < (e.radius + state.player.radius)) state.player.health -= 0.5; }
        }

        // 5. EXPLOSIVE AI (Kamikaze with a fuse)
        else if (e.type === 'explosive') {
            if (distanceToPlayer < 350 && e.explodeTimer === -1 && canSeePlayer) {
                e.x += Math.cos(e.angle) * e.speed * dt;
                e.y += Math.sin(e.angle) * e.speed * dt;
                isMoving = true;
                if (distanceToPlayer < 60) e.explodeTimer = 0.6; // Trigger 0.6s fuse
            }
            if (e.explodeTimer > -1) {
                e.explodeTimer -= dt;
                // Flash white and red
                e.color = (Math.floor(e.explodeTimer * 10) % 2 === 0) ? 'white' : 'crimson'; 
                if (e.explodeTimer <= 0) {
                    sfx.explosion();
                  let isShielded = state.player.activeBuffs && state.player.activeBuffs.shield > 0;
                    if (distanceToPlayer < 120 && !isShielded) {
                        state.player.health -= 15; 
                    }
                    state.enemies.splice(i, 1); // Delete self
                    continue; 
                }
            }
        }

        // 6. CLOAKED AI (Invisible until close)
        else if (e.type === 'cloaked') {
            if (distanceToPlayer < 150 && canSeePlayer) {
                e.isVisible = true; // Reveal!
                e.x += Math.cos(e.angle) * e.speed * dt;
                e.y += Math.sin(e.angle) * e.speed * dt;
                isMoving = true;
               let isShielded = state.player.activeBuffs && state.player.activeBuffs.shield > 0;
                if (distanceToPlayer < (e.radius + state.player.radius) && !isShielded) {
                    state.player.health -= 0.3;
                }
            }else {
                e.isVisible = false; // Hide!
            }
        }
        // 7. THE OMEGA BOSS AI
        else if (e.type === 'boss') {
            e.attackCooldown -= dt;
            e.spawnCooldown -= dt;
            
            // Boss slowly and relentlessly glides toward you
            e.x += Math.cos(e.angle) * e.speed * dt;
            e.y += Math.sin(e.angle) * e.speed * dt;
            isMoving = true;

            if (canSeePlayer) {
                // ATTACK 1: Bullet Hell Ring (Fires an 8-way spread of huge plasma balls)
                if (e.attackCooldown <= 0) {
                    for (let j = 0; j < 8; j++) {
                        let spread = e.angle + (j * (Math.PI / 4)); // 360 degrees / 8
                        state.bullets.push({ 
                            x: e.x, y: e.y, 
                            vx: Math.cos(spread) * 350, 
                            vy: Math.sin(spread) * 350, 
                            radius: 8, bounces: 1, isEnemyBullet: true, damage: 20 
                        });
                    }
                    e.attackCooldown = 2.5; // Fires every 2.5 seconds!
                }

                // ATTACK 2: Spawn Minions (Creates Explosive Bots to flush you out of cover)
                if (e.spawnCooldown <= 0) {
                    // Prevent infinite spawning if you haven't killed the old ones
                    if (state.enemies.length < 15) {
                        state.enemies.push(enemy_manager_singleton_controller_factory.createExplosive(e.x - 60, e.y));
                        state.enemies.push(enemy_manager_singleton_controller_factory.createExplosive(e.x + 60, e.y));
                    }
                    e.spawnCooldown = 7.0; // Spawns backup every 7 seconds
                }
            }
            
            // Massive contact damage if you touch the boss!
            if (!state.player.activeBuffs || state.player.activeBuffs.shield <= 0) {if (distanceToPlayer < (e.radius + state.player.radius)) state.player.health -= 2.0;} 
        }

        // APPLY WALL COLLISION TO ALL MOVING ENEMIES
        if (isMoving) {
            let enemy_resolved = resolve_circle_aabb_collision(e.x, e.y, e.radius, state.walls);
            e.x = enemy_resolved.x;
            e.y = enemy_resolved.y;
        }
    }
    // (Inside updateEnemies, right at the bottom)
    
    // Check if any contact damage or explosions killed the player this frame
    if (single_global_state_object.player.health <= 0) {
        single_global_state_object.player.health = 0;
        single_global_state_object.gameOver = true;
    }
}

function render_entities_and_update_state(dt) 
{
    // ==========================================
    // 0. MAIN TITLE SCREEN
    // ==========================================
    if (!single_global_state_object.gameStarted) {
        ctx.fillStyle = '#050510'; // Deep space background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw a cool grid background for style
        ctx.strokeStyle = '#111122';
        ctx.lineWidth = 1;
        for(let i = 0; i <= canvas.width; i += 50) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for(let j = 0; j <= canvas.height; j += 50) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
        }

        // Game Title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 60px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText("DArk: Echo Sector", canvas.width / 2, canvas.height / 2 - 40);
        
        // Pulsing Start Text
        let pulse = Math.abs(Math.sin(performance.now() / 300));
        ctx.fillStyle = `rgba(0, 255, 102, ${0.5 + pulse * 0.5})`;
        ctx.font = 'bold 24px Courier New';
        ctx.fillText("> CLICK TO START MISSION <", canvas.width / 2, canvas.height / 2 + 40);
        
        ctx.textAlign = 'left';
        return; // Stop the engine from rendering the real game
    }

    // ==========================================
    // PAUSE LOGIC (Freeze Physics)
    // ==========================================
    if (single_global_state_object.isPaused) {
        dt = 0; // By making delta-time 0, we instantly freeze all movement, bullets, and cooldowns!
    }




    // ==========================================
    // GAME OVER SCREEN
    // ==========================================
    if (single_global_state_object.gameOver) {
        // Draw a dark red, semi-transparent overlay
        ctx.fillStyle = 'rgba(20, 0, 0, 0.9)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the Death Text
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 50px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText("PLAYER DEFEATED", canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Courier New';
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 30);
        
        // Reset text alignment for the rest of the game
        ctx.textAlign = 'left'; 
        
        // Stop running physics and rendering!
        bgm.playTrack("defeat")
        return; 
    }

    // ==========================================
    // MISSION ACCOMPLISHED SCREEN
    // ==========================================
    if (single_global_state_object.gameWon) {
        // Draw a dark green, semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 20, 10, 0.9)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the Victory Text
        ctx.fillStyle = '#00ff66';
        ctx.font = 'bold 50px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText("MISSION ACCOMPLISHED", canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Courier New';
        ctx.fillText("Enemies Have Been Neutralised!", canvas.width / 2, canvas.height / 2 + 30);
        
        // NEW: Draw the Final Score in Gold!
        let finalScore = single_global_state_object.score || 0;
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 35px Courier New';
        ctx.fillText("FINAL SCORE: " + finalScore, canvas.width / 2, canvas.height / 2 + 80);

        // NEW: Draw the Final Clear Time!
        let finalTime = formatTime(single_global_state_object.timer || 0);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 25px Courier New';
        ctx.fillText("CLEAR TIME: " + finalTime, canvas.width / 2, canvas.height / 2 + 120);

        ctx.textAlign = 'left'; 
        bgm.playTrack("victory")
        return; // Freeze the game!
    }
    // ==========================================
    // NEW: UPDATE RUN TIMER
    // ==========================================
    // Because 'dt' becomes 0 when the game is paused, the timer will perfectly pause with it!
    if (single_global_state_object.timer === undefined) single_global_state_object.timer = 0;
    single_global_state_object.timer += dt;
    // 1. CLEAR CANVAS
    // ==========================================
    // CAMERA SYSTEM CALCULATION
    // ==========================================
    // Calculate the camera offset to keep the player dead center!
    let cameraX = player_position_x - canvas.width / 2;
    let cameraY = player_position_y - canvas.height / 2;

    // Convert the mouse screen position into actual world map coordinates
    if (single_global_state_object.mouse.screenX !== undefined) {
        single_global_state_object.mouse.x = single_global_state_object.mouse.screenX + cameraX;
        single_global_state_object.mouse.y = single_global_state_object.mouse.screenY + cameraY;
    }

    // 1. CLEAR CANVAS
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ==========================================
    // ACTIVATE CAMERA (Shift the Game World!)
    // ==========================================
    ctx.save(); 
    ctx.translate(-cameraX, -cameraY);

    // Draw Walls
   // ==========================================
    // 1.1 DRAW STATIC WALLS
    // ==========================================
    ctx.fillStyle = '#4a1515'; 
    ctx.strokeStyle = '#c23b3b'; 
    ctx.lineWidth = 2;
    for (let i = 0; i < single_global_state_object.walls.length; i++) {
        let wall = single_global_state_object.walls[i];
        // Skip drawing doors here, we will draw them glowing red later!
        if (wall.isDoor) continue; 
        
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    }

    // ==========================================
    // 1.2 ROOM LOCKDOWN SYSTEM (Ambushes)
    // ==========================================
    //door lock
    if (single_global_state_object.rooms) {
        for (let i = 0; i < single_global_state_object.rooms.length; i++) {
            let r = single_global_state_object.rooms[i];
            
            // ctx.fillStyle = 'rgba(255, 255, 0, 0.2)'; 
            // ctx.fillRect(r.trigger.x, r.trigger.y, r.trigger.w, r.trigger.h);
            
            // // Draw the hidden trap doors as solid purple
            // ctx.fillStyle = 'rgba(255, 0, 255, 0.6)'; 
            // for (let d of r.doors) {
            //     ctx.fillRect(d.x, d.y, d.w, d.h);
            // }
            if (r.isCleared) continue; // Room is already beaten

            // Check if player stepped inside the invisible trigger zone
            let pX = player_position_x;
            let pY = player_position_y;
            let inZone = (pX > r.trigger.x && pX < r.trigger.x + r.trigger.w && 
                          pY > r.trigger.y && pY < r.trigger.y + r.trigger.h);

            // AMBUSH! Slam the doors shut
            if (inZone && !r.isLocked) {
                r.isLocked = true;
                // Add the doors to the main physics array
                for(let d of r.doors) {
                    d.isDoor = true; // Tag it so we can delete it later
                    single_global_state_object.walls.push(d);
                }
            }

            // If the room is currently locked, monitor the enemies inside
            if (r.isLocked) {
                let enemiesAlive = 0;
                for (let e of single_global_state_object.enemies) {
                    // Count enemies that are inside this specific room
                    if (e.x > r.trigger.x && e.x < r.trigger.x + r.trigger.w &&
                        e.y > r.trigger.y && e.y < r.trigger.y + r.trigger.h) {
                        enemiesAlive++;
                    }
                }

                if (enemiesAlive === 0) {
                    // UNLOCK THE DOORS!
                    r.isLocked = false;
                    r.isCleared = true;
                    // Filter out all walls tagged as 'isDoor'
                    single_global_state_object.walls = single_global_state_object.walls.filter(w => !w.isDoor);
                } else {
                    // Render the Active Laser Doors blocking the exit
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 4;
                    for (let d of r.doors) {
                        ctx.fillRect(d.x, d.y, d.w, d.h);
                        
                        // Draw an animated laser pattern on the door
                        ctx.beginPath();
                        ctx.setLineDash([10, 5]); // Dashed line
                        ctx.lineDashOffset = -performance.now() / 20; // Scrolling animation
                        ctx.strokeRect(d.x, d.y, d.w, d.h);
                        ctx.setLineDash([]); // Reset dash for the rest of the game
                    }
                }
            }
        }
    }
    
    // Draw a subtle background grid across the entire massive map
    ctx.strokeStyle = '#111122';
    ctx.lineWidth = 1;
    for(let i = 0; i <= 2000; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 2000); ctx.stroke();
    }
    for(let j = 0; j <= 2000; j += 50) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(2000, j); ctx.stroke();
    }


  // ==========================================
    // 1.5 RENDER EXTRACTION ZONE
    // ==========================================
    if (single_global_state_object.exitZone) {
        let exit = single_global_state_object.exitZone;
        let enemiesCleared = single_global_state_object.enemies.length === 0;

        ctx.fillStyle = enemiesCleared ? 'rgba(0, 255, 100, 0.2)' : 'rgba(100, 0, 0, 0.2)';
        ctx.strokeStyle = enemiesCleared ? '#00ff66' : '#ff3333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.rect(exit.x, exit.y, exit.w, exit.h);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText(enemiesCleared ? "EXTRACTION OPEN" : "ZONE LOCKED", exit.x + 10, exit.y + 35);

        if (enemiesCleared) {
            let closestX = Math.max(exit.x, Math.min(player_position_x, exit.x + exit.w));
            let closestY = Math.max(exit.y, Math.min(player_position_y, exit.y + exit.h));
            let dx = player_position_x - closestX;
            let dy = player_position_y - closestY;
            
            // FIXED: Using the direct path to the radius to prevent crashes!
            let pRadius = single_global_state_object.player.radius;

            if ((dx * dx + dy * dy) < (pRadius * pRadius)) {
                sfx.teleport();
                advanceLevel();
                ctx.restore();
                return; 
            }
        }
    }
    // 2. UPDATE STATE (PHYSICS & MOVEMENT)
   let activeBuffs = single_global_state_object.player.activeBuffs || { speed: 0, shield: 0, invis: 0 };
    if (activeBuffs.speed > 0) activeBuffs.speed -= dt;
    if (activeBuffs.shield > 0) activeBuffs.shield -= dt;
    if (activeBuffs.invis > 0) activeBuffs.invis -= dt;

    // Apply the Speed Potion multiplier (2.5x speed!)
    let currentSpeed = single_global_state_object.player.speed;
    if (activeBuffs.speed > 0) currentSpeed *= 2.5; 
    let speed = currentSpeed * dt;
    
    // Movement
   
    
    // Movement
    if (single_global_state_object.keys['KeyW']) player_position_y -= speed;
    if (single_global_state_object.keys['KeyS']) player_position_y += speed;
    if (single_global_state_object.keys['KeyA']) player_position_x -= speed;
    if (single_global_state_object.keys['KeyD']) player_position_x += speed;
    if (single_global_state_object.keys['ArrowUp']) player_position_y -= speed;
    if (single_global_state_object.keys['ArrowDown']) player_position_y += speed;
    if (single_global_state_object.keys['ArrowLeft']) player_position_x -= speed;
    if (single_global_state_object.keys['ArrowRight']) player_position_x += speed;

// Apply Map Boundary Collisions for the Player
    let radius = single_global_state_object.player.radius;
    let resolved_pos = resolve_circle_aabb_collision(
        player_position_x, 
        player_position_y, 
        radius, 
        single_global_state_object.walls
    );
    
    // Commit the resolved coordinates back to the global variables
    player_position_x = resolved_pos.x;
    player_position_y = resolved_pos.y;

    // Calculating player aiming angle 
    let dx = single_global_state_object.mouse.x - player_position_x;
    let dy = single_global_state_object.mouse.y - player_position_y;
    single_global_state_object.player.angle = Math.atan2(dy, dx);
    updateEnemies(dt);

    
    // Draw Player Body
    ctx.globalAlpha = (activeBuffs.invis > 0) ? 0.3 : 1.0;
    ctx.beginPath();
    ctx.arc(player_position_x, player_position_y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    if (activeBuffs.shield > 0) {
        ctx.beginPath();
        ctx.arc(player_position_x, player_position_y, radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#00c8ff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // 5. UPDATE & RENDER ENEMIES
    // 5. UPDATE & RENDER ENEMIES
    for (let i = single_global_state_object.enemies.length - 1; i >= 0; i--) {
        let e = single_global_state_object.enemies[i];

        // Skip drawing if the enemy is cloaked and outside detection radius
        if (e.type === 'cloaked'&& !e.isVisible && single_global_state_object.flashlight !== false) continue;
        // ==========================================
        // NEW: RENDER ENEMY VISION CONES
        // ==========================================
        // ==========================================
        // NEW: RENDER ENEMY VISION CONES (Raycasted!)
        // ==========================================
        if (e.health > 0 && e.type !== 'boss' && e.type !== 'explosive' && e.type !== 'cloaked') {
            let fov = (e.type === 'sniper') ? (Math.PI / 3) : (Math.PI * 0.7);
            let sightDist = 200; 
            if (e.type === 'sniper') sightDist = 450;
            else if (e.type === 'turret') sightDist = 300;
            else if (e.type === 'dasher') sightDist = 250;

            // We use 20 rays per enemy. This is enough to look smooth 
            // without lagging the browser by doing too much math!
            let numEnemyRays = 20; 
            let startAngle = e.angle - (fov / 2);
            let endPoints = [];

            // Cast rays outwards in a cone
            for(let j = 0; j <= numEnemyRays; j++) {
                let rayAngle = startAngle + (j / numEnemyRays) * fov;
                let rayEnd = {
                    x: e.x + Math.cos(rayAngle) * sightDist,
                    y: e.y + Math.sin(rayAngle) * sightDist
                };

                let closestIntersect = null;
                let minDistance = 1;

                // Check this specific ray against every wall in the map
                for(let w = 0; w < single_global_state_object.walls.length; w++) {
                    let wall = single_global_state_object.walls[w];
                    let lines = [
                        [wall.x, wall.y, wall.x + wall.w, wall.y],
                        [wall.x, wall.y + wall.h, wall.x + wall.w, wall.y + wall.h],
                        [wall.x, wall.y, wall.x, wall.y + wall.h],
                        [wall.x + wall.w, wall.y, wall.x + wall.w, wall.y + wall.h]
                    ];

                    for(let l of lines) {
                        let intersect = get_line_intersection(
                            e.x, e.y, rayEnd.x, rayEnd.y, 
                            l[0], l[1], l[2], l[3]
                        );

                        if(intersect && intersect.distance < minDistance) {
                            minDistance = intersect.distance;
                            closestIntersect = intersect;
                        }
                    }
                }
                
                // Save the point where the ray hit a wall (or the max distance)
                if(closestIntersect) endPoints.push(closestIntersect);
                else endPoints.push(rayEnd);
            }

            // Draw the dynamic polygon based on where the rays hit!
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            for(let p of endPoints) {
                ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        if (e.type === 'sniper' && e.fireCooldown < 1.5 && e.fireCooldown > 0) {
            // Laser gets thicker and brighter the closer it gets to firing
            let intensity = 1.5 - e.fireCooldown; 
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(e.angle) * 1000, e.y + Math.sin(e.angle) * 1000);
            ctx.strokeStyle = `rgba(255, 0, 0, ${intensity})`; // Fading red laser
            ctx.lineWidth = intensity * 2;
            ctx.stroke();
        }
        
        // Turret Warning Glow
        if (e.type === 'turret' && e.fireCooldown < 0.5 && e.fireCooldown > 0) {
            // Flashes a harsh yellow ring right before unleashing the burst
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 200, 0, 0.4)';
            ctx.fill();
        }
        // Initialize maxHealth once for the health bar math
        if (!e.maxHealth) e.maxHealth = e.health; 

        if (e.type === 'boss') {
            // Draw Boss special glowing rings
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            // Makes the ring dashed and spinning
            ctx.setLineDash([15, 10]); 
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash for everything else
            
            // Draw a GIGANTIC health bar above the boss
            let bossBarWidth = 160;
            ctx.fillStyle = '#440000';
            ctx.fillRect(e.x - bossBarWidth / 2, e.y - e.radius - 40, bossBarWidth, 12);
            ctx.fillStyle = '#ff00ff'; // Neon pink health
            ctx.fillRect(e.x - bossBarWidth / 2, e.y - e.radius - 40, bossBarWidth * (e.health / e.maxHealth), 12);
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(e.x - bossBarWidth / 2, e.y - e.radius - 40, bossBarWidth, 12);
            
            // Add Boss Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText("OMEGA", e.x, e.y - e.radius - 45);
            ctx.textAlign = 'left';

        } else {
            // Draw normal Enemy Health Bar
            let barWidth = 30;
            ctx.fillStyle = 'red';
            ctx.fillRect(e.x - barWidth / 2, e.y - e.radius - 12, barWidth, 4);
            ctx.fillStyle = 'lime';
            ctx.fillRect(e.x - barWidth / 2, e.y - e.radius - 12, barWidth * (e.health / e.maxHealth), 4);
        }

        // Draw Enemy Body
     // Draw Enemy Body
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.strokeStyle = 'darkred';
        ctx.lineWidth = 2;
        ctx.stroke();

        
        
        
    }
    // draw aiming direction 
    ctx.save();
    ctx.beginPath();
    ctx.translate(player_position_x, player_position_y);
    ctx.rotate(single_global_state_object.player.angle);
    ctx.moveTo(0, 0);
    ctx.lineTo(radius + 10, 0); // line out from the player
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // 4. UPDATE & RENDER BULLETS
    ctx.fillStyle = 'yellow';
    
    // Loop backwards so we can safely remove bullets from the array when they die
    for (let i = single_global_state_object.bullets.length - 1; i >= 0; i--) {
        let b = single_global_state_object.bullets[i];
        
        // Move the bullet
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        
        // Ricochet Logic: Check collisions with walls
        let hit = false;
        let normal = { x: 0, y: 0 };
        
        for (let j = 0; j < single_global_state_object.walls.length; j++) {
            let w = single_global_state_object.walls[j];
            
            // Check if bullet is inside a wall bounds
            if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
                hit = true;
                
                // Figure out which side of the wall was hit to get the normal vector
                let distLeft = Math.abs(b.x - w.x);
                let distRight = Math.abs(b.x - (w.x + w.w));
                let distTop = Math.abs(b.y - w.y);
                let distBottom = Math.abs(b.y - (w.y + w.h));
                let min = Math.min(distLeft, distRight, distTop, distBottom);
                
                if (min === distLeft) normal = { x: -1, y: 0 };
                else if (min === distRight) normal = { x: 1, y: 0 };
                else if (min === distTop) normal = { x: 0, y: -1 };
                else normal = { x: 0, y: 1 };
                
                // Push bullet out of the wall slightly to prevent getting stuck
                b.x += normal.x * 2;
                b.y += normal.y * 2;
                break;
            }
        }

        // ==========================================
    
        // ==========================================
        // BULLET vs ENTITY COLLISION
        // ==========================================
        let bulletDestroyed = false;

        if (b.isEnemyBullet) {
            // Check if enemy bullet hits the Player
            let dx = player_position_x - b.x;
            let dy = player_position_y - b.y;
            let distance = Math.sqrt((dx * dx) + (dy * dy));
          if (distance < single_global_state_object.player.radius + b.radius) {
        bulletDestroyed = true; // The bullet is gone regardless of hitting shield or flesh

        // GATE 2: Choose the outcome based on the shield buff status
        if (activeBuffs.shield > 0) {
            sfx.ricochet(); // Harmlessly bounce off the shield
        } else {
            // No shield active -> take damage normally
            single_global_state_object.player.health -= (b.damage || 5);
            sfx.hit();
            
            if (single_global_state_object.player.health <= 0) {
                single_global_state_object.player.health = 0; 
                single_global_state_object.gameOver = true;
            }
        }
    
        }
        } else {
            // Check if player bullet hits an Enemy
            for (let k = single_global_state_object.enemies.length - 1; k >= 0; k--) {
                let e = single_global_state_object.enemies[k];
                let dx = e.x - b.x;
                let dy = e.y - b.y;
                let distance = Math.sqrt((dx * dx) + (dy * dy));
                
                if (distance < e.radius + b.radius) {
                    e.health -= b.damage;
                    bulletDestroyed = true;
                    
                    // Kill the enemy if health drops to 0
                  if (e.health <= 0) {
                    // ==========================================
                        // NEW: ADD SCORE BASED ON ENEMY DIFFICULTY
                        // ==========================================
                        if (!single_global_state_object.score) single_global_state_object.score = 0;
                        let points = 0;
                        if (e.type === 'rusher') points = 50;
                        else if (e.type === 'dasher' || e.type === 'explosive') points = 100;
                        else if (e.type === 'turret' || e.type === 'sniper' || e.type === 'cloaked') points = 150;
                        else if (e.type === 'boss') points = 5000;
                        
                        single_global_state_object.score += points;
                        
                        // NEW: SHATTER EXPLOSION! (Moved out of the item drop check!)
                        if (!single_global_state_object.particles) single_global_state_object.particles = [];
                        for(let s = 0; s < 15; s++) {
                            let angle = Math.random() * Math.PI * 2;
                            let spd = 50 + Math.random() * 200;
                            single_global_state_object.particles.push({
                                x: e.x, y: e.y,
                                vx: Math.cos(angle) * spd,
                                vy: Math.sin(angle) * spd,
                                life: 0.3 + Math.random() * 0.3,
                                maxLife: 0.6,
                                color: e.color, 
                                size: 3 + Math.random() * 3
                            });
                        }

                        // ==========================================
                        // HEALTH DROP LOGIC (Scaled by Difficulty)
                        // ==========================================
                        let dropChance = 0;
                        let healAmount = 0;
                        
                        if (e.type === 'rusher') { dropChance = 0.30; healAmount = 15; }
                        else if (e.type === 'dasher' || e.type === 'cloaked' || e.type === 'explosive') { dropChance = 0.45; healAmount = 25; }
                        else if (e.type === 'sniper' || e.type === 'turret') { dropChance = 0.70; healAmount = 45; }

                        // Roll the dice to see if an item drops!
                        if (Math.random() < dropChance) {
                            if (!single_global_state_object.items) single_global_state_object.items = [];
                            single_global_state_object.items.push({
                                type:'health',
                                x: e.x, y: e.y,
                                radius: 10, heal: healAmount
                            });
                        }

                        // ==========================================
                        // 2. ALIEN GOOP DROP (Currency)
                        // ==========================================
                        let goopValue = 0;
                        if (e.type === 'rusher') goopValue = 5;
                        else if (e.type === 'dasher' || e.type === 'cloaked' || e.type === 'explosive') goopValue = 15;
                        else if (e.type === 'sniper' || e.type === 'turret') goopValue = 30;

                        single_global_state_object.items.push({
                            type: 'goop',
                            x: e.x + (Math.random() * 20 - 10), 
                            y: e.y + (Math.random() * 20 - 10),
                            radius: 7, value: goopValue
                        });

                        // Delete the dead enemy
                        single_global_state_object.enemies.splice(k, 1);
                    }
                    break; // Bullet stops after hitting one enemy
                }
            }
        }

        if (bulletDestroyed) {
            single_global_state_object.bullets.splice(i, 1);
            continue; // Skip rendering this bullet since it exploded
        }
        
        if (hit) {
            b.bounces--;
            sfx.ricochet();
            for(let s = 0; s < 5; s++) {
                single_global_state_object.particles.push({
                    x: b.x, y: b.y,
                    // Blast sparks outward using the wall's normal vector
                    vx: normal.x * 150 + (Math.random() - 0.5) * 150,
                    vy: normal.y * 150 + (Math.random() - 0.5) * 150,
                    life: 0.15 + Math.random() * 0.15,
                    maxLife: 0.3,
                    color: '#ffff00', // Bright yellow
                    size: 2 + Math.random() * 2
                });
            }
            if (b.bounces <= 0) {
                // Destroy bullet if out of bounces
                single_global_state_object.bullets.splice(i, 1);
                continue; // Skip the rest of this loop iteration
            } else {
                // Apply the exact reflection vector required by the prompt constraints!
                let velocityVector = { x: b.vx, y: b.vy };
                let reflection = darkSpaceVector_reflect(velocityVector, normal);
                b.vx = reflection.x;
                b.vy = reflection.y;
            }
        }
        
        // Render the bullet
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4.5 UPDATE & RENDER PARTICLES
    // ==========================================
    // Ensure the array exists so we don't have to edit index.html
    if (!single_global_state_object.particles) single_global_state_object.particles = [];
    
    for (let i = single_global_state_object.particles.length - 1; i >= 0; i--) {
        let p = single_global_state_object.particles[i];
        
        // Age the particle
        p.life -= dt;
        if (p.life <= 0) {
            single_global_state_object.particles.splice(i, 1);
            continue;
        }
        
        // Move the particle
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        
        // Add friction and shrink it over time
        p.vx *= 0.95; 
        p.vy *= 0.95;
        p.size *= 0.95; 
        
        // Draw the particle with fading transparency
        ctx.globalAlpha = p.life / p.maxLife; 
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    // Reset transparency for the rest of the game!
    ctx.globalAlpha = 1.0;

    // ==========================================
    // 6. UPDATE & RENDER ITEMS (Health Drops)
    // ==========================================
    if (!single_global_state_object.items) single_global_state_object.items = [];
    
    for (let i = single_global_state_object.items.length - 1; i >= 0; i--) {
        let it = single_global_state_object.items[i];
        
        // Draw the Glowing Green Heart
        ctx.save();
        ctx.translate(it.x, it.y);
        
       let floatY = Math.sin(performance.now() / 200) * 3;
        ctx.translate(0, floatY);
        
        if (it.type === 'health') {
            // Draw the Glowing Green Heart
            ctx.scale(0.8, 0.8);
            ctx.beginPath();
            ctx.moveTo(0, -3);
            ctx.bezierCurveTo(10, -15, 25, -3, 0, 15);
            ctx.bezierCurveTo(-25, -3, -10, -15, 0, -3);
            ctx.fillStyle = '#00ff66';
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } 
        else if (it.type === 'goop') {
            // Draw the Alien Biomass Goop (Pulsating Purple/Cyan orb)
            let pulse = Math.abs(Math.sin(performance.now() / 150)) * 2;
            ctx.beginPath();
            ctx.arc(0, 0, it.radius + pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#9d00ff'; // Toxic purple
            ctx.shadowColor = '#d000ff';
            ctx.shadowBlur = 12;
            ctx.fill();
            
            // Cyan glowing core
            ctx.beginPath();
            ctx.arc(0, 0, it.radius / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#00ffff'; 
            ctx.fill();
        }
        ctx.restore();
        // Check collision between Player and Health Drop
        let dx = player_position_x - it.x;
        let dy = player_position_y - it.y;
        let dist = Math.sqrt((dx * dx) + (dy * dy));
        
        if (dist < single_global_state_object.player.radius + it.radius) {
            sfx.pickup();
            if (it.type === 'health') {
                single_global_state_object.player.health += it.heal;
                let maxHP = single_global_state_object.player.maxHealth || 100;
if (single_global_state_object.player.health > maxHP) single_global_state_object.player.health = maxHP; 
            } 
            else if (it.type === 'goop') {
                // Safety check in case index.html wasn't updated
                if (single_global_state_object.player.goop === undefined) single_global_state_object.player.goop = 0;
                // Add the goop value to the player's wallet!
                single_global_state_object.player.goop += it.value;
            }
            // Delete the item from the map after picking it up
            single_global_state_object.items.splice(i, 1);
        }
    }
    if (single_global_state_object.upgrades && single_global_state_object.upgrades.lightActive) {
        // Subtract the fraction of a second that passed this frame
        single_global_state_object.upgrades.lightTimer -= dt;
        
        // When the timer hits zero, turn the shadows back on!
        if (single_global_state_object.upgrades.lightTimer <= 0) {
            single_global_state_object.upgrades.lightActive = false;
            single_global_state_object.flashlight = true; 
        }
    }

    // ==========================================
    // 7. RENDER LINE OF SIGHT & SHADOWS
    // ==========================================
    // ==========================================
    // 7. RENDER LINE OF SIGHT (120-Degree Flashlight)
    // ==========================================
    let numRays = 60; // Reduced ray count since we only draw 1/3 of a circle now
    let viewDistance = 200;
    let endPoints = [];

    // Calculate FOV boundaries (120 degrees total = +/- 60 degrees from center)
    let fov = (120 * Math.PI) / 180; 
    let startAngle = single_global_state_object.player.angle - (fov / 2);

    // Cast rays in a 120 degree cone facing the mouse
    for(let i = 0; i <= numRays; i++) {
        let angle = startAngle + (i / numRays) * fov;
        let rayEnd = {
            x: player_position_x + Math.cos(angle) * viewDistance,
            y: player_position_y + Math.sin(angle) * viewDistance
        };

        let closestIntersect = null;
        let minDistance = 1;

        // Check the ray against every single wall
        for(let j = 0; j < single_global_state_object.walls.length; j++) {
            let w = single_global_state_object.walls[j];
            let lines = [
                [w.x, w.y, w.x + w.w, w.y],
                [w.x, w.y + w.h, w.x + w.w, w.y + w.h],
                [w.x, w.y, w.x, w.y + w.h],
                [w.x + w.w, w.y, w.x + w.w, w.y + w.h]
            ];

            for(let l of lines) {
                let intersect = get_line_intersection(
                    player_position_x, player_position_y, rayEnd.x, rayEnd.y, 
                    l[0], l[1], l[2], l[3]
                );

                if(intersect && intersect.distance < minDistance) {
                    minDistance = intersect.distance;
                    closestIntersect = intersect;
                }
            }
        }
        
        if(closestIntersect) endPoints.push(closestIntersect);
        else endPoints.push(rayEnd);
    }

        //Blacken
        lightCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
        lightCtx.fillStyle = '#020205'; 
        lightCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

        // Carve out the light polygon (Subtracting the camera offset!)
        lightCtx.globalCompositeOperation = 'destination-out';
        lightCtx.beginPath();
        
        // Start at the player's center, offset by camera
        lightCtx.moveTo(player_position_x - cameraX, player_position_y - cameraY); 
        
        // Trace the arc of the ray endpoints, offset by camera
        for(let i = 0; i < endPoints.length; i++) {
            lightCtx.lineTo(endPoints[i].x - cameraX, endPoints[i].y - cameraY);   
        }
        
        lightCtx.closePath(); 
        lightCtx.fillStyle = 'white';
        lightCtx.fill();
        lightCtx.globalCompositeOperation = 'source-over';
    

    // ==========================================
    // DEACTIVATE CAMERA (Lock to Screen Space)
    // ==========================================
    ctx.restore(); // <--- CRITICAL: This pops the canvas back to normal screen space!

    //flashlight only when shadow is on
    if (single_global_state_object.flashlight!== false) {
        ctx.drawImage(lightCanvas, 0, 0);
    }

    // ==========================================
    // 8. RENDER HUD (Heads Up Display)
    // ==========================================
    
    // 1. Sleek Sci-Fi Angled Background Panel
    ctx.fillStyle = 'rgba(6, 6, 18, 0.85)'; // Deep space blue/black
    ctx.strokeStyle = '#5fecff'; // Cyan tech border
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(260, 10);
    ctx.lineTo(280, 30);  // Angled top-right corner
    ctx.lineTo(280, 95);
    ctx.lineTo(30, 95);
    ctx.lineTo(10, 75);   // Angled bottom-left corner
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Dynamic Health Typography
    let hp = Math.ceil(single_global_state_object.player.health);
    
    let maxHp = single_global_state_object.player.maxHealth || 100; 
    let hpRatio = hp / maxHp;
    // Color shifts based on how much health you have left!
    let hpColor = '#00ff66'; // Healthy Green
    if (hp <= 50) hpColor = '#ffcc00'; // Warning Yellow
    if (hp <= 25) hpColor = '#ff3333'; // Critical Red

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText("HEALTH", 25, 30);
    
    ctx.fillStyle = hpColor;
    ctx.textAlign = 'right';
    
    ctx.fillText(hp + "/" + maxHp, 260, 30); 
    ctx.textAlign = 'left';

    // 3. Glowing Health Bar
    // Dark track background
    ctx.fillStyle = '#222233'; 
    ctx.fillRect(25, 40, 200, 12);
    
    // Actual health fill with a neon glow
    ctx.fillStyle = hpColor;
    ctx.shadowColor = hpColor;
    ctx.shadowBlur = 10;
    ctx.fillRect(25, 40, Math.max(0, hpRatio * 235), 12);
    ctx.shadowBlur = 0; // Reset shadow so it doesn't leak to other elements
    
    // Crisp white border around the bar
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 40, 235, 12);

    // 4. Alien Goop (Biomass) Currency Tracker
    let currentGoop = single_global_state_object.player.goop || 0;
    
    // Draw a live, animated mini-goop icon directly on the UI
    let uiPulse = Math.abs(Math.sin(performance.now() / 200)) * 1.5;
    ctx.beginPath();
    ctx.arc(35, 75, 5 + uiPulse, 0, Math.PI * 2);
    ctx.fillStyle = '#9d00ff';
    ctx.shadowColor = '#d000ff';
    ctx.shadowBlur = 8;
    ctx.fill();
    
    // Icon inner cyan core
    ctx.beginPath();
    ctx.arc(35, 75, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00ffff';
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Currency Text
    ctx.fillStyle = '#d000ff';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText("GOOP:" + currentGoop, 55, 81);

    // ==========================================
    // NEW: RENDER SCORE (Top Right)
    // ==========================================
    let currentScore = single_global_state_object.score || 0;
    
    // Draw an angled panel on the right side of the screen
    ctx.fillStyle = 'rgba(6, 6, 18, 0.85)';
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 240, 10);
    ctx.lineTo(canvas.width - 10, 10);
    ctx.lineTo(canvas.width - 10, 50);
    ctx.lineTo(canvas.width - 220, 50);
    ctx.lineTo(canvas.width - 240, 30); // Sci-fi angled cut
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw the Score Text
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 22px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText("SCORE: " + currentScore, canvas.width - 25, 36);
    ctx.textAlign = 'left'; // Reset alignment

    // ==========================================
    // NEW: RENDER ACTIVE TIMER (Top Center)
    // ==========================================
    let formattedTime = formatTime(single_global_state_object.timer || 0);

    ctx.fillStyle = 'rgba(6, 6, 18, 0.85)';
    ctx.strokeStyle = '#ffffff'; // White border for the timer
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Draw a perfectly centered, angled drop-down box
    let cx = canvas.width / 2;
    ctx.moveTo(cx - 80, 0);
    ctx.lineTo(cx + 80, 0);
    ctx.lineTo(cx + 60, 40);
    ctx.lineTo(cx - 60, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Render the digital clock
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(formattedTime, cx, 28);
    ctx.textAlign = 'left'; // Reset alignment

   // ==========================================
    // 9. RENDER SHOP BUTTON & MARKETPLACE
    // ==========================================
    if (!single_global_state_object.upgrades) {
        single_global_state_object.upgrades = { damage: 0, speed: 0, health: 0, multi: 1, lightActive: false };
        single_global_state_object.player.maxHealth = 100;
    }
    let u = single_global_state_object.upgrades;
    let p = single_global_state_object.player;

    // 1. Draw the Small Shop Square (Button)
    let btnX = 10, btnY = 105, btnSize = 40;
    
    ctx.fillStyle = single_global_state_object.isMarketplaceOpen ? '#d000ff' : 'rgba(6, 6, 18, 0.85)';
    ctx.strokeStyle = '#d000ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(btnX, btnY, btnSize, btnSize); ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = single_global_state_object.isMarketplaceOpen ? '#ffffff' : '#00ffff';
    ctx.font = 'bold 24px Courier New';
    ctx.fillText("$", btnX + 11, btnY + 28);

    // 2. Draw the 5 Dedicated Powerup Tracker Icons
    let iconNames = ["DMG", "SPD", "HP", "MLT", "LGT"];
    let iconValues = [u.damage + "/2", u.speed + "/2", u.health + "/2", u.multi + "/3", u.lightActive ? "ON" : "RDY"];
    let iconColors = ["#ff3333", "#ffcc00", "#00ff66", "#00ffff", "#ffffff"];

    for (let i = 0; i < 5; i++) {
        let icX = 10 + (i * 45); // Spread horizontally below shop button
        let icY = 155; 
        
        ctx.fillStyle = 'rgba(6, 6, 18, 0.85)';
        ctx.strokeStyle = iconColors[i];
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(icX, icY, 35, 35); ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = iconColors[i];
        ctx.font = 'bold 10px Courier New';
        ctx.fillText(iconNames[i], icX + 6, icY + 14); 
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(iconValues[i], icX + 8, icY + 28); 
    }
    
    // 3. Render the Expanding Marketplace Menu
    if (single_global_state_object.isMarketplaceOpen) {
        let mX = 60, mY = 105, mWidth = 450, mHeight = 360;

        ctx.fillStyle = 'rgba(6, 6, 18, 0.95)';
        ctx.strokeStyle = '#d000ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(mX, mY); ctx.lineTo(mX + mWidth, mY); ctx.lineTo(mX + mWidth, mY + mHeight - 20); ctx.lineTo(mX + mWidth - 20, mY + mHeight); ctx.lineTo(mX, mY + mHeight); ctx.closePath(); ctx.fill(); ctx.stroke();

        ctx.fillStyle = '#00ffff'; ctx.font = 'bold 18px Courier New';
        ctx.fillText("TERMINAL MARKET", mX + 20, mY + 30);
        ctx.beginPath(); ctx.moveTo(mX + 15, mY + 40); ctx.lineTo(mX + mWidth - 15, mY + 40); ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)'; ctx.stroke();

        let shopItems = [
            { name: "DAMAGE BOOST", cost: 30, current: u.damage, max: 2 },
            { name: "SPEED BOOST", cost: 30, current: u.speed, max: 2 },
            { name: "HEALTH BOOST", cost: 40, current: u.health, max: 2 },
            { name: "MULTI-BULLET", cost: 80, current: u.multi, max: 3 },
            { name: "MAP SCAN", cost: 20, current: u.lightActive ? "ACT" : 0, max: "INF" },
            { name: "SPEED POTION", cost: 20, current: p.potions.speed, max: "INF" },
            { name: "SHIELD POTION", cost: 30, current: p.potions.shield, max: "INF" },
            { name: "INVIS POTION", cost: 30, current: p.potions.invis, max: "INF" }
        ];

        for (let i = 0; i < shopItems.length; i++) {
            let itemY = mY + 70 + (i * 35);
            let item = shopItems[i];
            
            // Dynamic UI checks
            let isMaxed = item.max !== "INF" && item.current >= item.max;
            let canAfford = p.goop >= item.cost;
            let unavailable = isMaxed || (i === 4 && u.lightActive); 

            ctx.fillStyle = unavailable ? '#444' : (canAfford ? '#9d00ff' : '#880000');
            ctx.fillRect(mX + 15, itemY - 12, 12, 12);
            
            ctx.fillStyle = 'white'; ctx.font = 'bold 10px Courier New';
            ctx.fillText((i + 1), mX + 18, itemY - 3);

            ctx.fillStyle = unavailable ? '#666' : '#ffffff';
            ctx.font = 'bold 14px Courier New';
            ctx.fillText(item.name, mX + 35, itemY - 2);

            ctx.fillStyle = isMaxed ? '#00ffff' : (canAfford ? '#00ff66' : '#ff3333');
            ctx.textAlign = 'right';
            if (isMaxed) ctx.fillText("MAXED", mX + mWidth - 15, itemY - 2);
            else if (i === 4 && u.lightActive) ctx.fillText("ACTIVE", mX + mWidth - 15, itemY - 2);
            else ctx.fillText(item.cost + "G", mX + mWidth - 15, itemY - 2);
            
            ctx.textAlign = 'left'; 
            ctx.beginPath(); ctx.moveTo(mX + 15, itemY + 5); ctx.lineTo(mX + mWidth - 15, itemY + 5); ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.stroke();
        }

        ctx.fillStyle = '#888888'; ctx.font = '12px Courier New';
        ctx.fillText("Press 1-8 to purchase | Use: Shift(Speed), Q(Shield), E(Inv)", mX + 15, mY + mHeight - 15);
    }

    // ==========================================
    // 10. RENDER PAUSE OVERLAY
    // ==========================================
    if (single_global_state_object.isPaused) {
        ctx.fillStyle = 'rgba(0, 5, 10, 0.75)'; // Darken the screen
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 50px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText("SYSTEM PAUSED", canvas.width / 2, canvas.height / 2);
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Courier New';
        ctx.fillText("Press ESC to resume", canvas.width / 2, canvas.height / 2 + 40);

        ctx.fillStyle = '#ff3333'; // Red text so they know it's a hard reset
        ctx.fillText("Press R to Restart Mission", canvas.width / 2, canvas.height / 2 + 70);
        ctx.textAlign = 'left'; 
    }

} // <--- End of render_entities_and_update_state
