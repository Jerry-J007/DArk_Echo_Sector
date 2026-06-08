# DArk_Echo_Sector
Task 2 for Web development(delta forces)


DArk: Echo Sector
Overview
DArk: Echo Sector is a high-octane, tactical top-down shooter built entirely from scratch using vanilla JavaScript and the HTML5 Canvas API. Developed without the use of external game engines or abstraction libraries (like Phaser or Unity), this project demonstrates a deep understanding of low-level rendering, custom physics, raycasting mathematics, and artificial intelligence state machines.

🚀 Play the Game
(You can insert a link to your live hosted game here, like a GitHub Pages link, or instruct them to open index.html in their browser)

🎮 Controls & Mechanics
Movement: W A S D or Arrow Keys

Aim & Fire: Mouse & Left Click

Pause/Resume: ESC

Restart Run: R

Marketplace (Shop): M

Tactical Abilities (Potions)
Once purchased from the Marketplace, active abilities can be triggered during combat to turn the tide of a firefight:

Sprint (Speed Burst): Shift

Invincibility Shield: Q

Invisibility (Ghost Mode): E

⚙️ Technical Highlights & Features
1. Custom Physics & Combat Engine
No Dependencies: The entire game loop, entity rendering, and state updates are hand-coded.

Vector Mathematics: Implemented accurate angle-of-incidence wall reflection logic for bullet ricochets using custom dot-product vector math.

AABB Collision Resolution: Ensures smooth gliding against static geometry without clipping or getting stuck.

2. Advanced Vision Mechanics (Raycasting)
Dynamic Shadows: Utilizes raycasting and polygon rendering to create a dynamic 120-degree line-of-sight flashlight for the player. Areas outside this cone are obscured in darkness.

Enemy Detection Cones: AI units actively project their own calculated Field of View (FOV) cones, checking for both angular alignment and wall-blocking intersections before engaging.

3. Finite State Machine AI
Enemies don't just chase; they calculate and react. The game features 7 distinct AI profiles:

Rusher: Standard swarm intelligence.

Turret: Stationary, heavy 3-round burst fire.

Sniper: Telegraphs a high-velocity laser, freezing its aim right before firing to allow for skill-based dodging.

Dasher: Closes the gap instantly with a high-speed melee burst.

Explosive: Kamikaze units with a visual fuse and AOE damage.

Cloaked: Invisible assassins that only render when within close proximity.

Omega Boss: Multi-phase combat featuring 8-way bullet hell spreads and minion-spawning mechanics.

4. Progression & Persistent Memory
Dynamic Marketplace: Players collect Alien Goop to spend on persistent upgrades (Damage, Speed, Health, Multi-shot) and tactical consumables.

Web Storage API: Utilizes the browser's localStorage to save the game state (every_frame()), ensuring currency and high scores persist across reloads.

5. Audiovisual Polish
Particle Engine: Custom arrays handle fading muzzle flashes, sparks on wall ricochets, and enemy death shatter effects.

Audio Controller: A custom sound engine handles overlapping sound clones (so rapid-fire shooting doesn't cut out) and dynamic background music transitions between rooms.
