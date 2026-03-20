export const MONTHS = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
export const MONTHS_FULL = ['Januar','Februar','Marts','April','Maj','Juni','Juli','August','September','Oktober','November','December'];
export const YEAR = 2026;
export const COMPANY = "Visual Strategies v/Charlotte Rosenberg";

export interface PLRow {
  t: 'sec' | 'acct' | 'total' | 'res' | 'final' | 'sp';
  lbl?: string;
  nr?: number;
  grp?: string;
  id?: string;
  sum?: string;
}

export const PL: PLRow[] = [
  { t:'sec', lbl:'Omsætning' },
  { t:'acct', nr:1010, lbl:'Salg af varer/ydelser m/moms', grp:'oms' },
  { t:'acct', nr:1015, lbl:'Salg til kunder u/moms', grp:'oms' },
  { t:'acct', nr:1020, lbl:'Salg af varer til Norge', grp:'oms' },
  { t:'acct', nr:1021, lbl:'Salg af ydelser til Sverige + EU', grp:'oms' },
  { t:'acct', nr:1050, lbl:'Coaching', grp:'oms' },
  { t:'acct', nr:1055, lbl:'Salg af varer indenfor EU', grp:'oms' },
  { t:'acct', nr:1060, lbl:'Salg udenfor EU', grp:'oms' },
  { t:'acct', nr:1065, lbl:'Salg indland uden moms', grp:'oms' },
  { t:'total', lbl:'Omsætning i alt', id:'oms', sum:'grp:oms' },
  { t:'sp' },
  { t:'sec', lbl:'Direkte omkostninger' },
  { t:'acct', nr:1305, lbl:'Finders fee', grp:'dir' },
  { t:'acct', nr:1310, lbl:'Direkte omkostninger m/moms', grp:'dir' },
  { t:'acct', nr:1315, lbl:'Salgsgebyr u.moms / EasyMe', grp:'dir' },
  { t:'acct', nr:1318, lbl:'Underleverandør u. moms', grp:'dir' },
  { t:'total', lbl:'Direkte omk. i alt', id:'dir', sum:'grp:dir' },
  { t:'res', lbl:'Dækningsbidrag', id:'db', sum:'id:oms+id:dir' },
  { t:'sp' },
  { t:'sec', lbl:'Lønninger' },
  { t:'acct', nr:2210, lbl:'Lønninger', grp:'loen' },
  { t:'acct', nr:2211, lbl:'Feriepenge & SH', grp:'loen' },
  { t:'acct', nr:2213, lbl:'B-honorar', grp:'loen' },
  { t:'acct', nr:2224, lbl:'DA-barsel', grp:'loen' },
  { t:'acct', nr:2230, lbl:'KM-penge', grp:'loen' },
  { t:'acct', nr:2241, lbl:'Personaleudgifter', grp:'loen' },
  { t:'total', lbl:'Lønninger i alt', id:'loen', sum:'grp:loen' },
  { t:'sp' },
  { t:'sec', lbl:'Salgs- og rejseomkostninger' },
  { t:'acct', nr:2750, lbl:'Restaurationsbesøg', grp:'salg' },
  { t:'acct', nr:2754, lbl:'Gaver og blomster', grp:'salg' },
  { t:'acct', nr:2760, lbl:'Møde, samarbejdspartner', grp:'salg' },
  { t:'acct', nr:2765, lbl:'Møde / Workshop', grp:'salg' },
  { t:'acct', nr:2770, lbl:'Rejseudgifter', grp:'salg' },
  { t:'acct', nr:2800, lbl:'Annoncer / Hjemmeside', grp:'salg' },
  { t:'total', lbl:'Salgs- og rejseomk. i alt', id:'salg', sum:'grp:salg' },
  { t:'sp' },
  { t:'sec', lbl:'Autodrift - personbiler' },
  { t:'acct', nr:3110, lbl:'Brændstof', grp:'auto' },
  { t:'acct', nr:3120, lbl:'Bilforsikring', grp:'auto' },
  { t:'acct', nr:3150, lbl:'Parkering', grp:'auto' },
  { t:'total', lbl:'Autodrift i alt', id:'auto', sum:'grp:auto' },
  { t:'sp' },
  { t:'sec', lbl:'Lokaleomkostninger' },
  { t:'acct', nr:3410, lbl:'Husleje m/moms', grp:'lok' },
  { t:'acct', nr:3411, lbl:'Husleje u/moms', grp:'lok' },
  { t:'acct', nr:3412, lbl:'Leje af mødelokaler', grp:'lok' },
  { t:'total', lbl:'Lokaleomk. i alt', id:'lok', sum:'grp:lok' },
  { t:'sp' },
  { t:'sec', lbl:'Administrationsomkostninger' },
  { t:'acct', nr:3600, lbl:'Kontorartikler og tryksager', grp:'adm' },
  { t:'acct', nr:3601, lbl:'Kursus / Thomas Compton', grp:'adm' },
  { t:'acct', nr:3604, lbl:'Edb-udgifter / software', grp:'adm' },
  { t:'acct', nr:3605, lbl:'EDB omk. fra EU', grp:'adm' },
  { t:'acct', nr:3620, lbl:'Telefon', grp:'adm' },
  { t:'acct', nr:3621, lbl:'Internetforbindelse', grp:'adm' },
  { t:'acct', nr:3628, lbl:'Bank gebyr og porto', grp:'adm' },
  { t:'acct', nr:3640, lbl:'Revisor / Regnskabsass.', grp:'adm' },
  { t:'acct', nr:3645, lbl:'Advokat', grp:'adm' },
  { t:'acct', nr:3650, lbl:'Forsikringer', grp:'adm' },
  { t:'acct', nr:3660, lbl:'Faglitteratur m/moms', grp:'adm' },
  { t:'acct', nr:3662, lbl:'Kontingenter m/moms', grp:'adm' },
  { t:'acct', nr:3664, lbl:'Web-hotel og domænenavne', grp:'adm' },
  { t:'total', lbl:'Adm.omk. i alt', id:'adm', sum:'grp:adm' },
  { t:'res', lbl:'Resultat før afskrivninger', id:'raf', sum:'id:db+id:loen+id:salg+id:auto+id:lok+id:adm' },
  { t:'sp' },
  { t:'sec', lbl:'Afskrivninger' },
  { t:'acct', nr:3910, lbl:'Afskrivning, indretning lejede lok.', grp:'afs' },
  { t:'acct', nr:3940, lbl:'Afskrivning, driftsmidler og inv.', grp:'afs' },
  { t:'acct', nr:3950, lbl:'Afskrivning, edb', grp:'afs' },
  { t:'total', lbl:'Afskrivninger i alt', id:'afs', sum:'grp:afs' },
  { t:'res', lbl:'Resultat før renter', id:'rfr', sum:'id:raf+id:afs' },
  { t:'sp' },
  { t:'sec', lbl:'Finansielle poster' },
  { t:'acct', nr:4310, lbl:'Renteindtægt, bank', grp:'rind' },
  { t:'acct', nr:4360, lbl:'Renteindtægt, debitorer', grp:'rind' },
  { t:'total', lbl:'Renteindtægter i alt', id:'rind', sum:'grp:rind' },
  { t:'acct', nr:4450, lbl:'Låneomkostninger', grp:'rudg' },
  { t:'acct', nr:4460, lbl:'Renteudgift, kreditorer', grp:'rudg' },
  { t:'acct', nr:4465, lbl:'Renteudgift, Told & Skat', grp:'rudg' },
  { t:'total', lbl:'Renteudgifter i alt', id:'rudg', sum:'grp:rudg' },
  { t:'res', lbl:'Resultat før ekstraord. poster', id:'rfep', sum:'id:rfr+id:rind+id:rudg' },
  { t:'sp' },
  { t:'sec', lbl:'Ekstraordinære poster' },
  { t:'acct', nr:4610, lbl:'Ekstraord. indtægter m/moms', grp:'ekstra' },
  { t:'acct', nr:4640, lbl:'Ekstraord. udgifter u/moms', grp:'ekstra' },
  { t:'total', lbl:'Ekstraord. poster i alt', id:'ekstra', sum:'grp:ekstra' },
  { t:'final', lbl:'PERIODENS RESULTAT', id:'res', sum:'id:rfep+id:ekstra' },
];

