// 3.6: big, region-flavoured name pools. Hash-based and deterministic, with globally unique full names and no digits.
// The names are look-alikes, not real players. Each region has 150+ first names and 300+ surnames
// (real-style surnames plus root+suffix forms), with optional double surnames, so combinations run into the millions.
import type { GameState } from './game.ts';

export const REGIONS = ['en', 'es', 'it', 'de', 'fr', 'pt', 'ar', 'af', 'nl', 'sl'] as const;
export type Region = (typeof REGIONS)[number];
const w = (s: string) => s.trim().split(/\s+/);
const cross = (roots: string, ends: string) => w(roots).flatMap((r) => w(ends).map((e) => r + e));

const INTL = w(`Adam Adrian Alex Andre Anton Ben Daniel David Elias Emil Erik Felix Gabriel Hugo Isaac Ivan Jakob Jonas Julian Kai
 Leo Leon Lucas Luca Marco Marius Mateo Max Milan Mika Nico Noah Oliver Oscar Patrick Paul Rafael Robin Samuel Sebastian Simon Theo
 Tobias Victor Viktor Aaron Adrien Alexis Arthur Bruno Cesar Dario Denis Dominik Eric Fabian Filip Henry Igor Jan Jesper Joel Karl
 Kevin Lars Lukas Martin Mario Matteo Michael Moritz Nathan Niklas Oskar Pablo Philip Rene Roman Ruben Stefan Tim Tomas Vincent Yannick Zan`);
