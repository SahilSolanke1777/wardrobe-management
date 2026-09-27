import { tintOf } from '@/lib/wardrobe';
import { photoSrc } from '@/lib/catalogue-shared';
import GarmentArt from './GarmentArt';

// A garment as an object on paper.
//  - transparent cut-out (catalogue .png)  → sits directly on the paper with a contact shadow
//  - a photo with a background (.jpg / your uploads) → a framed photo card
//  - no photo → the illustrated drawing
export function Cutout({ item, className = '' }) {
  const src = photoSrc(item.photo);
  if (src) {
    const transparent = /\.png$/i.test(item.photo);
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={item.name} className={`cutout ${transparent ? 'cutout-png' : 'cutout-photo'} ${className}`} draggable={false} loading="lazy" decoding="async" />;
  }
  return <GarmentArt item={item} className={className} />;
}

// Legacy tile (a tinted card). Still used by the admin content page.
export default function Garment({ item, size = 140, height }) {
  const style = { background: tintOf(item.color), height: height ?? size + 60 };
  return (
    <div className="tile" style={style}>
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Cutout item={item} /></div>
    </div>
  );
}