export interface Transaction {
  id: number;
  dato: string;
  type: string;
  bilag: string | number;
  tekst: string;
  belob: number;
  konto: number;
  moms: string | null;
  modkonto?: number;
  faktura?: string;
}

export const INIT_TXN: Transaction[] = [
  { id:1, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-1', tekst:'Parkering EasyPark - Januar', belob:690.36, konto:3150, moms:null },
  { id:2, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-2', tekst:'Kursus / Thomas Compton - Januar', belob:666.52, konto:3601, moms:null },
  { id:3, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-3', tekst:'Edb-udgifter/software - Januar', belob:950.37, konto:3604, moms:'I25' },
  { id:4, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-4', tekst:'Telefon - Januar', belob:179.00, konto:3620, moms:'I25' },
  { id:5, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-5', tekst:'Internet - Januar', belob:309.00, konto:3621, moms:'I25' },
  { id:6, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-6', tekst:'Bank gebyr - Januar', belob:2.50, konto:3628, moms:null },
  { id:7, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-7', tekst:'Revisor - Januar', belob:2112.10, konto:3640, moms:'I25' },
  { id:8, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-8', tekst:'Forsikringer - Januar', belob:138.00, konto:3650, moms:null },
  { id:9, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-9', tekst:'Kontingenter - Januar', belob:1722.50, konto:3662, moms:'I25' },
  { id:10, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-10', tekst:'Låneomkostninger - Januar', belob:350.00, konto:4450, moms:null },
  { id:11, dato:'2026-01-31', type:'Finansbilag', bilag:'jan-11', tekst:'Leje af mødelokaler - Januar', belob:118.75, konto:3410, moms:'I25' },
  { id:12, dato:'2026-02-06', type:'Finansbilag', bilag:'5076', tekst:'Bgs SN-9780 Soho (mødelokale)', belob:118.75, konto:3410, moms:'I25' },
  { id:13, dato:'2026-02-06', type:'Finansbilag', bilag:'5079', tekst:'EasyPark parkering', belob:87.71, konto:3150, moms:null },
  { id:14, dato:'2026-02-06', type:'Finansbilag', bilag:'5080', tekst:'Dandomain internet', belob:47.50, konto:3621, moms:'I25' },
  { id:15, dato:'2026-02-06', type:'Finansbilag', bilag:'5077', tekst:'DREIST STORGAARD advokat', belob:4500.00, konto:3645, moms:'I25' },
  { id:16, dato:'2026-02-04', type:'Finansbilag', bilag:'5075', tekst:'Mofibo software', belob:89.00, konto:3604, moms:'I25' },
  { id:17, dato:'2026-02-04', type:'Finansbilag', bilag:'5074', tekst:'Adobe software', belob:220.00, konto:3604, moms:'I25' },
  { id:18, dato:'2026-02-03', type:'Finansbilag', bilag:'5073', tekst:'EasyMe salgsplatform', belob:166.25, konto:3604, moms:'I25' },
  { id:19, dato:'2026-02-09', type:'Finansbilag', bilag:'5082', tekst:'Voice2Text software', belob:298.00, konto:3604, moms:'I25' },
  { id:20, dato:'2026-02-17', type:'Finansbilag', bilag:'5089', tekst:'Dropbox software', belob:93.33, konto:3604, moms:'I25' },
  { id:21, dato:'2026-02-16', type:'Finansbilag', bilag:'5085', tekst:'Frankly forsikring (software)', belob:69.00, konto:3604, moms:'I25' },
  { id:22, dato:'2026-02-19', type:'Finansbilag', bilag:'5091', tekst:'Canva software', belob:788.33, konto:3604, moms:'I25' },
  { id:23, dato:'2026-02-17', type:'Finansbilag', bilag:'5088', tekst:'Thomas Compton kursus', belob:656.73, konto:3601, moms:null },
  { id:24, dato:'2026-02-17', type:'Finansbilag', bilag:'5087', tekst:'Låneomkostninger februar', belob:350.00, konto:4450, moms:null },
  { id:25, dato:'2026-02-10', type:'Finansbilag', bilag:'5083', tekst:'EasyPark parkering', belob:49.83, konto:3150, moms:null },
  { id:26, dato:'2026-02-23', type:'Finansbilag', bilag:'5093', tekst:'EasyPark parkering', belob:35.33, konto:3150, moms:null },
  { id:27, dato:'2026-02-24', type:'Finansbilag', bilag:'5097', tekst:'EasyPark parkering', belob:83.84, konto:3150, moms:null },
  { id:28, dato:'2026-02-25', type:'Finansbilag', bilag:'5098', tekst:'EasyPark parkering', belob:18.73, konto:3150, moms:null },
  { id:29, dato:'2026-02-24', type:'Finansbilag', bilag:'5096', tekst:'Møde ZETTLE samarbejdspartner', belob:301.00, konto:2760, moms:null },
  { id:30, dato:'2026-02-24', type:'Finansbilag', bilag:'5095', tekst:'Dankort Bog & Idé kontorartikler', belob:140.00, konto:3600, moms:'I25' },
  { id:31, dato:'2026-02-23', type:'Finansbilag', bilag:'5092', tekst:'SVEA kontorartikler/tryksager', belob:1989.00, konto:3600, moms:'I25' },
  { id:32, dato:'2026-02-17', type:'Finansbilag', bilag:'5086', tekst:'EDB/Software diverse februar', belob:1306.00, konto:3604, moms:'I25' },
  { id:33, dato:'2026-02-28', type:'Finansbilag', bilag:'feb-33', tekst:'Telefon februar', belob:181.08, konto:3620, moms:'I25' },
  { id:34, dato:'2026-02-28', type:'Finansbilag', bilag:'feb-34', tekst:'Internet diverse februar', belob:309.00, konto:3621, moms:'I25' },
  { id:35, dato:'2026-02-28', type:'Finansbilag', bilag:'feb-35', tekst:'Kontingenter februar', belob:513.00, konto:3662, moms:'I25' },
];

export const INIT_BUDGET: Record<number, number[]> = {
  1010: [50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000],
  1310: [-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000],
  2210: [-25000,-25000,-25000,-25000,-25000,-25000,-25000,-25000,-25000,-25000,-25000,-25000],
  2760: [-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500],
  3150: [-750,-750,-750,-750,-750,-750,-750,-750,-750,-750,-750,-750],
  3410: [-95,-95,-95,-95,-95,-95,-95,-95,-95,-95,-95,-95],
  3600: [-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500],
  3601: [-700,-700,-700,-700,-700,-700,-700,-700,-700,-700,-700,-700],
  3604: [-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000,-3000],
  3620: [-200,-200,-200,-200,-200,-200,-200,-200,-200,-200,-200,-200],
  3621: [-300,-300,-300,-300,-300,-300,-300,-300,-300,-300,-300,-300],
  3640: [-300,-300,-300,-300,-300,-300,-300,-300,-300,-300,-300,-300],
  3645: [-4000,-4000,-4000,-4000,-2000,-2000,-2000,-2000,-2000,-2000,-2000,-2000],
  3650: [-138,-138,-138,-138,-138,-138,-138,-138,-138,-138,-138,-138],
  3662: [-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500],
  4450: [-350,-350,-350,-350,-350,-350,-350,-350,-350,-350,-350,-350],
};

export interface BskatRate {
  id: number;
  belob: number;
  forfald: string;
  betalt: number;
  betaltDato: string;
}

export const INIT_BSKAT: BskatRate[] = [
  { id: 1, belob: 0, forfald: `20-01-${YEAR}`, betalt: 0, betaltDato: '' },
  { id: 2, belob: 0, forfald: `20-03-${YEAR}`, betalt: 0, betaltDato: '' },
  { id: 3, belob: 0, forfald: `20-05-${YEAR}`, betalt: 0, betaltDato: '' },
  { id: 4, belob: 0, forfald: `20-07-${YEAR}`, betalt: 0, betaltDato: '' },
  { id: 5, belob: 0, forfald: `20-09-${YEAR}`, betalt: 0, betaltDato: '' },
  { id: 6, belob: 0, forfald: `20-11-${YEAR}`, betalt: 0, betaltDato: '' },
  { id: 7, belob: 0, forfald: `20-01-${YEAR + 1}`, betalt: 0, betaltDato: '' },
  { id: 8, belob: 0, forfald: `20-03-${YEAR + 1}`, betalt: 0, betaltDato: '' },
  { id: 9, belob: 0, forfald: `20-05-${YEAR + 1}`, betalt: 0, betaltDato: '' },
  { id: 10, belob: 0, forfald: `20-07-${YEAR + 1}`, betalt: 0, betaltDato: '' },
];

export const INIT_BSKAT_SELSKAB: BskatRate[] = [
  { id: 1, belob: 0, forfald: `20-03-${YEAR}`, betalt: 0, betaltDato: '' },
  { id: 2, belob: 0, forfald: `20-11-${YEAR}`, betalt: 0, betaltDato: '' },
];
