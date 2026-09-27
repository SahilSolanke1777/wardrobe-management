// Illustrated garments: every piece is drawn as a crafted flat-lay — seams, collars,
// buttons, stitching, folds, fabric grain and prints — tinted with the item's colour.
// No hooks, so it renders in both server and client components.

// ---------- colour helpers ----------
function rgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const n = m ? parseInt(m[1], 16) : 0xd8c7a6;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function mix(hex, target, t) {
  const a = rgb(hex), b = rgb(target);
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
}
const lighten = (h, t) => mix(h, '#ffffff', t);
const darken = (h, t) => mix(h, '#000000', t);
function luminance(hex) {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ---------- which drawing to use ----------
const KINDS = [
  ['tote', /tote|bag|purse|clutch|crossbody|backpack|handbag/i],
  ['scarf', /scarf|stole|dupatta|shawl/i],
  ['cap', /cap\b|hat|beanie|beret/i],
  ['belt', /belt/i],
  ['heels', /heel|pump|stiletto/i],
  ['boots', /boot/i],
  ['loafers', /loafer|oxford shoe|derby|brogue|mule|flat\b|ballet/i],
  ['sandals', /sandal|slide|flip/i],
  ['sneakers', /sneaker|trainer|runner|canvas shoe/i],
  ['coat', /coat|trench|parka|overcoat/i],
  ['blazer', /blazer|suit jacket/i],
  ['jacket', /jacket|bomber|shacket|gilet|vest/i],
  ['slip', /slip|cami|satin|silk dress|strappy/i],
  ['dress', /dress|gown|frock|kurta|anarkali/i],
  ['skirt', /skirt/i],
  ['shorts', /shorts/i],
  ['jeans', /jean|denim(?! jacket)/i],
  ['trousers', /trouser|pant|chino|slack|jogger|cargo|legging/i],
  ['tee', /\btee\b|\bt-shirt|\btshirt|tank|\btop\b|polo/i],
  ['sweater', /sweater|crewneck|knit|jumper|cardigan|hoodie|sweatshirt|pullover/i],
  ['shirt', /shirt|oxford|blouse|overshirt|button/i],
];
const DEFAULT_BY_CATEGORY = { Tops: 'tee', Bottoms: 'trousers', Dresses: 'dress', Outerwear: 'jacket', Shoes: 'sneakers', Accessories: 'tote' };
const ALLOWED = {
  Tops: ['tee', 'shirt', 'sweater'],
  Bottoms: ['jeans', 'trousers', 'shorts', 'skirt'],
  Dresses: ['dress', 'slip'],
  Outerwear: ['jacket', 'blazer', 'coat', 'sweater', 'shirt'],
  Shoes: ['sneakers', 'loafers', 'boots', 'heels', 'sandals'],
  Accessories: ['tote', 'scarf', 'cap', 'belt'],
};

export function garmentKind(item) {
  const allowed = ALLOWED[item.category] || [];
  for (const [kind, re] of KINDS) if (re.test(item.name || '') && allowed.includes(kind)) return kind;
  if (item.category === 'Outerwear' && /denim/i.test(item.name || '')) return 'jacket';
  return DEFAULT_BY_CATEGORY[item.category] || 'tee';
}

// The type picker in "Add a piece" offers these, per category
export const KIND_OPTIONS = {
  Tops: [['tee', 'T-shirt'], ['shirt', 'Shirt'], ['sweater', 'Knit']],
  Bottoms: [['jeans', 'Jeans'], ['trousers', 'Trousers'], ['shorts', 'Shorts'], ['skirt', 'Skirt']],
  Dresses: [['dress', 'Dress'], ['slip', 'Slip dress']],
  Outerwear: [['jacket', 'Jacket'], ['blazer', 'Blazer'], ['coat', 'Coat']],
  Shoes: [['sneakers', 'Sneakers'], ['loafers', 'Loafers'], ['boots', 'Boots'], ['heels', 'Heels'], ['sandals', 'Sandals']],
  Accessories: [['tote', 'Bag'], ['scarf', 'Scarf'], ['cap', 'Cap'], ['belt', 'Belt']],
};

function patternOf(name = '') {
  if (/floral|flower|print|botanical/i.test(name)) return 'floral';
  if (/stripe|breton|pinstripe/i.test(name)) return 'stripe';
  if (/check|plaid|tartan|flannel|gingham/i.test(name)) return 'check';
  if (/polka|dot/i.test(name)) return 'dots';
  return null;
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

// ---------- the drawings (viewBox 0 0 200 240) ----------
function Tee({ p }) {
  const body = 'M70 32 Q100 48 130 32 L166 46 L186 86 L158 100 L152 88 L153 214 Q100 222 47 214 L48 88 L42 100 L14 86 L34 46 Z';
  return (
    <>
      <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={body} fill={p.pat} />
      <path d="M72 33 Q100 47 128 33 Q100 42 72 33 Z" fill={p.deep} />
      <path d="M68 31 Q100 54 132 31" fill="none" stroke={p.shade} strokeWidth="5" strokeLinecap="round" />
      <path d="M68 31 Q100 54 132 31" fill="none" stroke={p.hi} strokeWidth="1" strokeDasharray="1.5 2" />
      <path d="M17 82 L42 94 M183 82 L158 94" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
      <path d="M50 206 Q100 214 150 206" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
      <path d="M48 88 L52 120 M152 88 L148 120" stroke={p.fold} strokeWidth="6" strokeLinecap="round" opacity=".5" />
      <path d="M86 70 Q80 140 90 205 M118 80 Q126 150 114 206" fill="none" stroke={p.fold} strokeWidth="9" strokeLinecap="round" />
      <path d="M100 60 Q97 130 104 200" fill="none" stroke={p.hi} strokeWidth="10" strokeLinecap="round" opacity=".2" />
    </>
  );
}

function Shirt({ p, overshirt }) {
  const body = 'M72 28 L100 40 L128 28 L160 42 L178 72 L194 196 L170 202 L154 108 L155 222 L45 222 L46 108 L30 202 L6 196 L22 72 L40 42 Z';
  const buttons = [72, 102, 132, 162, 192];
  return (
    <>
      <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={body} fill={p.pat} />
      <path d="M40 42 L46 108 M160 42 L154 108" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
      <path d="M6 196 L30 202 L32 186 L9 181 Z M194 196 L170 202 L168 186 L191 181 Z" fill={p.shade} stroke={p.edge} strokeWidth=".8" />
      <path d="M22 72 Q28 140 20 188 M178 72 Q172 140 180 188" fill="none" stroke={p.fold} strokeWidth="8" strokeLinecap="round" />
      <path d="M97 40 L97 222 L103 222 L103 40 Z" fill={p.shade} opacity=".6" />
      <path d="M100 40 L100 222" stroke={p.stitch} strokeWidth=".8" strokeDasharray="2 2" />
      {buttons.map((y) => (
        <g key={y}>
          <circle cx="100" cy={y} r="3.2" fill={p.button} stroke={p.edge} strokeWidth=".6" />
          <circle cx="99" cy={y - 1} r=".9" fill="#fff" opacity=".6" />
        </g>
      ))}
      {overshirt ? (
        <>
          <path d="M60 72 h26 v28 q-13 5 -26 0 Z M114 72 h26 v28 q-13 5 -26 0 Z" fill={p.shade} stroke={p.edge} strokeWidth=".8" />
          <path d="M58 70 h30 v8 h-30 Z M112 70 h30 v8 h-30 Z" fill={p.fill} stroke={p.edge} strokeWidth=".8" />
        </>
      ) : (
        <path d="M112 70 h24 v24 q-12 4 -24 0 Z" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2 1.6" />
      )}
      <path d="M72 28 L100 40 L88 62 L64 40 Z" fill={p.light} stroke={p.edge} strokeWidth="1" strokeLinejoin="round" />
      <path d="M128 28 L100 40 L112 62 L136 40 Z" fill={p.light} stroke={p.edge} strokeWidth="1" strokeLinejoin="round" />
      <path d="M78 110 Q72 170 82 218 M124 112 Q132 170 120 218" fill="none" stroke={p.fold} strokeWidth="9" strokeLinecap="round" />
      <path d="M60 100 Q56 150 62 210" fill="none" stroke={p.hi} strokeWidth="8" strokeLinecap="round" opacity=".2" />
    </>
  );
}

function Sweater({ p }) {
  const body = 'M70 30 Q100 44 130 30 L162 44 L180 74 L192 190 L170 196 L154 110 L156 206 L44 206 L46 110 L30 196 L8 190 L20 74 L38 44 Z';
  const ribs = Array.from({ length: 22 }, (_, i) => 48 + i * 5);
  return (
    <>
      <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={body} fill={p.pat} />
      <path d={body} fill="url(#knit)" opacity=".5" />
      <path d="M44 206 L156 206 L156 222 Q100 228 44 222 Z" fill={p.shade} stroke={p.edge} strokeWidth="1" />
      {ribs.map((x) => <path key={x} d={`M${x} 207 L${x} 223`} stroke={p.deep} strokeWidth="1" opacity=".35" />)}
      <path d="M8 190 L30 196 L28 212 L6 206 Z M192 190 L170 196 L172 212 L194 206 Z" fill={p.shade} stroke={p.edge} strokeWidth="1" />
      <path d="M68 29 Q100 52 132 29 Q100 40 68 29 Z" fill={p.deep} />
      <path d="M70 31 Q100 55 130 31" fill="none" stroke={p.shade} strokeWidth="6" strokeLinecap="butt" />
      <path d="M70 31 Q100 55 130 31" fill="none" stroke={p.deep} strokeWidth="6" strokeDasharray="1 2.5" opacity=".35" />
      <path d="M22 80 Q30 140 20 186 M178 80 Q170 140 180 186" fill="none" stroke={p.fold} strokeWidth="9" strokeLinecap="round" />
      <path d="M84 80 Q78 140 88 202 M120 86 Q128 150 116 202" fill="none" stroke={p.fold} strokeWidth="10" strokeLinecap="round" />
      <path d="M102 64 Q98 130 104 200" fill="none" stroke={p.hi} strokeWidth="12" strokeLinecap="round" opacity=".2" />
    </>
  );
}

function Jacket({ p, denim, blazer }) {
  const body = 'M70 24 L100 36 L130 24 L162 38 L180 70 L194 200 L170 206 L156 110 L157 206 L43 206 L44 110 L30 206 L6 200 L20 70 L38 38 Z';
  const seam = denim ? p.contrast : p.stitch;
  return (
    <>
      <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={body} fill={p.pat} />
      {denim && <path d={body} fill="url(#twill)" opacity=".55" />}
      <path d="M6 200 L30 206 L32 190 L9 185 Z M194 200 L170 206 L168 190 L191 185 Z" fill={p.shade} stroke={p.edge} strokeWidth=".8" />
      <path d="M20 70 Q28 140 18 196 M180 70 Q172 140 182 196" fill="none" stroke={p.fold} strokeWidth="9" strokeLinecap="round" />
      <path d="M100 36 L100 206" stroke={p.edge} strokeWidth="1.4" />
      {blazer ? (
        <>
          <path d="M70 24 L100 36 L100 120 L80 92 L66 56 L74 50 L64 40 Z" fill={p.light} stroke={p.edge} strokeWidth="1" strokeLinejoin="round" />
          <path d="M130 24 L100 36 L100 120 L120 92 L134 56 L126 50 L136 40 Z" fill={p.light} stroke={p.edge} strokeWidth="1" strokeLinejoin="round" />
          <path d="M56 150 h28 M116 150 h28" stroke={p.edge} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M120 74 h20" stroke={p.edge} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="100" cy="134" r="3.8" fill={p.button} stroke={p.edge} strokeWidth=".7" />
        </>
      ) : (
        <>
          <path d="M70 24 L100 36 L88 60 L56 46 Z M130 24 L100 36 L112 60 L144 46 Z" fill={p.shade} stroke={p.edge} strokeWidth="1" strokeLinejoin="round" />
          <path d="M44 150 L156 150" stroke={seam} strokeWidth="1.2" strokeDasharray="3 2" />
          <path d="M44 190 L156 190 M44 196 L156 196" stroke={seam} strokeWidth="1" strokeDasharray="3 2" />
          <path d="M58 80 h28 v24 l-14 6 l-14 -6 Z M114 80 h28 v24 l-14 6 l-14 -6 Z" fill={p.shade} stroke={seam} strokeWidth="1" strokeDasharray={denim ? '3 2' : '0'} />
          <path d="M62 150 L66 60 M138 150 L134 60" stroke={seam} strokeWidth="1" strokeDasharray="3 2" />
          {[76, 112, 150, 178].map((y) => <circle key={y} cx="104" cy={y} r="3.4" fill={denim ? '#B98A4A' : p.button} stroke={p.edge} strokeWidth=".7" />)}
        </>
      )}
      <path d="M80 110 Q74 160 84 204 M122 112 Q128 160 118 204" fill="none" stroke={p.fold} strokeWidth="9" strokeLinecap="round" />
      <path d="M58 96 Q54 150 60 200" fill="none" stroke={p.hi} strokeWidth="8" strokeLinecap="round" opacity=".2" />
    </>
  );
}

function Coat({ p }) {
  const body = 'M70 16 L100 30 L130 16 L162 30 L182 64 L196 196 L172 202 L158 104 L164 234 L36 234 L42 104 L28 202 L4 196 L18 64 L38 30 Z';
  return (
    <>
      <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={body} fill={p.pat} />
      <path d={body} fill="url(#wool)" opacity=".45" />
      <path d="M4 196 L28 202 L30 186 L7 181 Z M196 196 L172 202 L170 186 L193 181 Z" fill={p.shade} stroke={p.edge} strokeWidth=".8" />
      <path d="M18 64 Q26 140 16 192 M182 64 Q174 140 184 192" fill="none" stroke={p.fold} strokeWidth="10" strokeLinecap="round" />
      <path d="M70 16 L100 30 L112 128 L84 88 L62 50 L72 42 L58 32 Z" fill={p.light} stroke={p.edge} strokeWidth="1" strokeLinejoin="round" />
      <path d="M130 16 L100 30 L112 128 L128 90 L140 50 L130 42 L142 32 Z" fill={p.shade} stroke={p.edge} strokeWidth="1" strokeLinejoin="round" />
      <path d="M112 128 L112 234" stroke={p.edge} strokeWidth="1.3" />
      {[[92, 138], [132, 138], [92, 176], [132, 176]].map(([x, y]) => (
        <g key={`${x}${y}`}><circle cx={x} cy={y} r="4.2" fill={p.button} stroke={p.edge} strokeWidth=".7" /><circle cx={x - 1} cy={y - 1.2} r="1" fill="#fff" opacity=".5" /></g>
      ))}
      <path d="M50 170 l26 -4 M126 166 l26 4" stroke={p.edge} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M78 120 Q70 180 76 230 M142 120 Q150 180 144 230" fill="none" stroke={p.fold} strokeWidth="10" strokeLinecap="round" />
      <path d="M56 90 Q50 160 56 226" fill="none" stroke={p.hi} strokeWidth="9" strokeLinecap="round" opacity=".2" />
    </>
  );
}

function Bottoms({ p, kind }) {
  const denim = kind === 'jeans';
  const seam = denim ? p.contrast : p.stitch;
  if (kind === 'skirt') {
    const body = 'M62 26 L138 26 L170 214 Q100 226 30 214 Z';
    return (
      <>
        <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
        <path d={body} fill={p.pat} />
        <path d="M62 26 L138 26 L139 40 L61 40 Z" fill={p.shade} stroke={p.edge} strokeWidth="1" />
        <path d="M34 206 Q100 218 166 206" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
        <path d="M80 44 L64 212 M100 44 L100 218 M120 44 L136 212" fill="none" stroke={p.fold} strokeWidth="10" strokeLinecap="round" />
        <path d="M90 44 L82 214 M112 44 L120 214" fill="none" stroke={p.hi} strokeWidth="6" strokeLinecap="round" opacity=".2" />
      </>
    );
  }
  const short = kind === 'shorts';
  const hemY = short ? 118 : 230;
  const body = `M56 16 L144 16 L${short ? 156 : 152} ${hemY} L${short ? 108 : 110} ${hemY} L100 ${short ? 70 : 82} L${short ? 92 : 90} ${hemY} L${short ? 44 : 48} ${hemY} Z`;
  return (
    <>
      <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={body} fill={p.pat} />
      {denim && <path d={body} fill="url(#twill)" opacity=".6" />}
      <path d="M56 16 L144 16 L145 30 L55 30 Z" fill={p.shade} stroke={p.edge} strokeWidth="1" />
      <path d="M56 26 L144 26" stroke={seam} strokeWidth="1" strokeDasharray="2.5 2" />
      {[66, 88, 112, 134].map((x) => <rect key={x} x={x - 2} y="14" width="4" height="18" rx="1" fill={p.fill} stroke={p.edge} strokeWidth=".7" />)}
      <circle cx="100" cy="23" r="3" fill={denim ? '#B98A4A' : p.button} stroke={p.edge} strokeWidth=".6" />
      <path d="M100 30 L100 70 Q100 78 90 78 L90 36" fill="none" stroke={seam} strokeWidth="1.1" strokeDasharray={denim ? '2.5 2' : '0'} />
      <path d="M57 38 Q74 44 78 30 M143 38 Q126 44 122 30" fill="none" stroke={seam} strokeWidth="1.2" strokeDasharray={denim ? '2.5 2' : '0'} />
      {denim && <path d="M126 32 h10 v10 h-10 Z" fill="none" stroke={seam} strokeWidth="1" strokeDasharray="2 1.5" />}
      {!short && !denim && <path d="M74 40 L70 226 M126 40 L130 226" stroke={p.deep} strokeWidth="1" opacity=".5" />}
      {!short && <path d={`M49 ${hemY - 10} L91 ${hemY - 10} M109 ${hemY - 10} L151 ${hemY - 10}`} stroke={seam} strokeWidth="1" strokeDasharray="2.5 2" />}
      <path d={`M66 50 Q62 ${hemY / 2 + 40} 66 ${hemY - 6} M134 50 Q138 ${hemY / 2 + 40} 134 ${hemY - 6}`} fill="none" stroke={p.fold} strokeWidth="9" strokeLinecap="round" />
      <path d={`M80 60 Q78 ${hemY / 2 + 40} 82 ${hemY - 8} M120 60 Q122 ${hemY / 2 + 40} 118 ${hemY - 8}`} fill="none" stroke={p.hi} strokeWidth="7" strokeLinecap="round" opacity=".2" />
      {denim && !short && <path d="M60 170 q10 -4 22 0 M60 186 q10 -4 22 0 M118 168 q10 -4 22 0" fill="none" stroke={p.hi} strokeWidth="2" opacity=".2" />}
    </>
  );
}

function Dress({ p, slip }) {
  if (slip) {
    const body = 'M76 44 Q100 76 124 44 L128 96 Q134 150 164 232 Q100 240 36 232 Q66 150 72 96 Z';
    return (
      <>
        <path d="M78 46 L84 6 M122 46 L116 6" stroke={p.deep} strokeWidth="1.6" strokeLinecap="round" />
        <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
        <path d={body} fill={p.pat} />
        <path d="M76 44 Q100 76 124 44" fill="none" stroke={p.deep} strokeWidth="2" />
        <path d="M92 70 Q76 150 60 228 M110 72 Q124 150 142 228" fill="none" stroke={p.fold} strokeWidth="10" strokeLinecap="round" />
        <path d="M100 76 Q96 150 100 234" fill="none" stroke="url(#sheen)" strokeWidth="18" strokeLinecap="round" />
        <path d="M84 60 Q70 150 50 230" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".25" />
        <path d="M40 226 Q100 236 160 226" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2 2" />
      </>
    );
  }
  const body = 'M74 18 Q100 34 126 18 L150 30 L168 62 L148 72 L138 60 L132 104 Q148 170 170 230 Q100 240 30 230 Q52 170 68 104 L62 60 L52 72 L32 62 L50 30 Z';
  return (
    <>
      <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={body} fill={p.pat} />
      <path d="M74 18 Q100 42 126 18 Q100 30 74 18 Z" fill={p.deep} />
      <path d="M68 104 Q100 112 132 104" fill="none" stroke={p.deep} strokeWidth="2" />
      <path d="M68 104 Q100 112 132 104" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2 2" transform="translate(0 4)" />
      <path d="M34 60 L50 68 M166 60 L150 68" stroke={p.stitch} strokeWidth="1" strokeDasharray="2 2" />
      <path d="M86 112 L64 226 M100 114 L100 234 M116 112 L138 226" fill="none" stroke={p.fold} strokeWidth="10" strokeLinecap="round" />
      <path d="M92 114 L80 230 M108 114 L120 230" fill="none" stroke={p.hi} strokeWidth="6" strokeLinecap="round" opacity=".2" />
      <path d="M36 226 Q100 238 164 226" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
    </>
  );
}

// Shoes are drawn as a pair, in profile, one behind the other
function Shoe({ p, kind }) {
  const one = (dx, dy, back) => {
    const tone = back ? { fill: p.shadeFill, edge: p.edge } : { fill: p.fill, edge: p.edge };
    const t = `translate(${dx} ${dy})`;
    if (kind === 'sneakers') {
      return (
        <g transform={t}>
          <path d="M14 150 Q12 116 40 110 L70 100 Q84 84 104 88 L120 112 Q150 116 176 128 Q190 136 188 150 Z" fill={tone.fill} stroke={tone.edge} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M10 150 L190 150 Q192 164 178 166 L20 166 Q8 164 10 150 Z" fill={p.sole} stroke={p.edge} strokeWidth="1" />
          <path d="M14 156 L186 156" stroke={p.edge} strokeWidth=".6" strokeDasharray="3 2" opacity=".6" />
          <path d="M120 112 Q150 116 176 128 Q186 134 188 146 L150 146 Q140 124 120 112 Z" fill={p.shade} opacity=".7" />
          <path d="M74 104 L112 118 M80 98 L116 112 M86 94 L118 106" stroke={p.lace} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M14 150 Q14 124 34 116 L40 150 Z" fill={p.shade} opacity=".6" />
          <path d="M60 130 Q100 120 150 134" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
        </g>
      );
    }
    if (kind === 'boots') {
      return (
        <g transform={t}>
          <path d="M40 40 L96 40 L100 120 Q140 122 176 136 Q190 144 188 158 L20 158 Q24 110 40 40 Z" fill={tone.fill} stroke={tone.edge} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M16 158 L190 158 L190 170 L16 170 Z" fill={p.soleDark} stroke={p.edge} strokeWidth="1" />
          <path d="M20 158 L20 176 L48 176 L48 170" fill={p.soleDark} />
          <path d="M40 40 L96 40 L97 50 L39 50 Z" fill={p.shade} />
          <path d="M60 50 L64 130" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
          <path d="M100 120 Q140 122 176 136" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
          <path d="M46 60 Q42 110 36 150" fill="none" stroke={p.hi} strokeWidth="6" strokeLinecap="round" opacity=".2" />
        </g>
      );
    }
    if (kind === 'heels') {
      return (
        <g transform={t}>
          <path d="M34 100 Q40 88 60 96 Q100 116 150 134 Q176 142 184 156 L150 160 Q110 150 80 128 Q60 118 50 124 Z" fill={tone.fill} stroke={tone.edge} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M34 100 L40 170 L46 170 L50 124" fill={p.soleDark} stroke={p.edge} strokeWidth="1" />
          <path d="M150 160 L186 158" stroke={p.edge} strokeWidth="3" strokeLinecap="round" />
          <path d="M60 104 Q100 120 150 138" fill="none" stroke={p.hi} strokeWidth="3" opacity=".2" />
        </g>
      );
    }
    if (kind === 'sandals') {
      return (
        <g transform={t}>
          <path d="M16 150 L186 150 Q192 162 180 166 L22 166 Q10 162 16 150 Z" fill={p.soleDark} stroke={p.edge} strokeWidth="1" />
          <path d="M40 150 Q60 118 90 150 M110 150 Q130 116 160 150 M60 130 Q100 118 140 130" fill="none" stroke={tone.fill} strokeWidth="9" strokeLinecap="round" />
          <path d="M40 150 Q60 118 90 150 M110 150 Q130 116 160 150" fill="none" stroke={p.edge} strokeWidth="1" />
        </g>
      );
    }
    // loafers
    return (
      <g transform={t}>
        <path d="M16 148 Q14 118 40 112 Q70 106 100 108 Q150 110 178 126 Q192 136 188 148 Z" fill={tone.fill} stroke={tone.edge} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M12 148 L190 148 Q190 158 180 160 L18 160 Q10 158 12 148 Z" fill={p.soleDark} stroke={p.edge} strokeWidth="1" />
        <path d="M14 148 L14 164 L40 164 L40 158" fill={p.soleDark} />
        <path d="M100 108 Q150 110 178 126 Q140 128 110 126 Q98 120 100 108 Z" fill={p.shade} stroke={p.edge} strokeWidth=".8" />
        <path d="M112 118 L150 124" stroke={p.edge} strokeWidth="3" strokeLinecap="round" />
        <path d="M122 120 L138 122" stroke={p.deep} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M30 124 Q80 116 120 128" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
        <path d="M40 118 Q70 112 96 114" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".3" />
      </g>
    );
  };
  return (
    <g transform={kind === 'boots' ? 'translate(-6 -22) scale(1.06)' : 'translate(-14 -58) scale(1.14)'}>
      {one(-6, 22, true)}
      {one(10, 50, false)}
    </g>
  );
}

function Accessory({ p, kind }) {
  if (kind === 'scarf') {
    return (
      <>
        <path d="M60 20 Q100 40 140 20 L150 60 Q130 90 128 150 L118 230 L92 226 L100 150 Q100 100 78 70 Z" fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M60 20 Q100 40 140 20 L150 60 Q130 90 128 150 L118 230 L92 226 L100 150 Q100 100 78 70 Z" fill={p.pat} />
        <path d="M78 70 Q60 110 52 200 L78 204 Q84 130 100 100 Z" fill={p.shadeFill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${54 + i * 3.2} ${201 + i * 0.4} l-1 12`} stroke={p.deep} strokeWidth="1.2" />)}
        {Array.from({ length: 8 }, (_, i) => <path key={`b${i}`} d={`M${94 + i * 3.1} ${226 + i * 0.4} l0 12`} stroke={p.deep} strokeWidth="1.2" />)}
        <path d="M110 60 Q106 120 110 220" fill="none" stroke="url(#sheen)" strokeWidth="12" strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'cap') {
    return (
      <g transform="translate(0 30)">
        <path d="M40 120 Q40 50 100 46 Q160 50 160 120 Z" fill={p.fill} stroke={p.edge} strokeWidth="1.2" />
        <path d="M40 120 Q100 110 196 132 Q170 150 120 140 Q70 132 40 128 Z" fill={p.shade} stroke={p.edge} strokeWidth="1" />
        <path d="M100 46 L100 120 M70 54 Q66 90 66 118 M130 54 Q134 90 134 118" stroke={p.stitch} strokeWidth="1" strokeDasharray="2 2" fill="none" />
        <circle cx="100" cy="46" r="4" fill={p.shade} stroke={p.edge} strokeWidth=".8" />
      </g>
    );
  }
  if (kind === 'belt') {
    return (
      <g transform="translate(0 70)">
        <path d="M10 70 Q100 20 190 70 L190 90 Q100 40 10 90 Z" fill={p.fill} stroke={p.edge} strokeWidth="1.2" />
        <path d="M14 76 Q100 30 186 76" fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
        <rect x="84" y="36" width="32" height="30" rx="4" fill="none" stroke="#B9A36A" strokeWidth="5" />
        <path d="M100 40 L100 62" stroke="#B9A36A" strokeWidth="3" />
      </g>
    );
  }
  // tote
  const body = 'M36 80 L164 80 L178 224 L22 224 Z';
  return (
    <>
      <path d="M64 84 Q64 22 100 22 Q136 22 136 84" fill="none" stroke={p.deep} strokeWidth="9" strokeLinecap="round" />
      <path d="M64 84 Q64 22 100 22 Q136 22 136 84" fill="none" stroke={p.fill} strokeWidth="6" strokeLinecap="round" />
      <path d={body} fill={p.fill} stroke={p.edge} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={body} fill={p.pat} />
      <path d="M36 80 L164 80 L165 94 L35 94 Z" fill={p.shade} />
      <path d="M40 98 L160 98 M28 214 L172 214" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
      <path d="M58 94 L54 224 M142 94 L146 224" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />
      <rect x="60" y="80" width="10" height="22" rx="2" fill={p.shade} stroke={p.edge} strokeWidth=".8" />
      <rect x="130" y="80" width="10" height="22" rx="2" fill={p.shade} stroke={p.edge} strokeWidth=".8" />
      <path d="M70 110 Q62 170 66 220" fill="none" stroke={p.hi} strokeWidth="10" strokeLinecap="round" opacity=".2" />
      <path d="M130 110 Q138 170 134 220" fill="none" stroke={p.fold} strokeWidth="10" strokeLinecap="round" />
    </>
  );
}

// ---------- palette derived from one colour ----------
function paletteFor(color, id) {
  const lum = luminance(color);
  const veryLight = lum > 0.82;
  const veryDark = lum < 0.18;
  return {
    fill: `url(#${id}-body)`,
    shadeFill: darken(color, 0.16),
    pat: `url(#${id}-pat)`,
    edge: veryLight ? darken(color, 0.38) : darken(color, 0.42),
    shade: darken(color, veryDark ? 0.25 : 0.1),
    deep: darken(color, 0.32),
    light: lighten(color, veryLight ? 0.1 : 0.14),
    hi: veryDark ? lighten(color, 0.3) : lighten(color, 0.55),
    fold: veryDark ? 'rgba(0,0,0,.22)' : 'rgba(40,25,10,.08)',
    stitch: veryDark ? lighten(color, 0.35) : darken(color, 0.35),
    contrast: '#C98A3A',
    button: veryDark ? lighten(color, 0.2) : darken(color, 0.25),
    lace: veryLight ? darken(color, 0.25) : lighten(color, 0.85),
    sole: '#F4F1EA',
    soleDark: darken(color, 0.55),
  };
}

export default function GarmentArt({ item, className = '', title }) {
  const color = /^#?[0-9a-f]{6}$/i.test(item.color || '') ? item.color : '#D8C7A6';
  const kind = garmentKind(item);
  const id = `g${item.id ?? ''}${hashStr(`${item.name}${color}${kind}`)}`;
  const p = paletteFor(color, id);
  const pattern = patternOf(item.name);
  const veryDark = luminance(color) < 0.18;
  const accentInk = veryDark ? lighten(color, 0.45) : darken(color, 0.45);

  let drawing;
  if (kind === 'tee') drawing = <Tee p={p} />;
  else if (kind === 'shirt') drawing = <Shirt p={p} overshirt={/overshirt|shacket|flannel/i.test(item.name || '')} />;
  else if (kind === 'sweater') drawing = <Sweater p={p} />;
  else if (kind === 'jacket') drawing = <Jacket p={p} denim={/denim|jean/i.test(item.name || '')} />;
  else if (kind === 'blazer') drawing = <Jacket p={p} blazer />;
  else if (kind === 'coat') drawing = <Coat p={p} />;
  else if (['jeans', 'trousers', 'shorts', 'skirt'].includes(kind)) drawing = <Bottoms p={p} kind={kind} />;
  else if (kind === 'slip') drawing = <Dress p={p} slip />;
  else if (kind === 'dress') drawing = <Dress p={p} />;
  else if (['sneakers', 'loafers', 'boots', 'heels', 'sandals'].includes(kind)) drawing = <Shoe p={p} kind={kind} />;
  else drawing = <Accessory p={p} kind={kind} />;

  return (
    <svg viewBox="0 0 200 250" className={`cutout garment-art ${className}`} role="img" aria-label={title || item.name} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={lighten(color, veryDark ? 0.14 : 0.16)} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={darken(color, 0.16)} />
        </linearGradient>
        {pattern === 'floral' && (
          <pattern id={`${id}-pat`} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
            <g fill={lighten(color, 0.6)} opacity=".85"><circle cx="6" cy="6" r="2.6" /><circle cx="9" cy="4" r="2.2" /><circle cx="9" cy="8" r="2.2" /><circle cx="3.5" cy="4.5" r="2" /><circle cx="4" cy="8.5" r="2" /></g>
            <circle cx="6.4" cy="6.2" r="1.3" fill={accentInk} />
            <path d="M18 18 q3 -5 6 0 q-3 5 -6 0 Z" fill={darken(color, 0.3)} opacity=".55" />
          </pattern>
        )}
        {pattern === 'stripe' && (
          <pattern id={`${id}-pat`} width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="4" y="4" fill={veryDark ? lighten(color, 0.7) : darken(color, 0.5)} opacity=".7" /></pattern>
        )}
        {pattern === 'check' && (
          <pattern id={`${id}-pat`} width="22" height="22" patternUnits="userSpaceOnUse">
            <rect width="22" height="7" fill={darken(color, 0.35)} opacity=".35" /><rect width="7" height="22" fill={darken(color, 0.35)} opacity=".35" />
            <path d="M0 15 H22 M15 0 V22" stroke={lighten(color, 0.6)} strokeWidth="1" opacity=".6" />
          </pattern>
        )}
        {pattern === 'dots' && (
          <pattern id={`${id}-pat`} width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2.3" fill={veryDark ? '#fff' : darken(color, 0.55)} opacity=".75" /></pattern>
        )}
        {!pattern && <pattern id={`${id}-pat`} width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="none" /></pattern>}
        <pattern id="twill" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="6" height="2" fill="#fff" opacity=".16" /><rect y="3" width="6" height="1" fill="#000" opacity=".12" />
        </pattern>
        <pattern id="knit" width="8" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 0 L4 5 L8 0 M0 5 L4 10 L8 5" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth="1" />
        </pattern>
        <pattern id="wool" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".7" fill="#fff" opacity=".18" /><circle cx="3.5" cy="3" r=".6" fill="#000" opacity=".12" />
        </pattern>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {drawing}
    </svg>
  );
}
