import {openingStatus} from './hours.js';

const $ = (id) => document.getElementById(id);
const COPY = {
  uk: {skip:'До пошуку пунктів',brand:'Карта стійкості',headerCaption:'Відкриті дані для стійких громад',about:'Про дані',eyebrow:'КИЇВ · ПУНКТИ НЕЗЛАМНОСТІ',heading:'Підтримка поруч.',intro:'Знайдіть місце для тепла, зв’язку та підзарядки.',searchLabel:'Назва або адреса',find:'Знайти пункт',reset:'Скинути',district:'Район',allDistricts:'Усі райони',status:'Години роботи',allHours:'Будь-які',openNow:'Відкрито за графіком',closed:'Зачинено за графіком',unknown:'Графік невідомий',need:'Що вам потрібно?',allAmenities:'Усі послуги',moreFilters:'Фільтр за атрибутами',attribute:'Атрибут',value:'Значення',choose:'Оберіть',anyValue:'Будь-яке',includeInactive:'Показати неактивні записи',layers:'Шари карти',population:'Населення',popDetail:'WorldPop 2025 · сітка ~100 м',walk:'15 хвилин пішки',walkDetail:'Дитячий темп · 3 км/год',resultsHint:'за фільтрами',showMore:'Показати ще',download:'Завантажити дані',kyivTime:'Київський час',scheduleNote:'Стан за графіком, без перевірки на місці',fit:'Увесь Київ',locate:'Моє місце',loading:'Завантаження карти та даних…',legendTitle:'Пункти за графіком',openShort:'Відкрито',closedShort:'Зачинено',unknownShort:'Невідомо',inactive:'Неактивний',less:'Менше населення',more:'Більше',heatNote:'Відносна інтенсивність; залежить від масштабу',walkLegend:'Досяжні вулиці + коридор 35 м',filters:'Пошук і фільтри',aboutTitle:'Як читати цю карту',downloadHelp:'Пункти та ізохрони експортуються з поточними фільтрами. Населення охоплює всю територію аналізу.',exportFacilities:'Пункти · GeoJSON',exportIsochrones:'Ізохрони · GeoJSON',exportPopulation:'Населення · JSON',exportMetadata:'Метадані · JSON',empty:'За цими фільтрами пунктів не знайдено. Спробуйте скинути фільтри.',facilities:'пунктів',capacity:'Місткість за реєстром',people:'осіб',allAttributes:'Усі атрибути',showCatchment:'Показати 15-хвилинну зону',noCatchment:'Для цього пункту немає зони: перевірте відстань до доступної мережі.',catchmentsLoading:'Завантаження пішохідних зон…',catchmentsFailed:'Не вдалося завантажити пішохідні зони. Оновіть сторінку, щоб спробувати знову.',loadFailed:'Не вдалося завантажити дані. Перевірте з’єднання та оновіть сторінку.',mapFailed:'Бібліотека карти недоступна. Перевірте файли сайту та оновіть сторінку.',fileError:'Відкрийте сайт через HTTP-сервер, а не як файл. Команда: python3 -m http.server 8000 --directory site',locationFailed:'Не вдалося визначити місце. Дозвольте доступ до геолокації або знайдіть адресу.',outside:'Ви за межами території аналізу Києва.',youAreHere:'Ваше місце',notAvailable:'Немає даних',yes:'Так',no:'Ні',close:'Закрити',routingWarning:'Обмежена зв’язність дорожньої мережі: зона може суттєво недооцінювати доступність. Потрібна перевірка місцевих вулиць.',corridorPopulation:'Населення в модельному коридорі',tileError:'Фонова карта тимчасово недоступна. Дані пунктів і шари залишаються доступними.',updated:'Оновлено в реєстрі',catchmentEstimate:'Модель доступності: 750 м мережею з урахуванням відстані від пункту до вулиці. Показано коридори вулиць, а не повні міські квартали.',snapshot:'Знімок реєстру, без даних про черги чи наявність запасів.',amenities:{heater:'Обігрів',generator:'Генератор',charge:'Зарядка',water:'Вода',internet:'Інтернет',cellular:'Мобільний зв’язок',first_aid:'Аптечка',pandus:'Пандус'}},
  en: {skip:'Skip to facility search',brand:'Resilience map',headerCaption:'Open data for resilient communities',about:'About the data',eyebrow:'KYIV · RESILIENCE FACILITIES',heading:'Support, nearby.',intro:'Find a place for warmth, connection and a recharge.',searchLabel:'Name or address',find:'Find a facility',reset:'Reset',district:'District',allDistricts:'All districts',status:'Opening hours',allHours:'Any hours',openNow:'Open by schedule',closed:'Closed by schedule',unknown:'Hours unknown',need:'What do you need?',allAmenities:'All services',moreFilters:'Filter by attributes',attribute:'Attribute',value:'Value',choose:'Choose',anyValue:'Any value',includeInactive:'Include inactive records',layers:'Map layers',population:'Population',popDetail:'WorldPop 2025 · ~100 m grid',walk:'15-minute walk',walkDetail:'Child walking pace · 3 km/h',resultsHint:'matching filters',showMore:'Show more',download:'Download data',kyivTime:'Kyiv time',scheduleNote:'Published hours; availability not verified on site',fit:'Show Kyiv',locate:'My location',loading:'Loading map and datasets…',legendTitle:'Facilities by schedule',openShort:'Open',closedShort:'Closed',unknownShort:'Unknown',inactive:'Inactive',less:'Lower population',more:'Higher',heatNote:'Relative intensity; changes with map zoom',walkLegend:'Reachable streets + 35 m corridor',filters:'Search & filters',aboutTitle:'Reading this map',downloadHelp:'Facilities and isochrones use your current filters. Population covers the entire study area.',exportFacilities:'Facilities · GeoJSON',exportIsochrones:'Isochrones · GeoJSON',exportPopulation:'Population · JSON',exportMetadata:'Metadata · JSON',empty:'No facilities match these filters. Try resetting the filters.',facilities:'facilities',capacity:'Registered capacity',people:'people',allAttributes:'All attributes',showCatchment:'Show 15-minute catchment',noCatchment:'No catchment for this facility. Check its distance to the available walking network.',catchmentsLoading:'Loading walking catchments…',catchmentsFailed:'Walking catchments could not be loaded. Refresh the page to retry.',loadFailed:'The data could not be loaded. Check your connection and refresh the page.',mapFailed:'The map library is unavailable. Check the site files and refresh.',fileError:'Serve the site over HTTP instead of opening a file. Run: python3 -m http.server 8000 --directory site',locationFailed:'Your location is unavailable. Allow location access or search for an address.',outside:'You are outside the Kyiv study area.',youAreHere:'Your location',notAvailable:'Not provided',yes:'Yes',no:'No',close:'Close',routingWarning:'Limited road network connectivity: this catchment may substantially underestimate access. Local streets need review.',corridorPopulation:'Population in modeled corridor',tileError:'The basemap is temporarily unavailable. Facility data and layers are still available.',updated:'Updated in register',catchmentEstimate:'Accessibility model: 750 m along the network, including access from the facility to the street. Polygons represent street corridors, not complete city blocks.',snapshot:'A register snapshot, without live queue or supply information.',amenities:{heater:'Heating',generator:'Generator',charge:'Charging',water:'Water',internet:'Internet',cellular:'Mobile connection',first_aid:'First aid',pandus:'Ramp'}}
};
COPY.de = {
  skip:'Zur Suche nach Einrichtungen',brand:'Resilienzkarte',headerCaption:'Offene Daten für resiliente Gemeinschaften',about:'Über die Daten',eyebrow:'KYJIW · RESILIENZEINRICHTUNGEN',heading:'Unterstützung in Ihrer Nähe.',intro:'Finden Sie einen Ort zum Aufwärmen, Vernetzen und Aufladen.',searchLabel:'Name oder Adresse',find:'Einrichtung finden',reset:'Zurücksetzen',district:'Stadtbezirk',allDistricts:'Alle Stadtbezirke',status:'Öffnungszeiten',allHours:'Alle Öffnungszeiten',openNow:'Laut Zeitplan geöffnet',closed:'Laut Zeitplan geschlossen',unknown:'Öffnungszeiten unbekannt',need:'Was benötigen Sie?',allAmenities:'Alle Angebote',moreFilters:'Nach Attributen filtern',attribute:'Attribut',value:'Wert',choose:'Auswählen',anyValue:'Beliebiger Wert',includeInactive:'Inaktive Einträge anzeigen',layers:'Kartenebenen',population:'Bevölkerung',popDetail:'WorldPop 2025 · Raster ca. 100 m',walk:'15 Minuten zu Fuß',walkDetail:'Gehtempo eines Kindes · 3 km/h',resultsHint:'entsprechen den Filtern',showMore:'Mehr anzeigen',download:'Daten herunterladen',kyivTime:'Ortszeit in Kyjiw',scheduleNote:'Veröffentlichte Zeiten; Verfügbarkeit vor Ort nicht überprüft',fit:'Ganz Kyjiw anzeigen',locate:'Mein Standort',loading:'Karte und Datensätze werden geladen…',legendTitle:'Einrichtungen nach Öffnungszeiten',openShort:'Geöffnet',closedShort:'Geschlossen',unknownShort:'Unbekannt',inactive:'Inaktiv',less:'Weniger Bevölkerung',more:'Mehr',heatNote:'Relative Intensität; abhängig vom Kartenmaßstab',walkLegend:'Erreichbare Straßen + 35-m-Korridor',filters:'Suche und Filter',aboutTitle:'So lesen Sie diese Karte',downloadHelp:'Einrichtungen und Isochronen werden mit den aktuellen Filtern exportiert. Die Bevölkerungsdaten umfassen das gesamte Untersuchungsgebiet.',exportFacilities:'Einrichtungen · GeoJSON',exportIsochrones:'Isochronen · GeoJSON',exportPopulation:'Bevölkerung · JSON',exportMetadata:'Metadaten · JSON',empty:'Keine Einrichtungen entsprechen diesen Filtern. Versuchen Sie, die Filter zurückzusetzen.',facilities:'Einrichtungen',capacity:'Kapazität laut Register',people:'Personen',allAttributes:'Alle Attribute',showCatchment:'15-Minuten-Einzugsgebiet anzeigen',noCatchment:'Für diese Einrichtung ist kein Einzugsgebiet verfügbar. Prüfen Sie die Entfernung zum verfügbaren Wegenetz.',catchmentsLoading:'Fußläufige Einzugsgebiete werden geladen…',catchmentsFailed:'Die fußläufigen Einzugsgebiete konnten nicht geladen werden. Laden Sie die Seite erneut.',loadFailed:'Die Daten konnten nicht geladen werden. Prüfen Sie die Verbindung und laden Sie die Seite erneut.',mapFailed:'Die Kartenbibliothek ist nicht verfügbar. Prüfen Sie die Dateien der Website und laden Sie die Seite erneut.',fileError:'Öffnen Sie die Website über einen HTTP-Server statt als Datei. Befehl: python3 -m http.server 8000 --directory site',locationFailed:'Ihr Standort konnte nicht ermittelt werden. Erlauben Sie den Standortzugriff oder suchen Sie nach einer Adresse.',outside:'Sie befinden sich außerhalb des Untersuchungsgebiets Kyjiw.',youAreHere:'Ihr Standort',notAvailable:'Keine Angaben',yes:'Ja',no:'Nein',close:'Schließen',routingWarning:'Eingeschränkte Vernetzung der Straßen: Dieses Einzugsgebiet kann die Erreichbarkeit erheblich unterschätzen. Die örtlichen Straßen müssen überprüft werden.',corridorPopulation:'Bevölkerung im modellierten Korridor',tileError:'Die Hintergrundkarte ist vorübergehend nicht verfügbar. Einrichtungsdaten und Kartenebenen sind weiterhin verfügbar.',updated:'Im Register aktualisiert',catchmentEstimate:'Erreichbarkeitsmodell: 750 m entlang des Wegenetzes, einschließlich des Zugangs von der Einrichtung zur Straße. Die Polygone zeigen Straßenkorridore, keine vollständigen Häuserblöcke.',snapshot:'Momentaufnahme des Registers ohne aktuelle Angaben zu Warteschlangen oder Vorräten.',amenities:{heater:'Heizung',generator:'Generator',charge:'Lademöglichkeit',water:'Wasser',internet:'Internet',cellular:'Mobilfunk',first_aid:'Erste Hilfe',pandus:'Rampe'}
};
Object.assign(COPY.uk, {pageTitle:'Київ · Карта стійкості',serviceNavigation:'Навігація сервісом',language:'Мова',searchFilters:'Пошук і фільтри',facilityResults:'Результати пошуку пунктів',mapLabel:'Карта пунктів незламності Києва',facilityDetails:'Інформація про пункт',registeredFacilities:'пунктів у реєстрі',activeRecords:'активних записів',sourceMethodology:'Код і методологія',aboutWalkTitle:'15 хвилин дитячим кроком',coverageSummary:'У межах коридорів усіх активних записів: {inside} осіб ({percent}%). Поза коридорами: {outside}. Це оцінка за центрами комірок, без урахування поточного графіка чи фільтрів.',exportDescription:'Експорт із поточними фільтрами. Стан роботи визначено за опублікованим графіком, без перевірки на місці.',zoomIn:'Збільшити масштаб',zoomOut:'Зменшити масштаб'});
Object.assign(COPY.en, {pageTitle:'Kyiv · Resilience map',serviceNavigation:'Service navigation',language:'Language',searchFilters:'Search and filters',facilityResults:'Facility search results',mapLabel:'Kyiv resilience facilities map',facilityDetails:'Facility details',registeredFacilities:'registered facilities',activeRecords:'active records',sourceMethodology:'Source and methodology',aboutWalkTitle:'A 15-minute child-paced walk',coverageSummary:'Within corridors of all active records: {inside} people ({percent}%). Outside corridors: {outside}. This cell-center estimate does not apply current opening hours or filters.',exportDescription:'Filtered export. Opening state follows published schedules, not live verification.',zoomIn:'Zoom in',zoomOut:'Zoom out'});
Object.assign(COPY.de, {pageTitle:'Kyjiw · Resilienzkarte',serviceNavigation:'Navigation',language:'Sprache',searchFilters:'Suche und Filter',facilityResults:'Suchergebnisse für Einrichtungen',mapLabel:'Karte der Resilienzeinrichtungen in Kyjiw',facilityDetails:'Angaben zur Einrichtung',registeredFacilities:'Einrichtungen im Register',activeRecords:'aktive Einträge',sourceMethodology:'Quellcode und Methodik',aboutWalkTitle:'15 Minuten im Gehtempo eines Kindes',coverageSummary:'In den Korridoren aller aktiven Einträge: {inside} Personen ({percent} %). Außerhalb der Korridore: {outside}. Diese Schätzung anhand der Rasterzellenmittelpunkte berücksichtigt weder aktuelle Öffnungszeiten noch gesetzte Filter.',exportDescription:'Export mit aktuellen Filtern. Der Öffnungsstatus basiert auf veröffentlichten Zeiten und wurde nicht vor Ort überprüft.',zoomIn:'Vergrößern',zoomOut:'Verkleinern'});
const LOCALES = {uk:'uk-UA',en:'en-GB',de:'de-DE'};
let lang = 'uk';
try { const saved=localStorage.getItem('resilience-language');if(Object.hasOwn(COPY,saved))lang=saved; } catch {}
const t = (key) => COPY[lang][key] || key;
const localizedNumber = (n,locale=lang,maximumFractionDigits=2) => new Intl.NumberFormat(LOCALES[locale],{maximumFractionDigits}).format(n);
const number = (n) => localizedNumber(n,lang,0);
const interpolate = (text,values) => text.replace(/\{(\w+)\}/g,(_,key)=>values[key]??'');
const textNode = (tag, text, className) => { const el = document.createElement(tag); el.textContent = text; if(className) el.className=className; return el; };
let map, markers, polygons, selectedPolygon, heat, boundary, metadata = {}, population = {}, facilities = [], filtered = [], isochrones, isoPromise;
let selectedId = null, limit = 30, userMarker, currentTime = new Date(), tileWarning = false;
const states = new Map(), markerById = new Map();
const colors = {open:'#286342',closed:'#af6749',unknown:'#73838a',inactive:'#b1b7b2'};
const getId = (f) => String(f.properties.id ?? f.id ?? f.properties.objectid);
const isActive = (f) => f.properties.is_operational ?? Number(f.properties.actual) === 1;
const getName = (f) => f.properties.name || f.properties.name_po || t('notAvailable');
const amenities = (f) => f.properties.amenities || Object.fromEntries(Object.keys(COPY.uk.amenities).map(k=>[k, f.properties[k] === 'Так']));
const statusLabel = (state) => t({open:'openNow',closed:'closed',unknown:'unknown',inactive:'inactive'}[state]);

