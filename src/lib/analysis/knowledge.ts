import type { Level, Source, Vehicle } from "../types.ts";

/**
 * Kuratierte Wissensdatenbank zu Motoren und Getrieben.
 * Kosten sind grobe, unverbindliche Richtwerte (freie Werkstatt, DE, inkl. Teile).
 * Zuordnung erfolgt über Marke/Kraftstoff/Hubraum/Baujahr/Leistung – der exakte Motorcode
 * muss immer über Fahrzeugschein (Feld D.2 / Typschlüssel) oder VIN bestätigt werden.
 */

export type KbWeakPoint = {
  id: string;
  title: string;
  component: "Motor" | "Getriebe" | "Abgasanlage" | "Elektrik" | "Fahrwerk";
  detail: string;
  risk: Level;
  costMin: number;
  costMax: number;
  relevantFromKm: number | null;
  detection: string;
  check?: string;
  testDrive?: string;
  question?: string;
};

export type KbEntry = {
  id: string;
  name: string;
  kind: "motor" | "getriebe";
  matchNote: string;
  match: (c: Ctx) => boolean;
  weakPoints: KbWeakPoint[];
  sources: Source[];
};

export type Ctx = {
  make: string;
  model: string;
  variant: string;
  fuel: Vehicle["fuel"];
  ccm: number | null;
  kw: number | null;
  year: number | null;
  auto: boolean;
  gearbox: string;
};

const ADAC: Source = { label: "ADAC – Pannenstatistik & Autotests", url: "https://www.adac.de" };
const KBA: Source = { label: "KBA – Rückrufdatenbank (Rückrufe per FIN prüfen)", url: "https://www.kba.de" };
const WERKSTATT: Source = { label: "Erfahrungswerte unabhängiger Werkstätten (nicht amtlich)" };
const HERSTELLER: Source = { label: "Herstellervorgaben laut Serviceheft / Wartungsplan" };

const VAG = ["volkswagen", "vw", "audi", "skoda", "škoda", "seat", "cupra"];
const isVag = (c: Ctx) => VAG.includes(c.make);
const between = (y: number | null, a: number, b: number) => y !== null && y >= a && y <= b;
const near = (ccm: number | null, target: number, tol = 30) => ccm !== null && Math.abs(ccm - target) <= tol;
// Ohne Hubraumangabe nur zuordnen, wenn die Typbezeichnung eindeutig ist.
const bmw2lD = (c: Ctx) => (c.ccm !== null ? near(c.ccm, 1995) : /\b\d{0,2}(16|18|20|25)d\b/.test(`${c.model} ${c.variant}`));
const vag2lTdi = (c: Ctx) => (c.ccm !== null ? near(c.ccm, 1968) : /2[.,]0\s?tdi/.test(`${c.model} ${c.variant}`));
const mbOm651 = (c: Ctx) => (c.ccm !== null ? near(c.ccm, 2143) : /\b(180|200|220|250)\s?(cdi|d|bluetec)\b/.test(`${c.model} ${c.variant}`));
const isDsg = (c: Ctx) => /dsg|s[\s-]?tronic|doppelkupplung/.test(c.gearbox);

