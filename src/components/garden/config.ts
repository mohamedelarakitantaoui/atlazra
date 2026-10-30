/** Coordinates are metres, centred on the plot; +z faces the garden entrance. */
export type Position = [x: number, y: number, z: number];
export type GardenState = 'current' | 'project';
export interface GardenBox {
  size: [width: number, height: number, depth: number];
  position: Position;
}
export interface GardenConfig {
  plot: { width: number; depth: number; plinthHeight: number };
  house: { body: GardenBox; roof: GardenBox; window: GardenBox };
  trees: { x: number; z: number; radius: number; color: string }[];
  pool: { position: Position; coping: GardenBox; water: GardenBox } | null;
  path: { size: GardenBox['size']; position: Position; rotation: number }[];
  beds: { x: number; z: number; flowers: number }[];
  terrace: GardenBox;
  hedge: GardenBox;
  pergola: {
    position: Position;
    width: number;
    depth: number;
    height: number;
    slats: number;
  };
  states: {
    current: {
      stakes: { x: number; z: number }[];
      rocks: { x: number; z: number; radius: number }[];
    };
    project: { lawnInset: number; lawnHeight: number };
  };
}

/** The approved reference garden; callers can supply a complete project config. */
export const defaultGardenConfig: GardenConfig = {
  plot: { width: 20, depth: 14, plinthHeight: 1.2 },
  house: {
    body: { size: [9, 3.2, 4.2], position: [0, 1.6, -4.9] },
    roof: { size: [9.6, 0.25, 4.8], position: [0, 3.3, -4.9] },
    window: { size: [3.6, 2.2, 0.05], position: [-1.6, 1.3, -2.79] },
  },
  trees: [
    { x: -7.6, z: -4.8, radius: 1.6, color: '#4f7a50' },
    { x: 7.9, z: -5.2, radius: 1.8, color: '#6f9a63' },
    { x: -6.8, z: 3.6, radius: 1.3, color: '#87ad74' },
    { x: -2.6, z: 5.6, radius: 1, color: '#6f9a63' },
    { x: 8.6, z: 5.6, radius: 1.15, color: '#4f7a50' },
  ],
  pool: {
    position: [5.2, 0, 3],
    coping: { size: [6.4, 0.34, 3.2], position: [0, 0.17, 0] },
    water: { size: [5.8, 0.36, 2.6], position: [0, 0.19, 0] },
  },
  path: Array.from({ length: 7 }, (_, i) => ({
    size: [1.5, 0.12, 0.8],
    position: [Math.sin((i / 6) * 1.6) * -2.6, 0.15, 0.6 + (i / 6) * 5.8],
    rotation: -(i / 6) * 0.5,
  })),
  beds: [
    { x: 3.2, z: -0.2, flowers: 9 },
    { x: -5.4, z: -0.4, flowers: 9 },
    { x: -4.6, z: 6, flowers: 9 },
  ],
  terrace: { size: [9, 0.22, 2.6], position: [0, 0.11, -1.5] },
  hedge: { size: [0.8, 0.9, 10.5], position: [-9.4, 0.45, 1.4] },
  pergola: {
    position: [-2.5, 0, -1.5],
    width: 3.2,
    depth: 2.2,
    height: 2.4,
    slats: 7,
  },
  states: {
    current: {
      stakes: [
        { x: -6, z: -1 },
        { x: 6, z: -1 },
        { x: -6, z: 5 },
        { x: 6, z: 5 },
        { x: 0, z: 2 },
      ],
      rocks: [
        { x: -3, z: 4, radius: 0.45 },
        { x: 4.5, z: 0, radius: 0.35 },
        { x: 8, z: 4, radius: 0.5 },
        { x: -8, z: -1, radius: 0.4 },
      ],
    },
    project: { lawnInset: 0.2, lawnHeight: 0.14 },
  },
};