async function getJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
function notice(message) {
  $('notice').replaceChildren();
  $('notice').dataset.messageKey=Object.keys(COPY[lang]).find(key=>COPY[lang][key]===message)||'';
  const close = textNode('button','×'); close.setAttribute('aria-label',t('close'));close.onclick=()=>{$('notice').hidden=true;};
  $('notice').append(close,document.createTextNode(message));$('notice').hidden=false;
}
function setLanguage(next) {
  if(!Object.hasOwn(COPY,next))return;
  lang=next;
  try { localStorage.setItem('resilience-language',lang); } catch {}
  document.documentElement.lang=lang;document.title=t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAria));});
  document.querySelectorAll('[data-placeholder]').forEach(el=>{el.placeholder=t(el.dataset.placeholder);});
  document.querySelectorAll('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));
  $('population-layer').setAttribute('aria-label',t('population'));$('isochrone-layer').setAttribute('aria-label',t('walk'));
  document.querySelectorAll('.close-button').forEach(el=>el.setAttribute('aria-label',t('close')));
  const anyValue=$('attribute-value').querySelector('option[value=""]');if(anyValue)anyValue.textContent=t('anyValue');
  for(const [selector,key]of [['.leaflet-control-zoom-in','zoomIn'],['.leaflet-control-zoom-out','zoomOut']]){const el=document.querySelector(selector);if(el){el.title=t(key);el.setAttribute('aria-label',t(key));}}
  if(!$('notice').hidden&&$('notice').dataset.messageKey)notice(t($('notice').dataset.messageKey));
  if(userMarker)userMarker.setTooltipContent(textNode('span',t('youAreHere')));
  if(facilities.length){fillAmenitySelect();renderResults();if(selectedId)renderDetail();renderAbout();}
  updateClock();
}
function fillAmenitySelect() {
  const previous = $('amenity').value;
  $('amenity').replaceChildren(new Option(t('allAmenities'),''));
  for(const [key,label] of Object.entries(COPY[lang].amenities)) $('amenity').add(new Option(label,key));
  $('amenity').value=previous;
}
function fillFilters() {
  fillAmenitySelect();
  [...new Set(facilities.map(f=>f.properties.district).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'uk')).forEach(d=>$('district').add(new Option(d,d)));
  const keys=[...new Set(facilities.flatMap(f=>Object.entries(f.properties).filter(([,v])=>v!==null && ['string','number','boolean'].includes(typeof v)).map(([k])=>k)))].sort();
  for(const key of keys) $('attribute').add(new Option(key,key));
}
function attributeValues() {
  const key=$('attribute').value;
  $('attribute-value').replaceChildren(new Option(t('anyValue'),''));$('attribute-value').disabled=!key;
  if(key) [...new Set(facilities.map(f=>f.properties[key]).filter(v=>v!==null && v!==undefined).map(String))].sort((a,b)=>a.localeCompare(b,'uk',{numeric:true})).forEach(v=>$('attribute-value').add(new Option(v, v)));
  applyFilters();
}
function updateStates() {
  currentTime=new Date();
  for(const f of facilities) states.set(getId(f),isActive(f)?openingStatus(f.properties.opening_hours || f.properties.working_time,currentTime).state:'inactive');
}
function updateClock() {
  const date = new Date();
  $('clock').textContent=new Intl.DateTimeFormat(LOCALES[lang],{timeZone:'Europe/Kyiv',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
  $('clock').dateTime=date.toISOString();
}
function applyFilters() {
  const query=$('search').value.trim().toLocaleLowerCase('uk');
  const district=$('district').value,status=$('status').value,amenity=$('amenity').value,attribute=$('attribute').value,value=$('attribute-value').value;
  filtered=facilities.filter(f=>{
    const p=f.properties;
    if(!$('include-inactive').checked&&!isActive(f))return false;
    if(query && ![getName(f),p.address,p.district,p.category].filter(Boolean).join(' ').toLocaleLowerCase('uk').includes(query))return false;
    if(district&&p.district!==district)return false;
    if(status&&states.get(getId(f))!==status)return false;
    if(amenity&&!amenities(f)[amenity])return false;
    if(attribute&&(p[attribute]===null||p[attribute]===undefined||value!==''&&String(p[attribute])!==value))return false;
    return true;
  });
  limit=30;
  if(selectedId&&!filtered.some(f=>getId(f)===selectedId))closeDetail();
  $('inactive-legend').hidden=!$('include-inactive').checked;
  renderMarkers();renderResults();renderPolygons();
}
function renderMarkers() {
  if(!markers)return;
  markers.clearLayers();markerById.clear();
  for(const f of filtered){
    const id=getId(f),state=states.get(id),[lon,lat]=f.geometry.coordinates;
    const marker=L.circleMarker([lat,lon],{pane:'facilities',radius:id===selectedId?8:5.5,color:'#fff',weight:id===selectedId?2.5:1.5,fillColor:colors[state],fillOpacity:state==='inactive'?.5:.95});
    marker.bindTooltip(textNode('span',getName(f)),{direction:'top',offset:[0,-6]});
    marker.on('click',()=>selectFacility(id));marker.addTo(markers);markerById.set(id,marker);
  }
}
function renderResults() {
  $('result-count').textContent=`${number(filtered.length)} ${t('facilities')}`;
  $('facility-list').replaceChildren();
  if(!filtered.length){$('facility-list').append(textNode('p',t('empty'),'empty-state'));}
  for(const f of filtered.slice(0,limit)){
    const id=getId(f),state=states.get(id),button=textNode('button','','facility-row'+(id===selectedId?' selected':''));
    button.type='button';button.dataset.id=id;
    button.append(textNode('strong',getName(f)),textNode('span',f.properties.address||f.properties.district||'','address'));
    const meta=textNode('span','','row-meta');meta.append(textNode('i','',`dot ${state}`),textNode('span',statusLabel(state)));button.append(meta);
    const tags=Object.entries(amenities(f)).filter(([,yes])=>yes).map(([key])=>COPY[lang].amenities[key]||key);
    if(tags.length)button.append(textNode('span',tags.join(' · '),'amenity-tags'));
    button.onclick=()=>selectFacility(id);$('facility-list').append(button);
  }
  $('show-more').hidden=limit>=filtered.length;
}
async function loadIsochrones() {
  if(isochrones)return isochrones;
  if(!isoPromise) isoPromise=getJSON('data/isochrones.geojson').then(data=>{isochrones=data;return data;}).catch(error=>{isoPromise=null;throw error;});
  return isoPromise;
}
function matchingIsochrones() {
  const ids=new Set(filtered.map(getId));
  return (isochrones?.features||[]).filter(f=>ids.has(String(f.properties.facility_id)));
}
function renderPolygons() {
  if(!polygons)return;
  polygons.clearLayers();$('walk-legend').hidden=!$('isochrone-layer').checked&&!selectedId;
  if($('isochrone-layer').checked&&isochrones)polygons.addData({type:'FeatureCollection',features:matchingIsochrones()});
}
async function selectFacility(id) {
  selectedId=id;renderDetail();renderMarkers();renderResults();
  const f=facilities.find(f=>getId(f)===id);if(!f)return;
  document.querySelector('.sidebar').classList.remove('visible');
  const [lon,lat]=f.geometry.coordinates;map.setView([lat,lon],Math.max(map.getZoom(),15));
  await showSelectedCatchment(false);
}
async function showSelectedCatchment(fit=true) {
  const id=selectedId;if(!id)return;
  try {
    await loadIsochrones();if(selectedId!==id)return;
    selectedPolygon.clearLayers();
    const feature=isochrones.features.find(f=>String(f.properties.facility_id)===id);
    if(feature&&feature.geometry){selectedPolygon.addData(feature);$('walk-legend').hidden=false;if(fit)map.fitBounds(selectedPolygon.getBounds().pad(.12));}
    else if(fit)notice(t('noCatchment'));
  }catch{if(fit)notice(t('catchmentsFailed'));}
}
function renderDetail() {
  const f=facilities.find(f=>getId(f)===selectedId);if(!f)return;
  const p=f.properties,state=states.get(selectedId),root=$('detail-content');root.replaceChildren();
  root.append(textNode('div',p.category||p.type_po||p.destination||'','eyebrow'),textNode('h2',getName(f)),textNode('p',[p.address,p.district].filter(Boolean).join(' · '),'detail-address'));
  const badge=textNode('span','','status-badge');badge.append(textNode('i','',`dot ${state}`),textNode('span',statusLabel(state)));root.append(badge);
  root.append(textNode('div',`${t('status')}: ${(p.working_time||p.opening_hours||t('notAvailable')).replace(/<br\s*\/?>/gi,' · ')}`,'schedule'));
  const services=textNode('div','','detail-amenities');
  for(const [key,label] of Object.entries(COPY[lang].amenities)){
    const available=amenities(f)[key],el=textNode('span','',available?'':'unavailable');el.append(textNode(available?'b':'span',available?'✓':'—'),textNode('span',label));
    el.title=`${label}: ${available?t('yes'):t('no')}`;services.append(el);
  }
  root.append(services);
  if(p.routing_warning)root.append(textNode('p',t('routingWarning'),'routing-warning'));
  if(p.population_in_corridor!==null&&p.population_in_corridor!==undefined)root.append(textNode('p',`${t('corridorPopulation')}: ${number(p.population_in_corridor)} ${t('people')}`,'detail-meta'));
  if(p.count_people!==null&&p.count_people!==undefined)root.append(textNode('p',`${t('capacity')}: ${number(p.count_people)} ${t('people')}`,'detail-meta'));
  root.append(textNode('p',t('snapshot'),'detail-meta'));
  const catchment=textNode('button',t('showCatchment'),'secondary-button');catchment.onclick=()=>showSelectedCatchment();root.append(catchment);
  const details=document.createElement('details');details.append(textNode('summary',t('allAttributes')));const dl=document.createElement('dl');
  for(const [key,value] of Object.entries(p)){if(value===null||typeof value==='object')continue;dl.append(textNode('dt',key),textNode('dd',String(value)));}
  details.append(dl);root.append(details);$('detail').hidden=false;
}
function closeDetail(){selectedId=null;$('detail').hidden=true;if(selectedPolygon)selectedPolygon.clearLayers();renderMarkers();renderResults();$('walk-legend').hidden=!$('isochrone-layer').checked;}

function renderAbout() {
  const root=$('about-content');root.replaceChildren();
  const stats=textNode('div','','method-stats');
  for(const [n,label] of [[facilities.length,t('registeredFacilities')],[facilities.filter(isActive).length,t('activeRecords')]]){const cell=document.createElement('div');cell.append(textNode('strong',number(n)),textNode('span',label));stats.append(cell);}root.append(stats);
  if(metadata.coverage){const c=metadata.coverage;root.append(textNode('p',interpolate(t('coverageSummary'),{inside:number(c.population_in_operational_corridors),percent:localizedNumber(c.percent_in_operational_corridors),outside:number(c.population_outside_operational_corridors)})));}
  const unknownHours=number(metadata.counts?.unknown_hours??9),speed=localizedNumber(metadata.routing?.speed_kmh??3);
  const paragraphs={uk:[
    ['Пункти та послуги','Наданий файл query_poi.json містить місця обігріву та підтримки, характеристики обладнання, адреси й години. actual = 1 означає активний запис реєстру. Дата завантаження файлу не є датою перевірки роботи пункту.'],
    ['Години роботи',`Стан перераховується щохвилини за часовим поясом Europe/Kyiv. ${unknownHours} записів не містять точного графіка. «Відкрито» означає відповідність опублікованим годинам; доступність обладнання й запасів у реальному часі не перевіряється.`],
    [t('aboutWalkTitle'),t('catchmentEstimate')+` Швидкість ${speed} км/год є параметром моделі, а не виміряною швидкістю кожної дитини. Мережа не враховує поточні перешкоди, час очікування на переходах і безпеку маршруту.`],
    ['Населення','Наданий растр ukr_pop_2025_CN_100m_R2025A_v1.tif: модель WorldPop 2025, кількість людей у комірці. Збережено рідну сітку 3 кутові секунди (~100 м номінально). Теплова карта показує відносну інтенсивність, а не точний попит, черги або поточне місце перебування людей. Перехід на 20 м не додає точності вихідним даним.'],
    ['Межі цього випуску','Електричні відключення, фактична заповненість та оцінки черг не підключені: відповідні дані не були надані. Показані полігони не гарантують доступний або безпечний маршрут.'],
    ['Походження й оновлення','Пункти, дороги та растр надані автором проєкту. Точне первинне посилання та ліцензію міського реєстру потрібно додати до метаданих. Джерела та параметри обробки записано у завантажуваному metadata.json.']
  ],en:[
    ['Facilities and services','The supplied query_poi.json contains warming and support facilities, equipment, addresses and hours. actual = 1 denotes an active register record. A file download date is not a verification of current operations.'],
    ['Opening hours',`Status updates every minute in Europe/Kyiv time. ${unknownHours} records have no precise schedule. “Open” means within published opening hours; equipment and supplies are not verified in real time.`],
    [t('aboutWalkTitle'),t('catchmentEstimate')+` The ${speed} km/h speed is a modeling assumption, not a measured speed for every child. The network does not model current obstructions, crossing delays or route safety.`],
    ['Population','The supplied ukr_pop_2025_CN_100m_R2025A_v1.tif is the WorldPop 2025 modeled count per grid cell. Its native 3 arc-second grid (~100 m nominal) is retained. The heatmap displays relative intensity, not exact demand, queues or current whereabouts. Resampling to 20 m would not add information.'],
    ['Scope of this release','Electricity outages, live occupancy and queue estimates are not connected because those datasets were not supplied. Catchment polygons do not guarantee an accessible or safe route.'],
    ['Provenance and updates','The project author supplied facilities, roads and population. The original source URL and license of the municipal facility register still need to be added to the metadata. Download metadata.json for processing assumptions and provenance.']
  ],de:[
    ['Einrichtungen und Angebote','Die bereitgestellte Datei query_poi.json enthält Einrichtungen zum Aufwärmen und zur Unterstützung, ihre Ausstattung, Adressen und Öffnungszeiten. actual = 1 kennzeichnet einen aktiven Registereintrag. Das Herunterladen einer Datei bestätigt nicht den aktuellen Betrieb einer Einrichtung.'],
    ['Öffnungszeiten',`Der Status wird jede Minute in der Zeitzone Europe/Kyiv aktualisiert. ${unknownHours} Einträge enthalten keine genauen Öffnungszeiten. „Geöffnet“ bedeutet, dass die veröffentlichte Öffnungszeit gilt; Ausstattung und Vorräte werden nicht in Echtzeit überprüft.`],
    [t('aboutWalkTitle'),t('catchmentEstimate')+` Die Geschwindigkeit von ${speed} km/h ist eine Modellannahme und kein für jedes Kind gemessener Wert. Das Wegenetz berücksichtigt keine aktuellen Hindernisse, Wartezeiten an Übergängen oder die Sicherheit einer Route.`],
    ['Bevölkerung','Der bereitgestellte Rasterdatensatz ukr_pop_2025_CN_100m_R2025A_v1.tif enthält die von WorldPop für 2025 modellierte Personenzahl je Rasterzelle. Das ursprüngliche Raster mit 3 Bogensekunden Auflösung (nominell etwa 100 m) bleibt erhalten. Die Heatmap zeigt relative Intensität, keinen genauen Bedarf, keine Warteschlangen und keine aktuellen Aufenthaltsorte. Eine Umrechnung auf 20 m würde keine zusätzlichen Informationen liefern.'],
    ['Umfang dieser Veröffentlichung','Stromausfälle, aktuelle Belegung und geschätzte Warteschlangen sind nicht eingebunden, da diese Datensätze nicht bereitgestellt wurden. Die Einzugsgebietspolygone garantieren keine zugängliche oder sichere Route.'],
    ['Datenherkunft und Aktualisierung','Einrichtungen, Straßen und Bevölkerungsdaten wurden vom Projektverantwortlichen bereitgestellt. Die ursprüngliche Quellenadresse und die Lizenz des städtischen Einrichtungsregisters müssen noch in den Metadaten ergänzt werden. Annahmen zur Verarbeitung und Angaben zur Datenherkunft stehen in der herunterladbaren Datei metadata.json.']
  ]}[lang];
  for(const [heading,body]of paragraphs){root.append(textNode('h3',heading),textNode('p',body));}
  const p=document.createElement('p');p.append(document.createTextNode('© OpenStreetMap contributors · WorldPop (CC BY 4.0). '));const link=textNode('a',t('sourceMethodology'));link.href='https://github.com/oleksaboiko/open-data-and-resilience';link.target='_blank';link.rel='noopener';p.append(link);root.append(p);
}
function downloadJSON(data,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/geo+json'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function featureCollection(features){return {type:'FeatureCollection',generated_at:new Date().toISOString(),description:t('exportDescription'),attribution:metadata.attribution,sources:metadata.sources,features};}
async function init() {
  setLanguage(lang);
  if(location.protocol==='file:')throw new Error(t('fileError'));
  if(!window.L)throw new Error(t('mapFailed'));
  map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([50.45,30.52],11);
  L.control.zoom({position:'topright',zoomInTitle:t('zoomIn'),zoomOutTitle:t('zoomOut')}).addTo(map);L.control.scale({position:'bottomright',imperial:false}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  tiles.on('tileerror',()=>{if(!tileWarning){tileWarning=true;notice(t('tileError'));}});
  map.createPane('facilities');map.getPane('facilities').style.zIndex=450;
  markers=L.layerGroup().addTo(map);
  map.createPane('catchments');map.getPane('catchments').style.zIndex=350;
  polygons=L.geoJSON(null,{pane:'catchments',interactive:false,style:{color:'#72934c',weight:.7,opacity:.6,fillColor:'#b2d28c',fillOpacity:.2}}).addTo(map);
  selectedPolygon=L.geoJSON(null,{pane:'catchments',interactive:false,style:{color:'#476733',weight:2,fillColor:'#a8cb77',fillOpacity:.35}}).addTo(map);
  const results=await Promise.allSettled([getJSON('data/facilities.geojson'),getJSON('data/boundary.geojson'),getJSON('data/metadata.json'),getJSON('data/population.json')]);
  if(results[0].status!=='fulfilled')throw new Error(t('loadFailed'));
  facilities=results[0].value.features.filter(f=>f.geometry?.type==='Point'&&f.geometry.coordinates.length>=2&&f.geometry.coordinates.every(Number.isFinite));
  facilities.sort((a,b)=>getName(a).localeCompare(getName(b),'uk'));
  if(results[1].status==='fulfilled'){
    boundary=L.geoJSON(results[1].value,{interactive:false,style:{color:'#7b9580',weight:1.5,dashArray:'5 6',fill:false}}).addTo(map);
    if(boundary.getBounds().isValid())map.fitBounds(boundary.getBounds(),{padding:[35,35]});
  }else {const bounds=L.latLngBounds(facilities.map(f=>[f.geometry.coordinates[1],f.geometry.coordinates[0]]));if(bounds.isValid())map.fitBounds(bounds,{padding:[35,35]});}
  if(results[2].status==='fulfilled'){metadata=results[2].value;applyModelLabels();}
  if(results[3].status==='fulfilled'){
    population=results[3].value;
    const points=population.points||[],values=points.map(p=>p[2]).sort((a,b)=>a-b),cap=values[Math.floor(values.length*.98)]||1;
    heat=L.heatLayer(points.map(([lat,lon,value])=>[lat,lon,Math.min(value/cap,1)]),{radius:14,blur:16,maxZoom:13,minOpacity:.08,gradient:{.15:'#dbeafe',.35:'#93c5fd',.55:'#60a5fa',.75:'#2563eb',1:'#1e3a8a'}}).addTo(map);
  }else{$('population-layer').checked=false;$('population-layer').disabled=true;$('heat-legend').hidden=true;notice(t('loadFailed'));}
  fillFilters();updateStates();applyFilters();renderAbout();$('loading').hidden=true;
  setInterval(()=>{updateClock();updateStates();applyFilters();if(selectedId)renderDetail();},60000);
}

for(const id of ['district','status','amenity','attribute-value','include-inactive'])$(id).addEventListener('change',applyFilters);
let searchTimer;$('search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(applyFilters,140);});
$('attribute').addEventListener('change',attributeValues);
$('reset').onclick=()=>{for(const id of ['search','district','status','amenity','attribute'])$(id).value='';$('include-inactive').checked=false;attributeValues();};
$('show-more').onclick=()=>{limit+=30;renderResults();};
$('close-detail').onclick=closeDetail;
$('population-layer').onchange=()=>{if(heat){if($('population-layer').checked)heat.addTo(map);else heat.remove();}$('heat-legend').hidden=!$('population-layer').checked;};
$('isochrone-layer').onchange=async()=>{if($('isochrone-layer').checked){try{notice(t('catchmentsLoading'));await loadIsochrones();$('notice').hidden=true;}catch{$('isochrone-layer').checked=false;notice(t('catchmentsFailed'));}}renderPolygons();};
$('fit-map').onclick=()=>{if(boundary?.getBounds().isValid())map.fitBounds(boundary.getBounds(),{padding:[35,35]});else if(map)map.setView([50.45,30.52],11);};
$('locate').onclick=()=>{if(!map)return;map.locate({setView:false,enableHighAccuracy:true,timeout:10000});};
$('mobile-filters').onclick=()=>document.querySelector('.sidebar').classList.toggle('visible');
document.querySelectorAll('[data-lang]').forEach(el=>{el.onclick=()=>setLanguage(el.dataset.lang);});
for(const type of ['about','download']) $(`${type}-button`).onclick=()=>$(type+'-dialog').showModal();
document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>el.closest('dialog').close());
document.querySelectorAll('dialog').forEach(el=>el.addEventListener('click',e=>{if(e.target===el){const r=el.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)el.close();}}));
$('export-facilities').onclick=()=>downloadJSON(featureCollection(filtered.map(f=>({...f,properties:{...f.properties,schedule_state:states.get(getId(f)),schedule_evaluated_at:currentTime.toISOString()}}))),'resilience-facilities.geojson');
$('export-isochrones').onclick=async()=>{const button=$('export-isochrones');button.disabled=true;try{await loadIsochrones();downloadJSON(featureCollection(matchingIsochrones()),'resilience-15min-isochrones.geojson');}catch{notice(t('catchmentsFailed'));}finally{button.disabled=false;}};
init().then(()=>{
  map.on('locationfound',e=>{if(userMarker)userMarker.remove();userMarker=L.circleMarker(e.latlng,{radius:8,color:'white',weight:3,fillColor:'#2979c9',fillOpacity:1}).bindTooltip(textNode('span',t('youAreHere'))).addTo(map);if(boundary&&!boundary.getBounds().contains(e.latlng)){notice(t('outside'));return;}map.setView(e.latlng,15);});
  map.on('locationerror',()=>notice(t('locationFailed')));
}).catch(error=>{const message=textNode('span',error.message),key=Object.keys(COPY[lang]).find(key=>COPY[lang][key]===error.message);if(key)message.dataset.i18n=key;$('loading').replaceChildren(message);$('loading').setAttribute('role','alert');console.error(error);});

$('close-sidebar').onclick=()=>{document.querySelector('.sidebar').classList.remove('visible');$('mobile-filters').focus();};

function applyModelLabels(){
  const r=metadata.routing;if(!r)return;
  for(const locale of Object.keys(COPY)){
    const minutes=localizedNumber(r.minutes,locale),speed=localizedNumber(r.speed_kmh,locale),corridor=localizedNumber(r.corridor_buffer_m,locale),distance=localizedNumber(r.distance_budget_m,locale);
    const labels={
      uk:{walk:`${minutes} хвилин пішки`,walkDetail:`Дитячий темп · ${speed} км/год`,showCatchment:`Показати ${minutes}-хвилинну зону`,walkLegend:`Досяжні вулиці + коридор ${corridor} м`,aboutWalkTitle:`${minutes} хвилин дитячим кроком`,catchmentEstimate:`Модель доступності: ${distance} м мережею з урахуванням відстані від пункту до вулиці. Показано коридори вулиць, а не повні міські квартали.`},
      en:{walk:`${minutes}-minute walk`,walkDetail:`Child walking pace · ${speed} km/h`,showCatchment:`Show ${minutes}-minute catchment`,walkLegend:`Reachable streets + ${corridor} m corridor`,aboutWalkTitle:`A ${minutes}-minute child-paced walk`,catchmentEstimate:`Accessibility model: ${distance} m along the network, including access from the facility to the street. Polygons represent street corridors, not complete city blocks.`},
      de:{walk:`${minutes} Minuten zu Fuß`,walkDetail:`Gehtempo eines Kindes · ${speed} km/h`,showCatchment:`${minutes}-Minuten-Einzugsgebiet anzeigen`,walkLegend:`Erreichbare Straßen + ${corridor}-m-Korridor`,aboutWalkTitle:`${minutes} Minuten im Gehtempo eines Kindes`,catchmentEstimate:`Erreichbarkeitsmodell: ${distance} m entlang des Wegenetzes, einschließlich des Zugangs von der Einrichtung zur Straße. Die Polygone zeigen Straßenkorridore, keine vollständigen Häuserblöcke.`}
    };
    Object.assign(COPY[locale],labels[locale]);
  }
  setLanguage(lang);
}