const P: Record<Region, { first: string[]; last: string[] }> = {
  en: { first: w(`Jack Harry Charlie George Alfie Freddie Archie Oscar Thomas William James Joshua Callum Reece Kieran Declan Connor Liam
    Mason Tyler Jordan Ryan Lewis Jamie Ross Harvey Ollie Ellis Toby Reggie Louie Ronnie Jude Ethan Owen Rhys Dylan Morgan Aled Gareth
    Danny Scott Craig Dean Lee Marcus Jadon Bukayo Trent Kyle Aaron Curtis Jarrod Phil Cole Conor Ashley Wes Jarell Ezri Kobbie Rico
    Levi Zak Kai Taylor Cameron Billy Joe Sam Ben Tom Luke Matt Rob Nathaniel Jesse Jacob Dominic Bradley Nathan Elliot Harrison Jayden`),
    last: [...w(`Smith Jones Taylor Brown Wilson Evans Walker Wright Roberts Thompson Hughes Edwards Green Hall Wood Harris Clarke Jackson
      Turner Hill Moore Cooper Ward Morris King Baker Price Bennett Kelly Barnes Fletcher Holmes Dawson Kerr Murray Shaw Palmer Cole Rice
      Kane Foden Saka Stones Pickford Trippier Maguire Grealish Mount Sterling Bellingham Henderson Rashford Sancho Ramsdale Tomkins Pope`),
      ...cross('Ash Brad Brook Carl Chap Clif Craw Dun Fair Ford Hart Hay Kings Lang Mar Nor Red Rad Stan Thorn Whit Wy Ather Bur', 'ford ley ton field wood well by worth man stone')] },
  es: { first: w(`Alejandro Alvaro Pablo Sergio Javier Carlos Diego Daniel Adrian Ivan Raul Iker Unai Asier Mikel Aitor Gorka Oier Pedro
    Pau Marc Jordi Gerard Oriol Xavi Ferran Ansu Gavi Nacho Dani Rodrigo Mario Jesus Jose Juan Manuel Antonio Francisco Miguel Angel
    Rafael Fernando Luis Andres Ruben Hugo Martin Lucas Mateo Enzo Thiago Bruno Lautaro Julian Alexis Facundo Gonzalo Joaquin Nahuel
    Santiago Emiliano Agustin Valentin Rodri Koke Isco Borja Jorge Victor Samu Yeremy Brahim Fermin Nico Alex Eric Aleix Marcos Hector`),
    last: [...w(`Garcia Martinez Lopez Sanchez Perez Gomez Martin Jimenez Ruiz Hernandez Diaz Moreno Alvarez Munoz Romero Alonso Gutierrez
      Navarro Torres Dominguez Vazquez Ramos Gil Ramirez Serrano Blanco Molina Morales Suarez Ortega Delgado Castro Ortiz Rubio Marin
      Sanz Iglesias Nunez Medina Garrido Cortes Castillo Santos Lozano Guerrero Cano Prieto Mendez Cruz Calvo Gallego Vidal Leon Herrera`),
      ...cross('Albar Bel Carr Corr Escob Fern Ibarr Lizar Mendi Olabar Sala Urib Zabal Echev Goic Aran Valver Arri Larr Ira', 'ra ez eda ola ete ano uri ondo'), ...cross('Ru Ve Mo Ca Ba So Ga Pa Ta Lo', 'bio dano rante ñez')] },
  it: { first: w(`Alessandro Andrea Antonio Davide Federico Francesco Gabriele Giacomo Giovanni Giuseppe Lorenzo Luca Marco Matteo Mattia
    Nicolo Paolo Pietro Riccardo Roberto Simone Stefano Tommaso Valerio Vincenzo Ciro Gennaro Salvatore Domenico Raffaele Emanuele
    Fabio Filippo Gianluca Gianluigi Leonardo Manuel Michele Nicola Samuele Sandro Sergio Alberto Alessio Christian Daniele Dario Edoardo
    Enrico Ettore Fausto Gaetano Giorgio Guglielmo Ignazio Jacopo Lapo Massimo Mauro Ottavio Renato Rocco Sebastiano Tiziano Ugo Vito`),
    last: [...w(`Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti DeLuca Mancini Costa Giordano
      Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo Gentile Martinelli Vitale
      Lombardo Serra Coppola DeSantis DAngelo Marchetti Parisi Villa Conte Ferraro Ferri Fabbri Bianco Marini Grasso Valentini Messina`),
      ...cross('Barel Bastoni Bonuc Calabr Chiell Dimar Frattes Pellegr Locat Scamac Toloi Tonal Zanio Verrat Cristan Spinazz Gagliard Mancin Belott Raspad', 'ini elli etti one esi ucci'), ...cross('Capo Monte Santa Vallo Torre', 'rossi bello grande verde')] },
  de: { first: w(`Lukas Leon Finn Jonas Paul Ben Elias Luis Felix Maximilian Moritz Niklas Tim Jan Jannik Florian Tobias Fabian Philipp
    Kevin Marco Mario Manuel Thomas Joshua Kai Leroy Serge Ilkay Antonio Robin Julian Nico Timo Toni Jamal Florian Karim Malick Mats
    Benedikt Bastian Lars Sven Dirk Jens Uwe Klaus Jurgen Holger Matthias Andreas Christoph Dominik Sebastian Stefan Marvin Pascal Dennis
    Sandro Lennart Henrik Hannes Konstantin Vincent Oskar Emil Anton Theo Linus Mats Ole Torben Bjorn Arne Malte Jannes Kilian Johannes`),
    last: [...w(`Muller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Koch Richter Klein Wolf Schroder Neumann
      Schwarz Zimmermann Braun Kruger Hartmann Lange Werner Krause Lehmann Kohler Herrmann Konig Walter Mayer Huber Kaiser Fuchs Peters
      Lang Scholz Moller Weiss Jung Hahn Vogel Friedrich Keller Gunther Frank Berger Winkler Roth Beck Lorenz Baumann Franke Albrecht`),
      ...cross('Stein Linden Rosen Eichen Wald Berg Hof Feld Brunn Sonnen Heim Gold Kirch Grun Hagen Buch Lieben Falken', 'berg mann bach hauer haus feld meier dorf'), ...cross('Kimm Gnab Ruding Sul Havertz Werne', 'ich er le')] },
  fr: { first: w(`Lucas Hugo Louis Gabriel Arthur Jules Adam Raphael Leo Nathan Enzo Maxime Theo Antoine Paul Clement Baptiste Romain
    Thomas Nicolas Julien Alexandre Florian Kevin Yann Olivier Thierry Didier Laurent Franck Benoit Kylian Antoine Ousmane Kingsley
    Aurelien Eduardo Randal Ibrahima Moussa Mamadou Youssouf Wissam Rayan Mathys Bradley Warren Lucien Corentin Valentin Quentin Remi
    Bastien Gaetan Loic Mathieu Pierre Sebastien Tanguy Yoann Adrien Benjamin Dayot Jonathan Matteo Malo Enzo Elye Desire Amine Ilyes`),
    last: [...w(`Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcia David
      Bertrand Roux Vincent Fournier Morel Girard Andre Lefevre Mercier Dupont Lambert Bonnet Francois Martinez Legrand Garnier Faure
      Rousseau Blanc Guerin Muller Henry Roussel Nicolas Perrin Morin Mathieu Clement Gauthier Dumont Lopez Fontaine Chevalier Robin`),
      ...cross('Beau Bel Bon Chau Cler Dela Duro Fer Gau Lavo Mar Mont Ri Sain Val Ver Lacro Bou Char Pel', 'champ mont ville court lier nier taine reau')] },
  pt: { first: w(`Joao Tiago Diogo Goncalo Rafael Rodrigo Pedro Miguel Andre Bruno Bernardo Ruben Nuno Ricardo Rui Vitinha Vitor Danilo
    Nelson Otavio Francisco Martim Duarte Tomas Afonso Guilherme Henrique Lucas Gabriel Matheus Vinicius Neymar Casemiro Fabinho
    Alisson Ederson Marquinhos Thiago Raphinha Antony Rodrygo Endrick Gabigol Everton Richarlison Roberto Paulo Leandro Fabio Helder
    Hugo Jorge Luis Marco Mario Sergio Silvio Wilson Anderson Cristiano Deco Renato Joelson Ze Caio Igor Kaio Iuri Otavio Wendel Yuri`),
    last: [...w(`Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes Goncalves Gomes Lopes Marques Alves
      Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes Nunes Soares Vieira Monteiro Cardoso Rocha Raposo Neves Coelho Cruz
      Cunha Pires Ramos Reis Simoes Antunes Matos Fonseca Morais Lima Araujo Barbosa Castro Freitas Machado Dias Leite Tavares Miranda`),
      ...cross('Baraj Cancel Guerre Palh Semed Trincao Brag Inac Neto Fil Gaspar Lobat Quaresm Sarab Vilac Bem Aguiar Moutinh Pepin', 'inha eiro ado oso ela ote ao es')] },
  ar: { first: w(`Mohammed Ahmed Abdullah Faisal Fahad Salem Saleh Saud Sultan Nasser Khalid Omar Ali Hassan Hussein Yasser Majed Nawaf
    Turki Bandar Talal Waleed Hamad Hamdan Mansour Mishal Rakan Riyadh Saad Sami Yahya Yousef Ziyad Abdulrahman Abdulelah Ayman Bader
    Firas Ghazi Haitham Hattan Ibrahim Ismail Jaber Jamal Karim Marwan Mazen Mutaz Nabil Nayef Osama Qasim Raed Rayan Sabri Shaker
    Tamer Tariq Wael Zaid Zakaria Amin Anas Aziz Basel Fares Hani Hazem Imran Jassim Muhannad Mukhtar Riad Samir Yazeed Hamza Adel`),
    last: [...w(`AlDawsari AlShahrani AlFaraj AlBulayhi AlAmri AlOwais AlGhanam AlMalki AlShehri AlQahtani AlOtaibi AlHarbi AlZahrani
      AlGhamdi AlMutairi AlAnazi AlDosari AlShammari AlSubaie AlJuhani AlYami AlBishi AlRashidi AlAsmari AlHamdan AlNajei AlBuraikan
      AlAbed AlKhaibari Kanno Madu Aziz Hassan Saleh Fawaz Mansour Nasser Haddad Khalil Mahmoud Saeed Jaber Darwish Bakr Farouk Hamdi`),
      ...cross('Al', 'Sahli Ruwaili Baqami Hazmi Khaldi Murshidi Thaqafi Sulami Shehri Fahmi Jaberi Nakhli Barqi Hijji Wadaani Ghunaim Matrafi Kuwari Sharari Mazrouei'),
      ...cross('Bin', 'Salem Nasser Saud Hamad Fahad Khalid Rashid Majed Turki Yousef'),
      ...cross('AbuBak AbuZay AbuSha IbnRa IbnKha', 'ar ed er id oud')] },
  af: { first: w(`Sadio Mohamed Riyad Achraf Hakim Youssef Yassine Sofyan Nayef Kalidou Idrissa Ismaila Bamba Edouard Pape Cheikh Moussa
    Wilfried Sebastien Franck Serge Nicolas Simon Victor Kelechi Wilfred Alex Samuel Ademola Calvin Taiwo Frank Ola Ademola Yaya Kolo
    Seydou Didier Salomon Emmanuel Andre Jordan Thomas Mohammed Mahmoud Omar Ahmed Amr Trezeguet Ramadan Ibrahim Issa Lamine Boubacar
    Amadou Aliou Abdou Mamadou Abdoulaye Habib Krepin Lassine Fode Naby Amadou Brice Serhou Tariq Chancel Junior Arnaud Aurelien Kossi`),
    last: [...w(`Mane Salah Mahrez Hakimi Ziyech Bounou Amrabat Aguerd Koulibaly Gueye Sarr Mendy Diallo Traore Keita Toure Kone Drogba
      Zaha Pepe Kessie Haller Osimhen Iheanacho Chukwueze Lookman Ndidi Iwobi Onana Aboubakar Anguissa Mbeumo Partey Ayew Kudus Salisu
      Bissouma Diatta Sangare Doucoure Camara Fofana Cisse Diop Ndiaye Kouyate Bamba Coulibaly Sylla Konate Dembele Sissoko Kante Sow`),
      ...cross('Oko Ade Olu Chi Ebu Nwa Ola Afo Babu Ibe', 'nkwo yemi wale nedu ka chukwu kunle dipe'), ...cross('Ba Da Ka Ma Sa Ta Ya Wa', 'kayoko dombe ngara lunga ssama')] },
  nl: { first: w(`Daan Sem Lucas Levi Finn Milan Jesse Bram Luuk Thijs Stijn Ruben Jasper Wout Teun Tijn Mees Siem Jurrien Ryan Cody Memphis
    Virgil Frenkie Matthijs Denzel Xavi Tijjani Joey Kenneth Arjen Robin Wesley Dirk Klaas Jan Rafael Georginio Daley Nathan Micky
    Steven Bas Ruud Marco Edwin Patrick Clarence Frank Ronald Jaap Joost Kees Pieter Sjoerd Wim Hidde Jorrit Lars Mats Noa Owen Quinten
    Rik Sven Tom Vincent Wessel Youri Zeno Calvin Donyell Ian Jeremie Justin Kenny Lutsharel Mitchel Noussair Quilindschy Sven Teun`),
    last: [...w(`DeJong DeVries VanDijk Bakker Janssen Visser Smit Meijer DeBoer Mulder DeGroot Bos Vos Peters Hendriks VanLeeuwen Dekker
      Brouwer DeWit Dijkstra Smits DeGraaf VanDerMeer Kok Jacobs DeHaan Vermeulen VanDenBerg VanDerLinden Kuipers Veenstra Kramer
      Schouten VanBeek Willems Hoekstra Verhoeven Koster Prins Huisman Peeters Maes Wouters Claes Goossens Timber Gakpo Frimpong Simons`),
      ...cross('Van', 'Aken Bommel Basten Persie Nistelrooy Hanegem Gaal Bronckhorst Hooijdonk Wijk Marwijk Tiggelen Breukelen Loon Ginkel'),
      ...cross('Groen Hoog Kalk Lange Mol Oost Rijk Stal Ter Vel Wester Zuid', 'veld berg hout broek dijk kamp man')] },
  sl: { first: w(`Luka Ivan Marko Josip Mateo Ante Mario Nikola Dejan Dusan Aleksandar Sergej Dusko Stefan Filip Petar Milos Lazar Vanja
    Andrej Bojan Branislav Darko Goran Jovan Kristijan Matej Mislav Nemanja Ognjen Pavle Predrag Radomir Sasa Srdjan Tomislav Uros
    Vladimir Zoran Zlatan Edin Miralem Sead Haris Jakub Kamil Krzysztof Lukasz Piotr Robert Wojciech Arkadiusz Grzegorz Mateusz Michal
    Tomasz Bartosz Damian Jan Ondrej Patrik Tomas Vladislav Roman Dominik Martin Milan Juraj Erik Adam Viktor Kirill Artem Denis Oleksandr`),
    last: [...w(`Modric Rakitic Perisic Kramaric Brozovic Kovacic Gvardiol Livakovic Vlasic Pasalic Majer Sucic Mitrovic Vlahovic
      Milinkovic Tadic Kostic Lukic Zivkovic Pavlovic Jovic Dzeko Pjanic Begovic Lewandowski Zielinski Szczesny Glik Krychowiak Piatek
      Milik Bednarek Kiwior Cash Frankowski Swiderski Moder Hlozek Soucek Coufal Schick Kral Hamsik Skriniar Lobotka Duda Mak Rodak`),
      ...cross('Novak Petrov Jovan Marin Stojan Radov Ilic Mil Bogdan Dragan Tomas Lazar Vuk Zor Brank Kovac', 'ic ovic evic ski czak ek')] },
};
const MORE: Record<Region, string[]> = {
  en: cross('Black Gold Rock Silver Steel Oak Ash Elm', 'smith wright ham more'),
  es: cross('Arri Bena Cebal Echa Fuen Goros Lasa Mendo Olaz Pala Sola Tobe Urdi Zubi', 'ga ta rra ndi'),
  it: cross('Bene Carbo Dona Fala Guer Lami Mazza Nardo Pagli Scala Sorren Taddei Vecchi Zappa', 'ri tti nzi rello rino ccio la'),
  de: cross('Adler Bauer Ebner Frei Hellm Kessel Lind Morgen Ober Reich Schaf Wiesen Zell', 'inger er hofer stetter meier'),
  fr: cross('Aub Cour Dar Esco Ga Jour Lan Ner Pou Sau Tour Vau', 'ert ois ier and in at on eau'),
  pt: cross('Abre Bar Ca Dor Fal Gui Lou Mo Pa Que Sal Tor Val', 'nches deira velo reira lhas res mão'),
  ar: [...cross('Al', 'Juwayr Quraishi Ahmadi Hamidi Kathiri Marzouqi Nuaimi Obaidi Rumaithi Shamsi Tamimi Zaabi Hashimi Kaabi Amoudi Dhaheri Falasi Haddadi Jabri Khatib Mahri Naqbi Qasimi Rawahi Saadi Suwaidi Yafei Zubaidi Mehairi Masri Bakri Hakimi Farsi Kindi Mansouri Rifai Shamrani Sudairi Thani Waeli Zamil Harthi Hajri Ajmi Busaidi Dossari Enezi Fadhli Ghufeli Hassani Ibrahimi Jaziri Kharusi Lawati Mutawa Najjar Omari Qahtan Rashed Sabah Tayyar Uthman Wahaibi Yami Zadjali Ansari Baloushi Darmaki Ghaithi Hosani Kubaisi Mazroui Neyadi Raisi Shehhi Teneiji Mehairbi Hammadi Suwaileh Bloushi Khouri Saffar Tuwaijri'), ...cross('Abu', 'Khalil Nasser Hamdan Saleh Yaseen Rahma Taleb Zaid Haidar Samra')],
  af: cross('Ade Ayo Bola Dayo Femi Ife Kola Seun Tunde Wale Yinka Emeka Ike Obi', 'bayo kunle ola tola yemi'),
  nl: cross('Berk Bloem Dam Eik Holt Kers Molen Rooze Steen Vliet Wilg Zand', 'huis stra sma ink ma ers'),
  sl: cross('Babic Bozic Grabow Jankow Kowal Lisow Malin Nowic Pavel Radic Sobol Wisniew Zelen', 'ski ic ek ak ov'),
};
for (const r of REGIONS) P[r].last.push(...MORE[r]);
for (const r of REGIONS) { P[r].first = [...new Set([...P[r].first, ...INTL])]; P[r].last = [...new Set(P[r].last)]; }
export const poolSize = (r: Region) => ({ first: P[r].first.length, last: P[r].last.length });

