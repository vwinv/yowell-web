import type { AppUser, AuthResponse, LoginInput } from "@yowell/shared";

export function useAuth() {
  const token = useAuthCookie();
  const user = useState<AppUser | null>("auth-user", () => null);

  const isAuthenticated = computed(() => Boolean(token.value));
  const isAdmin = computed(() => user.value?.role === "admin");

  async function fetchMe() {
    if (!token.value) {
      user.value = null;
      return null;
    }
    try {
      user.value = await apiFetch<AppUser>(useApiUrl("/auth/me"));
      return user.value;
    } catch {
      return null;
    }
  }

  async function login(input: LoginInput) {
    const response = await $fetch<AuthResponse>(useApiUrl("/auth/login"), {
      method: "POST",
      body: input,
    });
    token.value = response.token;
    user.value = response.user;
    return response;
  }

  function logout() {
    token.value = null;
    user.value = null;
    navigateTo("/login");
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    fetchMe,
    login,
    logout,
  };
}
