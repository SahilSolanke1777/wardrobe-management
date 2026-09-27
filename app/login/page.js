import Link from 'next/link';
import { redirect } from 'next/navigation';
import { login } from '@/app/actions/auth';
import { getUser } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Log in — Hanger' };

export default async function LoginPage({ searchParams }) {
  if (await getUser()) redirect('/today');
  const { error } = await searchParams;
  return (
    <AuthShell>
      <form action={login}>
        <h1 className="display-sm">Welcome back</h1>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
        <p className="muted small">New here? <Link href="/signup">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}
