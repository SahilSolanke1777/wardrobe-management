import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signup } from '@/app/actions/auth';
import { getUser } from '@/lib/auth';
import AuthShell from '@/components/AuthShell';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Sign up — Hanger' };

export default async function SignupPage({ searchParams }) {
  if (await getUser()) redirect('/today');
  const { error } = await searchParams;
  return (
    <AuthShell>
      <form action={signup}>
        <h1 className="display-sm">Create your closet</h1>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="name">Name</label>
          <input className="input" id="name" name="name" autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
          <span className="muted small">At least 8 characters.</span>
        </div>
        <SubmitButton pendingText="Creating…">Sign up</SubmitButton>
        <p className="muted small">Already have an account? <Link href="/login">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
