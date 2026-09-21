// 宴会ゲームズ 白ラベル（マルチテナント）ブランドレジストリ
// エンジン/コンテンツは共有。看板（配色・店名・フォント・素材）だけ店ごとに切替。
// テーマは CSS 変数 --kg-* で全画面に適用される（globals.css / 各画面が参照）。

export type BrandTheme = {
  ink: string;
  sumi: string;
  sumi2: string;
  accent: string;
  accentDeep: string;
  accentHover: string; // hover時の明るめaccent
  accentRgb: string;   // "R,G,B"（glow/影の rgba() 用）
  gold: string;
  goldRgb: string;     // "R,G,B"（金の縁 rgba() 用）
  paper: string;
  paperRgb: string;    // "R,G,B"（線/縁の rgba() 用）
  paperDim: string;
  mist: string;
};

export type Brand = {
  id: string;
  name: string;        // 製品名（見出し）
  club: string;        // 店名（eyebrow）
  tagline: string;
  theme: BrandTheme;
  domains: string[];   // このブランドに対応するホスト名
};

const KINGYO: Brand = {
  id: 'kingyo',
  name: '宴会ゲームズ',
  club: 'NEWCLUB Kingyo',
  tagline: 'みんなのスマホで、今夜の答え合わせ。',
  theme: {
    ink: '#0a0a0b',
    sumi: '#111114',
    sumi2: '#17171b',
    accent: '#cf3a2e',
    accentDeep: '#a12417',
    accentHover: '#d8483c',
    accentRgb: '207,58,46',
    gold: '#b8935a',
    goldRgb: '184,147,90',
    paper: '#ece7df',
    paperRgb: '236,231,223',
    paperDim: '#b9b4ac',
    mist: '#7d7871',
  },
  domains: [],
};

const CGIRL: Brand = {
  id: 'cgirl',
  name: 'C-GIRL',
  club: 'BAR C-GIRL',
  tagline: '今夜も、みんなで盛り上がろう。',
  theme: {
    ink: '#0a070c',
    sumi: '#150f1a',
    sumi2: '#1e1626',
    accent: '#ff2d9a',
    accentDeep: '#c01f7a',
    accentHover: '#ff4dab',
    accentRgb: '255,45,154',
    gold: '#e2c079',
    goldRgb: '226,192,121',
    paper: '#f6eef4',
    paperRgb: '246,238,244',
    paperDim: '#cbb9c6',
    mist: '#9a8b96',
  },
  domains: [],
};

export const BRANDS: Record<string, Brand> = {
  kingyo: KINGYO,
  cgirl: CGIRL,
};

export const DEFAULT_BRAND_ID = 'kingyo';

/** ホスト名（と任意の override）からブランドIDを決める。未知なら既定(kingyo)。 */
export function resolveBrandId(host?: string | null, override?: string | null): string {
  if (override && BRANDS[override]) return override;
  if (host) {
    const h = host.toLowerCase();
    for (const b of Object.values(BRANDS)) {
      if (b.domains.some((d) => h === d || h.endsWith('.' + d))) return b.id;
    }
  }
  return DEFAULT_BRAND_ID;
}

export function getBrandById(id?: string | null): Brand {
  return (id && BRANDS[id]) || BRANDS[DEFAULT_BRAND_ID];
}

/** ブランドのテーマを CSS 変数文字列（:root 用）にする。 */
export function brandCssVars(brand: Brand): string {
  const t = brand.theme;
  return [
    `--kg-ink:${t.ink}`,
    `--kg-sumi:${t.sumi}`,
    `--kg-sumi2:${t.sumi2}`,
    `--kg-accent:${t.accent}`,
    `--kg-accent-deep:${t.accentDeep}`,
    `--kg-accent-hover:${t.accentHover}`,
    `--kg-accent-rgb:${t.accentRgb}`,
    `--kg-gold:${t.gold}`,
    `--kg-gold-rgb:${t.goldRgb}`,
    `--kg-paper:${t.paper}`,
    `--kg-paper-rgb:${t.paperRgb}`,
    `--kg-paper-dim:${t.paperDim}`,
    `--kg-mist:${t.mist}`,
  ].join(';');
}
