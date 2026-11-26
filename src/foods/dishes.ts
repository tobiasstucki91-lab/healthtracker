// ============================================================================
// KURATIERTE OFFLINE-GERICHTE- & RESTAURANT-DATENBANK (0 ms)
// ----------------------------------------------------------------------------
// Ergänzt Basis-DB & BLS 4.0 um beliebte Restaurant-, Imbiss- und
// internationale Gerichte inkl. realistischer Portionsgrößen.
// Alle Nährwerte pro 100 g; `portionGrams` & `portionLabel` dienen als
// 1-Tap-Portionsvorgabe im Grammatur-Rechner.
// ============================================================================

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9%,.]+/g, ' ')
    .trim();
}

export interface DishFood {
  id: string;
  name: string;
  brand: string;
  category: string;
  keywords: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingQuantity: number;
  servingSize: string;
  source: 'dish';
}

type DishRow = [
  id: string,
  name: string,
  category: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  portionGrams: number,
  portionLabel: string,
  keywords?: string,
];

const DISH_ROWS: DishRow[] = [
  // --- Asiatisch ---
  ['dish-pad-thai-chicken', 'Pad Thai mit Hähnchen', 'Asiatisch', 168, 9.5, 20.5, 5.2, 380, 'Teller', 'thai reisnudeln erdnüsse asiatisch'],
  ['dish-pad-thai-shrimp', 'Pad Thai mit Garnelen', 'Asiatisch', 158, 9.2, 20.8, 4.3, 380, 'Teller', 'thai reisnudeln scampi shrimps'],
  ['dish-pad-thai-tofu', 'Pad Thai mit Tofu (Vegetarisch)', 'Asiatisch', 162, 6.8, 21.5, 5.4, 380, 'Teller', 'thai reisnudeln veggie vegan'],
  ['dish-thai-curry-red', 'Rotes Thai-Curry mit Hähnchen & Reis', 'Asiatisch', 148, 8.2, 16.5, 5.5, 420, 'Teller', 'kokosmilch asiatisch scharf'],
  ['dish-thai-curry-green', 'Grünes Thai-Curry mit Hähnchen & Reis', 'Asiatisch', 144, 8.0, 16.0, 5.4, 420, 'Teller', 'kokosmilch asiatisch'],
  ['dish-thai-curry-veggie', 'Thai-Curry mit Gemüse, Tofu & Reis', 'Asiatisch', 132, 4.8, 17.2, 4.8, 420, 'Teller', 'kokosmilch vegan vegetarisch'],
  ['dish-fried-rice-chicken', 'Gebratener Reis mit Hähnchen & Ei', 'Asiatisch', 162, 8.5, 21.5, 4.6, 380, 'Teller', 'nasi goreng china asiatisch'],
  ['dish-fried-noodles-chicken', 'Gebratene Nudeln mit Hähnchen', 'Asiatisch', 175, 8.2, 22.8, 5.6, 380, 'Box', 'bami goreng china asiatisch mie nudeln'],
  ['dish-fried-noodles-veggie', 'Gebratene Nudeln mit Gemüse', 'Asiatisch', 156, 4.8, 23.5, 4.8, 350, 'Box', 'china asiatisch mie nudeln vegetarisch'],
  ['dish-pho-bo', 'Pho Bo (Vietnamesische Rindfleischsuppe)', 'Asiatisch', 78, 6.2, 9.8, 1.5, 550, 'Schüssel', 'vietnam reisnudeln suppe'],
  ['dish-ramen-tonkotsu', 'Ramen (Tonkotsu mit Schwein & Ei)', 'Asiatisch', 112, 6.4, 11.8, 4.4, 550, 'Schüssel', 'japan nudelsuppe'],
  ['dish-ramen-miso', 'Miso Ramen (Vegetarisch / Tofu)', 'Asiatisch', 88, 4.5, 11.5, 2.6, 550, 'Schüssel', 'japan nudelsuppe'],
  ['dish-sushi-maki-salmon', 'Sushi Maki Lachs (6 Stück)', 'Asiatisch', 148, 7.2, 24.5, 2.2, 140, 'Portion', 'japan sake maki'],
  ['dish-sushi-maki-avocado', 'Sushi Maki Avocado / Gurke (6 Stück)', 'Asiatisch', 142, 3.2, 25.5, 2.8, 140, 'Portion', 'japan kappa vegetarisch'],
  ['dish-sushi-inside-out', 'Sushi Inside-Out Roll (8 Stück)', 'Asiatisch', 172, 6.8, 25.0, 4.8, 220, 'Rolle', 'california roll philadelphia japan'],
  ['dish-sushi-nigiri-salmon', 'Sushi Nigiri Lachs', 'Asiatisch', 158, 9.2, 23.0, 3.2, 40, 'Stück', 'japan sake'],
  ['dish-poke-bowl-salmon', 'Poké Bowl mit Lachs & Reis', 'Asiatisch', 142, 8.8, 16.5, 4.4, 420, 'Bowl', 'poke hawaii avocado edamame'],
  ['dish-poke-bowl-chicken', 'Poké Bowl mit Hähnchen & Reis', 'Asiatisch', 136, 9.8, 16.8, 3.2, 420, 'Bowl', 'poke bowl teriyaki'],
  ['dish-bibimbap', 'Bibimbap (Koreanische Reis-Bowl)', 'Asiatisch', 145, 7.8, 19.5, 3.8, 450, 'Bowl', 'korea rind ei gochujang'],
  ['dish-summer-rolls', 'Sommerrollen (Reispapier mit Garnelen/Tofu)', 'Asiatisch', 118, 5.5, 19.0, 2.0, 90, 'Stück', 'vietnam glücksrollen'],
  ['dish-spring-rolls', 'Frühlingsrollen (frittiert)', 'Asiatisch', 235, 5.8, 27.0, 11.5, 75, 'Stück', 'asia china'],
  ['dish-gyoza', 'Gyoza / Teigtaschen (gebraten)', 'Asiatisch', 195, 8.0, 24.5, 7.2, 160, 'Portion', 'dumplings japan asia'],
  ['dish-edamame', 'Edamame (geschält / Kerne)', 'Asiatisch', 122, 11.9, 8.9, 5.2, 100, 'Portion', 'sojabohnen japan'],
  ['dish-duck-crispy-rice', 'Knusprige Ente mit Reis & Sauce', 'Asiatisch', 208, 10.5, 19.5, 9.8, 420, 'Teller', 'china asia erdnuss süß sauer'],
  ['dish-peanut-chicken-rice', 'Hähnchen in Erdnusssauce mit Reis', 'Asiatisch', 176, 9.8, 18.0, 7.2, 420, 'Teller', 'asia thai satay'],
  ['dish-sweet-sour-chicken', 'Hähnchen Süß-Sauer mit Reis', 'Asiatisch', 155, 7.8, 22.0, 3.8, 420, 'Teller', 'china asia'],
  ['dish-tom-kha-gai', 'Tom Kha Gai (Thai Kokossuppe)', 'Asiatisch', 98, 5.4, 4.5, 6.5, 350, 'Schüssel', 'thai suppe hähnchen'],
  ['dish-miso-soup', 'Miso-Suppe', 'Asiatisch', 28, 2.2, 2.8, 0.9, 250, 'Schüssel', 'japan'],

  // --- Indisch ---
  ['dish-butter-chicken', 'Butter Chicken mit Basmatireis', 'Indisch', 168, 9.8, 16.5, 6.8, 430, 'Teller', 'indien curry murgh makhani'],
  ['dish-tikka-masala', 'Chicken Tikka Masala mit Reis', 'Indisch', 158, 10.2, 16.2, 5.6, 430, 'Teller', 'indien curry'],
  ['dish-dal-rice', 'Indisches Dal (Linsencurry) mit Reis', 'Indisch', 128, 5.6, 19.5, 2.9, 400, 'Teller', 'indien vegan vegetarisch dhal'],
  ['dish-palak-paneer', 'Palak Paneer mit Reis', 'Indisch', 148, 6.8, 14.5, 6.9, 400, 'Teller', 'indien spinat käse vegetarisch'],
  ['dish-naan', 'Naan-Brot (Indisches Fladenbrot)', 'Indisch', 290, 8.8, 49.5, 6.2, 110, 'Stück', 'garlic knoblauch indien'],
  ['dish-biryani-chicken', 'Chicken Biryani', 'Indisch', 165, 8.8, 21.0, 5.0, 400, 'Teller', 'indien reis'],

  // --- Orientalisch, Imbiss & Deutsch ---
  ['dish-doener', 'Döner Kebap (Kalb/Hähnchen im Fladenbrot)', 'Imbiss', 202, 11.2, 20.5, 8.2, 360, 'Döner', 'kebab dönerbrot knoblauchsoße'],
  ['dish-dueruem', 'Dürüm Döner (Yufka-Rolle)', 'Imbiss', 206, 11.0, 21.8, 8.0, 380, 'Dürüm', 'kebab wrap yufka'],
  ['dish-doener-plate-rice', 'Döner-Teller mit Reis & Salat', 'Imbiss', 168, 11.8, 14.5, 6.8, 460, 'Teller', 'kebab'],
  ['dish-doener-plate-fries', 'Döner-Teller mit Pommes & Salat', 'Imbiss', 196, 10.5, 16.8, 9.4, 480, 'Teller', 'kebab'],
  ['dish-doener-box', 'Döner-Box (Fleisch & Pommes)', 'Imbiss', 228, 12.2, 18.5, 11.4, 320, 'Box', 'kebab'],
  ['dish-lahmacun', 'Lahmacun (Türkische Pizza, gerollt)', 'Imbiss', 188, 8.4, 24.0, 6.4, 300, 'Stück', 'türkisch'],
  ['dish-falafel-wrap', 'Falafel-Wrap / Dürüm', 'Imbiss', 214, 7.2, 26.5, 8.5, 320, 'Wrap', 'vegan vegetarisch kichererbsen'],
  ['dish-falafel-plate', 'Falafel-Teller mit Hummus & Salat', 'Imbiss', 175, 6.8, 18.5, 8.2, 380, 'Teller', 'vegan vegetarisch'],
  ['dish-shawarma', 'Shawarma-Wrap (Hähnchen)', 'Imbiss', 215, 11.5, 22.0, 8.8, 340, 'Wrap', 'arabisch orient'],
  ['dish-gyros-pita', 'Gyros Pita mit Tzatziki', 'Imbiss', 212, 10.8, 20.5, 9.4, 330, 'Pita', 'griechisch'],
  ['dish-gyros-plate', 'Gyros-Teller mit Reis, Salat & Tzatziki', 'Restaurant', 172, 11.5, 14.0, 7.6, 460, 'Teller', 'griechisch'],
  ['dish-currywurst-fries', 'Currywurst mit Pommes', 'Imbiss', 238, 8.4, 20.5, 13.6, 360, 'Portion', 'wurst imbiss'],
  ['dish-bratwurst-bun', 'Bratwurst im Brötchen', 'Imbiss', 278, 11.5, 22.0, 15.8, 175, 'Stück', 'grillwurst'],
  ['dish-leberkaese-bun', 'Leberkäse-Brötchen', 'Imbiss', 274, 10.8, 22.5, 15.5, 190, 'Stück', 'fleischkäse semmel'],
  ['dish-schnitzel-fries', 'Schnitzel Wiener Art mit Pommes', 'Restaurant', 246, 12.2, 21.5, 12.2, 420, 'Teller', 'schwein pute hähnchen'],
  ['dish-kaesespaetzle', 'Käsespätzle mit Röstzwiebeln', 'Restaurant', 218, 9.8, 23.0, 9.6, 380, 'Teller', 'spätzle schwäbisch allgäu'],
  ['dish-maultaschen', 'Maultaschen (gebraten oder in Brühe)', 'Restaurant', 178, 8.5, 20.5, 6.8, 300, 'Portion', 'schwäbisch'],
  ['dish-fischbroetchen', 'Fischbrötchen (Matjes / Lachs)', 'Imbiss', 228, 11.2, 26.5, 8.4, 180, 'Stück', 'nordsee brötchen'],

  // --- Italienisch & Mediterran ---
  ['dish-spaghetti-bolognese', 'Spaghetti Bolognese', 'Italienisch', 142, 7.6, 17.5, 4.5, 420, 'Teller', 'pasta nudeln hackfleisch'],
  ['dish-spaghetti-carbonara', 'Spaghetti Carbonara', 'Italienisch', 198, 8.8, 21.5, 8.4, 380, 'Teller', 'pasta nudeln speck ei'],
  ['dish-pasta-pesto', 'Pasta mit Pesto Genovese', 'Italienisch', 212, 6.2, 24.5, 9.8, 350, 'Teller', 'nudeln basilikum'],
  ['dish-pasta-arrabbiata', 'Penne all’Arrabbiata (Tomatensauce)', 'Italienisch', 132, 4.4, 22.5, 2.5, 380, 'Teller', 'nudeln vegan vegetarisch'],
  ['dish-lasagne', 'Lasagne Bolognese', 'Italienisch', 162, 8.6, 14.5, 7.6, 400, 'Portion', 'auflauf pasta'],
  ['dish-risotto-mushroom', 'Pilz-Risotto mit Parmesan', 'Italienisch', 148, 4.6, 20.5, 5.2, 360, 'Teller', 'reis italienisch'],
  ['dish-gnocchi-tomato', 'Gnocchi mit Tomatensauce & Mozzarella', 'Italienisch', 148, 5.4, 22.5, 3.8, 360, 'Teller', 'italienisch'],
  ['dish-pizza-margherita', 'Pizza Margherita (Restaurant)', 'Italienisch', 238, 10.2, 31.0, 7.8, 360, 'Pizza', 'pizzeria käse'],
  ['dish-pizza-salami', 'Pizza Salami (Restaurant)', 'Italienisch', 268, 11.6, 29.5, 11.2, 380, 'Pizza', 'pizzeria'],
  ['dish-pizza-prosciutto', 'Pizza Prosciutto (Schinken)', 'Italienisch', 242, 12.0, 30.0, 8.0, 380, 'Pizza', 'pizzeria'],
  ['dish-pizza-tonno', 'Pizza Tonno (Thunfisch & Zwiebeln)', 'Italienisch', 244, 13.2, 29.5, 7.8, 390, 'Pizza', 'pizzeria'],
  ['dish-pizza-funghi', 'Pizza Funghi (Champignons)', 'Italienisch', 226, 9.8, 30.0, 7.2, 370, 'Pizza', 'pizzeria pilze'],
  ['dish-flammkuchen', 'Flammkuchen Elsässer Art', 'Restaurant', 252, 8.8, 27.0, 12.0, 280, 'Flammkuchen', 'speck zwiebeln'],
  ['dish-caesar-salad', 'Caesar Salad mit Hähnchenbrust', 'Salat', 132, 11.5, 6.2, 6.8, 340, 'Salat', 'salat parmesan dressing'],
  ['dish-greek-salad', 'Griechischer Salat mit Feta & Oliven', 'Salat', 108, 4.2, 4.5, 8.2, 320, 'Salat', 'bauernsalat schafskäse'],
  ['dish-bruschetta', 'Bruschetta mit Tomaten', 'Italienisch', 175, 4.8, 26.0, 5.6, 150, 'Portion', 'vorspeise brot'],
  ['dish-tiramisu', 'Tiramisu', 'Dessert', 285, 5.2, 28.0, 16.5, 140, 'Portion', 'italienisch nachtisch'],

  // --- Burger, Tex-Mex & Bowls ---
  ['dish-cheeseburger', 'Cheeseburger (Restaurant / Brioche)', 'Burger', 248, 13.2, 22.0, 11.8, 280, 'Burger', 'rind käse'],
  ['dish-hamburger', 'Hamburger (Klassisch)', 'Burger', 232, 12.5, 22.5, 10.2, 260, 'Burger', 'rind'],
  ['dish-chickenburger', 'Crispy Chicken Burger', 'Burger', 242, 11.8, 25.0, 10.5, 260, 'Burger', 'hähnchen'],
  ['dish-veggieburger', 'Veggie Burger', 'Burger', 214, 8.5, 25.5, 8.6, 250, 'Burger', 'vegetarisch'],
  ['dish-fries', 'Pommes Frites (Fritteuse)', 'Imbiss', 285, 3.6, 36.5, 13.8, 180, 'Portion', 'fritten kartoffeln'],
  ['dish-sweet-potato-fries', 'Süßkartoffelpommes', 'Imbiss', 255, 2.5, 35.0, 11.5, 180, 'Portion', 'fritten'],
  ['dish-burrito-chicken', 'Burrito mit Hähnchen, Reis & Bohnen', 'Tex-Mex', 176, 10.2, 21.5, 5.4, 380, 'Burrito', 'mexikanisch wrap'],
  ['dish-burrito-bowl', 'Burrito Bowl mit Hähnchen & Guacamole', 'Tex-Mex', 148, 9.8, 15.5, 5.2, 420, 'Bowl', 'mexikanisch reis bohnen'],
  ['dish-quesadilla', 'Quesadilla mit Käse & Hähnchen', 'Tex-Mex', 248, 13.5, 22.5, 11.5, 260, 'Portion', 'mexikanisch tortilla'],
  ['dish-tacos', 'Tacos mit Rindfleisch & Salsa (3 Stück)', 'Tex-Mex', 192, 10.5, 18.5, 8.4, 270, 'Portion', 'mexikanisch'],
  ['dish-chili-con-carne', 'Chili con Carne', 'Tex-Mex', 118, 8.8, 9.5, 4.8, 380, 'Teller', 'hackfleisch bohnen'],
  ['dish-chili-sin-carne', 'Chili sin Carne (Vegetarisch/Vegan)', 'Tex-Mex', 94, 5.2, 13.5, 1.8, 380, 'Teller', 'bohnen linsen vegan'],
  ['dish-club-sandwich', 'Club Sandwich (Hähnchen, Bacon, Ei)', 'Snacks', 224, 12.2, 21.5, 9.8, 280, 'Sandwich', 'toast'],
  ['dish-chicken-wrap', 'Hähnchen-Wrap (Salat & Dressing)', 'Snacks', 184, 11.2, 20.5, 6.2, 250, 'Wrap', 'tortilla'],

  // --- Frühstück, Bäcker, Kaffee & Süßes ---
  ['dish-croissant', 'Buttercroissant', 'Bäckerei', 406, 8.2, 45.8, 21.0, 60, 'Stück', 'bäcker frühstück'],
  ['dish-pain-au-chocolat', 'Schokocroissant', 'Bäckerei', 416, 7.6, 47.0, 21.8, 70, 'Stück', 'bäcker'],
  ['dish-franzbroetchen', 'Franzbrötchen (Zimt)', 'Bäckerei', 392, 6.8, 49.0, 18.5, 100, 'Stück', 'bäcker'],
  ['dish-cheese-bun', 'Belegtes Brötchen mit Käse & Butter', 'Bäckerei', 274, 11.5, 32.5, 10.8, 130, 'Brötchen', 'bäcker frühstück'],
  ['dish-ham-bun', 'Belegtes Brötchen mit Kochschinken', 'Bäckerei', 238, 12.2, 33.0, 6.2, 130, 'Brötchen', 'bäcker'],
  ['dish-egg-bun', 'Belegtes Brötchen mit Ei', 'Bäckerei', 236, 10.2, 28.5, 8.8, 150, 'Brötchen', 'bäcker'],
  ['dish-avocado-toast-egg', 'Avocado-Toast mit 2 Eiern', 'Frühstück', 196, 8.8, 16.5, 10.6, 260, 'Portion', 'brot frühstück'],
  ['dish-shakshuka', 'Shakshuka (Tomatenpfanne mit 2 Eiern)', 'Frühstück', 98, 5.8, 6.2, 5.4, 380, 'Pfanne', 'orient frühstück'],
  ['dish-pancakes', 'Pancakes (ohne Sirup)', 'Frühstück', 228, 6.8, 34.0, 7.0, 180, 'Portion', 'pfannkuchen'],
  ['dish-kaiserschmarrn', 'Kaiserschmarrn mit Apfelmus', 'Restaurant', 224, 6.8, 30.5, 8.2, 320, 'Portion', 'österreich süß'],
  ['dish-cheesecake', 'Käsekuchen (1 Stück)', 'Dessert', 272, 7.4, 28.5, 14.2, 140, 'Stück', 'kuchen bäcker'],
  ['dish-chocolate-cake', 'Schokoladenkuchen (1 Stück)', 'Dessert', 378, 5.6, 44.0, 19.8, 110, 'Stück', 'kuchen'],
  ['dish-ice-cream-vanilla', 'Milcheis (Vanille / Schoko)', 'Dessert', 207, 3.6, 24.0, 10.8, 65, 'Kugel', 'eisdiele gelato'],
  ['dish-ice-cream-sorbet', 'Fruchteis / Sorbet', 'Dessert', 124, 0.5, 30.0, 0.2, 65, 'Kugel', 'eisdiele'],
  ['dish-cappuccino', 'Cappuccino (Vollmilch)', 'Getränke', 44, 2.3, 3.3, 2.4, 220, 'Tasse', 'kaffee café'],
  ['dish-cappuccino-oat', 'Cappuccino (Hafermilch)', 'Getränke', 38, 0.8, 5.2, 1.5, 220, 'Tasse', 'kaffee café oat'],
  ['dish-latte-macchiato', 'Latte Macchiato (Vollmilch)', 'Getränke', 52, 2.7, 3.9, 2.8, 300, 'Glas', 'kaffee café'],
  ['dish-protein-bar', 'Proteinriegel (typisch)', 'Snacks', 365, 33.0, 32.0, 12.5, 60, 'Riegel', 'eiweißriegel fitness'],
];

