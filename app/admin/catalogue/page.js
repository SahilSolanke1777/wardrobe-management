import { requireAdmin } from '@/lib/auth';
import { loadCatalogue } from '@/lib/catalogue';
import CatalogueReview from '@/components/CatalogueReview';

export const metadata = { title: 'Catalogue — Hanger admin' };

export default async function AdminCatalogue() {
  await requireAdmin();
  const entries = loadCatalogue().map(({ photo, cutout, best, dataset, label, colour, alt, hidden }) => ({ photo, cutout, best, dataset, label, colour, alt, hidden }));
  const cuts = entries.filter((e) => e.cutout).length;
  return (
    <>
      <div>
        <h1 style={{ fontSize: 28 }}>Catalogue</h1>
        <p className="sub">
          {entries.length} Pexels photos · {cuts} with clean cut-outs. Hide anything that&apos;s the wrong item, shows a logo, or looks messy — hidden photos
          disappear from the “Browse the catalogue” picker. {entries.length === 0 && 'No dataset yet: run python cloths/fetch_pexels.py.'}
        </p>
      </div>
      <CatalogueReview entries={entries} />
    </>
  );
}
