import { createAuthClient } from '@neondatabase/auth'

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_BASE_URL || process.env.NEON_AUTH_BASE_URL || 'https://ep-lucky-pond-az0mvcxc.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth'

export const neonAuth = createAuthClient(authUrl)

export function onboardingStorageKey(userId: string) {
  return `evspark:onboarding-complete:${userId}`
}
