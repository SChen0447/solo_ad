import axios from 'axios';
import type { Star, Constellation } from '../utils/types';

let starsCache: Star[] | null = null;
let constellationsCache: Constellation[] | null = null;

const fallbackStars: Star[] = [
  { id: "ori-betelgeuse", name: "参宿四", englishName: "Betelgeuse", magnitude: 0.5, distance: 640, spectralType: "M1-M2", ra: 88.7929, dec: 7.4071, color: "#ff6b4a" },
  { id: "ori-rigel", name: "参宿七", englishName: "Rigel", magnitude: 0.13, distance: 860, spectralType: "B8", ra: 78.6345, dec: -8.2016, color: "#a0d8ff" },
  { id: "ori-bellatrix", name: "参宿五", englishName: "Bellatrix", magnitude: 1.64, distance: 245, spectralType: "B2", ra: 81.2827, dec: 6.3497, color: "#c8e4ff" },
  { id: "ori-mintaka", name: "参宿三", englishName: "Mintaka", magnitude: 2.23, distance: 900, spectralType: "O9", ra: 83.0017, dec: -0.2991, color: "#b8dcff" },
  { id: "ori-alnilam", name: "参宿二", englishName: "Alnilam", magnitude: 1.69, distance: 1340, spectralType: "B0", ra: 84.0535, dec: -1.2019, color: "#b8dcff" },
  { id: "ori-alnitak", name: "参宿一", englishName: "Alnitak", magnitude: 1.77, distance: 820, spectralType: "O9", ra: 85.1896, dec: -1.9426, color: "#b0d8ff" },
  { id: "ori-saiph", name: "参宿六", englishName: "Saiph", magnitude: 2.06, distance: 720, spectralType: "B0", ra: 81.6535, dec: -9.6703, color: "#c0e0ff" },
  { id: "uma-dubhe", name: "天枢", englishName: "Dubhe", magnitude: 1.79, distance: 124, spectralType: "K0", ra: 165.4604, dec: 61.7510, color: "#ffd4a8" },
  { id: "uma-merak", name: "天璇", englishName: "Merak", magnitude: 2.37, distance: 79, spectralType: "A1", ra: 162.9097, dec: 56.3824, color: "#e8f0ff" },
  { id: "uma-phecda", name: "天玑", englishName: "Phecda", magnitude: 2.44, distance: 84, spectralType: "A0", ra: 166.6920, dec: 53.6948, color: "#e8f0ff" },
  { id: "uma-megrez", name: "天权", englishName: "Megrez", magnitude: 3.31, distance: 81, spectralType: "A3", ra: 170.6770, dec: 57.0326, color: "#eef4ff" },
  { id: "uma-alioth", name: "玉衡", englishName: "Alioth", magnitude: 1.77, distance: 81, spectralType: "A0", ra: 175.9587, dec: 55.9595, color: "#e8f0ff" },
  { id: "uma-mizar", name: "开阳", englishName: "Mizar", magnitude: 2.23, distance: 78, spectralType: "A2", ra: 178.7505, dec: 54.9254, color: "#eef4ff" },
  { id: "uma-alkaid", name: "摇光", englishName: "Alkaid", magnitude: 1.86, distance: 101, spectralType: "B3", ra: 180.6217, dec: 49.3132, color: "#c8e4ff" },
  { id: "cas-schedar", name: "王良四", englishName: "Schedar", magnitude: 2.24, distance: 228, spectralType: "K0", ra: 7.1832, dec: 56.5373, color: "#ffd4a8" },
  { id: "cas-caph", name: "王良一", englishName: "Caph", magnitude: 2.28, distance: 54, spectralType: "F2", ra: 3.3997, dec: 59.1497, color: "#fff4d4" },
  { id: "cas-gamma", name: "策星", englishName: "Gamma Cas", magnitude: 2.47, distance: 610, spectralType: "B0", ra: 10.1385, dec: 60.7168, color: "#b0d8ff" },
  { id: "cas-rukh", name: "阁道三", englishName: "Ruchbah", magnitude: 2.68, distance: 100, spectralType: "A5", ra: 18.4423, dec: 60.5408, color: "#eef4ff" },
  { id: "cas-epsilon", name: "阁道二", englishName: "Segin", magnitude: 3.37, distance: 440, spectralType: "B3", ra: 22.1430, dec: 63.6666, color: "#c0e0ff" },
  { id: "leo-regulus", name: "轩辕十四", englishName: "Regulus", magnitude: 1.35, distance: 77, spectralType: "B7", ra: 152.0928, dec: 11.9672, color: "#c0e0ff" },
  { id: "leo-denebola", name: "五帝座一", englishName: "Denebola", magnitude: 2.14, distance: 36, spectralType: "A3", ra: 175.3199, dec: 14.5647, color: "#eef4ff" },
  { id: "leo-algieba", name: "轩辕十二", englishName: "Algieba", magnitude: 2.28, distance: 130, spectralType: "K0", ra: 147.6042, dec: 19.8468, color: "#ffd4a8" },
  { id: "leo-zosma", name: "西上相", englishName: "Zosma", magnitude: 2.56, distance: 58, spectralType: "A4", ra: 167.5081, dec: 20.5233, color: "#eef4ff" },
  { id: "leo-chort", name: "西次相", englishName: "Chort", magnitude: 3.34, distance: 158, spectralType: "A5", ra: 158.8534, dec: 6.4735, color: "#eef4ff" },
  { id: "sco-antares", name: "心宿二", englishName: "Antares", magnitude: 1.09, distance: 550, spectralType: "M1", ra: 247.3517, dec: -26.4319, color: "#ff6b4a" },
  { id: "sco-acrab", name: "房宿四", englishName: "Acrab", magnitude: 2.56, distance: 400, spectralType: "B1", ra: 242.5814, dec: -19.8050, color: "#b0d8ff" },
  { id: "sco-dschubba", name: "房宿三", englishName: "Dschubba", magnitude: 2.29, distance: 440, spectralType: "B0", ra: 244.3275, dec: -22.6225, color: "#b0d8ff" },
  { id: "sco-sigma", name: "心宿一", englishName: "Sigma Sco", magnitude: 2.88, distance: 1800, spectralType: "B1", ra: 245.4896, dec: -25.7835, color: "#b0d8ff" },
  { id: "sco-tau", name: "心宿三", englishName: "Tau Sco", magnitude: 2.82, distance: 470, spectralType: "B0", ra: 250.7126, dec: -29.6248, color: "#b0d8ff" },
  { id: "sco-shaula", name: "尾宿八", "englishName": "Shaula", magnitude: 1.63, distance: 570, spectralType: "B2", ra: 264.1053, dec: -37.1053, color: "#b8dcff" },
  { id: "sco-lesath", name: "尾宿九", englishName: "Lesath", magnitude: 2.69, distance: 520, spectralType: "B2", ra: 265.2231, dec: -37.1039, color: "#b8dcff" },
  { id: "cyg-deneb", name: "天津四", englishName: "Deneb", magnitude: 1.25, distance: 2600, spectralType: "A2", ra: 310.3573, dec: 45.2803, color: "#eef4ff" },
  { id: "cyg-sadr", name: "天津一", englishName: "Sadr", magnitude: 2.23, distance: 1500, spectralType: "F8", ra: 305.5569, dec: 40.2567, color: "#fff4d4" },
  { id: "cyg-gienah", name: "天津九", englishName: "Gienah", magnitude: 2.48, distance: 170, spectralType: "K0", ra: 294.7287, dec: 33.9690, color: "#ffd4a8" },
  { id: "cyg-delta", name: "天津二", englishName: "Delta Cyg", magnitude: 2.87, distance: 165, spectralType: "B9", ra: 297.9854, dec: 45.0770, color: "#c8e4ff" },
  { id: "cyg-albireo", name: "辇道增七", englishName: "Albireo", magnitude: 3.09, distance: 430, spectralType: "K2", ra: 294.8909, dec: 27.9597, color: "#ffd4a8" },
  { id: "cyg-epsilon", name: "奚仲四", englishName: "Epsilon Cyg", magnitude: 2.48, distance: 72, spectralType: "K0", ra: 304.5667, dec: 33.4578, color: "#ffd4a8" },
  { id: "lyr-vega", name: "织女一", englishName: "Vega", magnitude: 0.03, distance: 25, spectralType: "A0", ra: 279.2346, dec: 38.7837, color: "#e8f0ff" },
  { id: "lyr-sulafat", name: "渐台二", englishName: "Sulafat", magnitude: 3.26, distance: 630, spectralType: "B9", ra: 283.0051, dec: 33.3659, color: "#c8e4ff" },
  { id: "lyr-sheliak", name: "渐台三", englishName: "Sheliak", magnitude: 3.52, distance: 960, spectralType: "B7", ra: 284.4013, dec: 33.4260, color: "#c0e0ff" },
  { id: "lyr-delta", name: "渐台一", englishName: "Delta Lyr", magnitude: 4.30, distance: 560, spectralType: "A3", ra: 285.5908, dec: 36.9832, color: "#eef4ff" },
  { id: "and-alpheratz", name: "壁宿二", englishName: "Alpheratz", magnitude: 2.06, distance: 97, spectralType: "B8", ra: 2.0982, dec: 29.0898, color: "#c0e0ff" },
  { id: "and-mirach", name: "奎宿九", englishName: "Mirach", magnitude: 2.07, distance: 197, spectralType: "M0", ra: 17.4330, dec: 35.6207, color: "#ff8f6b" },
  { id: "and-almach", name: "天大将军一", englishName: "Almach", magnitude: 2.10, distance: 350, spectralType: "K3", ra: 32.8063, dec: 42.3306, color: "#ffb88a" },
  { id: "and-51", name: "螣蛇廿二", englishName: "51 And", magnitude: 3.57, distance: 450, spectralType: "K5", ra: 11.9307, dec: 47.2078, color: "#ffc8a0" },
  { id: "and-mu", name: "奎宿一", englishName: "Mu And", magnitude: 3.87, distance: 130, spectralType: "A5", ra: 6.7327, dec: 38.8256, color: "#eef4ff" },
];

