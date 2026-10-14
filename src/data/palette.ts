export type ColorKey = 'navy' | 'indigo' | 'yellow' | 'white' | 'blue' | 'coral';

export const palette: Record<ColorKey, { name: string; hex: string; note: string }> = {
  navy: { name: 'Slate Periwinkle', hex: '#5961B4', note: 'The GEN M background colour.' },
  indigo: { name: 'Deep Periwinkle', hex: '#232863', note: 'Depth, focus, late-night study.' },
  yellow: { name: 'GEN M Cream', hex: '#E7EEAC', note: 'The pale cream of every graphic.' },
  white: { name: 'Soft White', hex: '#F5F4EC', note: 'Paper, light, breathing room.' },
  blue: { name: 'Electric Blue', hex: '#3A6BFF', note: 'Signal, energy, the digital layer.' },
  coral: { name: 'Coral Red', hex: '#FF5B4F', note: 'Used sparingly. A single spark.' },
};

export const colorKeys = Object.keys(palette) as ColorKey[];
