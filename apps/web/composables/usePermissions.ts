import type { AppModulePermission } from "@yowell/shared";
import {
  formatPermissionList,
  permissionForRoute,
  userCanMutate,
} from "@yowell/shared";

export function usePermissions() {
  const { user } = useAuth();

  function can(module: AppModulePermission): boolean {
    return userCanMutate(user.value, module);
  }

  return {
    user,
    can,
    isAdmin: computed(() => user.value?.role === "admin"),
    permissionSummary: computed(() => {
      if (!user.value) return "";
      if (user.value.role === "admin") return "Administrateur — accès complet";
      return formatPermissionList(user.value.permissions);
    }),
  };
}

/** Droits d'écriture pour le module de la page courante (ou module passé). */
export function useModulePermission(module?: AppModulePermission) {
  const route = useRoute();
  const { can, user } = usePermissions();

  const resolvedModule = computed(() => {
    if (module) return module;
    return permissionForRoute(route.path);
  });

  const canWrite = computed(() => {
    const mod = resolvedModule.value;
    if (!mod) return true;
    return can(mod);
  });

  const readOnly = computed(() => {
    const mod = resolvedModule.value;
    if (!mod) return false;
    return !can(mod);
  });

  return {
    user,
    module: resolvedModule,
    canWrite,
    readOnly,
    can,
  };
}
