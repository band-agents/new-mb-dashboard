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
  shopify: {
    clientId: process.env.SHOPIFY_CLIENT_ID ?? "",
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET ?? "",
    apiVersion: process.env.SHOPIFY_API_VERSION ?? "2024-10",
    redirectUri: process.env.SHOPIFY_REDIRECT_URI ?? "",
    scopes: process.env.SHOPIFY_SCOPES ?? "read_orders,read_customers",
  },
};

/** True once real Meta App credentials have been configured. */
export const isMetaConfigured = () => Boolean(env.meta.appId && env.meta.appSecret);

/** True once a real Shopify Partner app (Client ID/Secret) has been configured. */
export const isShopifyConfigured = () => Boolean(env.shopify.clientId && env.shopify.clientSecret);