export const KNOWLEDGE: KbEntry[] = [
  {
    id: "bmw-n47",
    name: "BMW N47 (2,0 l Diesel)",
    kind: "motor",
    matchNote: "Zuordnung über Marke, Diesel, ~2,0 l und Baujahr bis 2015 (2014/2015 Übergang zum B47).",
    match: (c) => c.make === "bmw" && c.fuel === "Diesel" && bmw2lD(c) && between(c.year, 2007, 2015),
    weakPoints: [
      {
        id: "n47-kette",
        title: "Steuerkette (getriebeseitig)",
        component: "Motor",
        detail: "Bekannte Schwachstelle: Längung der Kette und Verschleiß der Gleitschienen, besonders bei frühen Baujahren bis ca. 2011. Die Kette sitzt auf der Getriebeseite, der Tausch ist entsprechend aufwendig.",
        risk: "hoch",
        costMin: 2000,
        costMax: 4500,
        relevantFromKm: 80000,
        detection: "Rasseln oder Schleifen bei Kaltstart und im Leerlauf, gut hörbar Richtung Getriebeglocke. Rechnung über Kettentausch verlangen.",
        check: "Kaltstart abhören: metallisches Rasseln/Schleifen von hinten am Motor (Steuerkette N47)?",
        testDrive: "Im Leerlauf und beim Gaswegnehmen bei ca. 1.500–2.000 U/min auf Rasseln/Pfeifen hören (Hinweis auf gelängte Steuerkette).",
        question: "Wurde die Steuerkette bereits erneuert? Gibt es eine Rechnung dazu?",
      },
      {
        id: "n47-drall",
        title: "Drallklappen / Ansaugbrücke",
        component: "Motor",
        detail: "Verkokung und Defekte der Drallklappen bzw. Ansaugbrücke sind häufig. Lösen sich Teile, drohen im Extremfall Motorschäden.",
        risk: "mittel",
        costMin: 300,
        costMax: 900,
        relevantFromKm: 100000,
        detection: "Fehlerspeicher auslesen, Ruckeln bei niedriger Drehzahl, Leistungsverlust.",
        check: "Fehlerspeicher auslesen lassen (Drallklappen / Ansaugsystem).",
      },
      {
        id: "n47-agr",
        title: "AGR-Ventil, AGR-Kühler und Partikelfilter",
        component: "Abgasanlage",
        detail: "Abgasrückführung und DPF verschmutzen besonders bei viel Kurzstrecke. Zu AGR-Kühlern gab es bei BMW-Dieseln Rückrufe – per FIN prüfen.",
        risk: "mittel",
        costMin: 400,
        costMax: 2000,
        relevantFromKm: 120000,
        detection: "Motorkontrollleuchte, Notlauf, häufige Regenerationen, Kühlmittelverlust.",
        question: "Wurden Rückrufaktionen (z. B. AGR-Kühler) durchgeführt? Ist das im Serviceheft vermerkt?",
      },
    ],
    sources: [ADAC, KBA, WERKSTATT],
  },
  {
    id: "bmw-b47",
    name: "BMW B47 (2,0 l Diesel)",
    kind: "motor",
    matchNote: "Zuordnung über Marke, Diesel, ~2,0 l und Baujahr ab 2014 (2014/2015 Übergang vom N47).",
    match: (c) => c.make === "bmw" && c.fuel === "Diesel" && bmw2lD(c) && (c.year ?? 0) >= 2014,
    weakPoints: [
      {
        id: "b47-agr",
        title: "AGR-Kühler (Rückrufthema)",
        component: "Abgasanlage",
        detail: "Für BMW-Diesel mit B47 gab es Rückrufe wegen undichter AGR-Kühler (Brandgefahr). Ob die Maßnahme durchgeführt wurde, lässt sich beim BMW-Händler per FIN prüfen.",
        risk: "mittel",
        costMin: 0,
        costMax: 1200,
        relevantFromKm: null,
        detection: "Nachweis der Rückrufaktion verlangen; Kühlmittelstand prüfen.",
        question: "Wurde die Rückrufaktion zum AGR-Kühler durchgeführt (Nachweis/BMW-Händler)?",
      },
      {
        id: "b47-dpf",
        title: "Partikelfilter / SCR (AdBlue)",
        component: "Abgasanlage",
        detail: "Bei viel Kurzstrecke setzen sich DPF und AGR zu; bei Modellen mit SCR können AdBlue-Komponenten (Dosierer, Pumpe, Sensor) ausfallen.",
        risk: "mittel",
        costMin: 500,
        costMax: 2500,
        relevantFromKm: 120000,
        detection: "Warnmeldungen im Display, Notlauf, Fehlerspeicher.",
        testDrive: "Auf Warnmeldungen zu Abgassystem / AdBlue im Display achten.",
      },
      {
        id: "b47-kette",
        title: "Steuerkette",
        component: "Motor",
        detail: "Gegenüber dem N47 deutlich robuster; Schäden sind seltene Einzelfälle, aber teuer.",
        risk: "niedrig",
        costMin: 2000,
        costMax: 4000,
        relevantFromKm: 150000,
        detection: "Rasseln beim Kaltstart.",
      },
    ],
    sources: [ADAC, KBA, WERKSTATT],
  },
  {
    id: "vag-ea189",
    name: "VW-Konzern 2,0 TDI EA189 (Common Rail, Euro 5)",
    kind: "motor",
    matchNote: "Zuordnung über VW-Konzernmarke, Diesel, ~2,0 l, Baujahr 2008–2015 (ab 2012 teilweise schon EA288).",
    match: (c) => isVag(c) && c.fuel === "Diesel" && vag2lTdi(c) && between(c.year, 2008, 2015),
    weakPoints: [
      {
        id: "ea189-update",
        title: "Abgas-Software-Update (Dieselthema)",
        component: "Abgasanlage",
        detail: "EA189-Motoren waren vom Dieselskandal betroffen und mussten ein Software-Update erhalten. Danach wurden vermehrt AGR- und DPF-Probleme berichtet.",
        risk: "mittel",
        costMin: 0,
        costMax: 1500,
        relevantFromKm: null,
        detection: "Nachweis über durchgeführtes Update (Aufkleber / Rechnung / Händlerabfrage per FIN).",
        question: "Wurde das Abgas-Software-Update durchgeführt? Gab es danach Probleme mit AGR oder Partikelfilter?",
      },
      {
        id: "ea189-agr",
        title: "AGR-Ventil und Partikelfilter",
        component: "Abgasanlage",
        detail: "Verschmutzung von AGR und DPF, besonders bei Kurzstrecke.",
        risk: "mittel",
        costMin: 400,
        costMax: 2500,
        relevantFromKm: 120000,
        detection: "Motorkontrollleuchte, Notlauf, Leistungsverlust.",
      },
      {
        id: "ea189-zr",
        title: "Zahnriemen inkl. Wasserpumpe",
        component: "Motor",
        detail: "Der Motor hat einen Zahnriemen. Wird das Wechselintervall laut Hersteller überschritten, droht bei Riss ein Motorschaden.",
        risk: "hoch",
        costMin: 700,
        costMax: 1200,
        relevantFromKm: 150000,
        detection: "Rechnung über letzten Zahnriemenwechsel (km-Stand und Datum) verlangen.",
        question: "Wann und bei welchem Kilometerstand wurde der Zahnriemen gewechselt? Gibt es eine Rechnung?",
      },
      {
        id: "ea189-inj",
        title: "Injektoren",
        component: "Motor",
        detail: "Defekte Injektoren kommen bei höheren Laufleistungen vor.",
        risk: "niedrig",
        costMin: 800,
        costMax: 2000,
        relevantFromKm: 180000,
        detection: "Unrunder Leerlauf, Startprobleme, Rauch.",
      },
    ],
    sources: [ADAC, KBA, WERKSTATT],
  },
  {
    id: "vag-ea288",
    name: "VW-Konzern 2,0 TDI EA288",
    kind: "motor",
    matchNote: "Zuordnung über VW-Konzernmarke, Diesel, ~2,0 l, Baujahr ab 2012.",
    match: (c) => isVag(c) && c.fuel === "Diesel" && vag2lTdi(c) && (c.year ?? 0) >= 2012,
    weakPoints: [
      {
        id: "ea288-kuehl",
        title: "Kühlmittelverlust (AGR-Kühler, Thermostat, Wasserpumpe)",
        component: "Motor",
        detail: "Undichtigkeiten im Kühlkreislauf werden bei diesem Motor häufiger berichtet.",
        risk: "mittel",
        costMin: 300,
        costMax: 1500,
        relevantFromKm: 80000,
        detection: "Kühlmittelstand und Ausgleichsbehälter prüfen, weiße Ablagerungen, süßlicher Geruch.",
        check: "Kühlmittelstand prüfen, Ausgleichsbehälter auf Ablagerungen ansehen.",
      },
      {
        id: "ea288-scr",
        title: "Partikelfilter / AdBlue-System",
        component: "Abgasanlage",
        detail: "Bei Modellen mit SCR können AdBlue-Komponenten ausfallen; DPF-Probleme bei Kurzstrecke.",
        risk: "mittel",
        costMin: 500,
        costMax: 2500,
        relevantFromKm: 120000,
        detection: "Warnmeldungen im Display, Fehlerspeicher.",
      },
      {
        id: "ea288-zr",
        title: "Zahnriemen inkl. Wasserpumpe",
        component: "Motor",
        detail: "Zahnriemenmotor. Intervall laut Herstellervorgabe beachten.",
        risk: "mittel",
        costMin: 700,
        costMax: 1200,
        relevantFromKm: 180000,
        detection: "Rechnung über letzten Zahnriemenwechsel verlangen.",
        question: "Wann wurde der Zahnriemen zuletzt gewechselt (km/Datum)?",
      },
    ],
    sources: [ADAC, KBA, HERSTELLER, WERKSTATT],
  },
  {
    id: "vag-tsi-ea111",
    name: "VW-Konzern 1,2 / 1,4 TSI EA111",
    kind: "motor",
    matchNote: "Zuordnung über VW-Konzernmarke, Benzin, 1,2 l oder 1,4 l, Baujahr 2006–2012.",
    match: (c) => isVag(c) && c.fuel === "Benzin" && (near(c.ccm, 1390) || near(c.ccm, 1197)) && between(c.year, 2006, 2012),
    weakPoints: [
      {
        id: "ea111-kette",
        title: "Steuerkette (Längung)",
        component: "Motor",
        detail: "Kettenlängung ist bei diesen Motoren gut dokumentiert; ein Überspringen kann zu Motorschaden führen.",
        risk: "hoch",
        costMin: 800,
        costMax: 2000,
        relevantFromKm: 60000,
        detection: "Rasseln für einige Sekunden nach Kaltstart.",
        check: "Kaltstart (Motor wirklich kalt!): Rasseln in den ersten Sekunden?",
        testDrive: "Kaltstart beobachten – kurzes Kettenrasseln ist ein Warnsignal.",
        question: "Wurde die Steuerkette schon getauscht?",
      },
      {
        id: "ea111-oel",
        title: "Ölverbrauch / Kolbenschäden (v. a. 1,4 TSI Twincharger)",
        component: "Motor",
        detail: "Erhöhter Ölverbrauch und Kolbenschäden sind bei einigen Varianten bekannt.",
        risk: "mittel",
        costMin: 1500,
        costMax: 4000,
        relevantFromKm: 100000,
        detection: "Ölstand prüfen, blauer Rauch, Ölverbrauch beim Verkäufer erfragen.",
        question: "Wie viel Öl muss zwischen den Inspektionen nachgefüllt werden?",
      },
    ],
    sources: [ADAC, WERKSTATT],
  },
  {
    id: "vag-ea888-g2",
    name: "VW-Konzern 1,8 / 2,0 TSI EA888 (Gen. 1/2)",
    kind: "motor",
    matchNote: "Zuordnung über VW-Konzernmarke, Benzin, 1,8 l oder 2,0 l, Baujahr 2007–2012.",
    match: (c) => isVag(c) && c.fuel === "Benzin" && (near(c.ccm, 1798) || near(c.ccm, 1984)) && between(c.year, 2007, 2012),
    weakPoints: [
      {
        id: "ea888-oel",
        title: "Erhöhter Ölverbrauch (Kolbenringe)",
        component: "Motor",
        detail: "Bei dieser Motorgeneration bekannt; Reparatur über neue Kolben ist teuer.",
        risk: "hoch",
        costMin: 2000,
        costMax: 5000,
        relevantFromKm: 80000,
        detection: "Ölstand, Ölverbrauchsmessung, blauer Rauch beim Gasgeben nach Leerlauf.",
        question: "Wie hoch ist der Ölverbrauch? Wurden die Kolben/Kolbenringe bereits erneuert?",
      },
      {
        id: "ea888-spanner",
        title: "Steuerkettenspanner",
        component: "Motor",
        detail: "Frühe Kettenspanner konnten versagen – mit Motorschaden als Folge. Spätere Ausführung ist überarbeitet.",
        risk: "hoch",
        costMin: 800,
        costMax: 1500,
        relevantFromKm: 60000,
        detection: "Nachweis über Tausch des Kettenspanners, Rasseln beim Kaltstart.",
        question: "Wurde der Steuerkettenspanner auf die überarbeitete Version getauscht?",
      },
    ],
    sources: [ADAC, WERKSTATT],
  },
  {
    id: "mb-om651",
    name: "Mercedes-Benz OM651 (2,1 l Diesel)",
    kind: "motor",
    matchNote: "Zuordnung über Marke, Diesel, ~2,1 l, Baujahr 2008–2019 (ab 2016 schrittweise OM654).",
    match: (c) => /mercedes/.test(c.make) && c.fuel === "Diesel" && mbOm651(c) && between(c.year, 2008, 2019),
    weakPoints: [
      {
        id: "om651-inj",
        title: "Injektoren (frühe Piezo-Injektoren)",
        component: "Motor",
        detail: "Frühe Baujahre (ca. 2008–2011) hatten Probleme mit Piezo-Injektoren; es gab Rückrufe/Austauschaktionen.",
        risk: "mittel",
        costMin: 1500,
        costMax: 3000,
        relevantFromKm: null,
        detection: "Ruckeln, Notlauf, Motorkontrollleuchte; Nachweis über Injektortausch.",
        question: "Wurden die Injektoren schon einmal getauscht oder gab es eine Rückrufaktion dazu?",
      },
      {
        id: "om651-kette",
        title: "Steuerkette / Kettenspanner",
        component: "Motor",
        detail: "Kettenlängung bei höheren Laufleistungen möglich.",
        risk: "mittel",
        costMin: 1500,
        costMax: 3000,
        relevantFromKm: 150000,
        detection: "Rasseln beim Kaltstart.",
        check: "Kaltstart: Rasselgeräusche (Steuerkette OM651)?",
      },
      {
        id: "om651-dicht",
        title: "Undichtigkeiten (Ölkühler / Ölfiltergehäuse)",
        component: "Motor",
        detail: "Ölverlust an Ölkühler- bzw. Ölfiltergehäusedichtungen kommt vor.",
        risk: "niedrig",
        costMin: 200,
        costMax: 700,
        relevantFromKm: 120000,
        detection: "Ölfeuchte am Motor und unter dem Fahrzeug.",
      },
    ],
    sources: [ADAC, KBA, WERKSTATT],
  },
  {
    id: "psa-puretech",
    name: "PSA/Stellantis 1,2 PureTech (Turbo-Benziner)",
    kind: "motor",
    matchNote: "Zuordnung über Marke (Peugeot/Citroën/DS/Opel), Benzin, ~1,2 l.",
    match: (c) => ["peugeot", "citroen", "citroën", "ds", "opel"].includes(c.make) && c.fuel === "Benzin" && near(c.ccm, 1199) && (c.year ?? 0) >= (c.make === "opel" ? 2019 : 2014),
    weakPoints: [
      {
        id: "puretech-riemen",
        title: "Zahnriemen im Ölbad",
        component: "Motor",
        detail: "Der in Öl laufende Zahnriemen kann sich zersetzen; Partikel verstopfen das Ölpumpensieb – bis hin zum Motorschaden. Hersteller hat Intervalle verkürzt und Kulanzregelungen aufgelegt.",
        risk: "hoch",
        costMin: 800,
        costMax: 2000,
        relevantFromKm: 60000,
        detection: "Nachweis über Riemenkontrolle/-wechsel, Ölwechsel mit vorgeschriebener Ölspezifikation.",
        question: "Wann wurde der Zahnriemen geprüft/gewechselt? Wurde immer das vorgeschriebene Öl verwendet?",
      },
      {
        id: "puretech-oel",
        title: "Ölverbrauch",
        component: "Motor",
        detail: "Erhöhter Ölverbrauch wird häufig berichtet.",
        risk: "mittel",
        costMin: 500,
        costMax: 3000,
        relevantFromKm: 60000,
        detection: "Ölstand prüfen, Verkäufer nach Nachfüllmengen fragen.",
      },
    ],
    sources: [ADAC, HERSTELLER, WERKSTATT],
  },
  {
    id: "ford-ecoboost10",
    name: "Ford 1,0 EcoBoost",
    kind: "motor",
    matchNote: "Zuordnung über Marke, Benzin, ~1,0 l, ab 2012.",
    match: (c) => c.make === "ford" && c.fuel === "Benzin" && near(c.ccm, 999, 10) && (c.year ?? 0) >= 2012,
    weakPoints: [
      {
        id: "eco-kuehl",
        title: "Kühlsystem / Überhitzung",
        component: "Motor",
        detail: "Defekte Kühlmittelschläuche und Überhitzung sind bekannt (teils Rückrufe). Überhitzung kann den Zylinderkopf schädigen.",
        risk: "hoch",
        costMin: 300,
        costMax: 3500,
        relevantFromKm: null,
        detection: "Kühlmittelstand, Temperaturanzeige während der Probefahrt, Rückrufe per FIN.",
        testDrive: "Temperaturanzeige beobachten – sie darf nach dem Warmfahren nicht weiter steigen.",
      },
      {
        id: "eco-riemen",
        title: "Zahnriemen im Ölbad",
        component: "Motor",
        detail: "Wechselintervall nach Herstellervorgabe unbedingt einhalten.",
        risk: "mittel",
        costMin: 700,
        costMax: 1300,
        relevantFromKm: 150000,
        detection: "Rechnung über Zahnriemenwechsel verlangen.",
        question: "Wurde der Zahnriemen bereits gewechselt?",
      },
    ],
    sources: [ADAC, KBA, WERKSTATT],
  },
  {
    id: "renault-tce12",
    name: "Renault/Dacia/Nissan 1,2 TCe (H5Ft)",
    kind: "motor",
    matchNote: "Zuordnung über Marke, Benzin, ~1,2 l, Baujahr 2012–2016.",
    match: (c) => ["renault", "dacia", "nissan"].includes(c.make) && c.fuel === "Benzin" && near(c.ccm, 1197) && between(c.year, 2012, 2016),
    weakPoints: [
      {
        id: "tce-oel",
        title: "Hoher Ölverbrauch",
        component: "Motor",
        detail: "Bekanntes Problem mit Ölverbrauch bis hin zu Motorschäden; Hersteller hat Software/Teile überarbeitet.",
        risk: "hoch",
        costMin: 1500,
        costMax: 5000,
        relevantFromKm: 50000,
        detection: "Ölstand, Nachweis über Werkstattmaßnahmen zum Ölverbrauch.",
        question: "Wurde wegen Ölverbrauch schon eine Werkstattmaßnahme durchgeführt?",
      },
    ],
    sources: [ADAC, WERKSTATT],
  },
  // ---------- Getriebe ----------
  {
    id: "vag-dq200",
    name: "VW-Konzern DSG DQ200 (7-Gang, trockene Kupplung)",
    kind: "getriebe",
    matchNote: "Vermutet aus Doppelkupplungsgetriebe + geringerer Leistung (Benzin ≤ 110 kW oder Diesel ≤ 1,6 l). Getriebetyp über FIN prüfen.",
    match: (c) => isVag(c) && c.auto && isDsg(c) && !/a4|a5|a6|a7|q5|q7/.test(c.model) && ((c.fuel === "Benzin" && (c.kw ?? 999) <= 110) || (c.fuel === "Diesel" && (c.ccm ?? 9999) <= 1600)),
    weakPoints: [
      {
        id: "dq200-mech",
        title: "Mechatronik",
        component: "Getriebe",
        detail: "Ausfälle der Mechatronik (Hydraulik/Druckspeicher) sind beim DQ200 die bekannteste Schwachstelle.",
        risk: "hoch",
        costMin: 1200,
        costMax: 2500,
        relevantFromKm: 60000,
        detection: "Gangwechsel-Rucken, blinkende Ganganzeige, Notlauf, Getriebe-Warnmeldung.",
        testDrive: "Langsames Anfahren und Stop-and-go testen: Rupfen, Rucken oder verzögertes Einlegen sind Warnzeichen (DSG DQ200).",
        question: "Wurde die Mechatronik oder Kupplung des DSG schon getauscht?",
      },
      {
        id: "dq200-kupp",
        title: "Doppelkupplung (trocken)",
        component: "Getriebe",
        detail: "Rupfen beim Anfahren deutet auf Kupplungsverschleiß hin.",
        risk: "mittel",
        costMin: 1000,
        costMax: 2000,
        relevantFromKm: 100000,
        detection: "Rupfen beim Anfahren, besonders am Berg und rückwärts.",
      },
    ],
    sources: [ADAC, WERKSTATT],
  },
  {
    id: "vag-dsg-nass",
    name: "VW-Konzern DSG nass (DQ250 / DQ381 / DQ500)",
    kind: "getriebe",
    matchNote: "Vermutet aus Doppelkupplungsgetriebe + höherer Leistung. Getriebetyp über FIN prüfen.",
    match: (c) => isVag(c) && c.auto && isDsg(c) && !/a4|a5|a6|a7|q5|q7/.test(c.model) && !((c.fuel === "Benzin" && (c.kw ?? 999) <= 110) || (c.fuel === "Diesel" && (c.ccm ?? 9999) <= 1600)),
    weakPoints: [
      {
        id: "dsgnass-oel",
        title: "Getriebeölwechsel (Intervall ca. 60.000 km)",
        component: "Getriebe",
        detail: "Nasse DSG brauchen regelmäßigen Öl- und Filterwechsel; fehlende Nachweise erhöhen das Risiko für Mechatronik und Kupplung.",
        risk: "mittel",
        costMin: 250,
        costMax: 450,
        relevantFromKm: 60000,
        detection: "Rechnung über DSG-Ölwechsel verlangen.",
        question: "Wurde der DSG-Ölwechsel nach Herstellervorgabe gemacht? Gibt es Nachweise?",
      },
      {
        id: "dsgnass-mech",
        title: "Mechatronik",
        component: "Getriebe",
        detail: "Mechatronik-Defekte kommen vor, seltener als beim DQ200.",
        risk: "mittel",
        costMin: 1500,
        costMax: 3000,
        relevantFromKm: 120000,
        detection: "Schaltrucke, Notlauf, Warnmeldung.",
        testDrive: "Auf harte Schaltvorgänge und Rucken beim Hoch- und Runterschalten achten.",
      },
    ],
    sources: [HERSTELLER, WERKSTATT],
  },
  {
    id: "audi-dl501",
    name: "Audi S tronic DL501 (7-Gang, längs)",
    kind: "getriebe",
    matchNote: "Vermutet aus Audi mit S tronic in einem Längsmotor-Modell (A4/A5/A6/A7/Q5). Getriebetyp über FIN prüfen.",
    match: (c) => c.make === "audi" && c.auto && isDsg(c) && /a4|a5|a6|a7|q5/.test(c.model) && between(c.year, 2008, 2018),
    weakPoints: [
      {
        id: "dl501-mech",
        title: "Mechatronik",
        component: "Getriebe",
        detail: "Defekte der Mechatronik sind bei diesem Getriebe die häufigste teure Reparatur.",
        risk: "hoch",
        costMin: 1500,
        costMax: 3500,
        relevantFromKm: 100000,
        detection: "Ruckeln, Notlauf, Getriebe-Warnleuchte, Gänge fehlen.",
        testDrive: "Rückwärtsgang und Rangieren testen; S tronic darf nicht ruckeln oder Gänge 'suchen'.",
        question: "Gab es schon Reparaturen an der Mechatronik oder Kupplung der S tronic?",
      },
      {
        id: "dl501-oel",
        title: "Getriebeölwechsel (ca. alle 60.000 km)",
        component: "Getriebe",
        detail: "Regelmäßiger Ölwechsel ist wichtig; fehlende Nachweise erhöhen das Risiko.",
        risk: "mittel",
        costMin: 300,
        costMax: 500,
        relevantFromKm: 60000,
        detection: "Rechnung über Getriebeölwechsel.",
        question: "Wurde das Getriebeöl der S tronic regelmäßig gewechselt?",
      },
    ],
    sources: [HERSTELLER, WERKSTATT],
  },
  {
    id: "zf-8hp",
    name: "ZF 8HP (8-Gang-Automatik)",
    kind: "getriebe",
    matchNote: "Vermutet aus BMW mit Automatik ab 2010 (Ausnahme: frontgetriebene Modelle mit anderem Getriebe) oder Audi Tiptronic. Getriebetyp über FIN prüfen.",
    match: (c) => c.auto && ((c.make === "bmw" && (c.year ?? 0) >= 2010 && !/active tourer|gran tourer|x1|x2|1er|2er/.test(`${c.model} ${c.variant}`)) || /8hp|tiptronic/.test(c.gearbox)),
    weakPoints: [
      {
        id: "8hp-oel",
        title: "Getriebeölwechsel trotz 'Lebensdauerfüllung'",
        component: "Getriebe",
        detail: "Der Hersteller spricht von Lebensdauerfüllung, ZF selbst empfiehlt aber einen Öl- und Filterwechsel nach etwa 8–10 Jahren bzw. ca. 100.000–120.000 km.",
        risk: "mittel",
        costMin: 400,
        costMax: 700,
        relevantFromKm: 100000,
        detection: "Rechnung über Getriebeölservice verlangen.",
        question: "Wurde ein Getriebeölwechsel (Automatik) durchgeführt? Bei welchem km-Stand?",
      },
      {
        id: "8hp-dicht",
        title: "Undichtigkeit an Mechatronik-Steckhülse / Ölwanne",
        component: "Getriebe",
        detail: "Leichter Ölverlust am Getriebe ist bekannt und meist günstig zu beheben.",
        risk: "niedrig",
        costMin: 150,
        costMax: 500,
        relevantFromKm: 100000,
        detection: "Ölfeuchte am Getriebe (Unterboden ansehen).",
        testDrive: "Automatik soll weich und schnell schalten; Schläge beim Einlegen von D/R sind ein Warnzeichen.",
      },
    ],
    sources: [HERSTELLER, WERKSTATT],
  },
  {
    id: "mb-7g",
    name: "Mercedes-Benz 7G-Tronic (722.9)",
    kind: "getriebe",
    matchNote: "Vermutet aus Mercedes mit Automatik, Baujahr 2004–2016 (danach meist 9G-Tronic).",
    match: (c) => /mercedes/.test(c.make) && c.auto && !/9g/.test(c.gearbox) && between(c.year, 2004, 2016),
    weakPoints: [
      {
        id: "7g-platte",
        title: "Steuereinheit / Leiterplatte (Drehzahlsensoren)",
        component: "Getriebe",
        detail: "Defekte der elektrohydraulischen Steuereinheit sind bekannt.",
        risk: "mittel",
        costMin: 600,
        costMax: 1500,
        relevantFromKm: 100000,
        detection: "Notlauf (bleibt in einem Gang), Schaltschläge, Fehlerspeicher.",
        testDrive: "Bei der Probefahrt alle Gänge durchschalten lassen – Schaltschläge oder Notlauf sind Warnzeichen.",
      },
      {
        id: "7g-oel",
        title: "Getriebeölwechsel",
        component: "Getriebe",
        detail: "Ölwechsel nach Herstellervorgabe; fehlende Nachweise erhöhen das Risiko.",
        risk: "niedrig",
        costMin: 300,
        costMax: 500,
        relevantFromKm: 100000,
        detection: "Rechnung über Getriebeölwechsel.",
        question: "Wurde das Automatikgetriebeöl schon gewechselt?",
      },
    ],
    sources: [HERSTELLER, WERKSTATT],
  },
  {
    id: "ford-powershift",
    name: "Ford PowerShift (trockene Doppelkupplung DPS6)",
    kind: "getriebe",
    matchNote: "Vermutet aus Ford Benziner mit Automatik (Focus/Fiesta/C-Max/B-Max/EcoSport), Baujahr 2011–2018.",
    match: (c) => c.make === "ford" && c.auto && c.fuel === "Benzin" && /focus|fiesta|c-max|b-max|ecosport/.test(c.model) && between(c.year, 2011, 2018),
    weakPoints: [
      {
        id: "ps-kupp",
        title: "Kupplungsrupfen / Getriebesteuergerät",
        component: "Getriebe",
        detail: "Rupfen, Ruckeln und Ausfälle des Getriebesteuergeräts sind gut dokumentiert.",
        risk: "hoch",
        costMin: 800,
        costMax: 2500,
        relevantFromKm: 50000,
        detection: "Rupfen beim Anfahren, Ruckeln im Stop-and-go, Warnmeldung.",
        testDrive: "Mehrmals langsam anfahren und im Schritttempo rollen – Rupfen ist ein deutliches Warnsignal.",
        question: "Wurden Kupplung oder Getriebesteuergerät schon getauscht?",
      },
    ],
    sources: [ADAC, KBA, WERKSTATT],
  },
];

