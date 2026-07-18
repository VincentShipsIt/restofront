import type { RestaurantDraft } from "@/lib/restaurant";

const lePetitMeunier: RestaurantDraft = {
  slug: "le-petit-meunier",
  name: "Le Petit Meunier",
  eyebrow: "Cuisine de saison · Messimy",
  description:
    "À Messimy, Le Petit Meunier marie tradition française et cuisine gastronomique dans une maison chaleureuse, avec des produits de saison et des menus qui évoluent au fil du marché.",
  cuisine: "Cuisine française gastronomique",
  address: "12 chemin des Moulins, 69510 Messimy",
  phone: "04 78 45 05 03",
  sourceUrl: "https://www.lepetitmeunier.com/",
  heroImageUrl: "https://www.lepetitmeunier.com/s/img/emotionheader.JPG",
  palette: {
    background: "#f4f0e6",
    foreground: "#1f2923",
    accent: "#9a4f32",
  },
  menuSections: [
    {
      name: "Formules du jour",
      description: "Servies du mardi au vendredi midi",
      items: [
        {
          name: "Menu complet",
          description: "Entrée, plat, dessert, apéritif maison et quart de vin",
          price: 32,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Menu du jour",
          description: "Entrée, plat et dessert",
          price: 25,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Formule deux services",
          description: "Entrée et plat, ou plat et dessert",
          price: 22,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Plat du jour",
          description: "La suggestion du chef selon le marché",
          price: 17,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
      ],
    },
    {
      name: "Entrées",
      description: "À la carte le soir, le week-end et les jours fériés",
      items: [
        {
          name: "Panna cotta de parmesan",
          description: "Effiloché de joue de bœuf, roquette",
          price: 16,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl:
            "/images/le-petit-meunier/panna-cotta-parmesan.webp",
        },
        {
          name: "Roulé d’aubergine et ricotta",
          description: "Crémeux de poivron rouge, crumble",
          price: 16,
          currency: "EUR",
          dietaryLabels: ["vegetarian"],
          imageUrl: null,
        },
        {
          name: "Tataki de veau",
          description:
            "Artichaut, caviar de tomate confite, câpres croustillantes",
          price: 20,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Terrine de foie gras de canard mi-cuit",
          description:
            "Magret fumé, pain aux graines de courge, chutney de rhubarbe",
          price: 20,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Tartare de thon",
          description:
            "Radis, avocat, vinaigrette légère aux fruits de la passion",
          price: 20,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
      ],
    },
    {
      name: "Plats",
      description: "Cuisine du marché et produits de saison",
      items: [
        {
          name: "Curry de lentilles corail",
          description: "Asperges, morilles, espuma de courgette",
          price: 22,
          currency: "EUR",
          dietaryLabels: ["vegetarian"],
          imageUrl: null,
        },
        {
          name: "Tataki de saumon au sésame",
          description: "Galette de riz japonais, crème de petits pois",
          price: 22,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: "/images/le-petit-meunier/salmon-tataki.webp",
        },
        {
          name: "Gambas grillées",
          description:
            "Arancini au safran, légumes, coulis de carotte à l’ail",
          price: 27,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Cœur de ris de veau poêlé",
          description:
            "Pommes grenailles, oignon doux rôti, petits légumes, jus corsé",
          price: 27,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Magret de canard rôti",
          description: "Épices Dukkah, aubergine, panisse, jus réduit",
          price: 27,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: "/images/le-petit-meunier/duck-breast.webp",
        },
        {
          name: "Faux-filet de Wagyu",
          description:
            "100 g, pommes de terre au paprika, asperge, morille, sauce Larme du Tigre",
          price: 45,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
      ],
    },
    {
      name: "Desserts",
      description: "Créations maison · 9 €",
      items: [
        {
          name: "Tartelette au chocolat au lait",
          description: "Crémeux vanille",
          price: 9,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Pavlova aux fraises",
          description: "Tartare de fraise, tuile cacao",
          price: 9,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl:
            "/images/le-petit-meunier/strawberry-pavlova.webp",
        },
        {
          name: "Sphère en chocolat noir",
          description:
            "Ananas frais, sorbet ananas, caramel à la fleur de sel",
          price: 9,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Pomme Granny Smith revisitée",
          description: "Mousse vanille, streusel petit beurre",
          price: 9,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
        {
          name: "Assiette de sorbets maison",
          description: "Cinq parfums suivant le marché",
          price: 9,
          currency: "EUR",
          dietaryLabels: [],
          imageUrl: null,
        },
      ],
    },
  ],
  integrations: [
    {
      type: "booking",
      label: "Réserver une table",
      provider: "Zenchef",
      url: "https://bookings.zenchef.com/results?rid=363961&lang=fr",
    },
    {
      type: "social",
      label: "Voir sur Instagram",
      provider: "Instagram",
      url: "https://www.instagram.com/lepetitmeunier/",
    },
  ],
};

export const leadDrafts: Record<string, RestaurantDraft> = {
  [lePetitMeunier.slug]: lePetitMeunier,
  "restaurant-le-petit-meunier": lePetitMeunier,
};
