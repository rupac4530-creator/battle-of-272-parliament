// Geographic India map data (lon, lat) projected into a 500x580 SVG viewBox.
export const VB_W = 500;
export const VB_H = 580;
export const proj = (lon: number, lat: number): [number, number] => [
  40 + (lon - 68) * 14.6,
  28 + (37.4 - lat) * 15.8
];

// Clockwise outline (Indian official depiction incl. J&K, Ladakh, North-East).
const OUTLINE: [number, number][] = [
  [73.8, 36.9], [75.5, 37.0], [77.0, 35.6], [78.6, 35.6], [80.3, 35.2], [79.6, 33.6], [78.8, 32.4],
  [78.9, 31.0], [80.2, 30.2], [81.0, 30.2], [80.1, 28.8], [81.5, 28.4], [83.3, 27.4], [84.7, 27.0],
  [86.0, 26.6], [88.1, 26.4], [88.0, 27.1], [88.1, 27.9], [88.9, 28.1], [88.9, 27.3], [89.0, 26.7],
  [89.9, 26.7], [91.6, 26.8], [92.1, 27.0], [91.7, 27.8], [93.5, 28.6], [95.2, 29.2], [96.2, 29.4],
  [97.4, 28.2], [97.0, 27.5], [96.2, 27.2], [95.2, 26.2], [94.6, 25.0], [94.2, 23.8], [93.4, 23.0],
  [93.0, 22.0], [92.6, 22.9], [92.3, 24.2], [91.9, 23.6], [91.3, 23.1], [91.5, 24.1], [92.2, 24.9],
  [91.8, 25.2], [90.5, 25.2], [89.8, 25.3], [89.8, 25.9], [89.1, 25.7], [88.4, 25.6], [88.2, 25.3],
  [88.3, 25.0], [88.5, 24.8], [88.1, 24.5], [88.7, 24.1], [88.4, 23.5], [89.0, 22.9], [88.9, 22.2],
  [88.7, 21.7], [87.0, 21.5], [86.9, 20.7], [86.2, 19.9], [85.4, 19.4], [84.8, 19.1], [84.0, 18.4],
  [83.3, 17.5], [82.3, 16.6], [81.3, 16.0], [80.2, 15.6], [80.3, 13.4], [79.8, 12.0], [79.9, 11.0],
  [79.2, 10.3], [78.9, 9.3], [78.2, 8.9], [77.55, 8.08], [76.8, 8.6], [76.3, 9.6], [75.8, 11.0],
  [74.8, 12.8], [74.2, 14.5], [73.8, 15.5], [73.4, 16.6], [72.9, 18.0], [72.8, 19.1], [72.7, 20.4],
  [72.8, 21.1], [72.6, 22.0], [72.4, 21.5], [71.0, 20.8], [69.8, 21.0], [69.0, 22.3], [70.2, 22.9],
  [68.6, 23.2], [68.2, 23.7], [69.6, 24.2], [71.0, 24.4], [70.0, 26.0], [70.4, 27.5], [71.9, 27.9],
  [73.0, 29.3], [74.5, 29.9], [74.6, 31.1], [75.0, 32.4], [75.3, 32.9], [74.3, 34.0], [73.3, 34.7],
  [72.8, 35.7]
];

export const INDIA_PATH =
  'M' + OUTLINE.map(([lo, la]) => proj(lo, la).map(n => n.toFixed(1)).join(',')).join(' L') + ' Z';

export const ISLANDS: { name: string; pts: [number, number][]; label: [number, number] }[] = [
  { name: 'ANDAMAN & NICOBAR', label: [93.2, 6.0], pts: [[92.9, 13.2], [92.7, 12.4], [92.8, 11.7], [93.0, 10.9], [93.6, 9.2], [93.8, 8.2], [93.7, 7.2]] },
  { name: 'LAKSHADWEEP', label: [72.4, 8.2], pts: [[72.64, 10.57], [72.18, 10.8], [73.05, 10.1], [72.75, 11.2], [72.3, 10.0]] }
];

export const CITIES: { name: string; ll: [number, number] }[] = [
  { name: 'Delhi', ll: [77.21, 28.61] }, { name: 'Mumbai', ll: [72.88, 19.08] },
  { name: 'Kolkata', ll: [88.36, 22.57] }, { name: 'Chennai', ll: [80.27, 13.08] },
  { name: 'Bengaluru', ll: [77.59, 12.97] }, { name: 'Hyderabad', ll: [78.47, 17.39] }
];

export const REGIONS: { name: string; ll: [number, number] }[] = [
  { name: 'LADAKH', ll: [77.6, 34.4] }, { name: 'J&K', ll: [75.0, 33.7] }, { name: 'PUNJAB', ll: [75.0, 30.9] },
  { name: 'RAJASTHAN', ll: [73.6, 26.3] }, { name: 'GUJARAT', ll: [71.2, 22.4] }, { name: 'M.P.', ll: [78.0, 23.4] },
  { name: 'MAHARASHTRA', ll: [75.8, 19.4] }, { name: 'TELANGANA', ll: [79.0, 18.2] }, { name: 'KARNATAKA', ll: [75.6, 14.6] },
  { name: 'TAMIL NADU', ll: [78.3, 10.9] }, { name: 'ODISHA', ll: [84.2, 20.6] }, { name: 'BENGAL', ll: [87.6, 24.0] },
  { name: 'ASSAM', ll: [92.4, 26.6] }, { name: 'BIHAR', ll: [85.6, 25.7] }
];

// Real home bases for each leader: [lon, lat, label side]
export const LEADER_LOC: Record<string, { ll: [number, number]; place: string; side: 'l' | 'r' }> = {
  modi: { ll: [82.97, 25.32], place: 'Varanasi', side: 'r' },
  shah: { ll: [72.65, 23.22], place: 'Gandhinagar', side: 'l' },
  rahul: { ll: [76.08, 11.6], place: 'Wayanad', side: 'l' },
  yogi: { ll: [83.37, 26.76], place: 'Gorakhpur', side: 'r' },
  rajnath: { ll: [80.95, 26.85], place: 'Lucknow', side: 'l' },
  sitharaman: { ll: [80.27, 13.08], place: 'Chennai', side: 'r' },
  kharge: { ll: [76.83, 17.33], place: 'Kalaburagi', side: 'l' },
  kejriwal: { ll: [77.21, 28.61], place: 'New Delhi', side: 'l' },
  mamata: { ll: [88.36, 22.57], place: 'Kolkata', side: 'r' }
};
