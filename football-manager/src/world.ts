import { SQUADS } from './squads.ts';
// Fictional look-alike football world. Names are parodies; no real club names, crests or player names are used.
export type LeagueDef = { division: number; name: string; country: string; flag: string; tier: 1 | 2; clubs: string };
const L = (division: number, name: string, country: string, flag: string, tier: 1 | 2, clubs: string): LeagueDef => ({ division, name, country, flag, tier, clubs });
// Each club: id|Name|rating
export const LEAGUES: LeagueDef[] = [
  L(1, 'Premier Division', 'England', '🏴', 1, `mancity|Manchester Blues|84,liverpool|Merseyside Reds|84,arsenal|North London Gunners|84,chelsea|West London Blues|81,manutd|Manchester Reds|78,spurs|North London Lilywhites|77,newcastle|Tyneside Magpies|78,villa|Villa Park Lions|77,brighton|Brighton Seagulls|75,palace|South London Eagles|74,forest|Nottingham Foresters|74,bournemouth|Bournemouth Cherries|73,fulham|Fulham Cottagers|72,brentford|Brentford Bees|72,westham|East London Irons|72,everton|Merseyside Toffees|71,wolves|Wolverhampton Pack|70,leeds|Yorkshire Whites|69,sunderland|Wearside Black Cats|69,burnley|Burnley Clarets|68`),
  L(2, 'Championship Division', 'England', '🏴', 2, `leicester|Leicester Foxes|66,southampton|Southampton Saints|66,ipswich|Ipswich Tractors|65,sheffutd|Sheffield Blades|64,boro|Teesside Boro|63,coventry|Coventry Sky Blues|64,westbrom|West Brom Throstles|62,norwich|Norwich Canaries|62,watford|Watford Hornets|61,hull|Hull Tigers|60,stoke|Stoke Potters|61,bristol|Bristol Robins|61,millwall|South London Lions|60,swansea|Swansea Swans|60,derby|Derby Rams|59,qpr|West London Hoops|59,preston|Preston Lilywhites|59,blackburn|Blackburn Riversiders|58,portsmouth|Portsmouth Pompey|58,wrexham|Wrexham Dragons|60`),
  L(3, 'Liga Primera', 'Spain', '🇪🇸', 1, `realmadrid|Madrid Royals|86,barcelona|Barcelona Blaugrana|85,atletico|Madrid Atleti|81,bilbao|Bilbao Lions|77,villarreal|Villarreal Submarines|76,betis|Seville Verdiblancos|75,sevilla|Seville Nervion|72,sociedad|San Sebastian Txuri|74,valencia|Valencia Bats|71,celta|Vigo Sky Blues|71,osasuna|Pamplona Rojillos|70,girona|Girona Reds|70,getafe|Getafe Azulones|69,mallorca|Mallorca Islanders|69,rayo|Vallecas Lightning|69,alaves|Vitoria Babazorros|68,espanyol|Barcelona Parakeets|68,levante|Valencia Frogs|66,elche|Elche Franjiverdes|66,oviedo|Oviedo Carbayones|65`),
  L(4, 'Serie Prima', 'Italy', '🇮🇹', 1, `inter|Milan Nerazzurri|83,napoli|Naples Azzurri|82,juventus|Turin Old Lady|80,milan|Milan Rossoneri|80,atalanta|Bergamo Goddess|79,roma|Rome Wolves|78,lazio|Rome Eagles|75,bologna|Bologna Rossoblu|75,fiorentina|Florence Violets|74,como|Como Lakers|74,torino|Turin Bulls|71,udinese|Udine Zebrette|70,genoa|Genoa Griffins|69,cagliari|Cagliari Islanders|68,lecce|Lecce Salentini|67,parma|Parma Crusaders|68,verona|Verona Mastiffs|67,sassuolo|Sassuolo Greens|68,cremonese|Cremona Grigiorossi|66,pisa|Pisa Towers|66`),
  L(5, 'Bundesliga One', 'Germany', '🇩🇪', 1, `bayern|Munich Bavarians|86,leverkusen|Leverkusen Pharmacists|81,dortmund|Dortmund Yellows|80,leipzig|Leipzig Red Bulls|79,frankfurt|Frankfurt Eagles|77,stuttgart|Stuttgart Swabians|76,freiburg|Freiburg Breisgau|74,gladbach|Gladbach Foals|73,wolfsburg|Wolfsburg Wolves|73,mainz|Mainz Carnival|72,hoffenheim|Hoffenheim Villagers|73,bremen|Bremen River Greens|71,augsburg|Augsburg Fuggers|70,union|Berlin Iron Union|70,koln|Cologne Billy Goats|69,hamburg|Hamburg Dinos|69,heidenheim|Heidenheim Ballers|67,stpauli|Hamburg Pirates|67`),
  L(6, 'Ligue Premiere', 'France', '🇫🇷', 1, `psg|Paris Saints|85,marseille|Marseille Olympians|78,monaco|Monaco Princes|77,lille|Lille Mastiffs|76,lyon|Lyon Kids|75,nice|Nice Eaglets|73,lens|Lens Blood & Gold|74,rennes|Rennes Red-Blacks|72,strasbourg|Strasbourg Racers|72,brest|Brest Pirates|70,toulouse|Toulouse Violets|69,nantes|Nantes Canaries|68,auxerre|Auxerre Burgundians|66,angers|Angers Scoceans|66,havre|Le Havre Dockers|66,lorient|Lorient Merlus|65,metz|Metz Grenats|64,parisfc|Paris Blues FC|66`),
  L(7, 'Primeira Divisao', 'Portugal', '🇵🇹', 1, `benfica|Lisbon Eagles|79,sporting|Lisbon Lions|79,porto|Porto Dragons|79,braga|Braga Warriors|74,guimaraes|Guimaraes Conquerors|70,famalicao|Famalicao Rubies|68,gilvicente|Barcelos Roosters|67,moreirense|Moreira Greens|65,estoril|Estoril Canaries|67,rioave|Vila do Conde Rivers|65,arouca|Arouca Wolves|64,casapia|Lisbon Geese|64,santaclara|Azores Saints|65,nacional|Madeira Nationals|63,alverca|Alverca Ribatejanos|63,tondela|Tondela Auriverdes|62,estrela|Amadora Stars|63,avs|Vila das Aves Avenses|61`),
  L(8, 'Pro League', 'Saudi Arabia', '🇸🇦', 1, `hilal|Riyadh Crescent|78,nassr|Riyadh Victory|78,ittihad|Jeddah Tigers|76,ahli|Jeddah Royals|76,shabab|Riyadh Youth Lions|70,qadsiah|Khobar Knights|73,ettifaq|Dammam Commandos|70,taawoun|Buraidah Wolves|69,khaleej|Saihat Dolphins|67,fayha|Majmaah Orange|66,hazem|Rass Stallions|64,riyadh|Riyadh City|64,fateh|Hofuf Brigade|65,kholood|Rass Immortals|63,okhdood|Najran Trenchers|63,damac|Khamis Mountaineers|64,najma|Unaizah Stars|62,neom|Neom Futurists|66`),
];
// club|name|pos|age|rating  (parody look-alike names)
const STAR_DATA = `mancity|Erlang Haarlund|FW|25|89,mancity|Rodrigo Hernandes|MF|29|86,mancity|Fil Fodden|MF|25|84,
liverpool|Mo Salahh|FW|33|87,liverpool|Virgil van Dyke|DF|34|86,liverpool|Floryan Wirtsz|MF|22|85,liverpool|Alisson Beckker|GK|33|86,
arsenal|Bukayo Sacka|FW|24|86,arsenal|Declan Rise|MF|26|85,arsenal|Martin Odegarde|MF|26|85,arsenal|William Salibar|DF|24|85,
chelsea|Cole Palmar|MF|23|86,chelsea|Moises Caisedo|MF|24|84,chelsea|Enzo Fernandex|MF|24|83,
manutd|Bruno Fernandas|MF|31|85,manutd|Brian Mbeumoh|FW|26|82,manutd|Matheus Cunya|FW|26|82,
spurs|Mickey van de Vem|DF|24|82,spurs|Xavi Simmons|MF|22|81,spurs|Cristian Romeroh|DF|27|83,
newcastle|Bruno Guimaraez|MF|28|84,newcastle|Sandro Tonalli|MF|25|82,newcastle|Anthony Gordan|FW|24|81,
villa|Ollie Watkinz|FW|29|82,villa|Emi Martines|GK|33|83,villa|Morgan Rogerz|MF|23|82,
brighton|Kaoru Mitomah|FW|28|80,palace|Adam Wharten|MF|21|79,forest|Morgan Gibbs-Whyte|MF|25|80,everton|Jordan Pickfjord|GK|31|80,
realmadrid|Kilian Mbapay|FW|26|91,realmadrid|Vinicius Juniorr|FW|25|88,realmadrid|Jude Bellinghem|MF|22|88,realmadrid|Federico Valverd|MF|27|86,realmadrid|Thibaut Cortua|GK|33|87,
barcelona|Lamine Yamall|FW|18|89,barcelona|Pedrri|MF|22|87,barcelona|Raphinna|FW|28|86,barcelona|Robert Lewandowsky|FW|37|84,barcelona|Pau Cubarsy|DF|18|82,
atletico|Julian Alvares|FW|25|86,atletico|Jan Oblac|GK|32|85,atletico|Antoine Griezman|FW|34|83,
bilbao|Nico Williamz|FW|23|83,sociedad|Mikel Oyarsabal|FW|28|81,villarreal|Gerard Morano|FW|33|79,
inter|Lautaro Martines|FW|28|87,inter|Nicolo Barela|MF|28|85,inter|Alessandro Bastonny|DF|26|85,
napoli|Kevin De Bruyner|MF|34|85,napoli|Scot McTominay|MF|28|84,napoli|Romelu Lukakoo|FW|32|81,
juventus|Kenan Yildizz|FW|20|83,juventus|Dusan Vlahovik|FW|25|82,juventus|Gleison Bremerr|DF|28|83,
milan|Luka Modrich|MF|40|82,milan|Rafael Leaw|FW|26|84,milan|Mike Maignon|GK|30|85,
atalanta|Ademola Lukmann|FW|28|81,roma|Paulo Dybalah|FW|31|81,
bayern|Harry Kaine|FW|32|90,bayern|Jamaal Musialah|MF|22|87,bayern|Joshua Kimmick|MF|30|86,bayern|Michael Olisee|FW|24|86,bayern|Manuel Noyer|GK|39|84,
leverkusen|Patrick Schik|FW|29|80,dortmund|Serhou Guirassi|FW|29|83,dortmund|Gregor Kobbel|GK|28|84,leipzig|Christoph Baumgartnerr|MF|26|79,
psg|Ousmane Dembelay|FW|28|89,psg|Vitinia|MF|25|87,psg|Khvicha Kvaratskelya|FW|24|87,psg|Achraf Hakimy|DF|26|86,psg|Marquinyos|DF|31|85,
marseille|Mason Greenwud|FW|24|82,monaco|Ansu Fatty|FW|22|77,lille|Hakon Haraldsen|FW|22|78,
benfica|Vangelis Pavlidiss|FW|26|79,sporting|Morten Hjulmaand|MF|26|80,porto|Samu Aghehova|FW|21|79,
hilal|Ruben Neeves|MF|28|82,hilal|Kalidou Kulibali|DF|34|80,hilal|Yassine Bonou|GK|34|83,
nassr|Kristiano Renaldo|FW|40|85,nassr|Sadio Manay|FW|33|81,nassr|Joao Felics|MF|26|80,
ittihad|Karim Benzima|FW|37|84,ittihad|N'Golo Kantey|MF|34|81,ahli|Riyad Marhez|FW|34|81,ahli|Ivan Tonney|FW|29|80`;
export type StarDef = { club: string; name: string; position: 'GK' | 'DF' | 'MF' | 'FW'; age: number; rating: number };
const HAND: StarDef[] = STAR_DATA.split(',').map((x) => {
  const [club, name, position, age, rating] = x.trim().split('|');
  return { club: club!, name: name!, position: position as StarDef['position'], age: +age!, rating: +rating! };
});
/** Full look-alike first teams (generated by scripts/build_squads.py); hand-made stars only fill clubs without data. */
export const STARS: StarDef[] = [
  ...Object.entries(SQUADS).flatMap(([club, list]) =>
    list.split(';').map((x) => {
      const [name, position, age, rating] = x.split('|');
      return { club, name: name!, position: position as StarDef['position'], age: +age!, rating: +rating! };
    }),
  ),
  ...HAND.filter((x) => !SQUADS[x.club]),
];
export const starsFor = (club: string) => STARS.filter((x) => x.club === club);
const PALETTE = ['#D9F06F', '#6FE0DE', '#EFAB76', '#B9ABF5', '#F3CD6C', '#F28384', '#9AD19A', '#86B5F2', '#E9A9CE', '#C1C8D4', '#FBBC89', '#EACD88'];
export const WORLD = LEAGUES.flatMap((l) =>
  l.clubs.split(',').map((x, i) => {
    const [id, name, rating] = x.split('|');
    return { id: id!, name: name!, rating: +rating!, division: l.division, color: PALETTE[(i * 5 + l.division) % PALETTE.length]! };
  }),
);
export const league = (division: number) => LEAGUES.find((l) => l.division === division) ?? LEAGUES[0]!;
export const leagueName = (division: number) => { const l = league(division); return `${l.flag} ${l.name}`; };
export const sameCountry = (a: number, b: number) => league(a).country === league(b).country;
/** Continental cup places per league. */
export const EURO_QUOTA: Record<number, number> = { 1: 4, 3: 4, 4: 3, 5: 3, 6: 1, 7: 1 };
