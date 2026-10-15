export type ProductCategory =
  | 'Everyday Essentials'
  | 'Drinkware'
  | 'Wear & Carry'
  | 'Lifestyle Accessories';

export interface ProductItem {
  id: string;
  name: string;
  category: ProductCategory;
  categorySlug: 'everyday-essentials' | 'drinkware' | 'wear-and-carry' | 'lifestyle-accessories';
  image: string;
  isFeatured?: boolean;
  slogan?: string;
  shortDesc: string;
  description: string;
  features: string[];
  specs?: { label: string; value: string }[];
}

export const CATEGORIES: { name: ProductCategory; slug: string; desc: string }[] = [
  {
    name: 'Everyday Essentials',
    slug: 'everyday-essentials',
    desc: 'Functional tools and keepsakes tailored for student life, note-taking, and daily campus journeys.'
  },
  {
    name: 'Drinkware',
    slug: 'drinkware',
    desc: 'Minimalist glassware, bottles, and ceramic mugs crafted for mindful hydration and focus.'
  },
  {
    name: 'Wear & Carry',
    slug: 'wear-and-carry',
    desc: 'Signature apparel, headwear, and utility bags built around the GEN M generational movement.'
  },
  {
    name: 'Lifestyle Accessories',
    slug: 'lifestyle-accessories',
    desc: 'Curated desk, car, and personal accents communicating subtle elegance and purposeful living.'
  }
];

