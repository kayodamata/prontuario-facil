export type ToothVariant =
  | "incisor"
  | "canine"
  | "premolar"
  | "upperMolar"
  | "lowerMolar";

export interface ToothShapeDef {
  variant: ToothVariant;
  outline: string;
  crown: string;
  canals: { x: number; yTop: number; yBottom: number }[];
  grooves: string[];
  crownClipY: number;
}

export const SHAPES: Record<ToothVariant, ToothShapeDef> = {
  incisor: {
    variant: "incisor",
    outline:
      "M 40 8 C 44 3, 76 3, 80 8 C 84 14, 87 22, 88 30 C 90 42, 88 52, 86 60 " +
      "C 84 66, 82 70, 81 74 L 81 128 C 80 140, 78 146, 72 149 C 65 151, 54 151, 48 149 " +
      "C 42 146, 40 140, 39 128 L 39 74 C 38 70, 36 66, 34 60 C 32 52, 30 42, 32 30 " +
      "C 33 22, 36 14, 40 8 Z",
    crown:
      "M 40 8 C 44 3, 76 3, 80 8 C 84 14, 87 22, 88 30 C 90 42, 88 52, 86 60 " +
      "C 84 66, 82 70, 81 74 L 39 74 C 38 70, 36 66, 34 60 C 32 52, 30 42, 32 30 " +
      "C 33 22, 36 14, 40 8 Z",
    canals: [{ x: 60, yTop: 56, yBottom: 142 }],
    grooves: [],
    crownClipY: 72,
  },
  canine: {
    variant: "canine",
    outline:
      "M 46 4 C 48 0, 56 0, 60 3 C 65 7, 69 14, 72 22 C 75 32, 77 42, 78 50 " +
      "C 79 60, 77 68, 75 74 C 73 78, 72 82, 71 86 L 71 138 C 70 150, 67 155, 60 157 " +
      "C 52 159, 45 155, 43 143 L 43 86 C 42 82, 41 78, 39 74 C 37 68, 35 60, 36 50 " +
      "C 37 38, 39 20, 46 4 Z",
    crown:
      "M 46 4 C 48 0, 56 0, 60 3 C 65 7, 69 14, 72 22 C 75 32, 77 42, 78 50 " +
      "C 79 60, 77 68, 75 74 C 73 78, 72 82, 71 86 L 43 86 C 42 82, 41 78, 39 74 " +
      "C 37 68, 35 60, 36 50 C 37 38, 39 20, 46 4 Z",
    canals: [{ x: 57, yTop: 62, yBottom: 148 }],
    grooves: [],
    crownClipY: 84,
  },
  premolar: {
    variant: "premolar",
    outline:
      "M 34 10 C 36 5, 45 3, 51 4 C 56 4, 61 6, 64 10 C 70 14, 76 20, 79 28 " +
      "C 82 38, 83 48, 82 58 C 81 66, 80 72, 78 78 C 77 82, 76 86, 75 90 L 75 130 " +
      "C 74 144, 71 149, 64 151 C 56 153, 44 153, 38 151 C 31 149, 28 144, 27 130 " +
      "L 27 90 C 26 86, 25 82, 24 78 C 22 72, 21 66, 20 58 C 19 48, 20 38, 23 28 " +
      "C 26 20, 30 14, 34 10 Z",
    crown:
      "M 34 10 C 36 5, 45 3, 51 4 C 56 4, 61 6, 64 10 C 70 14, 76 20, 79 28 " +
      "C 82 38, 83 48, 82 58 C 81 66, 80 72, 78 78 C 77 82, 76 86, 75 90 L 27 90 " +
      "C 26 86, 25 82, 24 78 C 22 72, 21 66, 20 58 C 19 48, 20 38, 23 28 C 26 20, 30 14, 34 10 Z",
    canals: [
      { x: 42, yTop: 60, yBottom: 140 },
      { x: 68, yTop: 60, yBottom: 140 },
    ],
    grooves: ["M 42 12 C 47 20, 53 22, 60 18"],
    crownClipY: 88,
  },
  upperMolar: {
    variant: "upperMolar",
    outline:
      "M 22 14 C 24 6, 38 3, 48 4 C 58 4, 70 5, 78 9 C 86 13, 92 20, 95 28 " +
      "C 98 38, 99 48, 98 56 C 97 62, 95 66, 93 68 L 93 70 C 96 84, 97 108, 96 124 " +
      "C 95 134, 92 140, 85 141 L 80 141 C 75 141, 74 136, 74 126 L 74 96 " +
      "C 72 90, 68 90, 66 96 L 66 128 C 65 139, 62 145, 55 146 C 48 147, 45 141, 44 130 " +
      "L 44 96 C 42 90, 38 90, 36 96 L 36 126 C 35 136, 34 141, 28 141 L 24 141 " +
      "C 17 140, 15 134, 16 124 C 17 108, 18 84, 21 70 C 19 66, 18 62, 17 56 " +
      "C 16 48, 17 38, 22 14 Z",
    crown:
      "M 22 14 C 24 6, 38 3, 48 4 C 58 4, 70 5, 78 9 C 86 13, 92 20, 95 28 " +
      "C 98 38, 99 48, 98 56 C 97 62, 95 66, 93 68 L 21 70 C 19 66, 18 62, 17 56 " +
      "C 16 48, 17 38, 22 14 Z",
    canals: [
      { x: 32, yTop: 56, yBottom: 138 },
      { x: 55, yTop: 56, yBottom: 141 },
      { x: 84, yTop: 56, yBottom: 138 },
    ],
    grooves: [
      "M 30 30 C 42 25, 58 25, 70 30",
      "M 50 18 C 48 28, 48 40, 50 54",
    ],
    crownClipY: 58,
  },
  lowerMolar: {
    variant: "lowerMolar",
    outline:
      "M 22 14 C 24 6, 38 3, 48 4 C 58 4, 70 5, 78 9 C 86 13, 92 20, 95 28 " +
      "C 98 38, 99 48, 98 56 C 97 62, 95 66, 93 68 L 93 70 C 97 88, 98 116, 96 130 " +
      "C 95 140, 91 145, 84 146 L 78 146 C 73 146, 72 140, 72 128 L 72 100 " +
      "C 69 95, 63 95, 60 100 L 60 130 C 59 141, 55 146, 48 147 L 43 147 " +
      "C 37 146, 35 140, 35 128 L 35 100 C 32 95, 26 95, 23 100 C 19 108, 17 118, 17 128 " +
      "C 17 137, 16 143, 12 145 L 9 145 C 6 142, 6 134, 7 124 C 8 112, 12 96, 17 84 " +
      "C 20 76, 21 72, 21 70 C 19 66, 18 62, 17 56 C 16 48, 17 38, 22 14 Z",
    crown:
      "M 22 14 C 24 6, 38 3, 48 4 C 58 4, 70 5, 78 9 C 86 13, 92 20, 95 28 " +
      "C 98 38, 99 48, 98 56 C 97 62, 95 66, 93 68 L 21 70 C 19 66, 18 62, 17 56 " +
      "C 16 48, 17 38, 22 14 Z",
    canals: [
      { x: 38, yTop: 56, yBottom: 138 },
      { x: 78, yTop: 56, yBottom: 138 },
    ],
    grooves: [
      "M 30 30 C 42 25, 58 25, 70 30",
      "M 50 18 C 48 28, 48 40, 50 54",
    ],
    crownClipY: 58,
  },
};