const fallbackConstellations: Constellation[] = [
  { id: "orion", name: "猎户座", englishName: "Orion", season: "winter", starIds: ["ori-betelgeuse", "ori-rigel", "ori-bellatrix", "ori-mintaka", "ori-alnilam", "ori-alnitak", "ori-saiph"], lines: [{ from: "ori-betelgeuse", to: "ori-bellatrix" }, { from: "ori-bellatrix", to: "ori-mintaka" }, { from: "ori-mintaka", to: "ori-alnilam" }, { from: "ori-alnilam", to: "ori-alnitak" }, { from: "ori-betelgeuse", to: "ori-alnilam" }, { from: "ori-alnitak", to: "ori-rigel" }, { from: "ori-mintaka", to: "ori-saiph" }, { from: "ori-saiph", to: "ori-rigel" }] },
  { id: "ursa-major", name: "大熊座", englishName: "Ursa Major", season: "spring", starIds: ["uma-dubhe", "uma-merak", "uma-phecda", "uma-megrez", "uma-alioth", "uma-mizar", "uma-alkaid"], lines: [{ from: "uma-dubhe", to: "uma-merak" }, { from: "uma-merak", to: "uma-phecda" }, { from: "uma-phecda", to: "uma-megrez" }, { from: "uma-megrez", to: "uma-dubhe" }, { from: "uma-megrez", to: "uma-alioth" }, { from: "uma-alioth", to: "uma-mizar" }, { from: "uma-mizar", to: "uma-alkaid" }] },
  { id: "cassiopeia", name: "仙后座", englishName: "Cassiopeia", season: "autumn", starIds: ["cas-schedar", "cas-caph", "cas-gamma", "cas-rukh", "cas-epsilon"], lines: [{ from: "cas-caph", to: "cas-schedar" }, { from: "cas-schedar", to: "cas-gamma" }, { from: "cas-gamma", to: "cas-rukh" }, { from: "cas-rukh", to: "cas-epsilon" }] },
  { id: "leo", name: "狮子座", englishName: "Leo", season: "spring", starIds: ["leo-regulus", "leo-denebola", "leo-algieba", "leo-zosma", "leo-chort"], lines: [{ from: "leo-regulus", to: "leo-algieba" }, { from: "leo-algieba", to: "leo-zosma" }, { from: "leo-zosma", to: "leo-denebola" }, { from: "leo-denebola", to: "leo-chort" }, { from: "leo-chort", to: "leo-regulus" }] },
  { id: "scorpius", name: "天蝎座", englishName: "Scorpius", season: "summer", starIds: ["sco-antares", "sco-acrab", "sco-dschubba", "sco-sigma", "sco-tau", "sco-shaula", "sco-lesath"], lines: [{ from: "sco-acrab", to: "sco-dschubba" }, { from: "sco-dschubba", to: "sco-sigma" }, { from: "sco-sigma", to: "sco-antares" }, { from: "sco-antares", to: "sco-tau" }, { from: "sco-tau", to: "sco-shaula" }, { from: "sco-shaula", to: "sco-lesath" }] },
  { id: "cygnus", name: "天鹅座", englishName: "Cygnus", season: "summer", starIds: ["cyg-deneb", "cyg-sadr", "cyg-gienah", "cyg-delta", "cyg-albireo", "cyg-epsilon"], lines: [{ from: "cyg-deneb", to: "cyg-sadr" }, { from: "cyg-sadr", to: "cyg-delta" }, { from: "cyg-delta", to: "cyg-albireo" }, { from: "cyg-sadr", to: "cyg-gienah" }, { from: "cyg-sadr", to: "cyg-epsilon" }] },
  { id: "lyra", name: "天琴座", englishName: "Lyra", season: "summer", starIds: ["lyr-vega", "lyr-sulafat", "lyr-sheliak", "lyr-delta"], lines: [{ from: "lyr-vega", to: "lyr-sulafat" }, { from: "lyr-sulafat", to: "lyr-sheliak" }, { from: "lyr-sheliak", to: "lyr-delta" }, { from: "lyr-delta", to: "lyr-vega" }] },
  { id: "andromeda", name: "仙女座", englishName: "Andromeda", season: "autumn", starIds: ["and-alpheratz", "and-mirach", "and-almach", "and-51", "and-mu"], lines: [{ from: "and-alpheratz", to: "and-mu" }, { from: "and-mu", to: "and-51" }, { from: "and-51", to: "and-mirach" }, { from: "and-mirach", to: "and-almach" }] },
];

