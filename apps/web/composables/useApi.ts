import type { Ref, WatchSource } from "vue";
import type { UseFetchOptions } from "nuxt/app";

import type { AppUser } from "@yowell/shared";

const AUTH_COOKIE = "yowell-auth";
/** Durée de session alignée sur le JWT API (24 h) */
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24;

export function useAuthCookie() {
  return useCookie<string | null>(AUTH_COOKIE, {
    maxAge: AUTH_SESSION_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });
}

function httpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "statusCode" in error) {
    return (error as { statusCode?: number }).statusCode;
  }
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }
  return undefined;
}

export function clearAuthSession() {
  const token = useAuthCookie();
  token.value = null;
  useState<AppUser | null>("auth-user").value = null;
}

/** Session expirée ou invalide → déconnexion et page login */
export function handleUnauthorized(error: unknown): boolean {
  if (httpStatus(error) !== 401) return false;
  const token = useAuthCookie();
  if (!token.value) return false;
  clearAuthSession();
  if (import.meta.client) {
    navigateTo("/login");
  }
  return true;
}

/** Token accessible depuis les callbacks async (hors setup) */
export function useAuthToken(): Ref<string | null> {
  return useNuxtApp().$authToken as Ref<string | null>;
}

export function useApiBase() {
  const config = useRuntimeConfig();
  return config.public.apiBase as string;
}

export function useApiOrigin() {
  const config = useRuntimeConfig();
  return config.public.apiOrigin as string;
}

export function useApiUrl(path: string) {
  const base = useApiBase();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** URL absolue pour les fichiers uploadés (photos produits, etc.) */
export function useUploadUrl(path: string) {
  const origin = useApiOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function withAuthHeaders(
  headers: HeadersInit | undefined,
  token: string | null | undefined,
): HeadersInit {
  if (!token) return headers ?? {};
  const next = new Headers(headers);
  next.set("Authorization", `Bearer ${token}`);
  return next;
}

/** $fetch avec jeton JWT — fonctionne aussi dans useAsyncData */
type ApiFetchOptions<T> = Parameters<typeof $fetch<T>>[1] & {
  autoReload?: boolean;
};

export function apiFetch<T>(
  url: string,
  options: ApiFetchOptions<T> = {},
) {
  const token = useAuthToken();
  const { autoReload = true, ...fetchOptions } = options;

  const requestMethod = String(fetchOptions.method ?? "GET").toUpperCase();
  const shouldReload =
    autoReload &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(requestMethod);

  return $fetch<T>(url, {
    ...fetchOptions,
    headers: withAuthHeaders(
      fetchOptions.headers as HeadersInit | undefined,
      token.value,
    ),
  })
    .then((result) => {
      if (shouldReload && import.meta.client) {
        window.location.reload();
      }
      return result;
    })
    .catch((error) => {
      handleUnauthorized(error);
      throw error;
    });
}

/** useFetch avec jeton JWT */
export function useApiFetch<T>(
  url: string | (() => string),
  options: UseFetchOptions<T> = {},
) {
  const token = useAuthToken();

  return useFetch<T>(url, {
    ...options,
    onRequest({ options: reqOptions }) {
      if (token.value) {
        reqOptions.headers = withAuthHeaders(
          reqOptions.headers as HeadersInit | undefined,
          token.value,
        );
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        handleUnauthorized({ statusCode: 401 });
      }
    },
  });
}

/** Chargement client fiable */
export function useApiAsyncData<T>(
  key: string,
  url: () => string,
  watchSources: WatchSource[] = [],
) {
  return useAsyncData<T>(
    key,
    () => apiFetch<T>(url()),
    {
      watch: watchSources,
      server: false,
    },
  );
}
