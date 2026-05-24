export type NavIcon =
  | "chart"
  | "box"
  | "wallet"
  | "truck"
  | "users"
  | "cart"
  | "history"
  | "shield";

export type NavItem = {
  label: string;
  to: string;
  icon: NavIcon;
  description: string;
  adminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    id: "activite",
    title: "Activité",
    items: [
      {
        label: "Statistiques",
        to: "/",
        icon: "chart",
        description: "Ventes & production",
      },
      {
        label: "Ventes",
        to: "/ventes",
        icon: "cart",
        description: "Commandes clients",
      },
      {
        label: "Courses",
        to: "/courses",
        icon: "truck",
        description: "Tournées & livraisons",
      },
    ],
  },
  {
    id: "gestion",
    title: "Gestion",
    items: [
      {
        label: "Clients",
        to: "/clients",
        icon: "users",
        description: "Fichier clients",
      },
      {
        label: "Stock",
        to: "/stock",
        icon: "box",
        description: "Produits & production",
      },
      {
        label: "Comptabilité",
        to: "/comptabilite",
        icon: "wallet",
        description: "Entrées & sorties",
      },
    ],
  },
  {
    id: "systeme",
    title: "Système",
    items: [
      {
        label: "Journal",
        to: "/journal",
        icon: "history",
        description: "Historique des actions",
      },
      {
        label: "Utilisateurs",
        to: "/utilisateurs",
        icon: "shield",
        description: "Comptes & accès",
        adminOnly: true,
      },
    ],
  },
];

export const navigation = navGroups.flatMap((group) => group.items);
