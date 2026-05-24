function withAuthHeaders(
  headers: HeadersInit | undefined,
  token: string,
): HeadersInit {
  const next = new Headers(headers);
  next.set("Authorization", `Bearer ${token}`);
  return next;
}

export default defineNuxtPlugin({
  name: "api-auth",
  enforce: "pre",
  setup() {
    const token = useAuthCookie();

    const authFetch = $fetch.create({
      onRequest({ options }) {
        if (!token.value) return;
        options.headers = withAuthHeaders(
          options.headers as HeadersInit | undefined,
          token.value,
        );
      },
    });

    globalThis.$fetch = authFetch;

    return {
      provide: {
        authToken: token,
        authFetch,
      },
    };
  },
});
