// VAPID Web Push Public & Private Key Helper

export const DEFAULT_VAPID_PUBLIC_KEY = 
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
  'BEl62iUYgUivxIkv69yViEuiBIa45bB5n5mPzP_BfV6O8_7B4Q8L0q4Vf_B-g7v8A3k4j5l6m7n8o9p0q1r2s3t';

export const DEFAULT_VAPID_PRIVATE_KEY = 
  process.env.VAPID_PRIVATE_KEY || 
  's3c-r3t-v4p1d-pr1v4t3-k3y-h4b1t-tr4ck3r';

export function getVapidPublicKey(): string {
  if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return (window as any).__NEXT_DATA__.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
}
