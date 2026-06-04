export type AppModulePermission =
  | "comptabilite"
  | "stock"
  | "course"
  | "vente_clients";

export const ALL_MODULE_PERMISSIONS: AppModulePermission[] = [
  "comptabilite",
  "stock",
  "course",
  "vente_clients",
];

export const MODULE_PERMISSION_OPTIONS: {
  value: AppModulePermission;
  label: string;
  description: string;
}[] = [
  {
    value: "comptabilite",
    label: "Comptabilité",
    description: "Saisies, caisse et soldes d'ouverture",
  },
  {
    value: "stock",
    label: "Stock",
    description: "Produits, catalogue et production",
  },
  {
    value: "course",
    label: "Courses",
    description: "Tournées et livraisons",
  },
  {
    value: "vente_clients",
    label: "Ventes & clients",
    description: "Commandes, devis et fichier clients",
  },
];

export function permissionLabel(permission: AppModulePermission): string {
  return (
    MODULE_PERMISSION_OPTIONS.find((o) => o.value === permission)?.label ??
    permission
  );
}

export function formatPermissionList(
  permissions: AppModulePermission[],
): string {
  if (!permissions.length) return "Consultation seule";
  return permissions.map(permissionLabel).join(", ");
}

export type PermissionUser = {
  role: "admin" | "staff";
  permissions: AppModulePermission[];
};

export function userCanMutate(
  user: PermissionUser | null | undefined,
  module: AppModulePermission,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes(module);
}

/** Route Nuxt → permission requise pour les actions d'écriture. */
export function permissionForRoute(path: string): AppModulePermission | null {
  if (path.startsWith("/comptabilite")) return "comptabilite";
  if (path.startsWith("/stock")) return "stock";
  if (path.startsWith("/courses")) return "course";
  if (path.startsWith("/ventes") || path.startsWith("/clients")) {
    return "vente_clients";
  }
  return null;
}

/** Chemin API → permission pour POST/PATCH/PUT/DELETE. */
export function permissionForApiPath(path: string): AppModulePermission | null {
  const base = path.split("?")[0] ?? path;
  if (base.startsWith("/api/accounting")) return "comptabilite";
  if (base.startsWith("/api/stock")) return "stock";
  if (base.startsWith("/api/deliveries")) return "course";
  if (base.startsWith("/api/sales") || base.startsWith("/api/clients")) {
    return "vente_clients";
  }
  return null;
}