export function toCtx(v: Vehicle): Ctx {
  const make = (v.make ?? "").toLowerCase().trim().replace(/-benz$/, "").replace(/^mercedes.*/, "mercedes");
  return {
    make,
    model: (v.model ?? "").toLowerCase(),
    variant: (v.variant ?? "").toLowerCase(),
    fuel: v.fuel,
    ccm: v.displacementCcm,
    kw: v.powerKw,
    year: parseYear(v.firstRegistration),
    auto: v.transmission === "Automatik",
    gearbox: `${v.transmissionDetail ?? ""} ${v.variant ?? ""}`.toLowerCase(),
  };
}

export function parseYear(s: string | null): number | null {
  const m = s?.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

export function matchKnowledge(v: Vehicle): KbEntry[] {
  const c = toCtx(v);
  if (!c.make) return [];
  const found = KNOWLEDGE.filter((e) => e.match(c));
  // Ein bekannter Motorcode (aus Inserat oder EU-Typdaten) ist eindeutiger als Hubraum/Baujahr.
  const code = v.engineCode?.toUpperCase().replace(/\s/g, "");
  const byCode = code ? KNOWLEDGE.filter((e) => e.kind === "motor" && e.name.toUpperCase().replace(/\s/g, "").includes(code)) : [];
  return byCode.length ? [...byCode, ...found.filter((e) => e.kind !== "motor")] : found;
}
