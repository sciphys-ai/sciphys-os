export type XRDReferencePeak = {
  twoTheta: number
  intensity: number
  hkl?: string
  dSpacing?: number
}

export type XRDStructureSite = {
  label: string
  element: string
  a: number
  b: number
  c: number
  occupancy?: number
  bIso?: number
}

export type XRDStructureInfo = {
  materialId?: string
  sourceUrl?: string
  verified?: boolean
  lattice: {
    a: number
    b: number
    c: number
    alpha: number
    beta: number
    gamma: number
    volume?: number
  }
  symmetry?: {
    crystalSystem?: string
    latticeSystem?: string
    symbol?: string
    internationalNumber?: number
    hallNumber?: string
  }
  sites: XRDStructureSite[]
  properties?: {
    numberOfAtoms?: number
    density?: number
    dimensionality?: string
    oxidationStates?: string
  }
  description?: string
  source?: string
}

export type XRDElectronicInfo = {
  energyAboveHull?: string
  bandGap?: string
  predictedFormationEnergy?: string
  magneticOrdering?: string
  totalMagnetization?: string
  experimentallyObserved?: string
  notes?: string[]
  sources?: string[]
}

export type XRDReferencePhase = {
  id: string
  name: string
  formula: string
  crystalSystem?: string
  spaceGroup?: string
  source: string
  sourceId?: string
  wavelength?: number
  notes?: string
  peaks: XRDReferencePeak[]
  structure?: XRDStructureInfo
  electronic?: XRDElectronicInfo
}

export type XRDObservedPeak = {
  twoTheta: number
  dSpacing: number
  relativeIntensity: number
}

export type XRDReferencePeakMatch = {
  observed: XRDObservedPeak
  reference: XRDReferencePeak
  deltaTwoTheta: number
}

export type XRDReferenceMatch = {
  phase: XRDReferencePhase
  score: number
  matchedPeaks: XRDReferencePeakMatch[]
  missingStrongPeaks: XRDReferencePeak[]
  unexplainedObservedPeaks: XRDObservedPeak[]
  compositionScore?: number
  phaseRole?: "major" | "minor" | "trace" | "candidate"
  newlyExplainedPeaks?: XRDObservedPeak[]
  residualAfterPeaks?: XRDObservedPeak[]
  incrementalScore?: number
}

