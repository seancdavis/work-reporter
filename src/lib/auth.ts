import { createAuthClient } from "@neondatabase/neon-js/auth";

// Use same-domain proxy in production for mobile ITP compatibility
const getAuthUrl = () => {
  if (import.meta.env.PROD) {
    return `${window.location.origin}/neon-auth`;
  }
  return import.meta.env.VITE_NEON_AUTH_URL;
};

export const authClient = createAuthClient(getAuthUrl());