function generateFallbackBgStars(): Star[] {
  const result: Star[] = [];
  const colors = ["#ffffff", "#fff5e6", "#e8f0ff", "#fff0f5"];
  const spectral = ["A", "F", "G", "K", "M"];
  const seed = 42;
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = 0; i < 950; i++) {
    const ra = random() * 360;
    const dec = random() * 150 - 60;
    const magnitude = 3.5 + random() * 3.0;
    result.push({
      id: `bg-${i}`,
      name: `HD${Math.floor(100000 + random() * 899999)}`,
      magnitude: Math.round(magnitude * 100) / 100,
      distance: Math.round(50 + random() * 2950),
      spectralType: spectral[Math.floor(random() * spectral.length)],
      ra: Math.round(ra * 10000) / 10000,
      dec: Math.round(dec * 10000) / 10000,
      color: colors[Math.floor(random() * colors.length)],
    });
  }
  return result;
}

export class StarDataService {
  static async fetchStars(): Promise<Star[]> {
    if (starsCache) return starsCache;
    try {
      const res = await axios.get('/api/stars', { timeout: 3000 });
      starsCache = res.data;
    } catch {
      starsCache = [...fallbackStars, ...generateFallbackBgStars()];
    }
    return starsCache;
  }

  static async fetchConstellations(): Promise<Constellation[]> {
    if (constellationsCache) return constellationsCache;
    try {
      const res = await axios.get('/api/constellations', { timeout: 3000 });
      constellationsCache = res.data;
    } catch {
      constellationsCache = fallbackConstellations;
    }
    return constellationsCache;
  }

  static getStarById(id: string, stars: Star[]): Star | undefined {
    return stars.find(s => s.id === id);
  }

  static getNamedStars(stars: Star[]): Star[] {
    return stars.filter(s => !s.id.startsWith('bg-'));
  }
}
