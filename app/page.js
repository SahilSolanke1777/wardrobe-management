import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import Landing from '@/components/landing/Landing';
import TiltLayer from '@/components/TiltLayer';

export default async function Home() {
  const user = await getUser();
  if (user) redirect('/today');
  return (
    <>
      <Landing />
      <TiltLayer />
    </>
  );
}