export const PRODUCTS: ProductItem[] = [
  // ─── EVERYDAY ESSENTIALS ───
  {
    id: 'diary',
    name: 'Diary',
    category: 'Everyday Essentials',
    categorySlug: 'everyday-essentials',
    image: '/products/diary.jpg',
    shortDesc: 'Hardcover journal in deep blue-violet with silver foil debossed GEN M identity.',
    description: 'A thoughtfully crafted daily planner and notebook designed for reflective thoughts, lecture notes, and purposeful goal setting. Features acid-free ruled pages, bookmark ribbon, and lay-flat binding.',
    features: [
      'Deep blue-violet tactile hardcover',
      'Debossed white GEN M emblem',
      '192 pages of 80 GSM feather-proof paper',
      'Integrated ribbon bookmark and elastic band'
    ],
    specs: [
      { label: 'Binding', value: 'Hardcover Case Bound' },
      { label: 'Paper', value: '80 GSM Ivory Ruled' },
      { label: 'Size', value: 'A5 (148 × 210 mm)' }
    ]
  },
  {
    id: 'pen',
    name: 'Pen',
    category: 'Everyday Essentials',
    categorySlug: 'everyday-essentials',
    image: '/products/pen.jpg',
    shortDesc: 'Precision metal ballpoint pen with matte blue-violet finish and engraved logo.',
    description: 'An elegant aluminum writing instrument engineered for smooth, effortless flow. Fitted with a 0.7mm high-density German ink refill and balanced weight distribution for extended study sessions.',
    features: [
      'Matte anodized blue-violet aluminum body',
      'Precision laser-etched GEN M branding',
      '0.7mm German black ballpoint cartridge',
      'Spring-steel pocket clip'
    ],
    specs: [
      { label: 'Material', value: 'Anodized Aluminum' },
      { label: 'Ink', value: 'Quick-dry Black 0.7mm' },
      { label: 'Action', value: 'Click Retractable' }
    ]
  },
  {
    id: 'keychain',
    name: 'Keychain',
    category: 'Everyday Essentials',
    categorySlug: 'everyday-essentials',
    image: '/products/keychain.jpg',
    shortDesc: 'Geometric zinc-alloy emblem keychain with matte periwinkle enamel fill.',
    description: 'A durable geometric keepsake celebrating the generational confluence. Crafted from brushed zinc alloy with deep enamel inlay that resists scratches and wear over years of daily carry.',
    features: [
      'Geometric octagonal die-cast zinc alloy',
      'Debossed GEN M geometric emblem',
      'Triple-split key rings for organizing keys',
      'Tarnish-resistant brushed chrome rim'
    ],
    specs: [
      { label: 'Material', value: 'Zinc Alloy + Soft Enamel' },
      { label: 'Finish', value: 'Brushed Satin Chrome' },
      { label: 'Dimension', value: '42 × 38 mm' }
    ]
  },
  {
    id: 'bag-tag',
    name: 'Bag Tag',
    category: 'Everyday Essentials',
    categorySlug: 'everyday-essentials',
    image: '/products/bag_tag.jpg',
    shortDesc: 'Two-tone vegan leather luggage tag in blue-violet with sage-green buckle strap.',
    description: 'A distinctive travel tag for backpacks, carry-ons, and travel luggage. Embossed with the clean GEN M typography and protected with a concealed privacy contact window.',
    features: [
      'Dual-tone vegan leather (Blue-Violet + Sage)',
      'Debossed GEN M typographic branding',
      'Durable solid brass buckle attachment',
      'Concealed contact information card slot'
    ],
    specs: [
      { label: 'Material', value: 'Saffiano Textured Vegan Leather' },
      { label: 'Colors', value: 'Blue-Violet & Sage Green' },
      { label: 'Size', value: '70 × 110 mm' }
    ]
  },

  // ─── DRINKWARE ───
  {
    id: 'glass-set',
    name: 'Glass Set',
    category: 'Drinkware',
    categorySlug: 'drinkware',
    image: '/products/glass_set.jpg',
    shortDesc: 'Pair of fluted crystal-clear highball tumblers with frosted monogram emblem.',
    description: 'Minimalist ribbed glass tumblers celebrating clarity and community. Ideal for refreshing water, iced brew, or beverages during gatherings. Dishwasher safe and crafted from lead-free silicate glass.',
    features: [
      'Set of 2 vertical fluted glasses',
      'Frosted GEN M monogram etching',
      'Weighted heavy base for stability',
      'Lead-free high-clarity soda-lime glass'
    ],
    specs: [
      { label: 'Quantity', value: '2 Glasses per Box' },
      { label: 'Capacity', value: '350 ml (12 oz)' },
      { label: 'Care', value: 'Dishwasher Safe' }
    ]
  },
  {
    id: 'water-bottle',
    name: 'Water Bottle',
    category: 'Drinkware',
    categorySlug: 'drinkware',
    image: '/products/water_bottle.jpg',
    shortDesc: 'Matte sage green insulated stainless steel flask with carry loop lid.',
    description: 'Double-walled vacuum insulated bottle engineered to keep beverages cold for 24 hours or piping hot for 12 hours. Powder-coated in muted sage green with contrasting blue-violet handle loop.',
    features: [
      'Food-grade 18/8 stainless steel',
      'Double-wall vacuum temperature insulation',
      'Ergonomic blue-violet carry loop handle',
      'Sweat-free matte powder finish'
    ],
    specs: [
      { label: 'Capacity', value: '750 ml' },
      { label: 'Insulation', value: '24h Cold / 12h Hot' },
      { label: 'Color', value: 'Sage Green + Blue-Violet' }
    ]
  },
  {
    id: 'coffee-mug',
    name: 'Coffee Mug',
    category: 'Drinkware',
    categorySlug: 'drinkware',
    image: '/products/coffee_mug.jpg',
    shortDesc: 'Artisanal off-white ceramic coffee mug with glazed blue-violet handle.',
    description: 'A cozy, tactile ceramic mug designed for early morning study routines and evening conversations. Hand-dipped glaze with contrasting periwinkle handle and minimal typographic mark.',
    features: [
      'Heavyweight stoneware ceramic',
      'Contrasting hand-glazed blue-violet handle',
      'Microwave and dishwasher safe',
      'Comfortable 3-finger ergonomic grip'
    ],
    specs: [
      { label: 'Capacity', value: '330 ml' },
      { label: 'Material', value: 'Glazed Ceramic' },
      { label: 'Color', value: 'Off-White & Periwinkle' }
    ]
  },

  // ─── WEAR & CARRY ───
  {
    id: 'cross-bag',
    name: 'Cross Bag',
    category: 'Wear & Carry',
    categorySlug: 'wear-and-carry',
    image: '/products/cross_bag.jpg',
    shortDesc: 'Structured weather-resistant utility crossbody bag with sage green webbing strap.',
    description: 'An everyday compact shoulder bag built for essentials: phone, wallet, keys, and notebooks. Crafted from water-repellent Cordura nylon in blue-violet with custom military-grade sage webbing.',
    features: [
      'Water-repellent structured nylon fabric',
      'Adjustable sage green seatbelt webbing strap',
      'YKK waterproof reverse-coil zippers',
      'Internal organizer pockets and key clip'
    ],
    specs: [
      { label: 'Volume', value: '3.5 Litres' },
      { label: 'Dimensions', value: '22 × 17 × 7 cm' },
      { label: 'Strap', value: 'Adjustable 80–145 cm' }
    ]
  },
  {
    id: 'embroidered-cap',
    name: 'Embroidered Cap',
    category: 'Wear & Carry',
    categorySlug: 'wear-and-carry',
    image: '/products/cap.jpg',
    shortDesc: 'Classic 6-panel unstructured dad cap in cotton twill with white 3D embroidery.',
    description: 'A low-profile cotton twill cap tailored for effortless daily wear. Features satin-stitch 3D embroidered GEN M lockup on the crown, antique brass strap closure, and stitched ventilation eyelets.',
    features: [
      '100% premium washed cotton twill',
      'High-density white embroidered lettering',
      'Curved brim with reinforced tonal stitching',
      'Antique brass adjustable buckle closure'
    ],
    specs: [
      { label: 'Profile', value: 'Unstructured 6-Panel' },
      { label: 'Closure', value: 'Brass Slide Buckle' },
      { label: 'Size', value: 'One Size Fits Most' }
    ]
  },
  {
    id: 'white-tshirt',
    name: 'White T-Shirt',
    category: 'Wear & Carry',
    categorySlug: 'wear-and-carry',
    image: '/products/white_tshirt.jpg',
    isFeatured: true,
    slogan: 'Rooted in Deen. Driven by Purpose.',
    shortDesc: 'Flagship heavyweight cotton tee bearing the official GEN M slogan.',
    description: 'The defining piece of the GEN M collection. Cut in an oversized, relaxed streetwear silhouette from 240 GSM organic combed cotton. Features the official emblem and slogan across the chest.',
    features: [
      '240 GSM 100% Organic Combed Cotton',
      'High-density screen print: “Rooted in Deen. Driven by Purpose.”',
      'Thick 1-inch ribbed collar and drop-shoulder drape',
      'Pre-shrunk and bio-washed for lasting softness'
    ],
    specs: [
      { label: 'Fit', value: 'Relaxed Oversized Drop-Shoulder' },
      { label: 'Weight', value: '240 GSM Heavyweight Cotton' },
      { label: 'Print', value: 'Silkscreen Blue-Violet' }
    ]
  },

  // ─── LIFESTYLE ACCESSORIES ───
  {
    id: 'mobile-stand',
    name: 'Mobile Stand',
    category: 'Lifestyle Accessories',
    categorySlug: 'lifestyle-accessories',
    image: '/products/mobile_stand.jpg',
    shortDesc: 'Solid aluminum desk phone stand with anti-slip silicone cushions.',
    description: 'Ergonomic desktop companion crafted from 3mm solid aluminum. Designed for hands-free video calls, studying, and content viewing in both portrait and landscape orientation with charging cable slot.',
    features: [
      'Solid CNC-machined aluminum plate in blue-violet',
      'Non-slip silicone padding on cradle and base',
      'Ergonomic 60-degree viewing angle',
      'Dedicated cable pass-through port'
    ],
    specs: [
      { label: 'Material', value: 'Anodized 6061 Aluminum' },
      { label: 'Weight', value: '145 g' },
      { label: 'Compatibility', value: 'All 4–12.9" Phones & Tablets' }
    ]
  },
  {
    id: 'tissue',
    name: 'Tissue',
    category: 'Lifestyle Accessories',
    categorySlug: 'lifestyle-accessories',
    image: '/products/tissue.jpg',
    shortDesc: 'Eco-friendly facial tissue cube box in matte sage green with GEN M logo.',
    description: 'Refined desk accessory made with 100% virgin bamboo pulp tissues. Packaged in a minimalist matte sage-green dispenser box that adds calm elegance to desks, study tables, and car consoles.',
    features: [
      '100% sustainable virgin bamboo pulp',
      '2-ply ultra-soft, lint-free facial sheets',
      'Matte sage green and white dispenser cube',
      '80 tissues per box'
    ],
    specs: [
      { label: 'Sheet Count', value: '80 Tissues (2-Ply)' },
      { label: 'Box Size', value: '11 × 11 × 12 cm' },
      { label: 'Material', value: 'Biodegradable Bamboo Pulp' }
    ]
  },
  {
    id: 'car-perfume',
    name: 'Car Perfume',
    category: 'Lifestyle Accessories',
    categorySlug: 'lifestyle-accessories',
    image: '/products/car_perfume.jpg',
    shortDesc: 'Geometric air vent diffuser with blue-violet metallic accent and natural scent.',
    description: 'An elegant automotive diffuser engineered from obsidian alloy with periwinkle anodized beveled rims. Uses solid scent sticks derived from cedarwood and amber to keep your car journeys fresh.',
    features: [
      'Obsidian alloy chassis with blue-violet trim',
      'Rotatable air vent clip compatible with all cars',
      'Adjustable fragrance intensity dial',
      'Includes 2 natural scent rings (Cedarwood & Fresh Ocean)'
    ],
    specs: [
      { label: 'Mount', value: 'Silicone Air Vent Grip' },
      { label: 'Refills', value: 'Replaceable Solid Ring' },
      { label: 'Finish', value: 'Matte Obsidian + Blue-Violet' }
    ]
  }
];
