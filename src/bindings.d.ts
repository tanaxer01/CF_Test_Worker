export {};

declare global {
  const ELASTIC_APM_SERVER_URL: string;
  const MY_ENV_VAR: string;
  const MY_SECRET: string;
  const myKVNamespace: KVNamespace;
}
