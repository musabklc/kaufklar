import type { Vehicle } from "../types.ts";

/**
 * Häufig gehandelte Gebrauchtwagen in Deutschland (Modell, Motor, ein Baujahr der Generation), um die Recherche-Datenbank
 * vorab zu füllen. Hier stehen nur Typangaben – die Schwachstellen kommen ausschließlich aus der belegten Recherche.
 * Format: Marke | Modell | Variante | Kraftstoff | Hubraum ccm | Baujahr
 */
const LIST = `
Volkswagen|Golf|1.4 TSI (Golf 6)|Benzin|1390|2010
Volkswagen|Golf|1.6 TDI (Golf 6)|Diesel|1598|2010
Volkswagen|Golf|1.2 TSI (Golf 7)|Benzin|1197|2013
Volkswagen|Golf|1.6 TDI (Golf 7)|Diesel|1598|2013
Volkswagen|Golf|1.4 TSI (Golf 7)|Benzin|1395|2016
Volkswagen|Golf|2.0 TDI (Golf 7)|Diesel|1968|2016
Volkswagen|Golf|1.5 TSI (Golf 7 Facelift)|Benzin|1498|2019
Volkswagen|Golf|2.0 TDI (Golf 8)|Diesel|1968|2021
Volkswagen|Polo|1.2 TSI (6R)|Benzin|1197|2013
Volkswagen|Polo|1.0 TSI (AW)|Benzin|999|2019
Volkswagen|Passat|2.0 TDI (B7)|Diesel|1968|2013
Volkswagen|Passat|2.0 TDI (B8)|Diesel|1968|2016
Volkswagen|Passat|1.4 TSI (B8)|Benzin|1395|2016
Volkswagen|Tiguan|2.0 TDI (5N)|Diesel|1968|2013
Volkswagen|Tiguan|1.4 TSI (AD1)|Benzin|1395|2017
Volkswagen|Tiguan|2.0 TDI (AD1)|Diesel|1968|2019
Volkswagen|Touran|1.6 TDI (1T3)|Diesel|1598|2013
Volkswagen|Touran|1.4 TSI (5T)|Benzin|1395|2016
Volkswagen|up!|1.0 MPI|Benzin|999|2013
Volkswagen|T-Roc|1.0 TSI|Benzin|999|2019
Volkswagen|Caddy|2.0 TDI|Diesel|1968|2016
Volkswagen|Sharan|2.0 TDI|Diesel|1968|2013
Volkswagen|Transporter|2.0 TDI (T6)|Diesel|1968|2017
Audi|A3|1.4 TFSI (8V)|Benzin|1395|2016
Audi|A3|2.0 TDI (8V)|Diesel|1968|2013
Audi|A3|1.6 TDI (8V)|Diesel|1598|2016
Audi|A4|2.0 TDI (B8)|Diesel|1968|2010
Audi|A4|1.8 TFSI (B8)|Benzin|1798|2010
Audi|A4|2.0 TDI (B9)|Diesel|1968|2016
Audi|A6|2.0 TDI (C7)|Diesel|1968|2013
Audi|A6|3.0 TDI (C7)|Diesel|2967|2013
Audi|A1|1.4 TFSI (8X)|Benzin|1390|2013
Audi|Q3|2.0 TDI (8U)|Diesel|1968|2013
Audi|Q5|2.0 TDI (8R)|Diesel|1968|2011
Audi|Q5|2.0 TDI (FY)|Diesel|1968|2019
Skoda|Octavia|1.8 TSI (1Z)|Benzin|1798|2010
Skoda|Octavia|1.6 TDI (5E)|Diesel|1598|2014
Skoda|Octavia|1.4 TSI (5E)|Benzin|1395|2016
Skoda|Octavia|2.0 TDI (5E)|Diesel|1968|2016
Skoda|Fabia|1.2 MPI (5J)|Benzin|1198|2010
Skoda|Fabia|1.2 TSI (NJ)|Benzin|1197|2016
Skoda|Superb|2.0 TDI (3V)|Diesel|1968|2017
Skoda|Yeti|2.0 TDI|Diesel|1968|2013
Skoda|Kodiaq|2.0 TDI|Diesel|1968|2019
Skoda|Karoq|1.5 TSI|Benzin|1498|2019
Seat|Leon|1.4 TSI (5F)|Benzin|1395|2016
Seat|Leon|2.0 TDI (5F)|Diesel|1968|2016
Seat|Ibiza|1.2 TSI (6J)|Benzin|1197|2013
Seat|Ateca|1.5 TSI|Benzin|1498|2019
BMW|1er|116i (F20)|Benzin|1598|2013
BMW|1er|118d (F20)|Diesel|1995|2013
BMW|1er|118i (F20 LCI)|Benzin|1499|2016
BMW|3er|320d (E90)|Diesel|1995|2010
BMW|3er|320d (F30)|Diesel|1995|2013
BMW|3er|320i (F30)|Benzin|1997|2013
BMW|3er|320d (F30 LCI)|Diesel|1995|2016
BMW|3er|320d (G20)|Diesel|1995|2020
BMW|5er|520d (F10)|Diesel|1995|2013
BMW|5er|530d (F10)|Diesel|2993|2013
BMW|5er|520d (G30)|Diesel|1995|2019
BMW|X1|sDrive18d (E84)|Diesel|1995|2013
BMW|X1|sDrive18d (F48)|Diesel|1995|2019
BMW|X3|xDrive20d (F25)|Diesel|1995|2013
BMW|X3|xDrive20d (G01)|Diesel|1995|2019
BMW|2er|218i Active Tourer (F45)|Benzin|1499|2016
Mini|Cooper|1.6 (R56)|Benzin|1598|2010
Mini|Cooper|1.5 (F56)|Benzin|1499|2016
Mercedes-Benz|A-Klasse|A 180 (W176)|Benzin|1595|2013
Mercedes-Benz|A-Klasse|A 180 d (W176)|Diesel|1461|2016
Mercedes-Benz|A-Klasse|A 180 (W177)|Benzin|1332|2019
Mercedes-Benz|B-Klasse|B 180 (W246)|Benzin|1595|2013
Mercedes-Benz|C-Klasse|C 220 CDI (W204)|Diesel|2143|2010
Mercedes-Benz|C-Klasse|C 220 d (W205)|Diesel|2143|2016
Mercedes-Benz|C-Klasse|C 200 (W205)|Benzin|1991|2016
Mercedes-Benz|E-Klasse|E 220 CDI (W212)|Diesel|2143|2011
Mercedes-Benz|E-Klasse|E 220 d (W213)|Diesel|1950|2019
Mercedes-Benz|GLC|GLC 220 d (X253)|Diesel|2143|2017
Mercedes-Benz|CLA|CLA 200 (C117)|Benzin|1595|2016
Mercedes-Benz|Vito|2.1 CDI (W447)|Diesel|2143|2016
Mercedes-Benz|Sprinter|2.1 CDI (906)|Diesel|2143|2013
Opel|Corsa|1.2 (D)|Benzin|1229|2010
Opel|Corsa|1.4 (E)|Benzin|1398|2016
Opel|Corsa|1.2 (F)|Benzin|1199|2021
Opel|Astra|1.4 Turbo (J)|Benzin|1364|2013
Opel|Astra|1.4 Turbo (K)|Benzin|1399|2016
Opel|Astra|1.6 CDTI (K)|Diesel|1598|2016
Opel|Astra|1.2 Turbo (K Facelift)|Benzin|1199|2020
Opel|Insignia|2.0 CDTI (A)|Diesel|1956|2013
Opel|Zafira|2.0 CDTI (Tourer C)|Diesel|1956|2013
Opel|Mokka|1.4 Turbo|Benzin|1364|2014
Opel|Meriva|1.4 (B)|Benzin|1398|2013
Opel|Adam|1.4|Benzin|1398|2016
Ford|Fiesta|1.25 (Mk6)|Benzin|1242|2010
Ford|Fiesta|1.0 EcoBoost (Mk7)|Benzin|998|2014
Ford|Fiesta|1.1 (Mk8)|Benzin|1084|2019
Ford|Focus|1.6 Ti-VCT (Mk2)|Benzin|1596|2010
Ford|Focus|1.6 TDCi (Mk3)|Diesel|1560|2013
Ford|Focus|1.0 EcoBoost (Mk3)|Benzin|998|2016
Ford|Focus|1.5 TDCi (Mk3)|Diesel|1499|2016
Ford|Mondeo|2.0 TDCi (Mk5)|Diesel|1997|2016
Ford|Kuga|2.0 TDCi (Mk2)|Diesel|1997|2016
Ford|Kuga|1.5 EcoBoost (Mk2)|Benzin|1498|2016
Ford|C-Max|1.0 EcoBoost|Benzin|998|2016
Ford|Transit Custom|2.0 TDCi|Diesel|1995|2019
Renault|Clio|1.2 16V (III/IV)|Benzin|1149|2013
Renault|Clio|0.9 TCe (IV)|Benzin|898|2016
Renault|Clio|1.5 dCi (IV)|Diesel|1461|2016
Renault|Megane|1.5 dCi (III)|Diesel|1461|2013
Renault|Megane|1.2 TCe (III/IV)|Benzin|1197|2016
Renault|Captur|0.9 TCe|Benzin|898|2016
Renault|Scenic|1.5 dCi (III)|Diesel|1461|2013
Renault|Twingo|1.0 SCe (III)|Benzin|999|2016
Dacia|Sandero|0.9 TCe (II)|Benzin|898|2016
Dacia|Sandero|1.0 TCe (III)|Benzin|999|2022
Dacia|Duster|1.5 dCi|Diesel|1461|2016
Dacia|Duster|1.2 TCe|Benzin|1197|2016
Dacia|Logan|0.9 TCe MCV|Benzin|898|2016
Peugeot|208|1.2 PureTech|Benzin|1199|2016
Peugeot|208|1.2 PureTech (II)|Benzin|1199|2021
Peugeot|308|1.2 PureTech (T9)|Benzin|1199|2016
Peugeot|308|1.6 BlueHDi (T9)|Diesel|1560|2016
Peugeot|2008|1.2 PureTech|Benzin|1199|2016
Peugeot|3008|1.2 PureTech (II)|Benzin|1199|2019
Peugeot|3008|1.5 BlueHDi (II)|Diesel|1499|2019
Citroen|C3|1.2 PureTech (III)|Benzin|1199|2019
Citroen|C4 Picasso|1.6 BlueHDi (II)|Diesel|1560|2016
Citroen|Berlingo|1.6 HDi (II)|Diesel|1560|2013
Fiat|500|1.2 8V|Benzin|1242|2013
Fiat|500|0.9 TwinAir|Benzin|875|2013
Fiat|Panda|1.2 8V (III)|Benzin|1242|2013
Fiat|Tipo|1.4|Benzin|1368|2019
Fiat|Ducato|2.3 MultiJet|Diesel|2287|2016
Toyota|Yaris|1.33 Dual VVT-i (XP13)|Benzin|1329|2013
Toyota|Yaris|1.5 Hybrid (XP13)|Hybrid|1497|2016
Toyota|Auris|1.8 Hybrid (E15)|Hybrid|1798|2011
Toyota|Auris|1.8 Hybrid (E18)|Hybrid|1798|2016
Toyota|Corolla|1.8 Hybrid (E21)|Hybrid|1798|2020
Toyota|C-HR|1.8 Hybrid|Hybrid|1798|2019
Toyota|RAV4|2.5 Hybrid (XA50)|Hybrid|2487|2020
Toyota|Aygo|1.0 VVT-i|Benzin|998|2016
Toyota|Prius|1.8 Hybrid (XW30)|Hybrid|1798|2013
Hyundai|i30|1.6 CRDi (GD)|Diesel|1582|2013
Hyundai|i30|1.4 (GD)|Benzin|1396|2016
Hyundai|i20|1.2 (GB)|Benzin|1248|2016
Hyundai|ix35|2.0 GDI|Benzin|1999|2013
Hyundai|Tucson|1.6 GDI (TL)|Benzin|1591|2016
Hyundai|Tucson|1.7 CRDi (TL)|Diesel|1685|2016
Kia|Ceed|1.4 CVVT (JD)|Benzin|1396|2013
Kia|Ceed|1.6 CRDi (JD)|Diesel|1582|2016
Kia|Sportage|1.6 GDI (QL)|Benzin|1591|2016
Kia|Sportage|1.7 CRDi (SL/QL)|Diesel|1685|2016
Kia|Picanto|1.0 (TA)|Benzin|998|2013
Kia|Rio|1.2 (UB)|Benzin|1248|2016
Mazda|CX-5|2.2 Skyactiv-D (KE)|Diesel|2191|2013
Mazda|CX-5|2.0 Skyactiv-G (KE)|Benzin|1998|2016
Mazda|2|1.5 Skyactiv-G (DJ)|Benzin|1496|2016
Mazda|6|2.2 Skyactiv-D (GJ)|Diesel|2191|2013
Honda|Civic|1.8 i-VTEC (FK)|Benzin|1798|2010
Honda|Jazz|1.3 i-VTEC (GK)|Benzin|1318|2016
Honda|CR-V|2.2 i-DTEC (RE/RM)|Diesel|2199|2013
Nissan|Qashqai|1.6 (J10)|Benzin|1598|2010
Nissan|Qashqai|1.2 DIG-T (J11)|Benzin|1197|2016
Nissan|Qashqai|1.5 dCi (J11)|Diesel|1461|2016
Nissan|Juke|1.6 (F15)|Benzin|1598|2013
Nissan|Micra|1.2 (K13)|Benzin|1198|2013
Nissan|X-Trail|1.6 dCi (T32)|Diesel|1598|2016
Volvo|V40|D2 1.6|Diesel|1560|2013
Volvo|V60|D3 2.0|Diesel|1984|2013
Volvo|XC60|D4 2.0|Diesel|1969|2016
Volvo|XC90|D5 2.0 (II)|Diesel|1969|2017
Suzuki|Swift|1.2 (FZ)|Benzin|1242|2013
Suzuki|Vitara|1.6 (LY)|Benzin|1586|2016
`;

export const SEED_TYPES: Vehicle[] = LIST.trim()
  .split("\n")
  .map((line) => {
    const [make, model, variant, fuel, ccm, year] = line.split("|");
    return {
      make, model, variant, fuel: fuel as Vehicle["fuel"], displacementCcm: Number(ccm), firstRegistration: year,
      mileageKm: null, powerKw: null, engineCode: null, transmission: null, transmissionDetail: null, priceEur: null, co2GPerKm: null,
      consumptionPer100km: null, sellerType: null, location: null, previousOwners: null, accidentStatus: null, knownDamage: null,
      inspectionDue: null, serviceHistory: null, equipment: [], description: null, listingUrl: null,
    };
  });
