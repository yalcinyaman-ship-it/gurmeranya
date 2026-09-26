const LS = 'gurmeranya_v1';
export const SEED_CATS = ['Kahvaltı', 'Döner', 'Kebap', 'Esnaf Lokantası', 'Tatlı', 'Balık', 'Pide & Lahmacun', 'Kahve', 'Sokak Lezzeti'];
const SEED = [
  { id: 's1', name: 'Çiya Sofrası', city: 'İstanbul', district: 'Kadıköy', cat: 'Esnaf Lokantası', status: 'done', rating: 9, note: 'Menüyü ezberlemeye çalıştım, pes ettim. Her şeyden bir tabak.', createdAt: 7 },
  { id: 's2', name: 'Karaköy Güllüoğlu', city: 'İstanbul', district: 'Beyoğlu', cat: 'Tatlı', status: 'done', rating: 10, note: 'Fıstıklı sarma. Diyet pazartesi başlar; hangi pazartesi olduğu belli değil.', createdAt: 6 },
  { id: 's3', name: 'Van Kahvaltı Evi', city: 'İstanbul', district: 'Beyoğlu', cat: 'Kahvaltı', status: 'done', rating: 8, note: 'Otlu peynir, murtuğa. Hafta sonu kuyruğu da kahvaltının parçası.', createdAt: 5 },
  { id: 's4', name: 'Hacı Abdullah', city: 'İstanbul', district: 'Beyoğlu', cat: 'Esnaf Lokantası', status: 'done', rating: 7, note: 'Ayva tatlısı efsane, gerisi saygın.', createdAt: 4 },
  { id: 's5', name: 'Bayramoğlu Döner', city: 'İstanbul', district: 'Beykoz', cat: 'Döner', status: 'todo', note: 'Yol uzun ama döner uzun yolu sever.', createdAt: 3 },
  { id: 's6', name: 'Kebapçı İskender', city: 'Bursa', district: 'Osmangazi', cat: 'Kebap', status: 'todo', note: 'Tereyağı döküldüğü an ayakta alkış.', createdAt: 2 },
  { id: 's7', name: 'İmam Çağdaş', city: 'Gaziantep', district: 'Şahinbey', cat: 'Kebap', status: 'todo', note: 'Ali Nazik mi baklava mı? Cevap her zaman: ikisi.', createdAt: 1 }
];

export async function createStore(cfg) {
  if (cfg && cfg.firebase && cfg.firebase.apiKey) return firebaseStore(cfg);
  return localStore(cfg);
}

function localStore(cfg) {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(LS)); } catch (e) {}
  if (!data) data = { places: SEED, cats: SEED_CATS };
  if (!data.settings) data.settings = { mapsKey: (cfg && cfg.mapsKey) || '' };
  let admin = sessionStorage.getItem(LS + '_a') === '1';
  const subs = [], authSubs = [];
  const snap = () => ({ places: data.places, cats: data.cats, settings: data.settings });
  const emit = () => { localStorage.setItem(LS, JSON.stringify(data)); subs.forEach(f => f(snap())); };
  const setAdmin = v => { admin = v; v ? sessionStorage.setItem(LS + '_a', '1') : sessionStorage.removeItem(LS + '_a'); authSubs.forEach(f => f(v)); };
  return {
    mode: 'local',
    subscribe(f) { subs.push(f); f(snap()); },
    onAuth(f) { authSubs.push(f); f(admin); },
    async save(p) { const has = data.places.some(x => x.id === p.id); data.places = has ? data.places.map(x => x.id === p.id ? p : x) : [p, ...data.places]; emit(); },
    async remove(id) { data.places = data.places.filter(x => x.id !== id); emit(); },
    async saveCats(list) { data.cats = list; emit(); },
    async saveSettings(st) { data.settings = Object.assign({}, data.settings, st); emit(); },
    async login(pw) { if (pw !== 'yaman1905') return false; setAdmin(true); return true; },
    async logout() { setAdmin(false); }
  };
}