function h(str: string) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b) >>> 0; x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35) >>> 0; x ^= x >>> 16;
  return x >>> 0;
}
const at = <T,>(xs: T[], k: string) => xs[h(k) % xs.length]!;
/** Surnames like "VanDijk" or "AlShahrani" read better with a space. */
const pretty = (n: string) => n.replace(/^(Al|Bin|Abu|Ibn)(?=[A-Z])/, '$1 ').replace(/^(Van|De|Ter)(Der|Den)?(?=[A-Z])/, (_m, a, b) => (b ? `${a.toLowerCase()} ${b.toLowerCase()} ` : `${a === 'Van' ? 'van' : a} `)).replace(/^D(?=A[a-z])/, "D'").replace(/^DeL/, 'De L').replace(/^DeS/, 'De S');

/** A unique full name from the region's pools. Plain first+surname is tried first; then a double surname; then a middle name. Never digits. */
export function genName(seed: number, key: string, region: Region, used: Set<string>): string {
  const { first, last } = P[region];
  for (let t = 0; t < 24; t++) {
    const n = `${at(first, `${seed}|${key}|f${t}`)} ${pretty(at(last, `${seed}|${key}|l${t}`))}`;
    if (!used.has(n)) return n;
  }
  const dbl = region === 'es' || region === 'pt' ? ' ' : '-';
  for (let t = 0; t < 400; t++) {
    const f = at(first, `${seed}|${key}|F${t}`), a = pretty(at(last, `${seed}|${key}|A${t}`)), b = pretty(at(last, `${seed}|${key}|B${t}`));
    const n = t % 2 ? `${f} ${a}${dbl}${b}` : `${f} ${at(first, `${seed}|${key}|M${t}`)} ${a}`;
    if (a !== b && !used.has(n)) return n;
  }
  for (let t = 0; ; t++) { const n = `${at(first, `${seed}|${key}|G${t}`)} ${at(first, `${seed}|${key}|H${t}`)} ${pretty(at(last, `${seed}|${key}|I${t}`))}${dbl}${pretty(at(last, `${seed}|${key}|J${t}`))}`; if (!used.has(n)) return n; }
}

