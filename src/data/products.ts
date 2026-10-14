export interface Product {
  id: string;
  name: string;
  category: 'Apparel' | 'Accessories' | 'Bags' | 'Stationery' | 'Memorabilia' | 'Bundles';
  price: number;
  originalPrice: number;
  badge?: string;
  badgeType?: 'primary' | 'hot' | 'limited' | 'exclusive';
  shortDesc: string;
  description: string;
  features: string[];
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  tag: string;
  icon: string;
}

export const products: Product[] = [
  {
    id: 'genm-tee-signature',
    name: 'GEN M Signature Oversized Tee',
    category: 'Apparel',
    price: 699,
    originalPrice: 899,
    badge: 'Pre-Order Deal',
    badgeType: 'hot',
    shortDesc: '240 GSM heavy combed cotton with high-density screen print.',
    description: 'The definitive official tee of GEN M 2026. Tailored in an oversized streetwear drape with drop-shoulders and ribbed collar. Features the iconic GEN M typeface on chest and confluence manifesto graphic on the back.',
    features: ['240 GSM 100% Combed Cotton', 'Pre-shrunk, bio-washed fabric', 'High-density puff and screen print', 'Reinforced neck ribbing'],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: [
      { name: 'Slate Periwinkle', hex: '#5961B4' },
      { name: 'Deep Indigo', hex: '#232863' },
      { name: 'Pure Black', hex: '#161828' }
    ],
    tag: 'Apparel',
    icon: '👕'
  },
  {
    id: 'genm-hoodie-heritage',
    name: 'Confluence Heritage Pullover Hoodie',
    category: 'Apparel',
    price: 1399,
    originalPrice: 1799,
    badge: 'Bestseller',
    badgeType: 'primary',
    shortDesc: '380 GSM brushed fleece with tonal embroidered chest lockup.',
    description: 'Ultra-warm and cozy heavyweight hoodie built for late-night student discussions and morning sessions. Features custom antique brass eyelets, kangaroo pouch, and double-layered thermal hood.',
    features: ['380 GSM Heavy French Terry Fleece', 'Satin-stitch embroidered chest emblem', 'Thermal lined dual-panel hood', 'Concealed security pocket inside pouch'],
    sizes: ['M', 'L', 'XL', '2XL'],
    colors: [
      { name: 'Deep Indigo', hex: '#232863' },
      { name: 'Slate Periwinkle', hex: '#5961B4' }
    ],
    tag: 'Apparel',
    icon: '🧥'
  },
  {
    id: 'genm-varsity-jacket',
    name: 'GEN M Confluence Varsity Jacket',
    category: 'Apparel',
    price: 2299,
    originalPrice: 2899,
    badge: 'Limited Edition',
    badgeType: 'limited',
    shortDesc: 'Collector edition varsity jacket with chenille patches and quilted lining.',
    description: 'An exclusive heirloom piece commemorating the Generational Student Confluence. Crafted with textured wool-blend body, faux leather sleeves, custom GEN M metal snap buttons, and varsity chenille patches.',
    features: ['Textured wool-blend shell & PU sleeves', 'Diamond quilted thermal satin lining', 'Multi-layer chenille embroidery patches', 'Numbered official collector tag'],
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Indigo & Cream', hex: '#232863' }
    ],
    tag: 'Apparel',
    icon: '🧥'
  },
  {
    id: 'genm-canvas-tote',
    name: 'GEN M Heavy Canvas Confluence Tote',
    category: 'Bags',
    price: 349,
    originalPrice: 449,
    badge: 'Eco-Friendly',
    badgeType: 'primary',
    shortDesc: '14oz natural organic canvas with reinforced cross-stitched handles.',
    description: 'Spacious everyday tote designed to hold laptops, journals, and event literature. Screen-printed with the bilingual GEN M typography and Malayalam confluence motif.',
    features: ['14oz 100% Organic Cotton Canvas', 'Inner zippered pocket for keys & phone', 'Reinforced shoulder straps (32cm drop)', 'Water-resistant coated base'],
    colors: [
      { name: 'Natural Cream', hex: '#E7EEAC' },
      { name: 'Slate Periwinkle', hex: '#5961B4' }
    ],
    tag: 'Bags',
    icon: '👜'
  },
  {
    id: 'genm-delegate-backpack',
    name: 'Official Delegate Commuter Backpack',
    category: 'Bags',
    price: 1299,
    originalPrice: 1699,
    badge: 'Venue Essential',
    badgeType: 'hot',
    shortDesc: 'Weather-resistant 900D ballistic nylon with 16" padded laptop vault.',
    description: 'Designed specifically for delegate travel and conference mobility. Features dual water-bottle sleeves, hidden anti-theft passport pocket, luggage pass-through strap, and padded ergonomic shoulder harness.',
    features: ['900D Water-repellent Ballistic Nylon', 'Dedicated 16-inch velvet laptop compartment', 'USB charging pass-through port', 'YKK weather-sealed zippers'],
    colors: [
      { name: 'Midnight Periwinkle', hex: '#232863' }
    ],
    tag: 'Bags',
    icon: '🎒'
  },
  {
    id: 'genm-thermal-flask',
    name: 'GEN M Insulated Hydro Flask (750ml)',
    category: 'Accessories',
    price: 649,
    originalPrice: 799,
    badge: 'Popular',
    badgeType: 'primary',
    shortDesc: '24hr cold / 12hr hot double-walled 304 food-grade stainless steel.',
    description: 'Keep your beverages ice-cold through long confluence auditoriums or steaming hot for morning journeys. Matte powder-coat finish with laser-engraved GEN M crest and leakproof silicone grip cap.',
    features: ['750ml Food-grade 18/8 Stainless Steel', 'Double-wall copper vacuum insulation', 'Condensation-free powder coat grip', 'BPA-free twist spout cap with carry loop'],
    colors: [
      { name: 'Slate Matte', hex: '#5961B4' },
      { name: 'Cream Matte', hex: '#E7EEAC' }
    ],
    tag: 'Accessories',
    icon: '🍶'
  },
  {
    id: 'genm-ceramic-mug',
    name: 'Neoverse Matte Ceramic Confluence Mug',
    category: 'Memorabilia',
    price: 349,
    originalPrice: 449,
    badge: 'Desk Favorite',
    badgeType: 'primary',
    shortDesc: '350ml hand-dipped stoneware mug with satin matte glaze.',
    description: 'Start your study mornings with the spirit of GEN M. Ergonomic handle, deep indigo matte glaze, and contrasting pale cream typography along the rim.',
    features: ['350ml Premium Ceramic Stoneware', 'Microwave & Dishwasher safe', 'Silky satin glaze with debossed motif', 'Weighted base prevents accidental spills'],
    colors: [
      { name: 'Deep Indigo / Cream', hex: '#232863' }
    ],
    tag: 'Memorabilia',
    icon: '☕'
  },
  {
    id: 'genm-leather-journal',
    name: 'Confluence Hardbound Journal & Gel Pen',
    category: 'Stationery',
    price: 399,
    originalPrice: 499,
    badge: 'Essential',
    badgeType: 'primary',
    shortDesc: '192 numbered pages of 100 GSM bleedproof ivory paper.',
    description: 'Capture key ideas, reflections, and contacts during the three days in Kozhikode. Includes foil-stamped hard cover, ribbon marker, expandable back pocket, and matte black precision rollerball pen.',
    features: ['192 Pages 100 GSM Acid-Free Ivory Paper', 'Dotted grid ruling for sketching & notes', 'Expandable inner document pocket', 'Matching aluminum body gel pen included'],
    colors: [
      { name: 'Slate Periwinkle', hex: '#5961B4' },
      { name: 'Deep Navy', hex: '#232863' }
    ],
    tag: 'Stationery',
    icon: '📓'
  },
  {
    id: 'genm-enamel-pins',
    name: 'Official GEN M Enamel Pin Set (4-Pack)',
    category: 'Memorabilia',
    price: 299,
    originalPrice: 399,
    badge: 'Collectible',
    badgeType: 'exclusive',
    shortDesc: 'Hard enamel metal pins with gold plating and rubber clutches.',
    description: 'Set of 4 collectible lapel pins celebrating the 2026 Confluence: The Primary Logomark, Kozhikode Destination Marker, Confluence Star, and Manifesto Banner. Mount them on jackets, bags, or lanyards.',
    features: ['Jewelry-grade hard enamel construction', '18K gold-plated zinc alloy borders', 'Dual rubber clutches for secure hold', 'Custom illustrated collector backing card'],
    tag: 'Memorabilia',
    icon: '✨'
  },
  {
    id: 'genm-keychain-lanyard',
    name: 'Cast Alloy Keychain & Woven Lanyard',
    category: 'Accessories',
    price: 229,
    originalPrice: 299,
    shortDesc: 'Heavy zinc alloy badge with jacquard woven badge neck strap.',
    description: 'Heavyweight sculpted metal keychain with mirror-polished periwinkle enamel fill, paired with a soft jacquard woven event lanyard equipped with quick-release safety clasp.',
    features: ['Solid zinc alloy 3D die-cast medallion', 'Silky soft jacquard anti-chafing lanyard', 'Heavy-duty lobster claw swivel clip', 'Safety breakaway clasp'],
    tag: 'Accessories',
    icon: '🔑'
  },
  {
    id: 'genm-dad-cap',
    name: 'GEN M Embroidered Low-Profile Dad Cap',
    category: 'Apparel',
    price: 499,
    originalPrice: 649,
    badge: 'Streetwear',
    badgeType: 'hot',
    shortDesc: '100% brushed chino twill with 3D puff front embroidery.',
    description: 'Relaxed unstructured six-panel cap with pre-curved visor. Tonal eyelets, embroidered confluence typographic crest, and adjustable antique brass slider buckle.',
    features: ['100% Washed Chino Cotton Twill', 'Unstructured low-profile 6-panel fit', 'High-density 3D puff embroidery', 'Custom brass embossed closure buckle'],
    sizes: ['One Size (Adjustable)'],
    colors: [
      { name: 'Deep Indigo', hex: '#232863' },
      { name: 'Periwinkle', hex: '#5961B4' }
    ],
    tag: 'Apparel',
    icon: '🧢'
  },
  {
    id: 'genm-desk-mat',
    name: 'Confluence Panoramic Desk Mat (900x400)',
    category: 'Accessories',
    price: 599,
    originalPrice: 799,
    badge: 'Workspace',
    badgeType: 'primary',
    shortDesc: 'Micro-weave speed cloth with non-slip natural rubber base.',
    description: 'Upgrade your workspace with this 900x400x4mm extended desk mat featuring the panoramic abstract geometric artwork of GEN M. Smooth glide surface with precision anti-fray stitched perimeter.',
    features: ['High-density micro-textured fabric surface', 'Non-slip natural rubber grip backing', '360° Anti-fray precision edge stitching', 'Waterproof spill-resistant coating'],
    tag: 'Accessories',
    icon: '🖥️'
  },
  {
    id: 'genm-stickers-pack',
    name: 'Holographic & Matte Vinyl Sticker Pack (10-Pk)',
    category: 'Memorabilia',
    price: 179,
    originalPrice: 249,
    shortDesc: '10 weatherproof UV-protected die-cut stickers for laptops & flasks.',
    description: 'Pack of 10 custom die-cut stickers printed on thick scratch-resistant vinyl. Includes 4 holographic foil badges, 4 matte finish decals, and 2 transparent typographic strips.',
    features: ['UV & Weatherproof laminated vinyl', 'Scratch & water resistant for laptops & bottles', 'Residue-free clean removal adhesive', '4 Holographic special-finish editions included'],
    tag: 'Memorabilia',
    icon: '🏷️'
  },
  {
    id: 'genm-all-in-one-bundle',
    name: 'Official Delegate All-In-One Box Bundle',
    category: 'Bundles',
    price: 2699,
    originalPrice: 3899,
    badge: 'Save ₹1,200',
    badgeType: 'exclusive',
    shortDesc: 'Complete VIP kit: Hoodie, Tote, Flask, Journal, Pin Set & Stickers in custom gift box.',
    description: 'The ultimate collector experience. Pre-order all iconic GEN M items in a luxury magnetic-closure presentation box. Includes the Heritage Hoodie, Canvas Tote, Insulated Flask, Hardbound Journal, Enamel Pin Set, and Holographic Sticker Pack.',
    features: [
      'Heritage Hoodie (select your size)',
      'Heavy Canvas Confluence Tote Bag',
      '750ml Insulated Thermal Hydro Flask',
      'Hardbound Gold-Foil Journal & Gel Pen',
      'Full 4-Pack Enamel Pin Collector Set',
      'Deluxe 10-Pack Vinyl Sticker Pack',
      'Luxury embossed magnetic collector box'
    ],
    sizes: ['M', 'L', 'XL', '2XL'],
    tag: 'Bundles',
    icon: '🎁'
  }
];

export const categories = ['All', 'Apparel', 'Accessories', 'Bags', 'Stationery', 'Memorabilia', 'Bundles'] as const;
