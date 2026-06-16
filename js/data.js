/* Tunify — shared product catalog */
const TunifyProducts = [
  { id: 1, name: 'Stratocaster Standard', brand: 'Fender', category: 'string', price: 32500, badge: 'new', icon: 'fa-guitar', image: 'images/guitar_strat.png', stars: 5, reviews: 128, desc: 'The iconic Strat tone — crisp, versatile, and stage-ready.', specs: ['Alder body', 'Maple neck', '3 single-coil pickups', '2-point tremolo', '22 frets'], stock: 14 },
  { id: 2, name: 'Roland TD-17KVX', brand: 'Roland', category: 'percussion', price: 68000, badge: 'hot', icon: 'fa-drum', image: 'images/drums_roland.png', stars: 5, reviews: 94, desc: 'Professional V-Drums kit with mesh heads and expressive playability.', specs: ['Mesh heads', 'TD-17 sound module', '4-post rack', 'Kick pedal included', 'Bluetooth audio'], stock: 6 },
  { id: 3, name: 'Yamaha P-125', brand: 'Yamaha', category: 'keys', price: 29900, origPrice: 38000, badge: 'sale', icon: 'fa-keyboard', image: 'images/piano_yamaha.png', stars: 4, reviews: 76, desc: 'Compact 88-key digital piano with graded hammer action.', specs: ['88 GHS keys', '24W speakers', 'Dual voice mode', 'USB to Host', 'Smart Pianist app'], stock: 22 },
  { id: 4, name: 'Les Paul Classic', brand: 'Gibson', category: 'string', price: 55000, badge: '', icon: 'fa-guitar', image: 'images/guitar_strat.png', stars: 5, reviews: 61, desc: 'Rich, warm humbucker tone with premium craftsmanship.', specs: ['Mahogany body', 'Maple top', 'Burstbucker pickups', 'Set neck', 'Grover tuners'], stock: 4 },
  { id: 5, name: 'Cajon Box Kit', brand: 'Meinl', category: 'percussion', price: 6800, badge: 'new', icon: 'fa-drum', image: 'images/drums_roland.png', stars: 4, reviews: 43, desc: 'Portable acoustic percussion for unplugged sessions.', specs: ['Baltic birch', 'Adjustable snare', 'Non-slip feet', 'Compact size', 'Includes gig bag'], stock: 31 },
  { id: 6, name: 'Nord Stage 3 Compact', brand: 'Nord', category: 'keys', price: 185000, badge: 'hot', icon: 'fa-keyboard', image: 'images/piano_yamaha.png', stars: 5, reviews: 32, desc: 'Tour-grade stage keyboard with premium piano, organ, and synth engines.', specs: ['73 keys', 'Nord Piano Library', 'Dual manual organ', 'OLED display', 'Weighted action'], stock: 3 },
  { id: 7, name: 'Telecaster Player', brand: 'Fender', category: 'string', price: 28500, origPrice: 34000, badge: 'sale', icon: 'fa-guitar', stars: 4, reviews: 88, desc: 'Bright, cutting Tele tone with modern playability.', specs: ['Alder body', 'Modern C neck', 'Player Series pickups', 'String-through bridge', '22 frets'], stock: 11 },
  { id: 8, name: 'SPD-SX Pad', brand: 'Roland', category: 'percussion', price: 39000, badge: '', icon: 'fa-drum', stars: 5, reviews: 55, desc: 'Sample pad controller for live triggering.', specs: ['9 velocity pads', '4 external triggers', '16 GB internal', 'USB sample import', 'Balanced outputs'], stock: 9 },
  { id: 9, name: 'Jazz Bass Standard', brand: 'Fender', category: 'string', price: 35800, badge: '', icon: 'fa-guitar', stars: 5, reviews: 72, desc: 'Classic J-Bass growl with comfortable slim neck profile.', specs: ['Alder body', 'Maple fretboard', 'Split-coil pickups', '4-saddle bridge', '20 frets'], stock: 8 },
  { id: 10, name: 'SG Standard', brand: 'Gibson', category: 'string', price: 48500, badge: 'hot', icon: 'fa-guitar', stars: 5, reviews: 54, desc: 'Aggressive rock tone with lightweight mahogany body.', specs: ['Mahogany body', '490R/490T pickups', 'Nashville bridge', 'Set neck', '22 frets'], stock: 5 },
  { id: 11, name: 'RG450DX', brand: 'Ibanez', category: 'string', price: 18900, origPrice: 22500, badge: 'sale', icon: 'fa-guitar', stars: 4, reviews: 96, desc: 'Fast-playing superstrat for metal and shred.', specs: ['Poplar body', 'Wizard III neck', 'Quantum pickups', 'Edge-Zero II trem', '24 frets'], stock: 17 },
  { id: 12, name: 'GS Mini Mahogany', brand: 'Taylor', category: 'string', price: 42000, badge: 'new', icon: 'fa-guitar', stars: 5, reviews: 41, desc: 'Travel-friendly acoustic with surprising projection.', specs: ['Solid mahogany top', 'Layered sapele back/sides', 'ES-B electronics', '23-1/2" scale', 'Gig bag included'], stock: 10 },
  { id: 13, name: 'FP-30X Digital Piano', brand: 'Roland', category: 'keys', price: 44500, badge: '', icon: 'fa-keyboard', stars: 5, reviews: 67, desc: 'SuperNATURAL piano engine in a compact footprint.', specs: ['88 PHA-4 keys', 'Bluetooth MIDI/audio', '12W speakers', 'Twin piano mode', 'Dust cover included'], stock: 13 },
  { id: 14, name: 'FG800 Acoustic', brand: 'Yamaha', category: 'string', price: 12800, badge: '', icon: 'fa-guitar', stars: 4, reviews: 112, desc: 'Reliable dreadnought for beginners and campfire sessions.', specs: ['Spruce top', 'Nato back/sides', 'Rosewood fingerboard', '25-9/16" scale', 'Gig bag optional'], stock: 26 },
  { id: 15, name: 'Piano 5 73', brand: 'Nord', category: 'keys', price: 142000, badge: 'new', icon: 'fa-keyboard', stars: 5, reviews: 28, desc: 'Flagship Nord piano with expanded memory and effects.', specs: ['73 weighted keys', 'Nord Piano Library v2', 'Twin Pedal included', 'Layer/split modes', 'OLED display'], stock: 4 },
  { id: 16, name: 'B2 Digital Piano', brand: 'Korg', category: 'keys', price: 24500, origPrice: 28900, badge: 'sale', icon: 'fa-keyboard', stars: 4, reviews: 39, desc: 'Affordable weighted piano with rich stereo sound.', specs: ['88 NH keys', '30 sounds', 'Built-in lessons', 'Half-damper pedal', 'Music rest included'], stock: 15 },
  { id: 17, name: 'Export EXX725', brand: 'Pearl', category: 'percussion', price: 52000, badge: '', icon: 'fa-drum', stars: 5, reviews: 48, desc: 'Complete 5-piece shell pack ready for gigging.', specs: ['Poplar shells', '22" bass drum', 'Opti-Loc mounts', 'Includes snare', 'No cymbals'], stock: 7 },
  { id: 18, name: 'HCS Cymbal Pack', brand: 'Meinl', category: 'percussion', price: 11500, badge: 'sale', icon: 'fa-drum', stars: 4, reviews: 83, origPrice: 14000, desc: 'Matched brass cymbal set for student kits.', specs: ['14" hi-hats', '16" crash', '20" ride', 'Traditional finish', 'Includes bag'], stock: 19 },
  { id: 19, name: 'YAS-280 Alto Sax', brand: 'Yamaha', category: 'wind', price: 89500, badge: '', icon: 'fa-wind', stars: 5, reviews: 36, desc: 'Student alto sax with reliable intonation and easy response.', specs: ['Yellow brass body', 'High F# key', '4C mouthpiece', 'Lightweight case', 'Neck strap included'], stock: 6 },
  { id: 20, name: 'SM58 Vocal Mic', brand: 'Shure', category: 'vocals', price: 7800, badge: 'hot', icon: 'fa-microphone', stars: 5, reviews: 210, desc: 'Industry-standard dynamic mic for live vocals.', specs: ['Cardioid pattern', '50Hz–15kHz', 'Pneumatic shock mount', 'Steel mesh grille', 'XLR output'], stock: 42 },
  { id: 21, name: 'AT2020 Condenser', brand: 'Audio-Technica', category: 'vocals', price: 9200, badge: '', icon: 'fa-microphone', stars: 4, reviews: 145, desc: 'Studio condenser for vocals, podcasts, and acoustic instruments.', specs: ['Cardioid condenser', '48V phantom power', 'Low self-noise', 'Pivoting stand mount', 'Carrying pouch'], stock: 24 },
  { id: 22, name: 'Katana 50 Gen 3', brand: 'Boss', category: 'accessories', price: 21500, badge: 'new', icon: 'fa-plug', stars: 5, reviews: 58, desc: 'Versatile guitar amp with onboard effects and USB recording.', specs: ['50W combo', '12" speaker', '12 amp types', '60 effects', 'Stereo aux in'], stock: 12 },
  { id: 23, name: 'EXL110 10-Pack', brand: "D'Addario", category: 'accessories', price: 3200, badge: '', icon: 'fa-plug', stars: 5, reviews: 188, desc: 'Best-selling nickel wound electric strings in bulk pack.', specs: ['.010–.046 gauge', 'Round wound', '10 sets per box', 'Corrosion resistant', 'Made in USA'], stock: 55 },
  { id: 24, name: 'GS414B Guitar Stand', brand: 'Hercules', category: 'accessories', price: 1850, badge: '', icon: 'fa-plug', stars: 4, reviews: 92, desc: 'Auto-grip single guitar stand for stage or home.', specs: ['Auto Grip System', 'Folding legs', 'SFF rubber contacts', 'Steel construction', '1.5 kg weight'], stock: 38 },
  { id: 25, name: 'MG15 Gold', brand: 'Marshall', category: 'accessories', price: 9800, origPrice: 11500, badge: 'sale', icon: 'fa-plug', stars: 4, reviews: 74, desc: 'Compact Marshall tone for practice and recording.', specs: ['15W combo', '8" speaker', '3 channels', 'MP3/phone input', 'Emulated DI out'], stock: 16 },
  { id: 26, name: 'Roadshow 5pc', brand: 'Pearl', category: 'percussion', price: 38500, badge: 'new', icon: 'fa-drum', stars: 4, reviews: 51, desc: 'Entry kit with everything needed to start drumming.', specs: ['9-ply poplar', '16" crash included', '14" hybrid snare', 'P930 pedal', 'Cymbal stands'], stock: 11 },
  { id: 27, name: 'Mustang LT25', brand: 'Fender', category: 'accessories', price: 14200, badge: '', icon: 'fa-plug', stars: 4, reviews: 63, desc: 'Modeling amp with Fender presets and looper.', specs: ['25W combo', '8" speaker', '30 presets', 'USB recording', 'Headphone out'], stock: 14 },
  { id: 28, name: 'HD Dry Pack', brand: 'Evans', category: 'percussion', price: 4500, badge: '', icon: 'fa-drum', stars: 4, reviews: 37, desc: 'Hydraulic drumhead pack for punchy, controlled tone.', specs: ['12/13/16 heads', 'Hydraulic series', '2-ply design', 'Easy tune response', 'Fusion sizes'], stock: 27 },
  { id: 29, name: 'SRH840A Headphones', brand: 'Shure', category: 'vocals', price: 11200, badge: '', icon: 'fa-headphones', stars: 5, reviews: 89, desc: 'Closed-back studio headphones for monitoring and tracking.', specs: ['40mm drivers', 'Foldable design', 'Replaceable cable', '9.8 ft coiled cord', 'Carrying pouch'], stock: 18 },
  { id: 30, name: 'MINilogue XD', brand: 'Korg', category: 'keys', price: 68500, badge: 'hot', icon: 'fa-keyboard', stars: 5, reviews: 44, desc: 'Analog poly synth with digital multi-engine and sequencer.', specs: ['37 keys', '4-voice analog', 'Digital oscillator', '16-step sequencer', 'Joystick control'], stock: 5 },
  { id: 31, name: 'SR500E Bass', brand: 'Ibanez', category: 'string', price: 32800, badge: '', icon: 'fa-guitar', stars: 4, reviews: 47, desc: 'Modern bass with Nordstrand pickups and ash body.', specs: ['Ash body', 'Nordstrand Big Break', 'B10 bridge', '24 frets', 'Active/passive switch'], stock: 9 },
  { id: 32, name: 'AvantGrand N1X', brand: 'Yamaha', category: 'keys', price: 215000, badge: '', icon: 'fa-keyboard', stars: 5, reviews: 19, desc: 'Hybrid piano with grand action and spatial audio.', specs: ['88 wooden keys', 'Grand action', 'Spatial headphone sound', 'Bluetooth audio', '10 preset songs'], stock: 2 }
];

