// Central place to read server-only environment configuration.
// Nothing in this file may be imported from a Client Component.

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "",
  meta: {
    appId: process.env.META_APP_ID ?? "",
    appSecret: process.env.META_APP_SECRET ?? "",
    apiVersion: process.env.META_API_VERSION ?? "v21.0",
    redirectUri: process.env.META_REDIRECT_URI ?? "",
  },
};

/** True once real Meta App credentials have been configured. */
export const isMetaConfigured = () => Boolean(env.meta.appId && env.meta.appSecret);