export const BUILTIN_XRD_REFERENCE_PHASES: XRDReferencePhase[] = [
  {
    id: "lifepo4-olivine",
    name: "Lithium Iron Phosphate",
    formula: "LiFePO4",
    crystalSystem: "orthorhombic",
    spaceGroup: "Pnma",
    source: "SciPhys curated",
    sourceId: "PDF 00-040-1499",
    wavelength: 1.5406,
    notes:
      "Olivine LFP battery cathode. Principal Cu K-alpha reflections from recent literature.",
    structure: {
      materialId: "mp-19017",
      lattice: {
        a: 4.65,
        b: 5.97,
        c: 10.24,
        alpha: 90,
        beta: 90,
        gamma: 90,
        volume: 284.5,
      },
      symmetry: {
        crystalSystem: "Orthorhombic",
        latticeSystem: "Orthorhombic",
        symbol: "Pnma",
        internationalNumber: 62,
        hallNumber: "-P 2ac 2n",
      },
      sites: [
        { label: "4a", element: "Li", a: 0, b: 0, c: 0 },
        { label: "4c", element: "Fe", a: 0.529866, b: 0.25, c: 0.781151 },
        { label: "4c", element: "P", a: 0.418623, b: 0.25, c: 0.093866 },
        { label: "4c", element: "O", a: 0.744787, b: 0.25, c: 0.094231 },
        { label: "4c", element: "O", a: 0.709864, b: 0.75, c: 0.044309 },
        { label: "8d", element: "O", a: 0.713735, b: 0.545558, c: 0.834155 },
      ],
      properties: {
        numberOfAtoms: 28,
        density: 3.68,
        dimensionality: "3D",
        oxidationStates: "O2-, Fe2+, P5+, Li+",
      },
      description:
        "Olivine LiFePO4 in the orthorhombic Pnma setting. The listed sites are representative crystallographic positions for phase context and should be cross-checked before publication.",
      source: "Materials Project style summary; mp-19017 reference values",
    },
    electronic: {
      energyAboveHull: "0.000 eV/atom",
      bandGap: "3.92 eV",
      predictedFormationEnergy: "-2.480 eV/atom",
      magneticOrdering: "Ferromagnetic",
      totalMagnetization: "4.00 µB/f.u.",
      experimentallyObserved: "Yes",
      notes: [
        "Electronic and magnetic fields mirror the Materials Project summary style for quick context.",
        "Use the linked CIF / MP record or primary literature for publishable values.",
      ],
      sources: ["Materials Project mp-19017"],
    },
    peaks: [
      { twoTheta: 17.1, intensity: 40, hkl: "020" },
      { twoTheta: 20.8, intensity: 35, hkl: "011" },
      { twoTheta: 25.6, intensity: 45, hkl: "111" },
      { twoTheta: 29.7, intensity: 100, hkl: "121" },
      { twoTheta: 32.2, intensity: 55, hkl: "211" },
      { twoTheta: 35.6, intensity: 85, hkl: "131" },
      { twoTheta: 36.5, intensity: 45, hkl: "221" },
      { twoTheta: 37.9, intensity: 40, hkl: "311" },
    ],
  },
  {
    id: "na3v2po43-nasicon",
    name: "Sodium Vanadium Phosphate",
    formula: "Na3V2(PO4)3",
    crystalSystem: "rhombohedral",
    spaceGroup: "R-3c",
    source: "SciPhys curated",
    sourceId: "JCPDS 00-062-0345",
    wavelength: 1.5406,
    notes:
      "NASICON NVP battery cathode. Principal Cu K-alpha reflections from published NVP indexing.",
    structure: {
      lattice: {
        a: 8.73,
        b: 8.73,
        c: 21.8,
        alpha: 90,
        beta: 90,
        gamma: 120,
      },
      symmetry: {
        crystalSystem: "Rhombohedral",
        latticeSystem: "Hexagonal setting",
        symbol: "R-3c",
      },
      sites: [
        { label: "6b", element: "Na", a: 0, b: 0, c: 0 },
        { label: "18e", element: "Na", a: 0.65, b: 0, c: 0.25 },
        { label: "12c", element: "V", a: 0, b: 0, c: 0.15 },
        { label: "18e", element: "P", a: 0.29, b: 0, c: 0.25 },
        { label: "36f", element: "O", a: 0.18, b: 0.15, c: 0.08 },
        { label: "36f", element: "O", a: 0.47, b: 0.17, c: 0.2 },
      ],
      properties: {
        dimensionality: "3D",
        oxidationStates: "Na+, V3+, P5+, O2-",
      },
      description:
        "NASICON-type sodium vanadium phosphate in an R-3c framework. Site positions are approximate placeholders until a verified CIF is attached.",
      source: "SciPhys curated structural scaffold",
    },
    electronic: {
      notes: [
        "NVP is commonly discussed as a NASICON sodium-ion cathode; electronic values depend on oxidation state, calculation settings, and source CIF.",
        "Attach a verified CIF or Materials Project record to make this card publication-grade.",
      ],
    },
    peaks: [
      { twoTheta: 14.34, intensity: 45, hkl: "012" },
      { twoTheta: 20.21, intensity: 40, hkl: "104" },
      { twoTheta: 23.91, intensity: 90, hkl: "113" },
      { twoTheta: 28.91, intensity: 85, hkl: "024" },
      { twoTheta: 31.74, intensity: 55, hkl: "211" },
      { twoTheta: 32.26, intensity: 100, hkl: "116" },
      { twoTheta: 35.81, intensity: 70, hkl: "300" },
      { twoTheta: 43.51, intensity: 45, hkl: "1010" },
      { twoTheta: 48.44, intensity: 38, hkl: "315" },
      { twoTheta: 49.18, intensity: 36, hkl: "042" },
    ],
  },
  {
    id: "zno-wurtzite",
    name: "Zinc Oxide",
    formula: "ZnO",
    crystalSystem: "hexagonal",
    spaceGroup: "P63mc",
    source: "SciPhys curated",
    sourceId: "JCPDS 36-1451",
    wavelength: 1.5406,
    notes: "Common wurtzite ZnO reference for Cu K-alpha radiation.",
    structure: {
      lattice: {
        a: 3.25,
        b: 3.25,
        c: 5.21,
        alpha: 90,
        beta: 90,
        gamma: 120,
        volume: 47.6,
      },
      symmetry: {
        crystalSystem: "Hexagonal",
        latticeSystem: "Hexagonal",
        symbol: "P63mc",
        internationalNumber: 186,
      },
      sites: [
        { label: "2b", element: "Zn", a: 0.3333, b: 0.6667, c: 0 },
        { label: "2b", element: "Zn", a: 0.6667, b: 0.3333, c: 0.5 },
        { label: "2b", element: "O", a: 0.3333, b: 0.6667, c: 0.382 },
        { label: "2b", element: "O", a: 0.6667, b: 0.3333, c: 0.882 },
      ],
      properties: {
        numberOfAtoms: 4,
        density: 5.61,
        dimensionality: "3D",
        oxidationStates: "Zn2+, O2-",
      },
      description:
        "Wurtzite ZnO in the hexagonal P63mc setting. Useful for checking the expected (100), (002), and (101) reflections.",
      source: "SciPhys curated wurtzite structure",
    },
    electronic: {
      bandGap: "~3.3 eV",
      experimentallyObserved: "Yes",
      notes: ["Wide-band-gap semiconductor; literature band gaps vary with method and defect chemistry."],
    },
    peaks: [
      { twoTheta: 31.77, intensity: 56, hkl: "100" },
      { twoTheta: 34.42, intensity: 45, hkl: "002" },
      { twoTheta: 36.25, intensity: 100, hkl: "101" },
      { twoTheta: 47.54, intensity: 22, hkl: "102" },
      { twoTheta: 56.6, intensity: 31, hkl: "110" },
      { twoTheta: 62.86, intensity: 28, hkl: "103" },
      { twoTheta: 66.38, intensity: 6, hkl: "200" },
      { twoTheta: 67.96, intensity: 23, hkl: "112" },
      { twoTheta: 69.1, intensity: 11, hkl: "201" },
    ],
  },
  {
    id: "si-diamond",
    name: "Silicon",
    formula: "Si",
    crystalSystem: "cubic",
    spaceGroup: "Fd-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 27-1402",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 28.44, intensity: 100, hkl: "111" },
      { twoTheta: 47.3, intensity: 55, hkl: "220" },
      { twoTheta: 56.12, intensity: 30, hkl: "311" },
      { twoTheta: 69.13, intensity: 6, hkl: "400" },
      { twoTheta: 76.37, intensity: 11, hkl: "331" },
      { twoTheta: 88.03, intensity: 12, hkl: "422" },
    ],
  },
  {
    id: "au-fcc",
    name: "Gold",
    formula: "Au",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 04-0784",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 38.18, intensity: 100, hkl: "111" },
      { twoTheta: 44.39, intensity: 52, hkl: "200" },
      { twoTheta: 64.58, intensity: 32, hkl: "220" },
      { twoTheta: 77.55, intensity: 36, hkl: "311" },
      { twoTheta: 81.72, intensity: 12, hkl: "222" },
    ],
  },
  {
    id: "ag-fcc",
    name: "Silver",
    formula: "Ag",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 04-0783",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 38.12, intensity: 100, hkl: "111" },
      { twoTheta: 44.28, intensity: 40, hkl: "200" },
      { twoTheta: 64.43, intensity: 25, hkl: "220" },
      { twoTheta: 77.47, intensity: 26, hkl: "311" },
      { twoTheta: 81.54, intensity: 7, hkl: "222" },
    ],
  },
  {
    id: "cu-fcc",
    name: "Copper",
    formula: "Cu",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 04-0836",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 43.3, intensity: 100, hkl: "111" },
      { twoTheta: 50.43, intensity: 46, hkl: "200" },
      { twoTheta: 74.13, intensity: 20, hkl: "220" },
      { twoTheta: 89.93, intensity: 17, hkl: "311" },
    ],
  },
  {
    id: "pt-fcc",
    name: "Platinum",
    formula: "Pt",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 04-0802",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 39.76, intensity: 100, hkl: "111" },
      { twoTheta: 46.24, intensity: 53, hkl: "200" },
      { twoTheta: 67.45, intensity: 34, hkl: "220" },
      { twoTheta: 81.29, intensity: 36, hkl: "311" },
      { twoTheta: 85.73, intensity: 13, hkl: "222" },
    ],
  },
  {
    id: "al-fcc",
    name: "Aluminum",
    formula: "Al",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 04-0787",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 38.47, intensity: 100, hkl: "111" },
      { twoTheta: 44.74, intensity: 47, hkl: "200" },
      { twoTheta: 65.13, intensity: 22, hkl: "220" },
      { twoTheta: 78.22, intensity: 24, hkl: "311" },
      { twoTheta: 82.44, intensity: 7, hkl: "222" },
    ],
  },
  {
    id: "nio-rocksalt",
    name: "Nickel Oxide",
    formula: "NiO",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 47-1049",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 37.25, intensity: 62, hkl: "111" },
      { twoTheta: 43.28, intensity: 100, hkl: "200" },
      { twoTheta: 62.88, intensity: 48, hkl: "220" },
      { twoTheta: 75.41, intensity: 16, hkl: "311" },
      { twoTheta: 79.41, intensity: 16, hkl: "222" },
    ],
  },
  {
    id: "tio2-anatase",
    name: "Titanium Dioxide",
    formula: "TiO2",
    crystalSystem: "tetragonal",
    spaceGroup: "I41/amd",
    source: "SciPhys curated",
    sourceId: "ICDD 21-1272",
    wavelength: 1.5406,
    notes: "Anatase polymorph.",
    peaks: [
      { twoTheta: 25.28, intensity: 100, hkl: "101" },
      { twoTheta: 37.8, intensity: 20, hkl: "004" },
      { twoTheta: 48.05, intensity: 35, hkl: "200" },
      { twoTheta: 53.89, intensity: 20, hkl: "105" },
      { twoTheta: 55.06, intensity: 20, hkl: "211" },
      { twoTheta: 62.69, intensity: 14, hkl: "204" },
      { twoTheta: 68.76, intensity: 12, hkl: "116" },
      { twoTheta: 70.31, intensity: 9, hkl: "220" },
    ],
  },
  {
    id: "tio2-rutile",
    name: "Titanium Dioxide",
    formula: "TiO2",
    crystalSystem: "tetragonal",
    spaceGroup: "P42/mnm",
    source: "SciPhys curated",
    sourceId: "ICDD 21-1276",
    wavelength: 1.5406,
    notes: "Rutile polymorph.",
    peaks: [
      { twoTheta: 27.45, intensity: 100, hkl: "110" },
      { twoTheta: 36.09, intensity: 50, hkl: "101" },
      { twoTheta: 39.19, intensity: 8, hkl: "200" },
      { twoTheta: 41.23, intensity: 25, hkl: "111" },
      { twoTheta: 44.05, intensity: 8, hkl: "210" },
      { twoTheta: 54.32, intensity: 60, hkl: "211" },
      { twoTheta: 56.64, intensity: 20, hkl: "220" },
      { twoTheta: 69.01, intensity: 20, hkl: "301" },
    ],
  },
  {
    id: "ceo2-fluorite",
    name: "Cerium Dioxide",
    formula: "CeO2",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 34-0394",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 28.55, intensity: 100, hkl: "111" },
      { twoTheta: 33.08, intensity: 28, hkl: "200" },
      { twoTheta: 47.48, intensity: 46, hkl: "220" },
      { twoTheta: 56.34, intensity: 35, hkl: "311" },
      { twoTheta: 59.09, intensity: 8, hkl: "222" },
      { twoTheta: 69.4, intensity: 12, hkl: "400" },
      { twoTheta: 76.7, intensity: 11, hkl: "331" },
      { twoTheta: 79.08, intensity: 6, hkl: "420" },
    ],
  },
  {
    id: "al2o3-corundum",
    name: "Aluminum Oxide",
    formula: "Al2O3",
    crystalSystem: "trigonal",
    spaceGroup: "R-3c",
    source: "SciPhys curated",
    sourceId: "ICDD 46-1212",
    wavelength: 1.5406,
    notes: "Alpha-alumina corundum.",
    peaks: [
      { twoTheta: 25.58, intensity: 43, hkl: "012" },
      { twoTheta: 35.15, intensity: 100, hkl: "104" },
      { twoTheta: 37.78, intensity: 52, hkl: "110" },
      { twoTheta: 43.35, intensity: 80, hkl: "113" },
      { twoTheta: 52.55, intensity: 45, hkl: "024" },
      { twoTheta: 57.5, intensity: 60, hkl: "116" },
      { twoTheta: 66.51, intensity: 35, hkl: "214" },
      { twoTheta: 68.2, intensity: 30, hkl: "300" },
    ],
  },
  {
    id: "fe2o3-hematite",
    name: "Iron(III) Oxide",
    formula: "Fe2O3",
    crystalSystem: "trigonal",
    spaceGroup: "R-3c",
    source: "SciPhys curated",
    sourceId: "ICDD 33-0664",
    wavelength: 1.5406,
    notes: "Alpha-Fe2O3 hematite.",
    peaks: [
      { twoTheta: 24.14, intensity: 40, hkl: "012" },
      { twoTheta: 33.15, intensity: 100, hkl: "104" },
      { twoTheta: 35.61, intensity: 70, hkl: "110" },
      { twoTheta: 40.85, intensity: 20, hkl: "113" },
      { twoTheta: 49.48, intensity: 40, hkl: "024" },
      { twoTheta: 54.09, intensity: 60, hkl: "116" },
      { twoTheta: 57.58, intensity: 18, hkl: "122" },
      { twoTheta: 62.45, intensity: 28, hkl: "214" },
      { twoTheta: 64.0, intensity: 25, hkl: "300" },
    ],
  },
  {
    id: "fe3o4-magnetite",
    name: "Iron Oxide",
    formula: "Fe3O4",
    crystalSystem: "cubic",
    spaceGroup: "Fd-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 19-0629",
    wavelength: 1.5406,
    notes: "Magnetite spinel.",
    peaks: [
      { twoTheta: 30.1, intensity: 35, hkl: "220" },
      { twoTheta: 35.45, intensity: 100, hkl: "311" },
      { twoTheta: 43.1, intensity: 30, hkl: "400" },
      { twoTheta: 53.55, intensity: 20, hkl: "422" },
      { twoTheta: 57.0, intensity: 55, hkl: "511" },
      { twoTheta: 62.6, intensity: 40, hkl: "440" },
      { twoTheta: 74.0, intensity: 12, hkl: "533" },
    ],
  },
  {
    id: "sio2-quartz",
    name: "Silicon Dioxide",
    formula: "SiO2",
    crystalSystem: "trigonal",
    spaceGroup: "P3121",
    source: "SciPhys curated",
    sourceId: "ICDD 46-1045",
    wavelength: 1.5406,
    notes: "Alpha-quartz.",
    peaks: [
      { twoTheta: 20.86, intensity: 22, hkl: "100" },
      { twoTheta: 26.64, intensity: 100, hkl: "101" },
      { twoTheta: 36.54, intensity: 9, hkl: "110" },
      { twoTheta: 39.46, intensity: 8, hkl: "102" },
      { twoTheta: 50.14, intensity: 13, hkl: "112" },
      { twoTheta: 59.96, intensity: 9, hkl: "211" },
      { twoTheta: 68.1, intensity: 7, hkl: "203" },
    ],
  },
  {
    id: "caco3-calcite",
    name: "Calcium Carbonate",
    formula: "CaCO3",
    crystalSystem: "trigonal",
    spaceGroup: "R-3c",
    source: "SciPhys curated",
    sourceId: "ICDD 05-0586",
    wavelength: 1.5406,
    notes: "Calcite polymorph.",
    peaks: [
      { twoTheta: 23.05, intensity: 12, hkl: "012" },
      { twoTheta: 29.4, intensity: 100, hkl: "104" },
      { twoTheta: 35.97, intensity: 14, hkl: "110" },
      { twoTheta: 39.43, intensity: 18, hkl: "113" },
      { twoTheta: 43.15, intensity: 18, hkl: "202" },
      { twoTheta: 47.49, intensity: 17, hkl: "018" },
      { twoTheta: 48.5, intensity: 18, hkl: "116" },
      { twoTheta: 57.47, intensity: 8, hkl: "122" },
    ],
  },
  {
    id: "mgo-rocksalt",
    name: "Magnesium Oxide",
    formula: "MgO",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 45-0946",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 36.94, intensity: 9, hkl: "111" },
      { twoTheta: 42.92, intensity: 100, hkl: "200" },
      { twoTheta: 62.3, intensity: 46, hkl: "220" },
      { twoTheta: 74.67, intensity: 8, hkl: "311" },
      { twoTheta: 78.62, intensity: 15, hkl: "222" },
    ],
  },
  {
    id: "nacl-rocksalt",
    name: "Sodium Chloride",
    formula: "NaCl",
    crystalSystem: "cubic",
    spaceGroup: "Fm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 05-0628",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 27.32, intensity: 17, hkl: "111" },
      { twoTheta: 31.69, intensity: 100, hkl: "200" },
      { twoTheta: 45.45, intensity: 55, hkl: "220" },
      { twoTheta: 53.86, intensity: 6, hkl: "311" },
      { twoTheta: 56.47, intensity: 15, hkl: "222" },
      { twoTheta: 66.29, intensity: 8, hkl: "400" },
      { twoTheta: 75.27, intensity: 12, hkl: "420" },
    ],
  },
  {
    id: "srtio3-cubic",
    name: "Strontium Titanate",
    formula: "SrTiO3",
    crystalSystem: "cubic",
    spaceGroup: "Pm-3m",
    source: "SciPhys curated",
    sourceId: "ICDD 35-0734",
    wavelength: 1.5406,
    peaks: [
      { twoTheta: 22.78, intensity: 18, hkl: "100" },
      { twoTheta: 32.39, intensity: 100, hkl: "110" },
      { twoTheta: 39.98, intensity: 16, hkl: "111" },
      { twoTheta: 46.47, intensity: 48, hkl: "200" },
      { twoTheta: 57.78, intensity: 60, hkl: "211" },
      { twoTheta: 67.78, intensity: 38, hkl: "220" },
      { twoTheta: 77.1, intensity: 12, hkl: "310" },
    ],
  },
]

