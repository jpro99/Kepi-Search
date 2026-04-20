/**
 * Generates src/data/city-seeds.json from compact line lists.
 * Run: node scripts/generate-city-seeds.mjs
 * Lines: id|CityName|lat|lng|zoom (optional, default 12)
 * Country is implied by section (ISO2 + country label for UI).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "src", "data", "city-seeds.json");

function section(countryLabel, countryCode, lines) {
  const cities = [];
  for (const line of lines.trim().split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const parts = line.split("|").map((s) => s.trim());
    const [id, name, latS, lngS, zoomS] = parts;
    const lat = Number(latS);
    const lng = Number(lngS);
    const zoom = zoomS ? Number(zoomS) : 12;
    const pad = zoom >= 13 ? 0.045 : 0.085;
    cities.push({
      id,
      label: `${name}, ${countryLabel}`,
      countryCode,
      lat,
      lng,
      zoom,
      boundsPad: pad,
      transit: [
        {
          id: `${id}-t1`,
          name: "Transit / station area (refine in data)",
          mode: "rail",
          lat: lat + 0.008,
          lng: lng - 0.006,
        },
        {
          id: `${id}-t2`,
          name: "City center link (refine in data)",
          mode: "rail",
          lat: lat - 0.006,
          lng: lng + 0.008,
        },
      ],
      touristAnchors: [
        {
          id: `${id}-core`,
          label: `${name} center`,
          lat,
          lng,
        },
      ],
    });
  }
  return cities;
}

const ITALY = section(
  "Italy",
  "IT",
  `
positano|Positano|40.6280|14.4850|13
amalfi|Amalfi|40.6333|14.6029|13
ravello|Ravello|40.6493|14.6113|13
sorrento|Sorrento|40.6263|14.3758|12
capri|Capri|40.5532|14.2422|13
ischia|Ischia|40.7370|13.9489|12
matera|Matera|40.6664|16.6043|12
bari|Bari|41.1171|16.8719|11
lecce|Lecce|40.3515|18.1750|12
brindisi|Brindisi|40.6322|17.9361|12
ostuni|Ostuni|40.7296|17.5750|12
alberobello|Alberobello|40.7844|17.2372|13
polignano|Polignano a Mare|40.9961|17.2196|13
gallipoli|Gallipoli|40.0559|17.9900|12
otranto|Otranto|40.1481|18.4941|12
trieste|Trieste|45.6495|13.7768|12
genoa|Genoa|44.4056|8.9463|11
savona|Savona|44.3090|8.4811|12
verona|Verona|45.4384|10.9916|12
vicenza|Vicenza|45.5455|11.5354|12
padua|Padua|45.4064|11.8768|12
treviso|Treviso|45.6669|12.2430|12
udine|Udine|46.0620|13.2349|12
perugia|Perugia|43.1107|12.3908|12
assisi|Assisi|43.0708|12.6165|13
siena|Siena|43.3188|11.3317|12
san-gimignano|San Gimignano|43.4678|11.0421|13
lucca|Lucca|43.8428|10.5027|12
pisa|Pisa|43.7228|10.4017|12
livorno|Livorno|43.5485|10.3106|12
como|Como|45.8081|9.0852|12
bellagio|Bellagio|45.9877|9.2615|13
stresa|Stresa|45.7626|8.5380|12
bolzano|Bolzano|46.4983|11.3548|12
merano|Merano|46.6680|11.1590|12
cortina|Cortina dAmpezzo|46.5369|12.1357|12
taormina|Taormina|37.8537|15.2885|12
cefalu|Cefalu|38.0386|14.0225|12
palermo|Palermo|38.1157|13.3615|11
trapani|Trapani|38.0176|12.5372|12
agrigento|Agrigento|37.3110|13.5765|12
syracuse|Syracuse|37.0755|15.2866|12
catania|Catania|37.5079|15.0830|11
ragusa|Ragusa|36.9269|14.7255|12
cagliari|Cagliari|39.2238|9.1217|11
portoferraio|Portoferraio|42.8140|10.3264|12
portofino|Portofino|44.3033|9.2090|13
rapallo|Rapallo|44.3511|9.2280|12
chiavari|Chiavari|44.3177|9.3224|12
orta|Orta San Giulio|45.7982|8.4149|13
orvieto|Orvieto|42.7185|12.0959|13
spoleto|Spoleto|42.7438|12.7383|12
montepulciano|Montepulciano|43.0955|11.7870|13
montalcino|Montalcino|43.0583|11.4900|13
cortona|Cortona|43.2747|11.9852|13
ascoli|Ascoli Piceno|42.8534|13.5749|12
ancona|Ancona|43.6158|13.5189|12
pesaro|Pesaro|43.9099|12.9134|12
rimini|Rimini|44.0678|12.5695|12
ravenna|Ravenna|44.4184|12.2035|12
ferrara|Ferrara|44.8381|11.6198|12
modena|Modena|44.6471|10.9252|12
parma|Parma|44.8015|10.3279|12
reggio-emilia|Reggio Emilia|44.6983|10.6311|12
la-spezia|La Spezia|44.1027|9.8241|12
cinque-terre-monterosso|Monterosso al Mare|44.1463|9.6547|13
`,
);

const GERMANY = section(
  "Germany",
  "DE",
  `
lubeck|Lubeck|53.8655|10.6866|12
rostock|Rostock|54.0887|12.1401|11
kiel|Kiel|54.3233|10.1228|11
hannover|Hannover|52.3759|9.7320|11
bremen|Bremen|53.0793|8.8017|11
essen|Essen|51.4556|7.0116|11
bonn|Bonn|50.7374|7.0982|12
mainz|Mainz|49.9925|8.2573|12
koblenz|Koblenz|50.3569|7.5890|12
trier|Trier|49.7596|6.6439|12
augsburg|Augsburg|48.3705|10.8978|11
regensburg|Regensburg|49.0134|12.1016|12
passau|Passau|48.5665|13.4312|12
wiesbaden|Wiesbaden|50.0821|8.2400|12
heidelberg|Heidelberg|49.3988|8.6724|12
freiburg|Freiburg|47.9990|7.8421|12
garmisch|Garmisch-Partenkirchen|47.4921|11.0963|12
rugen-binz|Binz|54.4000|13.6100|12
erfurt|Erfurt|50.9848|11.0299|12
weimar|Weimar|50.9795|11.3235|13
potsdam|Potsdam|52.3906|13.0645|12
schwerin|Schwerin|53.6355|11.4012|12
magdeburg|Magdeburg|52.1205|11.6276|11
ulm|Ulm|48.3984|9.9916|12
konstanz|Konstanz|47.6633|9.1752|12
lindau|Lindau|47.5461|9.6843|13
`,
);

const CROATIA = section(
  "Croatia",
  "HR",
  `
zagreb|Zagreb|45.8150|15.9819|11
split|Split|43.5081|16.4402|12
dubrovnik|Dubrovnik|42.6507|18.0944|12
zadar|Zadar|44.1194|15.2314|12
rijeka|Rijeka|45.3271|14.4422|12
pula|Pula|44.8666|13.8496|12
hvar-town|Hvar|43.1729|16.4417|13
korcula|Korcula|42.9614|17.1352|13
rovinj|Rovinj|45.0812|13.6407|13
opatija|Opatija|45.3376|14.3050|12
`,
);

const AUSTRIA = section(
  "Austria",
  "AT",
  `
vienna|Vienna|48.2082|16.3738|11
salzburg|Salzburg|47.8095|13.0550|12
innsbruck|Innsbruck|47.2692|11.4041|12
graz|Graz|47.0707|15.4395|12
linz|Linz|48.3069|14.2858|12
hallstatt|Hallstatt|47.5622|13.6493|13
badgastein|Bad Gastein|47.1167|13.1356|12
klagenfurt|Klagenfurt|46.6247|14.3053|12
bregenz|Bregenz|47.5031|9.7471|12
zell-am-see|Zell am See|47.3245|12.7968|12
`,
);

const SPAIN = section(
  "Spain",
  "ES",
  `
madrid|Madrid|40.4168|-3.7038|11
barcelona|Barcelona|41.3851|2.1734|11
valencia|Valencia|39.4699|-0.3763|11
seville|Seville|37.3891|-5.9845|12
malaga|Malaga|36.7213|-4.4214|12
bilbao|Bilbao|43.2627|-2.9253|12
granada|Granada|37.1773|-3.5986|12
cordoba|Cordoba|37.8882|-4.7794|12
toledo|Toledo|39.8628|-4.0273|13
salamanca|Salamanca|40.9701|-5.6635|12
santiago|Santiago de Compostela|42.8782|-8.5448|12
palma|Palma|39.5696|2.6502|11
zaragoza|Zaragoza|41.6488|-0.8891|11
alicante|Alicante|38.3452|-0.4810|12
san-sebastian|San Sebastian|43.3183|-1.9812|12
sitges|Sitges|41.2370|1.8057|12
girona|Girona|41.9794|2.8214|12
cadiz|Cadiz|36.5271|-6.2886|12
jerez|Jerez de la Frontera|36.6865|-6.1361|12
ronda|Ronda|36.7423|-5.1671|13
nerja|Nerja|36.7450|-3.8764|12
ibiza-town|Ibiza|38.9067|1.4206|12
`,
);

const IRELAND = section(
  "Ireland",
  "IE",
  `
dublin|Dublin|53.3498|-6.2603|11
cork|Cork|51.8985|-8.4756|12
galway|Galway|53.2707|-9.0568|12
limerick|Limerick|52.6638|-8.6267|12
killarney|Killarney|52.0599|-9.5078|12
waterford|Waterford|52.2593|-7.1111|12
`,
);

const DENMARK = section(
  "Denmark",
  "DK",
  `
copenhagen|Copenhagen|55.6761|12.5683|11
aarhus|Aarhus|56.1629|10.2039|12
odense|Odense|55.4038|10.4024|12
aalborg|Aalborg|57.0488|9.9217|12
skagen|Skagen|57.7209|10.5839|12
`,
);

const FINLAND = section(
  "Finland",
  "FI",
  `
helsinki|Helsinki|60.1699|24.9384|11
tampere|Tampere|61.4978|23.7600|12
turku|Turku|60.4518|22.2666|12
rovaniemi|Rovaniemi|66.5039|25.7294|11
oulu|Oulu|65.0121|25.4651|11
`,
);

const NORWAY = section(
  "Norway",
  "NO",
  `
oslo|Oslo|59.9139|10.7522|11
bergen|Bergen|60.3913|5.3221|12
stavanger|Stavanger|58.9700|5.7331|12
tromso|Tromso|69.6492|18.9553|11
trondheim|Trondheim|63.4305|10.3951|12
alesund|Alesund|62.4722|6.1495|12
`,
);

const POLAND = section(
  "Poland",
  "PL",
  `
warsaw|Warsaw|52.2297|21.0122|11
krakow|Krakow|50.0647|19.9450|12
gdansk|Gdansk|54.3520|18.6466|12
wroclaw|Wroclaw|51.1079|17.0385|12
poznan|Poznan|52.4064|16.9252|12
zakopane|Zakopane|49.2992|19.9496|12
torun|Torun|53.0138|18.5981|12
gdynia|Gdynia|54.5189|18.5305|12
sopot|Sopot|54.4418|18.5601|12
`,
);

const CZECH = section(
  "Czechia",
  "CZ",
  `
prague|Prague|50.0755|14.4378|11
brno|Brno|49.1951|16.6068|12
cesky-krumlov|Cesky Krumlov|48.8109|14.3152|13
karlovy-vary|Karlovy Vary|50.2329|12.8711|12
olomouc|Olomouc|49.5938|17.2509|12
`,
);

const HUNGARY = section(
  "Hungary",
  "HU",
  `
budapest|Budapest|47.4979|19.0402|11
eger|Eger|47.9029|20.3733|12
siofok|Siofok|46.9041|18.0580|12
heviz|Heviz|46.7903|17.1841|12
pecs|Pecs|46.0727|18.2323|12
`,
);

const GREECE = section(
  "Greece",
  "GR",
  `
athens|Athens|37.9838|23.7275|11
thessaloniki|Thessaloniki|40.6401|22.9444|11
santorini-fira|Fira|36.4169|25.4321|12
mykonos-town|Mykonos|37.4467|25.3289|12
heraklion|Heraklion|35.3387|25.1442|12
rhodes-town|Rhodes|36.4341|28.2176|12
corfu-town|Corfu|39.6243|19.9217|12
nafplio|Nafplio|37.5683|22.8075|12
meteora-kalambaka|Kalambaka|39.7044|21.6269|12
chania|Chania|35.5132|24.0180|12
zakynthos|Zakynthos|37.7829|20.8978|12
`,
);

const FRANCE = section(
  "France",
  "FR",
  `
paris|Paris|48.8566|2.3522|11
lyon|Lyon|45.7640|4.8357|11
nice|Nice|43.7102|7.2620|12
marseille|Marseille|43.2965|5.3698|11
bordeaux|Bordeaux|44.8378|-0.5792|11
toulouse|Toulouse|43.6047|1.4442|11
strasbourg|Strasbourg|48.5734|7.7521|12
annecy|Annecy|45.8992|6.1294|12
cannes|Cannes|43.5528|7.0174|12
avignon|Avignon|43.9493|4.8055|12
colmar|Colmar|48.0794|7.3586|13
lille|Lille|50.6292|3.0573|11
nantes|Nantes|47.2184|-1.5536|11
rennes|Rennes|48.1173|-1.6778|11
montpellier|Montpellier|43.6108|3.8767|11
reims|Reims|49.2583|4.0317|12
dijon|Dijon|47.3220|5.0415|12
rouen|Rouen|49.4431|1.0993|12
biarritz|Biarritz|43.4832|-1.5586|12
carcassonne|Carcassonne|43.2122|2.3537|13
st-malo|Saint-Malo|48.6493|-2.0257|12
honfleur|Honfleur|49.4190|0.2329|13
`,
);

const BELGIUM = section(
  "Belgium",
  "BE",
  `
brussels|Brussels|50.8503|4.3517|11
antwerp|Antwerp|51.2194|4.4025|12
bruges|Bruges|51.2093|3.2247|12
ghent|Ghent|51.0543|3.7174|12
leuven|Leuven|50.8798|4.7005|12
dinant|Dinant|50.2605|4.9121|13
`,
);

const NETHERLANDS = section(
  "Netherlands",
  "NL",
  `
amsterdam|Amsterdam|52.3676|4.9041|11
rotterdam|Rotterdam|51.9244|4.4777|11
the-hague|The Hague|52.0705|4.3007|11
utrecht|Utrecht|52.0907|5.1214|12
maastricht|Maastricht|50.8514|5.6910|12
eindhoven|Eindhoven|51.4416|5.4697|12
haarlem|Haarlem|52.3874|4.6462|12
giethoorn|Giethoorn|52.7400|6.0729|13
`,
);

const UK = section(
  "United Kingdom",
  "GB",
  `
edinburgh|Edinburgh|55.9533|-3.1883|11
glasgow|Glasgow|55.8642|-4.2518|11
manchester|Manchester|53.4808|-2.2426|11
liverpool|Liverpool|53.4084|-2.9916|11
birmingham|Birmingham|52.4862|-1.8904|11
bath|Bath|51.3758|-2.3599|13
york|York|53.9600|-1.0873|12
oxford|Oxford|51.7520|-1.2577|12
cambridge|Cambridge|52.2053|0.1218|12
brighton|Brighton|50.8225|-0.1372|12
cardiff|Cardiff|51.4816|-3.1791|12
inverness|Inverness|57.4778|-4.2247|12
belfast|Belfast|54.5973|-5.9301|12
newcastle|Newcastle upon Tyne|54.9783|-1.6178|11
leeds|Leeds|53.8008|-1.5491|11
bristol|Bristol|51.4545|-2.5879|12
norwich|Norwich|52.6309|1.2974|12
canterbury|Canterbury|51.2802|1.0789|13
`,
);

const JAPAN = section(
  "Japan",
  "JP",
  `
tokyo|Tokyo|35.6762|139.6503|10
kyoto|Kyoto|35.0116|135.7681|11
osaka|Osaka|34.6937|135.5023|11
hiroshima|Hiroshima|34.3853|132.4553|11
fukuoka|Fukuoka|33.5904|130.4017|11
sapporo|Sapporo|43.0618|141.3545|11
nagoya|Nagoya|35.1815|136.9066|11
kanazawa|Kanazawa|36.5613|136.6562|12
nara|Nara|34.6851|135.8048|12
takayama|Takayama|36.1461|137.2516|12
hakone|Hakone|35.2329|139.1064|12
yokohama|Yokohama|35.4437|139.6380|11
kobe|Kobe|34.6901|135.1956|11
naha|Naha|26.2124|127.6809|11
sendai|Sendai|38.2682|140.8694|11
nikko|Nikko|36.7597|139.6190|12
matsumoto|Matsumoto|36.2380|137.9720|12
`,
);

const KOREA = section(
  "South Korea",
  "KR",
  `
seoul|Seoul|37.5665|126.9780|10
busan|Busan|35.1796|129.0756|11
jeju|Jeju City|33.4996|126.5312|11
incheon|Incheon|37.4563|126.7052|11
daegu|Daegu|35.8714|128.6014|11
gyeongju|Gyeongju|35.8562|129.2247|12
`,
);

const PHILIPPINES = section(
  "Philippines",
  "PH",
  `
manila|Manila|14.5995|120.9842|11
cebu|Cebu City|10.3157|123.8854|12
boracay|Boracay|11.9674|121.9248|13
el-nido|El Nido|11.1798|119.3956|12
davao|Davao City|7.1907|125.4553|11
tagaytay|Tagaytay|14.1153|120.9621|12
`,
);

const VIETNAM = section(
  "Vietnam",
  "VN",
  `
hanoi|Hanoi|21.0285|105.8542|11
ho-chi-minh|Ho Chi Minh City|10.8231|106.6297|11
da-nang|Da Nang|16.0544|108.2022|11
hoi-an|Hoi An|15.8801|108.3380|13
hue|Hue|16.4637|107.5909|12
ha-long|Ha Long|20.9501|107.0838|12
`,
);

const AUSTRALIA = section(
  "Australia",
  "AU",
  `
sydney|Sydney|-33.8688|151.2093|10
melbourne|Melbourne|-37.8136|144.9631|10
brisbane|Brisbane|-27.4698|153.0251|10
perth|Perth|-31.9505|115.8605|10
adelaide|Adelaide|-34.9285|138.6007|11
cairns|Cairns|-16.9186|145.7781|11
gold-coast|Gold Coast|-28.0167|153.4000|11
hobart|Hobart|-42.8821|147.3272|12
`,
);

const NEW_ZEALAND = section(
  "New Zealand",
  "NZ",
  `
auckland|Auckland|-36.8485|174.7633|10
wellington|Wellington|-41.2865|174.7762|11
christchurch|Christchurch|-43.5321|172.6362|11
queenstown|Queenstown|-45.0312|168.6626|12
rotorua|Rotorua|-38.1368|176.2497|12
`,
);

const THAILAND = section(
  "Thailand",
  "TH",
  `
bangkok|Bangkok|13.7563|100.5018|10
chiang-mai|Chiang Mai|18.7883|98.9853|11
phuket|Phuket City|7.8804|98.3923|11
krabi|Krabi|8.0863|98.9063|12
koh-samui|Koh Samui|9.5120|100.0136|12
ayutthaya|Ayutthaya|14.3532|100.5774|12
`,
);

const usTablePath = path.join(__dirname, "data", "us-city-table.json");
let UNITED_STATES = [];
if (fs.existsSync(usTablePath)) {
  const usRows = JSON.parse(fs.readFileSync(usTablePath, "utf8"));
  const usLines = usRows
    .map((row) => {
      const [id, name, lat, lng, zoom] = row;
      const z = zoom ?? 11;
      return `${id}|${name}|${lat}|${lng}|${z}`;
    })
    .join("\n");
  UNITED_STATES = section("United States", "US", usLines);
}

const cities = [
  ...ITALY,
  ...GERMANY,
  ...CROATIA,
  ...AUSTRIA,
  ...SPAIN,
  ...IRELAND,
  ...DENMARK,
  ...FINLAND,
  ...NORWAY,
  ...POLAND,
  ...CZECH,
  ...HUNGARY,
  ...GREECE,
  ...FRANCE,
  ...BELGIUM,
  ...NETHERLANDS,
  ...UK,
  ...JAPAN,
  ...KOREA,
  ...PHILIPPINES,
  ...VIETNAM,
  ...AUSTRALIA,
  ...NEW_ZEALAND,
  ...THAILAND,
  ...UNITED_STATES,
];

const ids = new Set();
for (const c of cities) {
  if (ids.has(c.id)) throw new Error(`Duplicate city id: ${c.id}`);
  ids.add(c.id);
}

fs.writeFileSync(outPath, JSON.stringify({ cities }, null, 0), "utf8");
console.log("Wrote", cities.length, "cities to", outPath);