interface DishIndexItem {
  food: DishFood;
  normName: string;
  normAll: string;
  compact: string;
  words: string[];
}

const compactOf = (s: string) => s.replace(/[^a-z0-9]/g, '');

export const DISH_FOODS: DishFood[] = DISH_ROWS.map(
  ([id, name, category, calories, protein, carbs, fat, portionGrams, portionLabel, keywords = '']) => ({
    id,
    name,
    brand: 'Gericht',
    category,
    keywords,
    calories,
    protein,
    carbs,
    fat,
    servingQuantity: portionGrams,
    servingSize: `1 ${portionLabel} (${portionGrams}g)`,
    source: 'dish',
  })
);

const DISH_INDEX: DishIndexItem[] = DISH_FOODS.map((food) => {
  const normName = norm(food.name);
  const normAll = norm(`${food.name} ${food.category} ${food.keywords}`);
  return {
    food,
    normName,
    normAll,
    compact: compactOf(normAll),
    words: normName.split(' ').filter(Boolean),
  };
});

export function searchDishes(query: string, limit = 15): DishFood[] {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];
  const first = tokens[0];
  const firstCompact = compactOf(first);

  const scored: Array<{ food: DishFood; score: number }> = [];
  for (const item of DISH_INDEX) {
    const ok = tokens.every((t) => {
      const c = compactOf(t);
      return item.normAll.includes(t) || (c.length >= 4 && item.compact.includes(c));
    });
    if (!ok) continue;

    let score = 3;
    if (item.normName === tokens.join(' ')) score = 0;
    else if (item.normName.startsWith(first) || item.compact.startsWith(firstCompact)) score = 1;
    else if (item.words.some((w) => w.startsWith(first))) score = 2;

    score += item.normName.length / 200;
    scored.push({ food: item.food, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name, 'de'))
    .slice(0, limit)
    .map((s) => s.food);
}