export function identifyReferencePhases(
  observedPeaks: XRDObservedPeak[],
  library: XRDReferencePhase[] = BUILTIN_XRD_REFERENCE_PHASES,
  options: {
    toleranceDeg?: number
    maxResults?: number
    minScore?: number
    materialHint?: string
  } = {},
): XRDReferenceMatch[] {
  const toleranceDeg = options.toleranceDeg ?? 0.35
  const maxResults = options.maxResults ?? 3
  const minScore = options.minScore ?? 35
  const hint = parseMaterialHint(options.materialHint)
  const observed = observedPeaks
    .filter((p) => Number.isFinite(p.twoTheta) && Number.isFinite(p.relativeIntensity))
    .slice()
    .sort((a, b) => b.relativeIntensity - a.relativeIntensity)

  const ranked = library
    .map((phase) => scorePhase(phase, observed, toleranceDeg, hint))
    .filter((m) => m.score >= minScore && m.matchedPeaks.length > 0)
    .sort((a, b) => b.score - a.score)

  return buildMultiphaseMatches(ranked, observed, maxResults)
}

function buildMultiphaseMatches(
  ranked: readonly XRDReferenceMatch[],
  observed: readonly XRDObservedPeak[],
  maxResults: number,
): XRDReferenceMatch[] {
  if (ranked.length === 0) return []

  const explained = new Set<string>()
  const contextual: XRDReferenceMatch[] = []

  for (const match of ranked.slice(0, Math.max(maxResults * 4, maxResults))) {
    const newlyExplained = match.matchedPeaks
      .map((m) => m.observed)
      .filter((peak) => !explained.has(observedPeakKey(peak)))
      .sort((a, b) => b.relativeIntensity - a.relativeIntensity)
    const strongNew = newlyExplained.filter((peak) => peak.relativeIntensity >= 18)
    const isFirst = contextual.length === 0
    const duplicateOnly = newlyExplained.length === 0

    if (!isFirst && duplicateOnly && match.score < 72) continue
    if (!isFirst && newlyExplained.length === 1 && strongNew.length === 0 && match.score < 58) {
      continue
    }

    for (const peak of newlyExplained) explained.add(observedPeakKey(peak))
    const residualAfter = observed
      .filter((peak) => !explained.has(observedPeakKey(peak)))
      .sort((a, b) => b.relativeIntensity - a.relativeIntensity)
      .slice(0, 8)
    const role = inferPhaseRole(isFirst, match.score, newlyExplained)
    const incrementalScore = Math.min(
      100,
      Math.round(
        match.score * Math.min(1, newlyExplained.length / Math.max(1, match.matchedPeaks.length)),
      ),
    )

    contextual.push({
      ...match,
      phaseRole: role,
      newlyExplainedPeaks: newlyExplained,
      residualAfterPeaks: residualAfter,
      incrementalScore,
    })

    if (contextual.length >= maxResults) break
  }

  if (contextual.length > 0) return contextual
  return ranked.slice(0, maxResults).map((match, index) => ({
    ...match,
    phaseRole: index === 0 ? "major" : "candidate",
    newlyExplainedPeaks: match.matchedPeaks.map((m) => m.observed),
    residualAfterPeaks: match.unexplainedObservedPeaks,
    incrementalScore: Math.round(match.score),
  }))
}

