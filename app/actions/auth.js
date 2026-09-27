'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';

function fail(path, msg) {
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
}

export async function signup(formData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  if (!name) fail('/signup', 'Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('/signup', 'Please enter a valid email.');
  if (password.length < 8) fail('/signup', 'Password must be at least 8 characters.');
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) fail('/signup', 'An account with that email already exists.');
  // The very first account becomes the admin
  const count = await prisma.user.count();
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: count === 0 ? 'ADMIN' : 'USER' },
  });
  await createSession(user.id);
  redirect('/today');
}

export async function login(formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) fail('/login', 'Wrong email or password.');
  if (user.status !== 'ACTIVE') fail('/login', 'This account has been suspended. Contact the site admin.');
  await createSession(user.id);
  redirect(user.role === 'ADMIN' && formData.get('next') === 'admin' ? '/admin' : '/today');
}

export async function logout() {
  await destroySession();
  redirect('/login');
}
