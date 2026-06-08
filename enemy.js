const enemy_manager_singleton_controller_factory = {
   
    //Rusher
    createRusher: function(startX, startY) { return { type: 'rusher', x: startX, y: startY, radius: 12, health: 50, speed: 100, angle: Math.random() * Math.PI * 2., color: 'red' }; },
    
    //Turrent
    createTurret: function(startX, startY) { return { type: 'turret', x: startX, y: startY, radius: 16, health: 150, speed: 0, angle: Math.random() * Math.PI * 2., fireCooldown: 0, color: 'orange' }; },
    
    //  Sniper
    createSniper: function(startX, startY) { return { type: 'sniper', x: startX, y: startY, radius: 14, health: 80, speed: 0, angle: Math.random() * Math.PI * 2., fireCooldown: 0, color: '#ff00ff' }; },
    
    //  Dasher 
    createDasher: function(startX, startY) { return { type: 'dasher', x: startX, y: startY, radius: 12, health: 60, speed: 80, angle: Math.random() * Math.PI * 2., dashCooldown: 0, isDashing: false, color: '#ff6600' }; },
    
    // Explosive 
    createExplosive: function(startX, startY) { return { type: 'explosive', x: startX, y: startY, radius: 10, health: 30, speed: 140, angle: Math.random() * Math.PI * 2., explodeTimer: -1, color: 'crimson' }; },
    
    //  Cloaked 
    createCloaked: function(startX, startY) { return { type: 'cloaked', x: startX, y: startY, radius: 12, health: 50, speed: 90, angle: Math.random() * Math.PI * 2., isVisible: false, color: '#444455' }; },

    createBoss: function(startX, startY) { return { type: 'boss', x: startX, y: startY, radius: 45, health: 2500, maxHealth: 2500, speed: 45, angle: Math.random() * Math.PI * 2., attackCooldown: 2.0, spawnCooldown: 5.0, color: '#ffffff' }; },
    
    spawnWave: function(state_object) {
        state_object.enemies = [];
        let level =state_object.currentLevel || 1;
        if(level===1){
        

        state_object.enemies.push(this.createTurret(540, 220));
        state_object.enemies.push(this.createTurret(900, 350));
        state_object.enemies.push(this.createTurret(1400, 750));
        
        
        state_object.enemies.push(this.createSniper(880, 220)); 
        state_object.enemies.push(this.createSniper(1350, 100)); 
         state_object.enemies.push(this.createSniper(280, 220));
        
        
        
        state_object.enemies.push(this.createRusher(250, 520)); 
        state_object.enemies.push(this.createRusher(250, 100)); 
           state_object.enemies.push(this.createRusher(1350, 300)); 
         
        
        
        state_object.enemies.push(this.createDasher(1200, 580)); 
         state_object.enemies.push(this.createDasher(600, 750));
          state_object.enemies.push(this.createDasher(400, 550));
        
        
        state_object.enemies.push(this.createExplosive(960, 780)); 
        state_object.enemies.push(this.createExplosive(600, 400)); 
         state_object.enemies.push(this.createExplosive(400, 400)); 



        state_object.enemies.push(this.createCloaked(120, 520));
         state_object.enemies.push(this.createCloaked(1400, 520));
         state_object.enemies.push(this.createCloaked(420, 300));
          state_object.enemies.push(this.createCloaked(120, 780));
           state_object.enemies.push(this.createCloaked(1150, 100)); 
        
        }
        else if (level === 2) {

           
        state_object.enemies.push(this.createTurret(540, 220));
        state_object.enemies.push(this.createTurret(900, 350));
        state_object.enemies.push(this.createTurret(1400, 750));
         state_object.enemies.push(this.createTurret(540, 850));
        
        state_object.enemies.push(this.createSniper(880, 220)); 
        state_object.enemies.push(this.createSniper(1350, 100)); 
         state_object.enemies.push(this.createSniper(280, 220));
         state_object.enemies.push(this.createSniper(1420, 880));
        
        
        
        state_object.enemies.push(this.createRusher(250, 520)); 
        state_object.enemies.push(this.createRusher(250, 100)); 
           state_object.enemies.push(this.createRusher(1350, 300)); 
            state_object.enemies.push(this.createRusher(700, 100));
          
        state_object.enemies.push(this.createRusher(400, 650)); 
        
        
        state_object.enemies.push(this.createDasher(1200, 580)); 
         state_object.enemies.push(this.createDasher(550, 750));
          state_object.enemies.push(this.createDasher(400, 550));
          state_object.enemies.push(this.createDasher(1200, 850));
        
        
        state_object.enemies.push(this.createExplosive(960, 780)); 
        state_object.enemies.push(this.createExplosive(600, 400)); 
         state_object.enemies.push(this.createExplosive(400, 400)); 
          state_object.enemies.push(this.createExplosive(1000, 380)); 
         state_object.enemies.push(this.createExplosive(1130, 400)); 



        state_object.enemies.push(this.createCloaked(120, 520));
         state_object.enemies.push(this.createCloaked(1400, 520));
         state_object.enemies.push(this.createCloaked(420, 300));
          state_object.enemies.push(this.createCloaked(120, 780));
            state_object.enemies.push(this.createCloaked(1150, 100)); 
              state_object.enemies.push(this.createCloaked(1020, 750));
            
        }
    else if (level === 3) {
            //  OMEGA 
            state_object.enemies.push(this.createBoss(1000, 600));
            
            //  Guard turrets in the corners of the boss room
            state_object.enemies.push(this.createTurret(600, 400));
            state_object.enemies.push(this.createTurret(1400, 400));
            state_object.enemies.push(this.createTurret(600, 1400));
            state_object.enemies.push(this.createTurret(1400, 1400));
        }}
};
