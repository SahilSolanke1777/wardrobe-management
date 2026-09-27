import { ZONES, boxFor } from '@/lib/wardrobe';
import { Cutout } from './Garment';

// A still life of an outfit laid out on the table (server-rendered, no interaction)
export default function Composition({ slots, byId, className = '' }) {
  const topIsDress = slots.top != null && byId[slots.top]?.category === 'Dresses';
  return (
    <div className={`stage ${className}`} style={{ touchAction: 'auto' }}>
      {ZONES.map((z, i) => {
        const item = slots[z.key] != null ? byId[slots[z.key]] : null;
        if (!item) return null;
        const [l, t, w, h] = boxFor(z.key, topIsDress);
        return (
          <div key={z.key} className="zone" style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, zIndex: z.z + 5 }}>
            <div className="piece" style={{ cursor: 'default', animation: `drop-in 700ms var(--spring) both`, animationDelay: `${i * 90 + 150}ms` }}>
              <Cutout item={item} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
