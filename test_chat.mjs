import { createServerClient } from '@supabase/ssr';
import { loadOperatorEnv } from './scripts/operator-env.mjs';

loadOperatorEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.TEST_CHAT_EMAIL;
const password = process.env.TEST_CHAT_PASSWORD;
const appUrl = (process.env.TEST_CHAT_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const message = process.env.TEST_CHAT_MESSAGE ?? 'What are the clinic hours?';

if (!supabaseUrl || !supabaseKey || !email || !password) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, TEST_CHAT_EMAIL, and TEST_CHAT_PASSWORD for an externally configured synthetic account.');
}

const cookieJar = new Map();
const supabase = createServerClient(supabaseUrl, supabaseKey, {
  cookies: {
    getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => {
      for (const { name, value } of cookies) cookieJar.set(name, value);
    },
  },
});

const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) throw new Error(`Synthetic account sign-in failed: ${signInError.message}`);

const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) throw new Error('Supabase did not verify the synthetic account session.');

const response = await fetch(`${appUrl}/api/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; '),
  },
  body: JSON.stringify({ messages: [{ role: 'user', content: message }] }),
});

console.log('Response status:', response.status);
console.log('Response body:', await response.text());