export interface ToothDef {
  tooth: number;
  name: string;
  variant: ToothVariant;
}

export const MAXILLARY_TEETH: ToothDef[] = [
  { tooth: 18, name: "3º molar superior direito", variant: "upperMolar" },
  { tooth: 17, name: "2º molar superior direito", variant: "upperMolar" },
  { tooth: 16, name: "1º molar superior direito", variant: "upperMolar" },
  { tooth: 15, name: "2º pré-molar superior direito", variant: "premolar" },
  { tooth: 14, name: "1º pré-molar superior direito", variant: "premolar" },
  { tooth: 13, name: "Canino superior direito", variant: "canine" },
  { tooth: 12, name: "Incisivo lateral superior direito", variant: "incisor" },
  { tooth: 11, name: "Incisivo central superior direito", variant: "incisor" },
  { tooth: 21, name: "Incisivo central superior esquerdo", variant: "incisor" },
  { tooth: 22, name: "Incisivo lateral superior esquerdo", variant: "incisor" },
  { tooth: 23, name: "Canino superior esquerdo", variant: "canine" },
  { tooth: 24, name: "1º pré-molar superior esquerdo", variant: "premolar" },
  { tooth: 25, name: "2º pré-molar superior esquerdo", variant: "premolar" },
  { tooth: 26, name: "1º molar superior esquerdo", variant: "upperMolar" },
  { tooth: 27, name: "2º molar superior esquerdo", variant: "upperMolar" },
  { tooth: 28, name: "3º molar superior esquerdo", variant: "upperMolar" },
];

export const MANDIBULAR_TEETH: ToothDef[] = [
  { tooth: 48, name: "3º molar inferior direito", variant: "lowerMolar" },
  { tooth: 47, name: "2º molar inferior direito", variant: "lowerMolar" },
  { tooth: 46, name: "1º molar inferior direito", variant: "lowerMolar" },
  { tooth: 45, name: "2º pré-molar inferior direito", variant: "premolar" },
  { tooth: 44, name: "1º pré-molar inferior direito", variant: "premolar" },
  { tooth: 43, name: "Canino inferior direito", variant: "canine" },
  { tooth: 42, name: "Incisivo lateral inferior direito", variant: "incisor" },
  { tooth: 41, name: "Incisivo central inferior direito", variant: "incisor" },
  { tooth: 31, name: "Incisivo central inferior esquerdo", variant: "incisor" },
  { tooth: 32, name: "Incisivo lateral inferior esquerdo", variant: "incisor" },
  { tooth: 33, name: "Canino inferior esquerdo", variant: "canine" },
  { tooth: 34, name: "1º pré-molar inferior esquerdo", variant: "premolar" },
  { tooth: 35, name: "2º pré-molar inferior esquerdo", variant: "premolar" },
  { tooth: 36, name: "1º molar inferior esquerdo", variant: "lowerMolar" },
  { tooth: 37, name: "2º molar inferior esquerdo", variant: "lowerMolar" },
  { tooth: 38, name: "3º molar inferior esquerdo", variant: "lowerMolar" },
];

export const TOOTH_LOOKUP: Record<number, ToothDef> = Object.fromEntries(
  [...MAXILLARY_TEETH, ...MANDIBULAR_TEETH].map((t) => [t.tooth, t]),
);

const CANAL_LABELS: Record<ToothVariant, string[]> = {
  incisor: ["Conduto radicular"],
  canine: ["Conduto radicular"],
  premolar: ["Conduto vestibular", "Conduto palatino/lingual"],
  upperMolar: [
    "Conduto mesiovestibular",
    "Conduto palatino",
    "Conduto distovestibular",
  ],
  lowerMolar: ["Conduto mesial", "Conduto distal"],
};

export const toothCanalLabels = (variant: ToothVariant) =>
  CANAL_LABELS[variant] ?? [];