const COUNTRY: Record<string, Region> = { England: 'en', Spain: 'es', Italy: 'it', Germany: 'de', France: 'fr', Portugal: 'pt', 'Saudi Arabia': 'ar' };
/** Most players come from the league's country; about 30% are foreign. */
export function regionFor(country: string | undefined, k: string): Region {
  const home = COUNTRY[country ?? ''] ?? 'en';
  const r = h(`nat|${k}`) % 100;
  if (r < 70) return home;
  return REGIONS[h(`nat2|${k}`) % REGIONS.length]!;
}
/** Names that went wrong in older versions: a number tacked on ("Theo Kerr 6"). */
export const badName = (n: string) => /\d/.test(n);
/** Migration: rename every player whose name has digits or repeats another player's. Ids and stats are untouched. Returns how many it fixed. */
export function fixNames(s: GameState, countryOf: (clubId: string) => string | undefined = () => undefined): number {
  const all = [...s.players, ...s.market, ...(s.rivals ?? []), ...(s.loansOut ?? []), ...((s as { youth?: { name: string; id: string; clubId: string }[] }).youth ?? [])];
  const used = new Set(all.map((p) => p.name)), seen = new Set<string>(), ids = new Set<string>();
  let n = 0;
  for (const p of all) {
    if (ids.has(p.id)) continue; // the same player object listed twice
    ids.add(p.id);
    const dup = seen.has(p.name); seen.add(p.name);
    if (!badName(p.name) && !dup) continue;
    const nm = genName(s.seed, p.id, regionFor(countryOf(p.clubId), p.id), used);
    used.add(nm); p.name = nm; n++;
  }
  return n;
}
/** Short pitch label: the surname, trimmed to fit a pitch disc. */
export const surname = (n: string) => {
  const parts = n.split(' ').filter((x) => !/^\d+$/.test(x));
  const s = parts.at(-1) ?? n;
  return s.length > 8 ? `${s.slice(0, 7)}.` : s;
};
