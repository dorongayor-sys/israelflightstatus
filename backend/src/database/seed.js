require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { initDb } = require('./db');

async function seed() {
  console.log('Initialising database...');
  const db = await initDb();

  // Create admin user
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);

  // Always upsert so Railway env var changes take effect on redeploy
  db.prepare('DELETE FROM users').run();
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Admin user set: ${username}`);

  // Seed airlines — use a sync_meta flag so DB migrations adding rows don't
  // falsely trigger the "already seeded" guard (e.g. ALK Airlines / FlyLili).
  const seededFlag = db.prepare("SELECT value FROM sync_meta WHERE key = 'airlines_seeded_v2'").get();
  if (seededFlag) {
    console.log('Airlines already seeded, skipping...');
    return;
  }

  // Source: Israeli aviation authority / news updates, April 2026.
  // Operation "Roaring Lion" — skies closed to civilian flights.
  // Status reflects latest announcements from each carrier.
  // Format: [name, iata_code, status, destinations_json, cancellation_reason, cancellation_end_date, notes, website]

  const airlines = [
    ['Aegean Airlines', 'A3', 'not_flying', '["TLV-ATH", "TLV-LCA", "TLV-HER", "TLV-SKG", "TLV-RHO"]', 'Regional security concerns', '2026-06-26', 'Greek national carrier. Suspended until at least 26/06/2026. Routes: Larnaca, Athens, Crete, Thessaloniki, Rhodes and other Mediterranean destinations.', 'https://www.aegeanair.com'],
    ['Air Canada', 'AC', 'not_flying', '["TLV-YYZ"]', 'Security concerns', '2026-09-07', 'Suspended until at least 08/09/2026. Operated 4 weekly flights to Toronto.', 'https://www.aircanada.com'],
    ['Air Europa', 'UX', 'not_flying', '["TLV-MAD"]', 'Security concerns', '2026-05-31', 'Spanish carrier. Suspended until at least 04/05/2026. Route: TLV-Madrid.', 'https://www.aireuropa.com'],
    ['Air France', 'AF', 'not_flying', '["TLV-CDG"]', 'Security concerns / airspace restrictions', '2026-05-03', 'Suspended until at least 03/05/2026. Route: TLV-Paris (CDG).', 'https://www.airfrance.com'],
    ['Air Haifa', 'HI', 'flying', '["TLV-LCA"]', '', null, 'Small Israeli carrier operating limited routes from TLV during the current emergency period.', 'https://www.airhaifa.com'],
    ['Air India', 'AI', 'not_flying', '["TLV-DEL"]', 'Security concerns / airspace restrictions', '2026-05-31', 'Suspended until at least 31/05/2026. Route: TLV-Delhi.', 'https://www.airindia.com'],
    ['Air Samarkand (Sam Air)', '9S', 'not_flying', '["TLV-SKD"]', 'Security concerns', null, 'Suspended TLV service until at least spring 2026. Route: TLV-Samarkand.', ''],
    ['Air Serbia', 'JU', 'not_flying', '["TLV-BEG"]', 'Security concerns', null, 'Not currently operating flights from Ben Gurion.', 'https://www.airserbia.com'],
    ['Air Seychelles', 'HM', 'not_flying', '["TLV-SEZ"]', 'Security concerns', '2026-05-01', 'Suspended until at least 02/05/2026. Route: TLV-Seychelles.', 'https://www.airseychelles.com'],
    ['American Airlines', 'AA', 'not_flying', '["TLV-JFK"]', 'Ongoing security concerns', '2026-09-08', 'Announced return to TLV-USA service on 09/08/2026. Currently not operating TLV flights.', 'https://www.aa.com'],
    ['Animawings', 'IO', 'not_flying', '["TLV-OTP"]', 'Security concerns', '2026-08-08', 'Romanian charter airline. Suspended until at least 10/08/2026. Route: TLV-Bucharest.', 'https://www.animawings.com'],
    ['Arkia', 'IZ', 'flying', '["All destinations"]', '', null, '', 'https://www.arkia.com'],
    ['Austrian Airlines', 'OS', 'not_flying', '["TLV-VIE"]', 'Suspended alongside Lufthansa Group', '2026-05-31', 'Part of Lufthansa Group. Suspended until at least 01/06/2026. Route: TLV-Vienna.', 'https://www.austrian.com'],
    ['Azerbaijan Airlines (AZAL)', 'J2', 'not_flying', '["TLV-GYD"]', 'Security concerns', '2026-05-01', 'Azerbaijani flag carrier. Suspended until at least 01/05/2026. Route: TLV-Baku.', 'https://www.azal.az'],
    ['Azimuth', 'A4', 'not_flying', '["TLV-AER"]', 'Security concerns', '2026-04-18', 'Russian regional carrier. Suspended until at least 20/04/2026. Route: TLV-Sochi (Russia).', 'https://www.azimuth.aero'],
    ['Belavia', 'B2', 'not_flying', '["TLV-MSQ"]', 'War Situation', null, '', 'https://www.belavia.by'],
    ['Bluebird Airways', 'BZ', 'flying', '["TLV-ATH"]', 'War - flights suspended', '2026-04-12', '', 'https://www.bluebirdairways.com'],
    ['British Airways', 'BA', 'not_flying', '["TLV-LHR"]', 'Indefinite suspension — ongoing security concerns', '2026-07-01', 'Suspended until at least 01/06/2026. Route: TLV-London Heathrow.', 'https://www.britishairways.com'],
    ['Brussels Airlines', 'SN', 'not_flying', '["TLV-BRU"]', 'Suspended alongside Lufthansa Group', '2026-05-31', 'Part of Lufthansa Group. Suspended until at least 01/06/2026. Route: TLV-Brussels.', 'https://www.brusselsairlines.com'],
    ['Bulgaria Air', 'FB', 'not_flying', '["TLV-SOF"]', 'Security concerns', '2026-05-14', 'Bulgarian national carrier. Suspended until at least 14/05/2026. Route: TLV-Sofia.', 'https://www.air.bg'],
    ['Cathay Pacific', 'CX', 'not_flying', '["TLV-HKG"]', 'Security concerns', null, 'Hong Kong carrier. Not flying to/from Israel at this stage.', 'https://www.cathaypacific.com'],
    ['Centrum Air', 'C6', 'not_flying', '["TLV-TAS", "TLV-SKD"]', 'Security concerns', null, 'Suspended with no confirmed return date. Routes: TLV-Tashkent and Samarkand.', ''],
    ['Croatia Airlines', 'OU', 'not_flying', '["TLV-ZAG"]', 'Security concerns', null, 'Croatian national carrier. Suspended due to security situation. Route: TLV-Zagreb.', 'https://www.croatiaairlines.com'],
    ['Cyprus Airways', 'CY', 'not_flying', '["TLV-LCA"]', 'Security concerns', '2026-04-17', 'Cypriot carrier. Suspended until at least 17/04/2026. Route: TLV-Larnaca.', 'https://www.cyprusairways.com'],
    ['Delta Air Lines', 'DL', 'not_flying', '["TLV-JFK", "TLV-ATL", "TLV-BOS"]', 'Ongoing security concerns — Israel-Iran conflict', '2026-09-05', 'Suspended until at least 05/09/2026. Routes: New York (JFK), Atlanta, and Boston.', 'https://www.delta.com'],
    ['EgyptAir', 'MS', 'not_flying', '["TLV-CAI"]', 'Security concerns', null, 'Egyptian national carrier. Not flying to/from Israel at this stage.', 'https://www.egyptair.com'],
    ['El Al', 'LY', 'flying', '["All destinations"]', '', null, 'National carrier. Operating emergency/reduced schedule only. Regular flights to NY, LA, Miami, Bangkok, London, Paris, Rome, Athens maintained as emergency service.', 'https://www.elal.com'],
    ['Electra Airways', '3E', 'not_flying', '[]', 'War - flights suspended', null, 'Israeli charter airline operating flights to various Mediterranean islands and European destinations.', ''],
    ['Emirates', 'EK', 'not_flying', '["TLV-DXB"]', 'Commercial and safety decision', null, 'Own Emirates flights suspended until April 2026. However, operates 8 daily TLV-DXB flights in cooperation with subsidiary flydubai, including connecting itineraries.', 'https://www.emirates.com'],
    ['Enter Air', 'ENT', 'not_flying', '["TLV-WAW"]', 'Security concerns', null, 'Polish charter airline. Not operating regular TLV service due to the war. Route: TLV-Warsaw.', 'https://www.enterair.pl'],
    ['Ethiopian Airlines', 'ET', 'not_flying', '["TLV-ADD"]', 'Security concerns / airspace restrictions', '2026-04-16', 'African flag carrier. Suspended until at least 16/04/2026. Route: TLV-Addis Ababa.', 'https://www.ethiopianairlines.com'],
    ['Etihad Airways', 'EY', 'not_flying', '["TLV-AUH"]', 'Airport operating under emergency restrictions', '2026-04-15', 'UAE carrier. Announced suspension of TLV flights until at least 16/04/2026. Routes: TLV-Abu Dhabi.', 'https://www.etihad.com'],
    ['Eurowings', 'EW', 'not_flying', '["TLV-DUS", "TLV-PRG", "TLV-HAM"]', 'Security concerns — Lufthansa Group', '2026-05-31', 'Lufthansa low-cost subsidiary. Suspended until at least 01/05/2026. Routes: TLV-Düsseldorf, Prague, Hamburg.', 'https://www.eurowings.com'],
    ['Finnair', 'AY', 'not_flying', '["TLV-HEL"]', 'Security concerns', null, 'Finnish national carrier. Not flying to/from Israel at this stage.', 'https://www.finnair.com'],
    ['FlyILi', 'FL', 'flying', '["TLV-VIE"]', 'War - flights suspended', null, 'Operating flight (TLV-VIE) for Arkia.', 'https://www.flyili.com'],
    ['FlyOne', 'S5', 'not_flying', '["TLV-KIV"]', 'Security concerns', '2026-04-17', 'Moldovan carrier. Suspended until at least 01/05/2026. Route: TLV-Moldova (Chisinau).', 'https://www.flyone.eu'],
    ['FlyYO', '4D', 'not_flying', '["TLV-ATH", "TLV-SKG", "TLV-LCA", "TLV-BUD"]', 'War - flights suspended', null, 'Operating charter flights for Israeli tourism companies. Destinations include Greece, Cyprus, and Hungary.', ''],
    ['Georgian Airways', 'A9', 'not_flying', '["TLV-TBS"]', 'Security concerns', '2026-04-17', 'Suspended until at least 17/04/2026. Route: TLV-Tbilisi.', 'https://www.georgian-airways.com'],
    ['Hainan Airlines', 'HU', 'not_flying', '["TLV-PEK", "TLV-SZX"]', 'Security concerns / airspace restrictions', '2026-04-16', 'Chinese carrier. Suspended until at least 20/04/2026. Routes: TLV-Beijing (PEK) and Shenzhen (SZX).', 'https://www.hnair.com'],
    ['Hello Jets', 'H3', 'not_flying', '["TLV-MUC", "TLV-FRA"]', 'War - flights suspended', null, 'Operating flights between Tel Aviv and Munich and other destinations.', ''],
    ['HiSky', 'H4', 'flying', '["TLV-RMO", "TLV-OTP"]', 'Security concerns', '2026-04-14', '', 'https://www.hisky.eu'],
    ['ITA Airways', 'AZ', 'not_flying', '["TLV-FCO", "TLV-MXP"]', 'Safety concerns', '2026-05-01', 'Italian national carrier (formerly Alitalia). Suspended until at least 01/05/2026. Route: TLV-Rome.', 'https://www.ita-airways.com'],
    ['Iberia', 'IB', 'not_flying', '["TLV-MAD", "TLV-BCN"]', 'Security concerns — IAG Group', '2026-05-30', 'Part of IAG. Suspended until at least 01/06/2026. Routes: TLV-Madrid and Barcelona (operated via Iberia Express brand).', 'https://www.iberia.com'],
    ['Icelandair', 'FI', 'not_flying', '["TLV-KEF"]', 'Security concerns', null, 'Icelandic carrier. Not flying to/from Israel at this stage.', 'https://www.icelandair.com'],
    ['Israir', '6H', 'flying', '["All destinations"]', '', null, 'Israeli carrier. Operating minimal emergency flights.', 'https://www.israirairlines.com'],
    ['KLM', 'KL', 'not_flying', '["TLV-AMS"]', 'Security concerns — Air France-KLM Group decision', '2026-05-17', 'Operating flights from Ben Gurion to Amsterdam. Suspended until at least 17/05/2026 — check directly with airline for specific bookings.', 'https://www.klm.com'],
    ['Korean Air', 'KE', 'not_flying', '["TLV-ICN"]', 'Security concerns', null, 'South Korean flag carrier. Not flying to/from Israel at this stage.', 'https://www.koreanair.com'],
    ['LOT Polish Airlines', 'LO', 'not_flying', '["TLV-WAW", "TLV-KRK"]', 'Security concerns', '2026-05-31', 'Polish national carrier. Suspended until at least 01/06/2026. Routes: TLV-Warsaw and Krakow.', 'https://www.lot.com'],
    ['Lufthansa', 'LH', 'not_flying', '["TLV-FRA", "TLV-MUC"]', 'Security assessment / airspace restrictions', '2026-05-31', 'Suspended until at least 01/06/2026. Routes: TLV-Munich and Frankfurt.', 'https://www.lufthansa.com'],
    ['Malta Airlines', 'KM', 'not_flying', '["TLV-MLA"]', 'Security concerns', null, 'Not currently operating flights from Ben Gurion.', 'https://www.maltaairlines.com'],
    ['Norwegian Air Shuttle', 'DY', 'not_flying', '["TLV-CPH", "TLV-ARN", "TLV-OSL"]', 'Security concerns', null, 'Announced return to TLV-Copenhagen route on 17/06/2026.', 'https://www.norwegian.com'],
    ['Pegasus Airlines', 'PC', 'not_flying', '["TLV-SAW"]', 'Turkish government ban on flights to/from Israel', null, 'Turkish LCC. Government ban prevents operations. Not flying to/from Israel at this stage.', 'https://www.flypgs.com'],
    ['Qanot Sharq', 'Q7', 'not_flying', '["TLV-SKD", "TLV-TAS"]', 'War - flights suspended', null, 'Uzbek carrier. Operating flights between Tel Aviv and Samarkand and Tashkent.', 'https://www.qanotsharq.com'],
    ['Red Wings', 'WZ', 'not_flying', '["TLV-AER", "TLV-SVO"]', 'Security concerns', '2026-04-17', 'Russian carrier. Suspended until at least 18/04/2026. Routes: TLV-Russia.', 'https://www.redwings.ru'],
    ['Royal Air Maroc', 'AT', 'not_flying', '["TLV-CMN"]', 'Security concerns', null, 'Moroccan flag carrier. Not flying to/from Israel at this stage.', 'https://www.royalairmaroc.com'],
    ['Royal Jordanian', 'RJ', 'not_flying', '["TLV-AMM"]', 'Regional security / diplomatic considerations', null, 'Operated TLV-AMM under Jordan-Israel peace treaty framework. Not flying at this stage.', 'https://www.rj.com'],
    ['Ryanair', 'FR', 'not_flying', '["TLV-VIE", "TLV-PFO", "TLV-KRK", "TLV-BRU", "TLV-BLQ", "TLV-SOF", "TLV-NAP", "TLV-ATH", "TLV-BUD", "TLV-MLA"]', 'Not operating at Ben Gurion currently', null, 'Not active at Ben Gurion at this stage. When service resumes, plans to operate: Vienna, Paphos, Krakow, Brussels, Bologna, Sofia, Naples, Athens, Budapest, Malta.', 'https://www.ryanair.com'],
    ['SAS Scandinavian Airlines', 'SK', 'not_flying', '["TLV-CPH", "TLV-ARN", "TLV-OSL"]', 'Security concerns', '2026-05-31', 'Scandinavian carrier. Suspended until at least 02/06/2026. Route: TLV-Copenhagen (direct).', 'https://www.flysas.com'],
    ['Sky Express', 'GQ', 'not_flying', '["TLV-ATH"]', 'Security concerns', '2026-04-17', 'Greek regional carrier. Suspended until at least 17/04/2026. Route: TLV-Athens.', 'https://www.skyexpress.gr'],
    ['SkyUp', 'PQ', 'not_flying', '["TLV-KBP", "TLV-OTP"]', 'Security concerns', '2026-05-01', 'Ukrainian LCC. Suspended until at least 03/05/2026. Various destinations.', 'https://www.skyUp.aero'],
    ['SmartWings', 'QS', 'not_flying', '["TLV-PRG"]', 'Security concerns', '2026-04-15', 'Czech LCC. Suspended until at least 01/07/2026. Route: TLV-Prague.', 'https://www.smartwings.com'],
    ['SunExpress', 'XQ', 'not_flying', '["TLV-IST", "TLV-AYT"]', 'Security concerns', null, 'Turkish-German LCC. Not operating from Israel at this stage.', 'https://www.sunexpress.com'],
    ['Swiss', 'LX', 'not_flying', '["TLV-ZRH"]', 'Suspended alongside Lufthansa Group', '2026-05-31', 'Part of Lufthansa Group. Suspended until at least 01/06/2026. Route: TLV-Zurich.', 'https://www.swiss.com'],
    ['TAP Air Portugal', 'TP', 'not_flying', '["TLV-LIS"]', 'War - flights suspended', '2026-05-31', 'Operating flights from Tel Aviv to Lisbon. Announced return to full Israel service from 01/06/2026.', 'https://www.flytap.com'],
    ['TAROM', 'RO', 'not_flying', '["TLV-OTP"]', 'Security concerns', '2026-04-19', 'Romanian national carrier. Suspended until at least 19/04/2026. Route: TLV-Bucharest.', 'https://www.tarom.ro'],
    ['TUS Airways', 'U8', 'not_flying', '["TLV-PFO", "TLV-LCA", "TLV-NAP", "TLV-SKG", "TLV-SOF", "TLV-VIE", "TLV-CFU", "TLV-JTR"]', 'Security concerns', '2026-04-14', '', 'https://www.tusairways.com'],
    ['Transavia', 'TO', 'not_flying', '["TLV-CDG", "TLV-LYS", "TLV-MRS", "TLV-TLS", "TLV-AMS"]', 'Security concerns — Air France-KLM Group decision', '2026-07-04', 'Air France-KLM low-cost subsidiary. Suspended until at least 06/07/2026. Routes: Paris, Lyon, Marseille, Toulouse. Amsterdam expected to resume later.', 'https://www.transavia.com'],
    ['Transavia Netherlands', 'HV', 'not_flying', '["TLV-AMS", "TLV-RTM"]', 'Security concerns — Air France-KLM Group decision', null, 'KLM low-cost subsidiary. All TLV routes suspended.', 'https://www.transavia.com'],
    ['Turkish Airlines', 'TK', 'not_flying', '["TLV-IST"]', 'Turkish government ban on flights to/from Israel', null, 'Ankara imposed a complete ban on Turkey-Israel flights amid the conflict. Not operating from Ben Gurion.', 'https://www.turkishairlines.com'],
    ['United Airlines', 'UA', 'not_flying', '["TLV-EWR"]', 'Ongoing security concerns — Israel-Iran conflict', '2026-09-07', 'Suspended until at least 07/09/2026. Routes: TLV-Newark.', 'https://www.united.com'],
    ['Uzbekistan Airways', 'HY', 'flying', '["TLV-TAS"]', 'Security concerns', '2026-04-14', 'Uzbek flag carrier. Suspended until at least 14/04/2026. Route: TLV-Tashkent.', 'https://www.uzairways.com'],
    ['Virgin Atlantic', 'VS', 'not_flying', '["TLV-LHR"]', 'Safety review', null, 'Not flying to/from Israel at this stage.', 'https://www.virginatlantic.com'],
    ['Vueling', 'VY', 'not_flying', '["TLV-BCN", "TLV-MAD"]', 'Security concerns — IAG Group', null, 'IAG low-cost subsidiary. All TLV routes suspended.', 'https://www.vueling.com'],
    ['Wizz Air', 'W6', 'not_flying', '["TLV-LTN", "TLV-BUD", "TLV-OTP", "TLV-VNO", "TLV-VIE", "TLV-VAR", "TLV-WAW", "TLV-LCA", "TLV-MXP", "TLV-RHO", "TLV-FCO", "TLV-SOF", "TLV-KRK", "TLV-IAS"]', 'Security concerns / airport restrictions', '2026-05-04', 'Wizz Air suspended all flights to TLV until 4th may.', 'https://www.wizzair.com'],
    ['airBaltic', 'BT', 'not_flying', '["TLV-RIX"]', 'Security concerns', '2026-05-31', 'Latvian carrier. Suspended until at least 01/06/2026. Route: TLV-Riga.', 'https://www.airbaltic.com'],
    ['easyJet', 'U2', 'not_flying', '["TLV-LGW", "TLV-LTN", "TLV-CDG", "TLV-MXP", "TLV-GVA", "TLV-AMS", "TLV-BCN"]', 'Safety review — will not return in summer 2026', null, 'Announced it will not return to Israel even in summer 2026.', 'https://www.easyjet.com'],
    ['flydubai', 'FZ', 'flying', '["TLV-DXB"]', 'Airport operating under emergency restrictions', '2026-04-30', '', 'https://www.flydubai.com'],
  ];

  const ISRAELI_NAMES = new Set(['El Al', 'Israir', 'Arkia', 'Air Haifa']);

  const insert = db.prepare(`
    INSERT INTO airlines (name, iata_code, status, destinations, cancellation_reason, cancellation_end_date, notes, website, is_israeli, date_adjusted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertMany = db.transaction((list) => {
    for (const row of list) insert.run(...row, ISRAELI_NAMES.has(row[0]) ? 1 : 0);
  });

  db.prepare('DELETE FROM airlines').run();
  insertMany(airlines);
  db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('airlines_seeded_v2', '1')").run();
  console.log(`Seeded ${airlines.length} airlines`);
  console.log('\nDone! Start the server with: npm run dev');
}

seed().catch(console.error);