async function firebaseStore(cfg) {
  const V = '10.12.2', u = m => `https://www.gstatic.com/firebasejs/${V}/firebase-${m}.js`;
  const [{ initializeApp }, fs, au] = await Promise.all([import(u('app')), import(u('firestore')), import(u('auth'))]);
  const app = initializeApp(cfg.firebase), db = fs.getFirestore(app), auth = au.getAuth(app);
  const col = fs.collection(db, 'places'), catDoc = fs.doc(db, 'meta', 'categories'), setDoc = fs.doc(db, 'meta', 'settings');
  let places = [], cats = SEED_CATS, settings = { mapsKey: cfg.mapsKey || '' };
  const subs = [];
  const emit = () => subs.forEach(f => f({ places, cats, settings }));
  fs.onSnapshot(col, s => { places = s.docs.map(d => ({ id: d.id, ...d.data() })); emit(); });
  fs.onSnapshot(catDoc, s => { if (s.exists()) cats = s.data().list || cats; emit(); });
  fs.onSnapshot(setDoc, s => { if (s.exists()) settings = Object.assign({}, settings, s.data()); emit(); });
  return {
    mode: 'firebase',
    subscribe(f) { subs.push(f); f({ places, cats, settings }); },
    onAuth(f) { au.onAuthStateChanged(auth, x => f(!!x)); },
    save(p) { const { id, ...rest } = p; return fs.setDoc(fs.doc(db, 'places', id), rest); },
    remove(id) { return fs.deleteDoc(fs.doc(db, 'places', id)); },
    saveCats(list) { return fs.setDoc(catDoc, { list }); },
    saveSettings(st) { return fs.setDoc(setDoc, st, { merge: true }); },
    async login(pw) { try { await au.signInWithEmailAndPassword(auth, cfg.adminEmail, pw); return true; } catch (e) { return false; } },
    logout() { return au.signOut(auth); }
  };
}

// ——— Google Maps linki çözümleme ———
export function parseMapsLink(input) {
  const s = (input || '').trim();
  if (!/^https?:\/\//i.test(s)) return { kind: 'text', query: s };
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(s)) return { kind: 'short' };
  let url; try { url = new URL(s); } catch (e) { return { kind: 'text', query: s }; }
  const dec = t => decodeURIComponent(t.replace(/\+/g, ' '));
  let name = '', lat = null, lng = null;
  const pm = url.pathname.match(/\/place\/([^/]+)/); if (pm) name = dec(pm[1]);
  const q = url.searchParams.get('query') || url.searchParams.get('q') || url.searchParams.get('destination'); if (!name && q) name = q;
  const d = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (d) { lat = +d[1]; lng = +d[2]; }
  const pid = url.searchParams.get('query_place_id') || url.searchParams.get('destination_place_id');
  if (!name && lat == null && !pid) return { kind: 'bad' };
  return { kind: 'link', query: name || (lat + ',' + lng), lat, lng, placeId: pid || '', link: s };
}

const FIELDS = 'id,displayName,formattedAddress,googleMapsUri,photos,addressComponents,rating,userRatingCount,location';

function mapPlace(p, key) {
  const comp = t => (p.addressComponents || []).find(c => (c.types || []).includes(t));
  const ph = p.photos && p.photos[0];
  return {
    placeId: p.id,
    name: (p.displayName && p.displayName.text) || '',
    address: p.formattedAddress || '',
    city: (comp('administrative_area_level_1') || {}).longText || '',
    district: (comp('administrative_area_level_2') || {}).longText || '',
    mapUrl: p.googleMapsUri || '',
    photoUrl: ph ? `https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=900&key=${key}` : '',
    googleRating: p.rating || null,
    googleCount: p.userRatingCount || 0,
    lat: p.location ? p.location.latitude : null,
    lng: p.location ? p.location.longitude : null
  };
}

async function gfetch(url, key, opts) {
  const r = await fetch(url, Object.assign({}, opts, { headers: Object.assign({ 'X-Goog-Api-Key': key }, opts.headers) }));
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || j.error.status);
  return j;
}

export async function searchPlaces(key, q, bias) {
  if (!key) throw new Error('nokey');
  const body = { textQuery: q, languageCode: 'tr', regionCode: 'TR' };
  if (bias && bias.lat != null) body.locationBias = { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 300 } };
  const j = await gfetch('https://places.googleapis.com/v1/places:searchText', key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': FIELDS.split(',').map(f => 'places.' + f).join(',') },
    body: JSON.stringify(body)
  });
  return (j.places || []).slice(0, 6).map(p => mapPlace(p, key));
}

export async function getPlace(key, id) {
  if (!key) throw new Error('nokey');
  const j = await gfetch('https://places.googleapis.com/v1/places/' + id + '?languageCode=tr', key, { method: 'GET', headers: { 'X-Goog-FieldMask': FIELDS } });
  return mapPlace(j, key);
}