function observedPeakKey(peak: XRDObservedPeak): string {
  return peak.twoTheta.toFixed(3)
}

function inferPhaseRole(
  isFirst: boolean,
  score: number,
  newlyExplained: readonly XRDObservedPeak[],
): "major" | "minor" | "trace" | "candidate" {
  if (isFirst) return "major"
  if (newlyExplained.length === 0) return "candidate"
  const strongestNew = Math.max(...newlyExplained.map((peak) => peak.relativeIntensity), 0)
  if (score >= 68 && (newlyExplained.length >= 2 || strongestNew >= 28)) return "minor"
  if (score >= 48 && strongestNew >= 8) return "trace"
  return "candidate"
}

export type XRDMaterialHint = {
  raw: string
  formulas: string[]
  aliases: string[]
  elements: Set<string>
}

export function parseMaterialHint(raw?: string | null): XRDMaterialHint | null {
  const text = (raw ?? "").trim()
  if (!text) return null
  const aliases = new Set<string>()
  const formulas = new Set<string>()
  const elements = new Set<string>()
  const normalized = text.toLowerCase()

  const aliasRules: Array<{ test: RegExp; formula: string; alias: string }> = [
    { test: /\blfp\b|lifepo4|li\s*fe\s*p\s*o|磷酸铁锂/i, formula: "LiFePO4", alias: "lfp" },
    {
      test: /\bnvp\b|na3v2\s*\(?po4\)?3|na\s*v\s*p\s*o|磷酸钒钠/i,
      formula: "Na3V2(PO4)3",
      alias: "nvp",
    },
  ]
  for (const rule of aliasRules) {
    if (rule.test.test(text)) {
      formulas.add(rule.formula)
      aliases.add(rule.alias)
    }
  }

  const formulaLike = text.match(/(?:[A-Z][a-z]?[0-9.()]*\s*){2,}/g) ?? []
  for (const formula of formulaLike) formulas.add(formula.replace(/\s+/g, ""))

  for (const formula of formulas) {
    for (const el of formulaElements(formula)) elements.add(el)
  }

  // Catch plain element lists like "Na V P O" or "Li, Fe, P".
  const elementTokens = text.match(/\b[A-Z][a-z]?\b/g) ?? []
  for (const token of elementTokens) elements.add(token)

  return {
    raw: text,
    formulas: [...formulas],
    aliases: [...aliases, normalized],
    elements,
  }
}

