/**
 * External references HALO cites in its copy: the Flame in Freefall challenge
 * resources, the standards behind its claims and the future investigations
 * whose data HALO cannot use yet. Every URL was checked to resolve (HTTP 200)
 * on 2026-11-15. Text here is wording, never a computed number.
 */

export type Ref = { label: string; url: string };

export const REFS = {
  // ---- Challenge resources ----
  psiCombustion: { label: "PSI Data Repository: Combustion Science", url: "https://psi.nasa.gov/physci/repo/search?q=combustion" },
  glennCombustion: {
    label: "NASA Glenn: Combustion Science",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/",
  },
  scienceCast: { label: "NASA ScienceCasts: The Power of Studying Combustion on the ISS (2018, video)", url: "https://www.youtube.com/watch?v=W1oXykoz9zg" },
  researchersGuide: {
    label: "A Researcher's Guide to: International Space Station Combustion Science (2015)",
    url: "https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/",
  },
  apollo1: { label: "NASA Safety and Mission Assurance: Apollo 1", url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1" },
  apollo13: { label: "NASA Safety and Mission Assurance: Apollo 13", url: "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13" },
  mir: { label: "NASA History: 25 Years Ago, Fire Aboard Space Station Mir", url: "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/" },

  // ---- Standards and limits ----
  std6001: {
    label: "NASA-STD-6001B: Flammability, Offgassing, and Compatibility Requirements and Test Procedures",
    url: "https://standards.nasa.gov/standard/NASA/NASA-STD-6001",
  },
  smac: {
    label: "Spacecraft Maximum Allowable Concentrations for Airborne Contaminants (JSC 20584), NTRS 20240007713",
    url: "https://ntrs.nasa.gov/citations/20240007713",
  },
  saffireLimits: {
    label: "Urban et al., Heat and Smoke Emission from Tests on the Saffire VI Experiment (ICES 2026), NTRS 20260001992",
    url: "https://ntrs.nasa.gov/citations/20260001992",
  },
  explorationAtmosphere: {
    label: "Norcross et al., Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere, NTRS 20150021491",
    url: "https://ntrs.nasa.gov/citations/20150021491",
  },

  // ---- Future and partner investigations (no PSI data yet) ----
  luci: {
    label: "Ferkul et al., Lunar Combustion Investigation (LUCI): Flammability Results from a Rotating Sounding Rocket, NTRS 20250010653",
    url: "https://ntrs.nasa.gov/citations/20250010653",
  },
  fm2: {
    label: "NASA Glenn: Flammability of Materials on the Moon (FM2)",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-of-materials-on-the-moon-fm2/",
  },
  sofie: {
    label: "NASA Glenn: Solid Fuel Ignition and Extinction (SoFIE)",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/solid-fuel-ignition-and-extinction-sofie/",
  },
  flare: {
    label: "NASA Glenn: Flammability Limits at Reduced-g Experiment (FLARE), JAXA-led",
    url: "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/flammability-limits-at-reduced-g-experiment-flare/",
  },

  // ---- Adjacent PSI record outside the combustion facet ----
  ase: { label: "PSI-179 ASE, Aerosol Sampling Experiment (Complex Fluids), dataset doi:10.60555/pdgr-c961", url: "https://doi.org/10.60555/pdgr-c961" },
} as const satisfies Record<string, Ref>;

/** NASA Glenn fact sheets for the investigations HALO reads (linked from the Glenn Combustion Science page). */
export const GLENN_FACT_SHEETS: Ref[] = [
  { label: "ACME", url: "https://www.nasa.gov/wp-content/uploads/2025/07/advanced-combustion-via-microgravity-experiments-acme.pdf" },
  { label: "BASS", url: "https://www.nasa.gov/wp-content/uploads/2025/07/burning-and-suppression-of-solids-bass.pdf" },
  { label: "DAFT", url: "https://www.nasa.gov/wp-content/uploads/2025/07/dust-and-aerosol-measurement-feasibility-test-daft.pdf" },
  { label: "FLEX", url: "https://www.nasa.gov/wp-content/uploads/2025/07/flame-extinguishment-experiment-flex.pdf" },
  { label: "SAME", url: "https://www.nasa.gov/wp-content/uploads/2025/07/smoke-aerosol-measurement-experiment-same.pdf" },
  { label: "Saffire", url: "https://www.nasa.gov/wp-content/uploads/2025/07/spacecraft-fire-safety-demonstration-saffire.pdf" },
  { label: "SLICE", url: "https://www.nasa.gov/wp-content/uploads/2025/07/structure-liftoff-in-combustion-experiment-slice.pdf" },
  { label: "SPICE", url: "https://www.nasa.gov/wp-content/uploads/2025/07/smoke-point-in-co-flow-experiment-spice.pdf" },
];

/** Three spacecraft emergencies (two fires, one oxygen-tank explosion), one lesson each. Facts are from the linked NASA pages. */
export const FIRE_HISTORY: Array<{ year: string; name: string; what: string; lesson: string; ref: Ref }> = [
  {
    year: "1967",
    name: "Apollo 1",
    what: "In a pre-launch test, with the cabin pressurized with 100% oxygen, a flash fire swept the spacecraft before the hatch could be opened. The crew of three died.",
    lesson: "Oxygen-rich air turns ordinary cabin materials into fuel. Material selection starts here.",
    ref: REFS.apollo1,
  },
  {
    year: "1970",
    name: "Apollo 13",
    what: "Heaters left on during ground testing degraded the Teflon wire insulation inside an oxygen tank. On the way to the Moon the tank failed and exploded, crippling the spacecraft's power and oxygen supply.",
    lesson: "Oxygen hardware and its wire insulation are fire hazards in their own right.",
    ref: REFS.apollo13,
  },
  {
    year: "1997",
    name: "Mir",
    what: "A solid-fuel oxygen generator ignited aboard the Mir station, blocking one Soyuz escape vehicle and filling the modules with dense smoke.",
    lesson: "A fire fills a sealed station with smoke, so detection and crew response matter as much as prevention.",
    ref: REFS.mir,
  },
];
