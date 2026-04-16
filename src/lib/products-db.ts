/**
 * Common Product Ingredients Database
 * Maps popular products to their known ingredients for quick halal analysis
 */

export interface ProductEntry {
  name: string;
  aliases?: string[];
  ingredients: string[];
  typical_status?: "halal" | "haram" | "doubtful";
}

export const PRODUCTS_DATABASE: ProductEntry[] = [
  {
    name: "Curry Noodles",
    aliases: ["Curry noodle", "Curry instant noodles"],
    ingredients: ["Wheat flour", "Curry flavoring", "MSG", "E631", "E627", "Palm oil", "Salt"],
    typical_status: "doubtful",
  },
  {
    name: "Instant Ramen",
    aliases: ["Ramen noodles", "Cup noodles"],
    ingredients: ["Wheat", "Egg powder", "MSG", "E471", "E481", "Chicken extract", "Ginger"],
    typical_status: "doubtful",
  },
  {
    name: "Chicken Instant Noodles",
    aliases: ["Chicken noodles", "Chicken ramen"],
    ingredients: ["Wheat flour", "Chicken flavoring", "MSG", "E627", "E631", "Poultry fat", "Herbs"],
    typical_status: "doubtful",
  },
  {
    name: "Prawn Crackers",
    aliases: ["Shrimp crackers", "Prawn crisps"],
    ingredients: ["Tapioca starch", "Prawn extract", "Salt", "Sugar", "Garlic"],
    typical_status: "halal",
  },
  {
    name: "Gummy Bears",
    aliases: ["Jelly bears", "Gummi"],
    ingredients: ["Sugar", "Glucose syrup", "E120 Carmine", "E171", "Gelatin", "Beeswax", "Wax"],
    typical_status: "haram",
  },
  {
    name: "Marshmallows",
    aliases: ["Marsh mallow"],
    ingredients: ["Corn syrup", "Gelatin", "Sugar", "Cornstarch", "E120"],
    typical_status: "haram",
  },
  {
    name: "Choco Chip Cookies",
    aliases: ["Chocolate chip biscuits", "Cookie"],
    ingredients: ["Wheat flour", "Butter", "Sugar", "Cocoa", "Eggs", "E471"],
    typical_status: "doubtful",
  },
  {
    name: "Milk Chocolate",
    aliases: ["Chocolate bar", "Cocoa"],
    ingredients: ["Cocoa", "Milk", "Sugar", "Cocoa butter", "E322 Lecithin", "Vanilla"],
    typical_status: "doubtful",
  },
  {
    name: "Yogurt",
    aliases: ["Yoghurt", "Yoghurt drink"],
    ingredients: ["Milk", "Lactic acid bacteria", "Sugar", "E120", "E500", "Fruit"],
    typical_status: "doubtful",
  },
  {
    name: "Cheese",
    aliases: ["Cheddar", "Mozzarella", "Cheese slice"],
    ingredients: ["Milk", "Rennet", "Salt", "E471", "E481"],
    typical_status: "doubtful",
  },
  {
    name: "Sausage",
    aliases: ["Hot dog", "Frankfurter"],
    ingredients: ["Pork meat", "Beef", "Salt", "Spices", "E250", "E451"],
    typical_status: "haram",
  },
  {
    name: "Beef Jerky",
    aliases: ["Dried meat", "Beef strips"],
    ingredients: ["Beef", "Salt", "Sugar", "Spices", "E250"],
    typical_status: "halal",
  },
  {
    name: "Mayonnaise",
    aliases: ["Mayo", "Salad dressing"],
    ingredients: ["Eggs", "Oil", "Vinegar", "E322 Lecithin", "E260"],
    typical_status: "doubtful",
  },
  {
    name: "Peanut Butter",
    aliases: ["Peanut paste"],
    ingredients: ["Peanuts", "Sugar", "Salt", "Vegetable oil"],
    typical_status: "halal",
  },
  {
    name: "Ice Cream",
    aliases: ["Gelato", "Frozen dessert"],
    ingredients: ["Milk", "Cream", "Sugar", "E441 Gelatin", "E322", "Vanilla extract"],
    typical_status: "haram",
  },
  {
    name: "Soft Drink",
    aliases: ["Soda", "Cola", "Carbonated drink"],
    ingredients: ["Water", "Sugar", "E330 Citric acid", "E211 Benzoate", "E102", "Caramel coloring"],
    typical_status: "halal",
  },
  {
    name: "Jam",
    aliases: ["Jelly", "Fruit preserve"],
    ingredients: ["Fruit", "Sugar", "E330 Citric acid", "E440 Pectin", "E200 Sorbic acid"],
    typical_status: "halal",
  },
  {
    name: "Margarine",
    aliases: ["Butter substitute", "Spread"],
    ingredients: ["Vegetable oil", "Water", "E471", "E481", "E322", "Salt"],
    typical_status: "doubtful",
  },
];

export function findProductByName(query: string): ProductEntry | undefined {
  const q = query.toLowerCase().trim();
  return PRODUCTS_DATABASE.find((p) =>
    p.name.toLowerCase().includes(q) ||
    q.includes(p.name.toLowerCase()) ||
    (p.aliases ?? []).some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))
  );
}