export function formulaElements(formula: string): Set<string> {
  const elements = new Set<string>()
  const stripped = formula.replace(/\[[^\]]+\]/g, "").replace(/[()]/g, "")
  const re = /([A-Z][a-z]?)(?:[0-9.]+)?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(stripped))) {
    elements.add(match[1])
  }
  return elements
}

function scorePhase(
  phase: XRDReferencePhase,
  observed: XRDObservedPeak[],
  toleranceDeg: number,
  hint: XRDMaterialHint | null,
): XRDReferenceMatch {
  const reference = phase.peaks
    .filter((p) => Number.isFinite(p.twoTheta) && Number.isFinite(p.intensity))
    .slice()
    .sort((a, b) => b.intensity - a.intensity)
  const usedObserved = new Set<number>()
  const matchedPeaks: XRDReferencePeakMatch[] = []

  for (const ref of reference) {
    let bestIdx = -1
    let bestDelta = Number.POSITIVE_INFINITY
    for (let i = 0; i < observed.length; i++) {
      if (usedObserved.has(i)) continue
      const delta = Math.abs(observed[i].twoTheta - ref.twoTheta)
      if (delta <= toleranceDeg && delta < bestDelta) {
        bestDelta = delta
        bestIdx = i
      }
    }
    if (bestIdx >= 0) {
      usedObserved.add(bestIdx)
      matchedPeaks.push({
        observed: observed[bestIdx],
        reference: ref,
        deltaTwoTheta: observed[bestIdx].twoTheta - ref.twoTheta,
      })
    }
  }

  const weight = (p: XRDReferencePeak) => Math.sqrt(Math.max(1, p.intensity))
  const totalReferenceWeight = reference.reduce((sum, p) => sum + weight(p), 0) || 1
  const matchedWeight = matchedPeaks.reduce((sum, m) => sum + weight(m.reference), 0)
  const weightedCoverage = matchedWeight / totalReferenceWeight
  const topReference = reference.slice(0, Math.min(5, reference.length))
  const matchedTop = topReference.filter((ref) =>
    matchedPeaks.some((m) => m.reference.twoTheta === ref.twoTheta),
  ).length
  const topCoverage = topReference.length > 0 ? matchedTop / topReference.length : 0
  const intensityAgreement = matchedPeaks.length
    ? matchedPeaks.reduce((sum, m) => {
        const ref = m.reference.intensity / 100
        const obs = m.observed.relativeIntensity / 100
        return sum + Math.max(0, 1 - Math.abs(ref - obs))
      }, 0) / matchedPeaks.length
    : 0
  const observedCoverage = observed.length > 0 ? matchedPeaks.length / Math.min(observed.length, 8) : 0
  const strongMisses = reference
    .filter((p) => p.intensity >= 30)
    .filter((ref) => !matchedPeaks.some((m) => m.reference.twoTheta === ref.twoTheta))
  const missingPenalty = Math.min(0.3, strongMisses.length * 0.06)
  const compositionScore = scoreCompositionCompatibility(phase, hint)

  const rawScore =
    100 *
    Math.max(
      0,
      0.45 * weightedCoverage +
        0.25 * topCoverage +
        0.15 * intensityAgreement +
        0.15 * observedCoverage -
        missingPenalty,
    )
  const score = rawScore * compositionScore

  return {
    phase,
    score: Math.round(score),
    matchedPeaks,
    missingStrongPeaks: strongMisses,
    unexplainedObservedPeaks: observed.filter((_, i) => !usedObserved.has(i)).slice(0, 8),
    compositionScore,
  }
}

