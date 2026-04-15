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

  // Seed airlines
  // To re-seed: delete backend/data/aviation.db and re-run this script
  const airlinesCount = db.prepare('SELECT COUNT(*) as count FROM airlines').get().count;
  if (airlinesCount > 0) {
    console.log('Airlines already seeded, skipping...');
    return;
  }

  // Source: Israeli aviation authority / news updates, April 2026.
  // Operation "Roaring Lion" — skies closed to civilian flights.
  // Status reflects latest announcements from each carrier.
  // Format: [name, iata_code, status, destinations_json, cancellation_reason, cancellation_end_date, notes, website]

  const airlines = [

    // ── ISRAELI CARRIERS ──────────────────────────────────────────────────────
    [
      'El Al', 'LY', 'partial',
      JSON.stringify(['TLV-JFK', 'TLV-LAX', 'TLV-MIA', 'TLV-LHR', 'TLV-CDG', 'TLV-FRA', 'TLV-FCO', 'TLV-ATH', 'TLV-BKK', 'TLV-HKT', 'TLV-NRT', 'TLV-LCA', 'TLV-BOS', 'TLV-FLL']),
      'Airport operating under emergency restrictions', null,
      'National carrier. Operating emergency/reduced schedule only. Regular flights to NY, LA, Miami, Bangkok, London, Paris, Rome, Athens maintained as emergency service.',
      'https://www.elal.com'
    ],
    [
      'Arkia', 'IZ', 'partial',
      JSON.stringify(['TLV-ATH', 'TLV-LCA', 'TLV-BCN', 'TLV-FCO', 'TLV-VIE', 'TLV-MXP', 'TLV-RHO', 'TLV-HER', 'TLV-CFU']),
      'Airport operating under emergency restrictions', null,
      'Israeli leisure/international carrier. Halted regular ticket sales. Operating limited emergency flights only.',
      'https://www.arkia.com'
    ],
    [
      'Israir', '6H', 'partial',
      JSON.stringify(['TLV-ATH', 'TLV-LCA', 'TLV-FCO', 'TLV-RHO', 'TLV-HER', 'TLV-SKG', 'TLV-KGS', 'TLV-PMI']),
      'Airport operating under emergency restrictions', null,
      'Israeli carrier. Operating minimal emergency flights.',
      'https://www.israirairlines.com'
    ],
    [
      'Air Haifa', 'HI', 'partial',
      JSON.stringify(['TLV-LCA', 'TLV-ATH']),
      null, null,
      'Small Israeli carrier operating limited routes during the current emergency period.',
      'https://www.airhaifa.com'
    ],
    [
      'Electra Airways', null, 'flying',
      JSON.stringify(['TLV-ATH', 'TLV-RHO', 'TLV-HER', 'TLV-SKG', 'TLV-LCA', 'TLV-PMI', 'TLV-BCN']),
      null, null,
      'Israeli charter airline operating flights to various Mediterranean islands and European destinations.',
      null
    ],
    [
      'FlyILi', null, 'flying',
      JSON.stringify(['TLV-ATH', 'TLV-LCA', 'TLV-BCN', 'TLV-FCO', 'TLV-RHO', 'TLV-HER']),
      null, null,
      'Israeli low-cost carrier operating flights to various Mediterranean and European destinations.',
      'https://www.flyili.com'
    ],
    [
      'Class Jet', null, 'flying',
      JSON.stringify(['TLV-ATH', 'TLV-LCA']),
      null, null,
      'Israeli charter operator. Operating charter flights for various Israeli tour operators.',
      null
    ],
    [
      'FlyYO', null, 'flying',
      JSON.stringify(['TLV-ATH', 'TLV-SKG', 'TLV-LCA', 'TLV-BUD']),
      null, null,
      'Operating charter flights for Israeli tourism companies. Destinations include Greece, Cyprus, and Hungary.',
      null
    ],
    [
      'Bluebird Airways', 'BZ', 'partial',
      JSON.stringify(['TLV-ATH', 'TLV-BUD', 'TLV-BOJ', 'TLV-BCN', 'TLV-TXL', 'TLV-VAR', 'TLV-HER', 'TLV-JMK', 'TLV-PFO', 'TLV-PRG', 'TLV-RHO', 'TLV-KGS']),
      'Airport operating under emergency restrictions', '2026-04-19',
      'Israeli charter airline. Suspended regular TLV operations until at least 19/04/2026. During the war, operating from Tabba airport. When resumed: Athens, Budapest, Burgas, Barcelona, Berlin, Varna, Crete, Mykonos, Paphos, Prague, Rhodes, Kos.',
      'https://www.bluebirdairways.com'
    ],

    // ── GULF / MIDDLE EAST ────────────────────────────────────────────────────
    [
      'flydubai', 'FZ', 'not_flying',
      JSON.stringify(['TLV-DXB']),
      'Airport operating under emergency restrictions', '2026-05-01',
      'UAE LCC. Announced suspension of TLV flights until at least 01/05/2026. Emirates operates 8 daily TLV-DXB flights in cooperation with flydubai (including connecting itineraries).',
      'https://www.flydubai.com'
    ],
    [
      'Etihad Airways', 'EY', 'not_flying',
      JSON.stringify(['TLV-AUH']),
      'Airport operating under emergency restrictions', '2026-04-16',
      'UAE carrier. Announced suspension of TLV flights until at least 16/04/2026. Routes: TLV-Abu Dhabi.',
      'https://www.etihad.com'
    ],
    [
      'Emirates', 'EK', 'not_flying',
      JSON.stringify(['TLV-DXB']),
      'Commercial and safety decision', null,
      'Own Emirates flights suspended until April 2026. However, operates 8 daily TLV-DXB flights in cooperation with subsidiary flydubai, including connecting itineraries.',
      'https://www.emirates.com'
    ],
    [
      'Air Arabia', 'G9', 'not_flying',
      JSON.stringify(['TLV-SHJ', 'TLV-AUH']),
      'Security concerns', null,
      'UAE LCC (Sharjah-based). Suspended amid ongoing conflict.',
      'https://www.airarabia.com'
    ],
    [
      'Royal Jordanian', 'RJ', 'not_flying',
      JSON.stringify(['TLV-AMM']),
      'Regional security / diplomatic considerations', null,
      'Operated TLV-AMM under Jordan-Israel peace treaty framework. Not flying at this stage.',
      'https://www.rj.com'
    ],
    [
      'Gulf Air', 'GF', 'not_flying',
      JSON.stringify(['TLV-BAH']),
      'Security concerns', null,
      'Bahrain flag carrier. Not flying to/from Israel at this stage.',
      'https://www.gulfair.com'
    ],
    [
      'Oman Air', 'WY', 'not_flying',
      JSON.stringify(['TLV-MCT']),
      'Security concerns', null,
      'Had operated TLV-MCT route. Suspended.',
      'https://www.omanair.com'
    ],

    // ── NORTH AMERICAN ────────────────────────────────────────────────────────
    [
      'American Airlines', 'AA', 'not_flying',
      JSON.stringify(['TLV-JFK']),
      'Ongoing security concerns', null,
      'Announced return to TLV-USA service on 02/07/2026. Currently not operating TLV flights.',
      'https://www.aa.com'
    ],
    [
      'Delta Air Lines', 'DL', 'not_flying',
      JSON.stringify(['TLV-JFK', 'TLV-ATL', 'TLV-BOS']),
      'Ongoing security concerns — Israel-Iran conflict', '2026-09-05',
      'Suspended until at least 05/09/2026. Routes: New York (JFK), Atlanta, and Boston.',
      'https://www.delta.com'
    ],
    [
      'United Airlines', 'UA', 'not_flying',
      JSON.stringify(['TLV-EWR']),
      'Ongoing security concerns — Israel-Iran conflict', '2026-09-07',
      'Suspended until at least 07/09/2026. Routes: TLV-Newark.',
      'https://www.united.com'
    ],
    [
      'Air Canada', 'AC', 'not_flying',
      JSON.stringify(['TLV-YYZ']),
      'Security concerns', '2026-09-08',
      'Suspended until at least 08/09/2026. Operated 4 weekly flights to Toronto.',
      'https://www.aircanada.com'
    ],

    // ── EUROPEAN — Lufthansa Group ────────────────────────────────────────────
    [
      'Lufthansa', 'LH', 'not_flying',
      JSON.stringify(['TLV-FRA', 'TLV-MUC']),
      'Security assessment / airspace restrictions', '2026-06-01',
      'Suspended until at least 01/06/2026. Routes: TLV-Munich and Frankfurt.',
      'https://www.lufthansa.com'
    ],
    [
      'Austrian Airlines', 'OS', 'not_flying',
      JSON.stringify(['TLV-VIE']),
      'Suspended alongside Lufthansa Group', '2026-06-01',
      'Part of Lufthansa Group. Suspended until at least 01/06/2026. Route: TLV-Vienna.',
      'https://www.austrian.com'
    ],
    [
      'Swiss', 'LX', 'not_flying',
      JSON.stringify(['TLV-ZRH']),
      'Suspended alongside Lufthansa Group', '2026-06-01',
      'Part of Lufthansa Group. Suspended until at least 01/06/2026. Route: TLV-Zurich.',
      'https://www.swiss.com'
    ],
    [
      'Brussels Airlines', 'SN', 'not_flying',
      JSON.stringify(['TLV-BRU']),
      'Suspended alongside Lufthansa Group', '2026-06-01',
      'Part of Lufthansa Group. Suspended until at least 01/06/2026. Route: TLV-Brussels.',
      'https://www.brusselsairlines.com'
    ],
    [
      'Eurowings', 'EW', 'not_flying',
      JSON.stringify(['TLV-DUS', 'TLV-PRG', 'TLV-HAM']),
      'Security concerns — Lufthansa Group', '2026-05-01',
      'Lufthansa low-cost subsidiary. Suspended until at least 01/05/2026. Routes: TLV-Düsseldorf, Prague, Hamburg.',
      'https://www.eurowings.com'
    ],

    // ── EUROPEAN — Air France-KLM Group ──────────────────────────────────────
    [
      'Air France', 'AF', 'not_flying',
      JSON.stringify(['TLV-CDG']),
      'Security concerns / airspace restrictions', '2026-05-03',
      'Suspended until at least 03/05/2026. Route: TLV-Paris (CDG).',
      'https://www.airfrance.com'
    ],
    [
      'KLM', 'KL', 'partial',
      JSON.stringify(['TLV-AMS']),
      'Security concerns — Air France-KLM Group decision', '2026-05-17',
      'Operating flights from Ben Gurion to Amsterdam. Suspended until at least 17/05/2026 — check directly with airline for specific bookings.',
      'https://www.klm.com'
    ],
    [
      'Transavia', 'TO', 'not_flying',
      JSON.stringify(['TLV-CDG', 'TLV-LYS', 'TLV-MRS', 'TLV-TLS', 'TLV-AMS']),
      'Security concerns — Air France-KLM Group decision', '2026-07-06',
      'Air France-KLM low-cost subsidiary. Suspended until at least 06/07/2026. Routes: Paris, Lyon, Marseille, Toulouse. Amsterdam expected to resume later.',
      'https://www.transavia.com'
    ],
    [
      'Transavia Netherlands', 'HV', 'not_flying',
      JSON.stringify(['TLV-AMS', 'TLV-RTM']),
      'Security concerns — Air France-KLM Group decision', null,
      'KLM low-cost subsidiary. All TLV routes suspended.',
      'https://www.transavia.com'
    ],

    // ── EUROPEAN — IAG Group ──────────────────────────────────────────────────
    [
      'British Airways', 'BA', 'not_flying',
      JSON.stringify(['TLV-LHR']),
      'Indefinite suspension — ongoing security concerns', '2026-06-01',
      'Suspended until at least 01/06/2026. Route: TLV-London Heathrow.',
      'https://www.britishairways.com'
    ],
    [
      'Iberia', 'IB', 'not_flying',
      JSON.stringify(['TLV-MAD', 'TLV-BCN']),
      'Security concerns — IAG Group', '2026-06-01',
      'Part of IAG. Suspended until at least 01/06/2026. Routes: TLV-Madrid and Barcelona (operated via Iberia Express brand).',
      'https://www.iberia.com'
    ],
    [
      'Vueling', 'VY', 'not_flying',
      JSON.stringify(['TLV-BCN', 'TLV-MAD']),
      'Security concerns — IAG Group', null,
      'IAG low-cost subsidiary. All TLV routes suspended.',
      'https://www.vueling.com'
    ],
    [
      'Aer Lingus', 'EI', 'not_flying',
      JSON.stringify(['TLV-DUB']),
      'Security concerns — IAG Group', null,
      'Part of IAG. TLV-Dublin route suspended.',
      'https://www.aerlingus.com'
    ],

    // ── EUROPEAN — LCCs ───────────────────────────────────────────────────────
    [
      'Ryanair', 'FR', 'not_flying',
      JSON.stringify(['TLV-VIE', 'TLV-PFO', 'TLV-KRK', 'TLV-BRU', 'TLV-BLQ', 'TLV-SOF', 'TLV-NAP', 'TLV-ATH', 'TLV-BUD', 'TLV-MLA']),
      'Not operating at Ben Gurion currently', null,
      'Not active at Ben Gurion at this stage. When service resumes, plans to operate: Vienna, Paphos, Krakow, Brussels, Bologna, Sofia, Naples, Athens, Budapest, Malta.',
      'https://www.ryanair.com'
    ],
    [
      'easyJet', 'U2', 'not_flying',
      JSON.stringify(['TLV-LGW', 'TLV-LTN', 'TLV-CDG', 'TLV-MXP', 'TLV-GVA', 'TLV-AMS', 'TLV-BCN']),
      'Safety review — will not return in summer 2026', null,
      'Announced it will not return to Israel even in summer 2026.',
      'https://www.easyjet.com'
    ],
    [
      'Wizz Air', 'W6', 'not_flying',
      JSON.stringify(['TLV-LTN', 'TLV-BUD', 'TLV-OTP', 'TLV-VNO', 'TLV-VIE', 'TLV-VAR', 'TLV-WAW', 'TLV-LCA', 'TLV-MXP', 'TLV-RHO', 'TLV-FCO', 'TLV-SOF', 'TLV-KRK', 'TLV-IAS']),
      'Security concerns / airport restrictions', '2026-04-28',
      'Suspended until at least 28/04/2026. Routes: Athens, Budapest, Bucharest, Vilnius, Vienna, Varna, Warsaw, London, Larnaca, Milan, Rhodes, Rome, Sofia, Krakow, Iasi.',
      'https://www.wizzair.com'
    ],
    [
      'Norwegian Air Shuttle', 'DY', 'not_flying',
      JSON.stringify(['TLV-CPH', 'TLV-ARN', 'TLV-OSL']),
      'Security concerns', null,
      'Announced return to TLV-Copenhagen route on 17/06/2026.',
      'https://www.norwegian.com'
    ],
    [
      'Volotea', 'V7', 'not_flying',
      JSON.stringify(['TLV-ATH', 'TLV-FCO', 'TLV-VRN', 'TLV-NAP']),
      'Security concerns', null,
      'Spanish LCC operating Mediterranean routes to TLV. All routes suspended.',
      'https://www.volotea.com'
    ],
    [
      'SmartWings', 'QS', 'not_flying',
      JSON.stringify(['TLV-PRG']),
      'Security concerns', '2026-07-01',
      'Czech LCC. Suspended until at least 01/07/2026. Route: TLV-Prague.',
      'https://www.smartwings.com'
    ],
    [
      'SunExpress', 'XQ', 'not_flying',
      JSON.stringify(['TLV-IST', 'TLV-AYT']),
      'Security concerns', null,
      'Turkish-German LCC. Not operating from Israel at this stage.',
      'https://www.sunexpress.com'
    ],

    // ── EUROPEAN — Full-service ────────────────────────────────────────────────
    [
      'ITA Airways', 'AZ', 'not_flying',
      JSON.stringify(['TLV-FCO', 'TLV-MXP']),
      'Safety concerns', '2026-05-01',
      'Italian national carrier (formerly Alitalia). Suspended until at least 01/05/2026. Route: TLV-Rome.',
      'https://www.ita-airways.com'
    ],
    [
      'Aegean Airlines', 'A3', 'not_flying',
      JSON.stringify(['TLV-ATH', 'TLV-LCA', 'TLV-HER', 'TLV-SKG', 'TLV-RHO']),
      'Regional security concerns', '2026-06-26',
      'Greek national carrier. Suspended until at least 26/06/2026. Routes: Larnaca, Athens, Crete, Thessaloniki, Rhodes and other Mediterranean destinations.',
      'https://www.aegeanair.com'
    ],
    [
      'Finnair', 'AY', 'not_flying',
      JSON.stringify(['TLV-HEL']),
      'Security concerns', null,
      'Finnish national carrier. Not flying to/from Israel at this stage.',
      'https://www.finnair.com'
    ],
    [
      'SAS Scandinavian Airlines', 'SK', 'not_flying',
      JSON.stringify(['TLV-CPH', 'TLV-ARN', 'TLV-OSL']),
      'Security concerns', '2026-06-02',
      'Scandinavian carrier. Suspended until at least 02/06/2026. Route: TLV-Copenhagen (direct).',
      'https://www.flysas.com'
    ],
    [
      'LOT Polish Airlines', 'LO', 'not_flying',
      JSON.stringify(['TLV-WAW', 'TLV-KRK']),
      'Security concerns', '2026-06-01',
      'Polish national carrier. Suspended until at least 01/06/2026. Routes: TLV-Warsaw and Krakow.',
      'https://www.lot.com'
    ],
    [
      'Virgin Atlantic', 'VS', 'not_flying',
      JSON.stringify(['TLV-LHR']),
      'Safety review', null,
      'Not flying to/from Israel at this stage.',
      'https://www.virginatlantic.com'
    ],
    [
      'Condor', 'DE', 'not_flying',
      JSON.stringify(['TLV-FRA', 'TLV-DUS', 'TLV-HAM', 'TLV-STR']),
      'Security concerns', null,
      'German leisure carrier. All TLV routes from German cities suspended.',
      'https://www.condor.com'
    ],
    [
      'TUI fly Germany', 'X3', 'not_flying',
      JSON.stringify(['TLV-FRA', 'TLV-DUS', 'TLV-MUC', 'TLV-HAM']),
      'Security concerns', null,
      'German charter/leisure airline. All TLV charter flights suspended.',
      'https://www.tuifly.com'
    ],
    [
      'TUI fly Belgium', 'TB', 'not_flying',
      JSON.stringify(['TLV-BRU']),
      'Security concerns', null,
      'Belgian charter/leisure airline. TLV-BRU route suspended.',
      'https://www.tuifly.be'
    ],
    [
      'Air Europa', 'UX', 'not_flying',
      JSON.stringify(['TLV-MAD']),
      'Security concerns', '2026-05-04',
      'Spanish carrier. Suspended until at least 04/05/2026. Route: TLV-Madrid.',
      'https://www.aireuropa.com'
    ],
    [
      'Bulgaria Air', 'FB', 'not_flying',
      JSON.stringify(['TLV-SOF']),
      'Security concerns', '2026-05-14',
      'Bulgarian national carrier. Suspended until at least 14/05/2026. Route: TLV-Sofia.',
      'https://www.air.bg'
    ],
    [
      'airBaltic', 'BT', 'not_flying',
      JSON.stringify(['TLV-RIX']),
      'Security concerns', '2026-06-01',
      'Latvian carrier. Suspended until at least 01/06/2026. Route: TLV-Riga.',
      'https://www.airbaltic.com'
    ],
    [
      'TAROM', 'RO', 'not_flying',
      JSON.stringify(['TLV-OTP']),
      'Security concerns', '2026-04-19',
      'Romanian national carrier. Suspended until at least 19/04/2026. Route: TLV-Bucharest.',
      'https://www.tarom.ro'
    ],
    [
      'Croatia Airlines', 'OU', 'not_flying',
      JSON.stringify(['TLV-ZAG']),
      'Security concerns', null,
      'Croatian national carrier. Suspended due to security situation. Route: TLV-Zagreb.',
      'https://www.croatiaairlines.com'
    ],
    [
      'Cyprus Airways', 'CY', 'not_flying',
      JSON.stringify(['TLV-LCA']),
      'Security concerns', '2026-04-17',
      'Cypriot carrier. Suspended until at least 17/04/2026. Route: TLV-Larnaca.',
      'https://www.cyprusairways.com'
    ],
    [
      'Animawings', 'IO', 'not_flying',
      JSON.stringify(['TLV-OTP']),
      'Security concerns', '2026-08-10',
      'Romanian charter airline. Suspended until at least 10/08/2026. Route: TLV-Bucharest.',
      'https://www.animawings.com'
    ],
    [
      'Sky Express', 'GQ', 'not_flying',
      JSON.stringify(['TLV-ATH']),
      'Security concerns', '2026-04-17',
      'Greek regional carrier. Suspended until at least 17/04/2026. Route: TLV-Athens.',
      'https://www.skyexpress.gr'
    ],
    [
      'SkyUp', 'PQ', 'not_flying',
      JSON.stringify(['TLV-KBP', 'TLV-OTP']),
      'Security concerns', '2026-05-03',
      'Ukrainian LCC. Suspended until at least 03/05/2026. Various destinations.',
      'https://www.skyUp.aero'
    ],
    [
      'Neos', 'NO', 'not_flying',
      JSON.stringify(['TLV-MXP', 'TLV-FCO', 'TLV-NAP']),
      'Security concerns', null,
      'Italian charter airline. Suspended until further notice. Mainly operates charter flights to Mediterranean destinations.',
      'https://www.neosair.it'
    ],
    [
      'Enter Air', 'ENT', 'not_flying',
      JSON.stringify(['TLV-WAW']),
      'Security concerns', null,
      'Polish charter airline. Not operating regular TLV service due to the war. Route: TLV-Warsaw.',
      'https://www.enterair.pl'
    ],
    [
      'Corendon Airlines', 'XC', 'flying',
      JSON.stringify(['TLV-ATH', 'TLV-RHO', 'TLV-HER', 'TLV-SKG', 'TLV-LCA', 'TLV-OTP']),
      null, null,
      'Dutch/Turkish leisure carrier. Operating flights from TLV to various Greek destinations, Larnaca, and Bucharest.',
      'https://www.corendonairlines.com'
    ],
    [
      'Wamos Air', 'EB', 'not_flying',
      JSON.stringify(['TLV-MAD']),
      'Security concerns', null,
      'Spanish charter airline. Not flying to/from Israel at this stage.',
      'https://www.wamosair.com'
    ],
    [
      'Icelandair', 'FI', 'not_flying',
      JSON.stringify(['TLV-KEF']),
      'Security concerns', null,
      'Icelandic carrier. Not flying to/from Israel at this stage.',
      'https://www.icelandair.com'
    ],
    [
      'Malta Airlines', null, 'not_flying',
      JSON.stringify(['TLV-MLA']),
      'Security concerns', null,
      'Not currently operating flights from Ben Gurion.',
      'https://www.maltaairlines.com'
    ],
    [
      'Air Malta', null, 'not_flying',
      JSON.stringify(['TLV-MLA']),
      'Security concerns', null,
      'Not flying to/from Israel at this stage.',
      null
    ],
    [
      'Air Serbia', 'JU', 'not_flying',
      JSON.stringify(['TLV-BEG']),
      'Security concerns', null,
      'Not currently operating flights from Ben Gurion.',
      'https://www.airserbia.com'
    ],
    [
      'Hello Jets', null, 'flying',
      JSON.stringify(['TLV-MUC', 'TLV-FRA']),
      null, null,
      'Operating flights between Tel Aviv and Munich and other destinations.',
      null
    ],

    // ── TURKISH CARRIERS ──────────────────────────────────────────────────────
    [
      'Turkish Airlines', 'TK', 'not_flying',
      JSON.stringify(['TLV-IST']),
      'Turkish government ban on flights to/from Israel', null,
      'Ankara imposed a complete ban on Turkey-Israel flights amid the conflict. Not operating from Ben Gurion.',
      'https://www.turkishairlines.com'
    ],
    [
      'Pegasus Airlines', 'PC', 'not_flying',
      JSON.stringify(['TLV-SAW']),
      'Turkish government ban on flights to/from Israel', null,
      'Turkish LCC. Government ban prevents operations. Not flying to/from Israel at this stage.',
      'https://www.flypgs.com'
    ],

    // ── TAP AIR PORTUGAL ──────────────────────────────────────────────────────
    [
      'TAP Air Portugal', 'TP', 'flying',
      JSON.stringify(['TLV-LIS']),
      null, null,
      'Operating flights from Tel Aviv to Lisbon. Announced return to full Israel service from 01/06/2026.',
      'https://www.flytap.com'
    ],

    // ── AFRICAN ───────────────────────────────────────────────────────────────
    [
      'Ethiopian Airlines', 'ET', 'not_flying',
      JSON.stringify(['TLV-ADD']),
      'Security concerns / airspace restrictions', '2026-04-16',
      'African flag carrier. Suspended until at least 16/04/2026. Route: TLV-Addis Ababa.',
      'https://www.ethiopianairlines.com'
    ],
    [
      'Royal Air Maroc', 'AT', 'not_flying',
      JSON.stringify(['TLV-CMN']),
      'Security concerns', null,
      'Moroccan flag carrier. Not flying to/from Israel at this stage.',
      'https://www.royalairmaroc.com'
    ],
    [
      'EgyptAir', 'MS', 'not_flying',
      JSON.stringify(['TLV-CAI']),
      'Security concerns', null,
      'Egyptian national carrier. Not flying to/from Israel at this stage.',
      'https://www.egyptair.com'
    ],

    // ── ASIAN ─────────────────────────────────────────────────────────────────
    [
      'Air India', 'AI', 'not_flying',
      JSON.stringify(['TLV-DEL']),
      'Security concerns / airspace restrictions', '2026-05-31',
      'Suspended until at least 31/05/2026. Route: TLV-Delhi.',
      'https://www.airindia.com'
    ],
    [
      'Hainan Airlines', 'HU', 'not_flying',
      JSON.stringify(['TLV-PEK', 'TLV-SZX']),
      'Security concerns / airspace restrictions', '2026-04-20',
      'Chinese carrier. Suspended until at least 20/04/2026. Routes: TLV-Beijing (PEK) and Shenzhen (SZX).',
      'https://www.hnair.com'
    ],
    [
      'IndiGo', '6E', 'not_flying',
      JSON.stringify(['TLV-DEL']),
      'Security concerns', null,
      'Indian LCC that launched TLV service. Route suspended during conflict.',
      'https://www.goindigo.in'
    ],
    [
      'Korean Air', 'KE', 'not_flying',
      JSON.stringify(['TLV-ICN']),
      'Security concerns', null,
      'South Korean flag carrier. Not flying to/from Israel at this stage.',
      'https://www.koreanair.com'
    ],
    [
      'Cathay Pacific', 'CX', 'not_flying',
      JSON.stringify(['TLV-HKG']),
      'Security concerns', null,
      'Hong Kong carrier. Not flying to/from Israel at this stage.',
      'https://www.cathaypacific.com'
    ],

    // ── AIR SEYCHELLES ────────────────────────────────────────────────────────
    [
      'Air Seychelles', 'HM', 'not_flying',
      JSON.stringify(['TLV-SEZ']),
      'Security concerns', '2026-05-02',
      'Suspended until at least 02/05/2026. Route: TLV-Seychelles.',
      'https://www.airseychelles.com'
    ],

    // ── EASTERN EUROPE / CAUCASUS ─────────────────────────────────────────────
    [
      'Georgian Airways', 'A9', 'not_flying',
      JSON.stringify(['TLV-TBS']),
      'Security concerns', '2026-04-17',
      'Suspended until at least 17/04/2026. Route: TLV-Tbilisi.',
      'https://www.georgian-airways.com'
    ],
    [
      'Azerbaijan Airlines (AZAL)', 'J2', 'not_flying',
      JSON.stringify(['TLV-GYD']),
      'Security concerns', '2026-05-01',
      'Azerbaijani flag carrier. Suspended until at least 01/05/2026. Route: TLV-Baku.',
      'https://www.azal.az'
    ],
    [
      'Belavia', 'B2', 'not_flying',
      JSON.stringify(['TLV-MSQ']),
      'Sanctions / airspace closure', null,
      'Belarusian national carrier. Suspended since 2022 due to international sanctions and airspace closure. Route: TLV-Minsk.',
      'https://www.belavia.by'
    ],
    [
      'HiSky', 'H4', 'not_flying',
      JSON.stringify(['TLV-KIV']),
      'Security concerns', '2026-04-16',
      'Moldovan LCC. Suspended until at least 16/04/2026. Route: TLV-Chisinau.',
      'https://www.hisky.eu'
    ],
    [
      'FlyOne', 'S5', 'not_flying',
      JSON.stringify(['TLV-KIV']),
      'Security concerns', '2026-05-01',
      'Moldovan carrier. Suspended until at least 01/05/2026. Route: TLV-Moldova (Chisinau).',
      'https://www.flyone.eu'
    ],
    [
      'Red Wings', 'WZ', 'not_flying',
      JSON.stringify(['TLV-AER', 'TLV-SVO']),
      'Security concerns', '2026-04-18',
      'Russian carrier. Suspended until at least 18/04/2026. Routes: TLV-Russia.',
      'https://www.redwings.ru'
    ],

    // ── CENTRAL ASIAN ─────────────────────────────────────────────────────────
    [
      'Uzbekistan Airways', 'HY', 'not_flying',
      JSON.stringify(['TLV-TAS']),
      'Security concerns', '2026-04-20',
      'Uzbek flag carrier. Suspended until at least 20/04/2026. Route: TLV-Tashkent.',
      'https://www.uzairways.com'
    ],
    [
      'Azimuth', 'A4', 'not_flying',
      JSON.stringify(['TLV-AER']),
      'Security concerns', '2026-04-20',
      'Russian regional carrier. Suspended until at least 20/04/2026. Route: TLV-Sochi (Russia).',
      'https://www.azimuth.aero'
    ],
    [
      'Air Samarkand (Sam Air)', null, 'not_flying',
      JSON.stringify(['TLV-SKD']),
      'Security concerns', null,
      'Suspended TLV service until at least spring 2026. Route: TLV-Samarkand.',
      null
    ],
    [
      'Qanot Sharq', 'Q7', 'flying',
      JSON.stringify(['TLV-SKD', 'TLV-TAS']),
      null, null,
      'Uzbek carrier. Operating flights between Tel Aviv and Samarkand and Tashkent.',
      'https://www.qanotsharq.com'
    ],
    [
      'Centrum Air', null, 'not_flying',
      JSON.stringify(['TLV-TAS', 'TLV-SKD']),
      'Security concerns', null,
      'Suspended with no confirmed return date. Routes: TLV-Tashkent and Samarkand.',
      null
    ],

    // ── TUS AIRWAYS ───────────────────────────────────────────────────────────
    [
      'TUS Airways', 'U8', 'not_flying',
      JSON.stringify(['TLV-PFO', 'TLV-LCA', 'TLV-NAP', 'TLV-SKG', 'TLV-SOF', 'TLV-VIE', 'TLV-CFU', 'TLV-JTR']),
      'Security concerns', '2026-04-14',
      'Cyprus-based carrier. Suspended until at least 14/04/2026. Routes: Paphos, Larnaca, Naples, Thessaloniki, Sofia, Vienna, Corfu, Santorini.',
      'https://www.tusairways.com'
    ],
  ];

  const ISRAELI_NAMES = new Set(['El Al', 'Israir', 'Arkia', 'Air Haifa']);

  const insert = db.prepare(`
    INSERT INTO airlines (name, iata_code, status, destinations, cancellation_reason, cancellation_end_date, notes, website, is_israeli, date_adjusted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertMany = db.transaction((list) => {
    for (const row of list) insert.run(...row, ISRAELI_NAMES.has(row[0]) ? 1 : 0);
  });

  insertMany(airlines);
  console.log(`Seeded ${airlines.length} airlines`);
  console.log('\nDone! Start the server with: npm run dev');
}

seed().catch(console.error);
