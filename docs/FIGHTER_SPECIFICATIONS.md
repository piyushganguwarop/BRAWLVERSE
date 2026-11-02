# Brawl Wars - Fighter Design Specifications

**Document Version:** 1.0  
**Phase:** Phase 0 (Planning & Discovery)  
**Status:** Approved  
**Related Documents:** [MASTER_PRODUCTION_BLUEPRINT.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/MASTER_PRODUCTION_BLUEPRINT.md) | [ART_GUIDELINES.md](file:///c:/Users/piyush/Downloads/PiyuProjects/BRAWLVERSE/docs/ART_GUIDELINES.md)

---

## 1. Fighter Roster Overview

The initial roster features four distinct combat archetypes designed to provide balanced, rock-paper-scissors dynamic gameplay.

```
                  +-----------------------------------+
                  |          ATLAS (Balanced)         |
                  | Versatile - Good Range - Standard |
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+-----------------------+                           +-----------------------+
|     VOLT (Speed)      |                           |     BLAZE (Power)     |
| Rapid combos, high    | <------- Matchup -------> | High damage, armored  |
| mobility, lower HP    |          Advantage        | strikes, lower speed  |
+-----------------------+                           +-----------------------+
          |                                                   |
          +-------------------------+-------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |         CIPHER (Technical)        |
                  | Traps, projectiles, feints, trick |
                  +-----------------------------------+
```

---

## 2. Universal Animation Set (23 Clips per Fighter)

Every fighter rig implements the identical 23-clip animation interface:

| # | Animation Clip | Duration | Transition Windows / Blend |
| :--- | :--- | :--- | :--- |
| **01** | `idle` | 1.8s loop | 120ms blend into movement or combat |
| **02** | `walk_fwd` | 0.8s loop | Directional blend tree |
| **03** | `walk_bwd` | 0.9s loop | Directional blend tree |
| **04** | `strafe_left` | 0.8s loop | Directional blend tree |
| **05** | `strafe_right` | 0.8s loop | Directional blend tree |
| **06** | `run` | 0.6s loop | High-speed dash sprint |
| **07** | `jump_start` | 0.12s | 3-frame anticipation into air |
| **08** | `jump_loop` | Loop | Airborne apex pose |
| **09** | `jump_land` | 0.15s | Recovery landing crouch |
| **10** | `crouch` | Loop | Low stance; avoids high strikes |
| **11** | `block` | Loop | Guard pose; frontal damage reduction |
| **12** | `perfect_block`| 0.25s | Deflective flash parry counter |
| **13** | `dodge_roll` | 0.45s | 14 invulnerability frames (IFrames) |
| **14** | `light_punch` | 0.30s | Startup: 4f, Active: 3f, Recovery: 11f |
| **15** | `medium_kick` | 0.42s | Startup: 8f, Active: 4f, Recovery: 13f |
| **16** | `heavy_strike` | 0.65s | Startup: 14f, Active: 5f, Recovery: 20f |
| **17** | `grab_strike` | 0.50s | Guard-breaking throw within 1.2m |
| **18** | `special_tech` | 0.80s | Super move with cinematic pause |
| **19** | `hit_light` | 0.25s | Flinch reaction |
| **20** | `hit_heavy` | 0.40s | Stagger recoil |
| **21** | `knockdown` | 0.80s | Juggle fall and ground collapse |
| **22** | `get_up` | 0.55s | Ground recovery wake-up roll |
| **23** | `victory` | 3.0s | End of match celebration |
| **24** | `defeat` | 2.5s | Match loss kneel/collapse |

---

## 3. Individual Fighter Profiles

### 3.1 Fighter 1: Atlas (The Vanguard) — Quality Reference Slice
- **Archetype:** Balanced All-Rounder
- **Visual Silhouette:** Streamlined cybernetic jacket, energetic spiky hair, energy gauntlet on right arm.
- **Color Palette:** Cobalt Blue (`#0066FF`), Crisp White (`#F0F4F8`), Cyan Glow (`#00E5FF`).
- **Base Attributes:**
  - Health: `1000 HP`
  - Ground Speed: `6.5 m/s`
  - Jump Velocity: `11.0 m/s`
  - Attack Power Multiplier: `1.0x`
  - Defense Multiplier: `1.0x` (Standard block absorbs 80% damage)
  - Energy Meter Max: `100 SP`
- **Signature Special: *Aether Thrust***
  - Atlas dashes forward 4 meters enveloped in blue light, piercing opponents for 180 damage and launching them on hit. Startup: 10f, Recovery: 16f.

---

### 3.2 Fighter 2: Volt (The Lightning Striker)
- **Archetype:** Speed / Agility
- **Visual Silhouette:** Sleek stealth bodysuit, aerodynamic visor, dual shock blades mounted on forearms.
- **Color Palette:** Electric Yellow (`#FFD700`), Midnight Black (`#12131A`), Neon Lime (`#A6FF00`).
- **Base Attributes:**
  - Health: `850 HP` (Glass cannon)
  - Ground Speed: `8.2 m/s` (Fastest movement in the roster)
  - Jump Velocity: `12.5 m/s` (Double-jump capable)
  - Attack Power Multiplier: `0.85x` (Lower single-hit damage, higher hit count)
  - Defense Multiplier: `0.90x`
- **Signature Special: *Thunder Blitz***
  - Rapid multi-hit teleport flurry striking from 4 directions in 0.6 seconds. Total 12 hits, 160 damage, highly effective at breaking guards.

---

### 3.3 Fighter 3: Blaze (The Iron Colossus)
- **Archetype:** Power / Tank / Brawler
- **Visual Silhouette:** Heavy reinforced armored exoskeleton, fiery crimson accents, broad shoulders and massive gauntlets.
- **Color Palette:** Crimson Scarlet (`#FF2A4D`), Charcoal Slate (`#1E1E24`), Solar Flare Amber (`#FF8C00`).
- **Base Attributes:**
  - Health: `1250 HP` (Highest health pool)
  - Ground Speed: `4.8 m/s` (Slower movement)
  - Jump Velocity: `9.5 m/s`
  - Attack Power Multiplier: `1.30x` (Devastating single strikes)
  - Defense Multiplier: `1.20x` (Inherent armor on heavy attacks absorbs 1 light hit)
- **Signature Special: *Magma Slam***
  - Leaps into the air and hammers both fists into the platform, creating an explosive 360-degree shockwave dealing 240 damage and knocking down all grounded targets.

---

### 3.4 Fighter 4: Cipher (The Phantom Tactician)
- **Archetype:** Technical / Zoning
- **Visual Silhouette:** Long flowing digital coat, floating holographic prisms around wrists, mask with glowing eye slit.
- **Color Palette:** Phantom Violet (`#8A2BE2`), Deep Obsidian (`#1A1726`), Holographic Magenta (`#FF007F`).
- **Base Attributes:**
  - Health: `920 HP`
  - Ground Speed: `5.8 m/s`
  - Jump Velocity: `10.5 m/s`
  - Attack Power Multiplier: `0.95x`
  - Defense Multiplier: `0.95x`
- **Signature Special: *Prism Distortion***
  - Deploys 2 homing holographic projectiles that orbit the opponent before striking, allowing Cipher to mix up with high/low strikes during the projectile impact.

---

## 4. Data-Driven Fighter Configuration Schema

All fighter attributes, move data, and frame timings are stored in clean JSON configurations:

```json
{
  "id": "atlas",
  "name": "Atlas",
  "title": "The Vanguard",
  "archetype": "balanced",
  "stats": {
    "maxHealth": 1000,
    "walkSpeed": 4.0,
    "runSpeed": 6.5,
    "jumpForce": 11.0,
    "gravity": 28.0,
    "defense": 1.0,
    "attackPower": 1.0
  },
  "moves": {
    "lightPunch": {
      "startupFrames": 4,
      "activeFrames": 3,
      "recoveryFrames": 11,
      "damage": 35,
      "hitStop": 50,
      "knockback": [1.2, 0.5, 0],
      "cancelableInto": ["mediumKick", "specialTech"]
    },
    "mediumKick": {
      "startupFrames": 8,
      "activeFrames": 4,
      "recoveryFrames": 13,
      "damage": 65,
      "hitStop": 70,
      "knockback": [2.5, 1.2, 0],
      "cancelableInto": ["heavyStrike", "specialTech"]
    },
    "heavyStrike": {
      "startupFrames": 14,
      "activeFrames": 5,
      "recoveryFrames": 20,
      "damage": 120,
      "hitStop": 110,
      "knockback": [5.0, 4.0, 0],
      "launcher": true,
      "cancelableInto": ["specialTech"]
    },
    "specialTech": {
      "startupFrames": 10,
      "activeFrames": 6,
      "recoveryFrames": 18,
      "damage": 180,
      "cost": 50,
      "hitStop": 160,
      "knockback": [6.5, 5.0, 0]
    }
  }
}
```
