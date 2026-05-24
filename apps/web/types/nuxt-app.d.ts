import type { Ref } from "vue";

declare module "#app" {
  interface NuxtApp {
    $authToken: Ref<string | null>;
    $authFetch: typeof globalThis.$fetch;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $authToken: Ref<string | null>;
    $authFetch: typeof globalThis.$fetch;
  }
}

export {};
