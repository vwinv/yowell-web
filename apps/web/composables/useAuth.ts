import type { AppUser, AuthResponse, LoginInput } from "@yowell/shared";
import { formatPermissionList } from "@yowell/shared";

export function useAuth() {
  const token = useAuthCookie();
  const user = useState<AppUser | null>("auth-user", () => null);

  const isAuthenticated = computed(() => Boolean(token.value));
  const isAdmin = computed(() => user.value?.role === "admin");
  const permissionSummary = computed(() => {
    if (!user.value) return "";
    if (user.value.role === "admin") return "Administrateur";
    return formatPermissionList(user.value.permissions);
  });

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
    permissionSummary,
    fetchMe,
    login,
    logout,
  };
}
