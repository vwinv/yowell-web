export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") return;

  const { token, user, fetchMe } = useAuth();

  if (!token.value) {
    return navigateTo("/login");
  }

  if (!user.value) {
    const me = await fetchMe();
    if (!me) {
      return navigateTo("/login");
    }
  }
});