function scoreCompositionCompatibility(
  phase: XRDReferencePhase,
  hint: XRDMaterialHint | null,
): number {
  if (!hint || (hint.elements.size === 0 && hint.formulas.length === 0 && hint.aliases.length === 0)) {
    return 1
  }

  const haystack = `${phase.id} ${phase.name} ${phase.formula} ${phase.notes ?? ""}`.toLowerCase()
  if (hint.aliases.some((alias) => alias && haystack.includes(alias))) return 1.25
  if (
    hint.formulas.some((formula) =>
      compactFormula(phase.formula).includes(compactFormula(formula)) ||
      compactFormula(formula).includes(compactFormula(phase.formula)),
    )
  ) {
    return 1.25
  }

  const phaseElements = formulaElements(phase.formula)
  const hintElements = hint.elements
  if (hintElements.size === 0 || phaseElements.size === 0) return 1

  const chemicallySpecific = (el: string) => !["H", "C", "O"].includes(el)
  const phaseSpecific = [...phaseElements].filter(chemicallySpecific)
  const hintSpecific = [...hintElements].filter(chemicallySpecific)
  const sharedSpecific = phaseSpecific.filter((el) => hintElements.has(el)).length
  const sharedAll = [...phaseElements].filter((el) => hintElements.has(el)).length
  const missingSpecific = phaseSpecific.filter((el) => !hintElements.has(el)).length

  if (hintSpecific.length > 0 && sharedSpecific === 0) return 0.08
  if (missingSpecific > 0) return Math.max(0.18, sharedSpecific / Math.max(phaseSpecific.length, 1))
  if (sharedAll === phaseElements.size) return 1.15
  return 0.8
}

function compactFormula(formula: string): string {
  return formula.toLowerCase().replace(/[^a-z0-9]/g, "")
}
