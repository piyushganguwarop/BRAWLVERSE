// Original, reusable fighter roster. Add a character here to make it selectable.
export const roster = [
  { id: 'atlas', name: 'ATLAS', title: 'THE HEAVYWEIGHT', color: 0x2869b5, accent: 0xe6b84c, skin: 0xb97855, hair: 0x20232c, style: 'balanced', stats: { power: 4, speed: 3, guard: 4 }, specialName: 'Titan Breaker', bio: 'A disciplined all-rounder with strong counters.', model: null },
  { id: 'volt', name: 'VOLT', title: 'THE STRIKER', color: 0x9c3e36, accent: 0xf2c45e, skin: 0x9b6549, hair: 0x171923, style: 'fast', stats: { power: 3, speed: 5, guard: 2 }, specialName: 'Flash Rush', bio: 'Fast attacks and quick movement.', model: null },
  { id: 'rook', name: 'ROOK', title: 'THE WALL', color: 0x53616f, accent: 0x9eb7c8, skin: 0xc58a67, hair: 0x30251f, style: 'tank', stats: { power: 5, speed: 2, guard: 5 }, specialName: 'Iron Fortress', bio: 'Slow, tough and hard to interrupt.', model: null },
  { id: 'myst', name: 'MYST', title: 'THE TRICKSTER', color: 0x6945a1, accent: 0x42d8c5, skin: 0xdaa27c, hair: 0x211b35, style: 'technical', stats: { power: 3, speed: 4, guard: 3 }, specialName: 'Phantom Pulse', bio: 'Flexible movement and tricky pressure.', model: null },
  { id: 'blaze', name: 'BLAZE', title: 'THE BRAWLER', color: 0xb75b26, accent: 0xffd08a, skin: 0x87583f, hair: 0x241c19, style: 'power', stats: { power: 5, speed: 3, guard: 3 }, specialName: 'Comet Smash', bio: 'Heavy hits that punish mistakes.', model: null },
  { id: 'nova', name: 'NOVA', title: 'THE VANGUARD', color: 0x247c75, accent: 0xc5f0db, skin: 0xe0ad86, hair: 0x35271f, style: 'balanced', stats: { power: 3, speed: 4, guard: 4 }, specialName: 'Rising Arc', bio: 'A reliable fighter with strong mobility.', model: null },
  { id: 'cipher', name: 'CIPHER', title: 'THE TECHNICIAN', color: 0x354d8b, accent: 0x8bc5ff, skin: 0x9a684f, hair: 0x151a29, style: 'technical', stats: { power: 3, speed: 4, guard: 4 }, specialName: 'Vector Strike', bio: 'Precise attacks and defensive options.', model: null },
  { id: 'onyx', name: 'ONYX', title: 'THE CHAMPION', color: 0x34313d, accent: 0xe45d78, skin: 0xc68d6b, hair: 0x17151b, style: 'power', stats: { power: 5, speed: 3, guard: 4 }, specialName: 'Blackout', bio: 'A dangerous close-range specialist.', model: null }
];

export function getFighter(id) {
  return roster.find((fighter) => fighter.id === id) ?? roster[0];
}

export function getRival(id) {
  const index = roster.findIndex((fighter) => fighter.id === id);
  return roster[(index + 1 + Math.floor(Math.random() * (roster.length - 1))) % roster.length];
}