const TunifyBrands = [
  { name: 'Fender', slug: 'fender' },
  { name: 'Gibson', slug: 'gibson' },
  { name: 'Yamaha', slug: 'yamaha' },
  { name: 'Roland', slug: 'roland' },
  { name: 'Shure', slug: 'shure' },
  { name: 'Ibanez', slug: 'ibanez' },
  { name: 'Marshall', slug: 'marshall' }
];

const TunifySearchSuggestions = TunifyProducts.map(p => p.name).concat(
  TunifyBrands.map(b => b.name),
  ['Guitar Cable', 'Drum Sticks', 'Piano Bench', 'Guitar Picks', 'Microphone Stand']
);

const TunifyOrders = [
  { id: 'TN-2401', date: '2024-11-02', status: 'Delivered', total: 32500, items: ['Stratocaster Standard'] },
  { id: 'TN-2402', date: '2024-11-18', status: 'Shipped', total: 68000, items: ['Roland TD-17KVX'] },
  { id: 'TN-2403', date: '2024-12-05', status: 'Processing', total: 29900, items: ['Yamaha P-125'] }
];

const TunifyDashboardStats = {
  revenue: 2847500,
  orders: 186,
  customers: 1240,
  lowStock: [
    { name: 'Les Paul Classic', stock: 4 },
    { name: 'Nord Stage 3 Compact', stock: 3 },
    { name: 'AvantGrand N1X', stock: 2 }
  ],
  salesByCategory: [
    { label: 'String', pct: 32 },
    { label: 'Percussion', pct: 22 },
    { label: 'Keys', pct: 24 },
    { label: 'Other', pct: 22 }
  ]
};
