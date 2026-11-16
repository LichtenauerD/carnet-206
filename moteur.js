/* Moteur de calcul du carnet : kilométrage estimé, échéances, rappels, statistiques.
 * Partagé entre l'appli (navigateur) et la tâche quotidienne des rappels (Node, GitHub Actions).
 */
(function (racine) {
  const PLANS = (typeof module !== 'undefined' && module.exports) ? require('./plans.js') : racine.PLANS;
  const JOUR = 86400000;

  // ---------- Dates ----------
  function versDate(iso) {
    if (!iso) return null;
    const [a, m, j] = iso.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, j));
  }
  function versIso(d) { return d.toISOString().slice(0, 10); }
  function aujourdhui() { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
  function ajouterMois(d, n) {
    const r = new Date(d.getTime());
    const jour = r.getUTCDate();
    r.setUTCDate(1);
    r.setUTCMonth(r.getUTCMonth() + n);
    const dernier = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
    r.setUTCDate(Math.min(jour, dernier));
    return r;
  }
  function ecartJours(a, b) { return Math.round((b - a) / JOUR); }

  // ---------- Données ----------
  function donneesVides() {
    return {
      format: 1,
      maj: null,
      vehicule: { nom: 'Ma 206+', modele: 'Peugeot 206+', annee: 2009, couleur: 'Gris', moteur: null,
        miseEnCirculation: null, immatriculation: '', boite: 'manuelle', kmAn: 5000 },
      releves: [],          // {id, date, km}
      interventions: [],    // {id, date, km, operations:[], libelle, garage, moiMeme, cout, notes}
      pleins: [],           // {id, date, km, litres, montant, complet}
      depenses: [],         // {id, date, categorie, libelle, montant}
      etatInitial: {},      // opId -> {date, km} | {inconnu:true}
      admin: { ctDernier: null, assuranceEcheance: null, assureur: '' },
      plan: {},             // opId -> {km, mois, actif}
      reglages: { ntfyTopic: '', appUrl: '', rappelsActifs: true },
      supprimes: [],        // identifiants supprimés (pour la fusion entre appareils)
      configure: false
    };
  }

  function normaliser(d) {
    const base = donneesVides();
    const r = Object.assign(base, d || {});
    r.vehicule = Object.assign(donneesVides().vehicule, (d && d.vehicule) || {});
    r.admin = Object.assign(donneesVides().admin, (d && d.admin) || {});
    r.reglages = Object.assign(donneesVides().reglages, (d && d.reglages) || {});
    ['releves', 'interventions', 'pleins', 'depenses', 'supprimes'].forEach(k => { if (!Array.isArray(r[k])) r[k] = []; });
    if (typeof r.etatInitial !== 'object' || !r.etatInitial) r.etatInitial = {};
    if (typeof r.plan !== 'object' || !r.plan) r.plan = {};
    return r;
  }

  // Fusion de deux versions (local et distant) : union par identifiant, suppressions respectées,
  // champs simples pris dans la version la plus récente.
  function fusionner(a, b) {
    a = normaliser(a); b = normaliser(b);
    const recent = (a.maj || '') >= (b.maj || '') ? a : b;
    const ancien = recent === a ? b : a;
    const r = normaliser(JSON.parse(JSON.stringify(recent)));
    r.supprimes = Array.from(new Set([].concat(a.supprimes, b.supprimes)));
    const sup = new Set(r.supprimes);
    ['releves', 'interventions', 'pleins', 'depenses'].forEach(k => {
      const parId = new Map();
      ancien[k].forEach(x => parId.set(x.id, x));
      recent[k].forEach(x => parId.set(x.id, x));
      r[k] = Array.from(parId.values()).filter(x => !sup.has(x.id)).sort((x, y) => (x.date || '').localeCompare(y.date || ''));
    });
    return r;
  }

  // ---------- Kilométrage ----------
  function pointsKm(d) {
    const pts = [];
    d.releves.forEach(x => x.km != null && pts.push({ date: x.date, km: +x.km }));
    d.interventions.forEach(x => x.km != null && x.km !== '' && pts.push({ date: x.date, km: +x.km }));
    d.pleins.forEach(x => x.km != null && x.km !== '' && pts.push({ date: x.date, km: +x.km }));
    pts.sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km);
    // garder une suite croissante (ignore une saisie aberrante plus basse que la précédente)
    const propre = [];
    pts.forEach(p => { if (!propre.length || p.km >= propre[propre.length - 1].km) propre.push(p); });
    return propre;
  }

  function dernierPoint(d) { const p = pointsKm(d); return p.length ? p[p.length - 1] : null; }

  // km par jour : observé sur les 13 derniers mois, mélangé à l'estimation annuelle tant que l'historique est court
  function rythme(d, auj) {
    auj = auj || aujourdhui();
    const estime = Math.max(+d.vehicule.kmAn || 5000, 100) / 365;
    const pts = pointsKm(d);
    if (pts.length < 2) return { kmJour: estime, source: 'estimation', observe: null };
    const fin = pts[pts.length - 1];
    const limite = versIso(new Date(versDate(fin.date) - 400 * JOUR));
    let debut = pts.find(p => p.date >= limite) || pts[0];
    if (debut === fin) debut = pts[pts.length - 2];
    const duree = ecartJours(versDate(debut.date), versDate(fin.date));
    if (duree < 14) return { kmJour: estime, source: 'estimation', observe: null };
    const observe = Math.max(fin.km - debut.km, 0) / duree;
    const poids = Math.min(duree / 120, 1);
    return { kmJour: poids * observe + (1 - poids) * estime, source: poids >= 1 ? 'observé' : 'mixte', observe };
  }

  function kmEstime(d, auj) {
    auj = auj || aujourdhui();
    const p = dernierPoint(d);
    if (!p) return null;
    const j = Math.max(ecartJours(versDate(p.date), auj), 0);
    return Math.round(p.km + rythme(d, auj).kmJour * j);
  }

  // ---------- Échéances ----------
  function operationsActives(d) {
    return PLANS.operationsPour(d.vehicule.moteur || 'tu3')
      .map(op => {
        const o = Object.assign({}, op, d.plan[op.id] || {});
        if (o.km === '' || o.km === 0) o.km = null;
        if (o.mois === '' || o.mois === 0) o.mois = null;
        if (o.km != null) o.km = +o.km;
        if (o.mois != null) o.mois = +o.mois;
        return o;
      })
      .filter(o => o.actif !== false);
  }

  function dernierFait(d, op) {
    const faites = d.interventions.filter(i => (i.operations || []).includes(op.id))
      .sort((a, b) => b.date.localeCompare(a.date));
    if (faites.length) return { date: faites[0].date, km: faites[0].km !== '' && faites[0].km != null ? +faites[0].km : null, via: 'journal' };
    if (op.id === 'controle_technique' && d.admin.ctDernier) return { date: d.admin.ctDernier, km: null, via: 'admin' };
    if (op.id === 'assurance' && d.admin.assuranceEcheance) {
      return { date: versIso(ajouterMois(versDate(d.admin.assuranceEcheance), -12)), km: null, via: 'admin' };
    }
    const e = d.etatInitial[op.id];
    if (e && !e.inconnu && e.date) return { date: e.date, km: e.km !== '' && e.km != null ? +e.km : null, via: 'initial' };
    return null;
  }

  function echeance(d, op, auj) {
    auj = auj || aujourdhui();
    const r = rythme(d, auj);
    const kmNow = kmEstime(d, auj);
    const der = dernierFait(d, op);
    const res = { op, dernier: der, statut: 'inconnu', date: null, km: null, joursRestants: null, kmRestants: null, progression: 0, critere: null };
    if (!der) return res;
    let dateTemps = null, dateKm = null;
    if (op.mois) dateTemps = ajouterMois(versDate(der.date), op.mois);
    if (op.km && der.km != null && kmNow != null) {
      res.km = der.km + op.km;
      res.kmRestants = res.km - kmNow;
      dateKm = new Date(auj.getTime() + Math.round(res.kmRestants / Math.max(r.kmJour, 0.1)) * JOUR);
    }
    let fin = dateTemps;
    res.critere = 'temps';
    if (dateKm && (!fin || dateKm < fin)) { fin = dateKm; res.critere = 'km'; }
    if (!fin) return res;
    res.date = versIso(fin);
    res.joursRestants = ecartJours(auj, fin);
    const pt = op.mois ? ecartJours(versDate(der.date), auj) / (op.mois * 30.44) : 0;
    const pk = (op.km && der.km != null && kmNow != null) ? (kmNow - der.km) / op.km : 0;
    res.progression = Math.max(0, Math.max(pt, pk));
    const seuilJ = paliersDe(op)[0] || 0;
    if (res.joursRestants < 0 || (res.kmRestants != null && res.kmRestants < 0)) res.statut = 'retard';
    else if (res.joursRestants <= seuilJ || (res.kmRestants != null && res.kmRestants <= (op.seuilKm || 1500))) res.statut = 'bientot';
    else res.statut = 'ok';
    return res;
  }

  // Paliers de rappel (jours avant l'échéance) : importants à 1 mois, 2 semaines, 1 semaine et le jour même
  function paliersDe(op) {
    if (op.paliers) return op.paliers;
    return op.importance === 'haute' ? [30, 14, 7, 0] : [14, 0];
  }

  const ORDRE = { retard: 0, bientot: 1, inconnu: 2, ok: 3 };
  function toutesEcheances(d, auj) {
    return operationsActives(d).map(op => echeance(d, op, auj)).sort((a, b) =>
      (ORDRE[a.statut] - ORDRE[b.statut]) || ((a.joursRestants ?? 1e9) - (b.joursRestants ?? 1e9)));
  }

  // ---------- Rappel de kilométrage ----------
  // Voiture peu utilisée : relevé demandé tous les 45 jours, 60 si elle roule très peu,
  // 21 si elle roule beaucoup ou si une échéance kilométrique approche. Relance tous les 7 jours.
  function planReleve(d, auj) {
    auj = auj || aujourdhui();
    const der = dernierPoint(d);
    const r = rythme(d, auj);
    let intervalle = 45;
    if (r.kmJour * 30 > 1200) intervalle = 21;
    else if (r.kmJour * 30 < 200) intervalle = 60;
    const proche = toutesEcheances(d, auj).some(e => e.op.km && e.kmRestants != null && e.kmRestants < 2000 && e.statut !== 'retard');
    if (proche) intervalle = Math.min(intervalle, 21);
    const jours = der ? ecartJours(versDate(der.date), auj) : null;
    return { intervalle, joursDepuis: jours, aFaire: jours == null || jours >= intervalle, prochain: der ? versIso(new Date(versDate(der.date).getTime() + intervalle * JOUR)) : versIso(auj) };
  }

  // ---------- Statistiques ----------
  function depensesToutes(d) {
    const l = [];
    d.interventions.forEach(i => +i.cout > 0 && l.push({ date: i.date, montant: +i.cout, categorie: i.type === 'reparation' ? 'Réparation' : 'Entretien', libelle: i.libelle || 'Intervention' }));
    d.pleins.forEach(p => +p.montant > 0 && l.push({ date: p.date, montant: +p.montant, categorie: 'Carburant', libelle: (p.litres ? (+p.litres).toFixed(1) + ' L' : 'Plein') }));
    d.depenses.forEach(x => +x.montant > 0 && l.push({ date: x.date, montant: +x.montant, categorie: x.categorie || 'Autre', libelle: x.libelle || x.categorie }));
    return l.sort((a, b) => b.date.localeCompare(a.date));
  }

  function statistiques(d, auj) {
    auj = auj || aujourdhui();
    const dep = depensesToutes(d);
    const parAnnee = {}, parCategorie = {};
    dep.forEach(x => {
      const a = x.date.slice(0, 4);
      parAnnee[a] = (parAnnee[a] || 0) + x.montant;
      parCategorie[x.categorie] = (parCategorie[x.categorie] || 0) + x.montant;
    });
    const annee = String(auj.getUTCFullYear());
    const douzeMois = versIso(ajouterMois(auj, -12));
    const total12 = dep.filter(x => x.date > douzeMois).reduce((s, x) => s + x.montant, 0);
    const pts = pointsKm(d).filter(p => p.date > douzeMois);
    const km12 = pts.length >= 2 ? pts[pts.length - 1].km - pts[0].km : null;
    const pl = d.pleins.filter(p => p.km !== '' && p.km != null && +p.litres > 0).slice().sort((a, b) => +a.km - +b.km);
    const conso = [];
    let ref = null, litres = 0;
    pl.forEach(p => {
      if (ref) litres += +p.litres;
      if (p.complet !== false) {
        if (ref && +p.km > +ref.km) conso.push({ date: p.date, km: +p.km, l100: litres / (+p.km - +ref.km) * 100 });
        ref = p; litres = 0;
      }
    });
    const consoMoy = conso.length ? conso.reduce((s, c) => s + c.l100, 0) / conso.length : null;
    const prixLitre = d.pleins.filter(p => +p.litres > 0 && +p.montant > 0).map(p => ({ date: p.date, prix: +p.montant / +p.litres }));
    return { parAnnee, parCategorie, totalAnnee: parAnnee[annee] || 0, total12, km12, coutKm: km12 > 0 ? total12 / km12 : null, conso, consoMoy, prixLitre, depenses: dep };
  }

  // ---------- Rappels (tâche quotidienne) ----------
  // Pour chaque opération, un "cycle" correspond à une échéance (identifiée par la date de la dernière fois).
  // On envoie un rappel à chaque palier franchi (30, 14, 7 jours, jour J), puis tous les 7 jours (importants)
  // ou 30 jours (conseils) tant que ce n'est pas marqué comme fait. Marquer comme fait ouvre un nouveau cycle.
  function rappelsDuJour(d, etat, auj) {
    auj = auj || aujourdhui();
    etat = etat || {};
    const anciens = etat.ops || {};
    const ops = {};
    const aEnvoyer = [];
    const kmNow = kmEstime(d, auj);
    const samedi = auj.getUTCDay() === 6;
    toutesEcheances(d, auj).forEach(e => {
      if (!e.dernier || e.joursRestants == null) return;
      const cle = e.dernier.date + '|' + (e.dernier.km ?? '');
      const prec = anciens[e.op.id] && anciens[e.op.id].cle === cle ? anciens[e.op.id] : { cle, paliers: [] };
      const p = paliersDe(e.op);
      const franchis = p.filter(x => e.joursRestants <= x);
      const nouveaux = franchis.filter(x => !prec.paliers.includes(x));
      let envoyer = false;
      if (nouveaux.length) envoyer = true;
      else if ((e.joursRestants < 0 || (e.kmRestants != null && e.kmRestants < 0)) && samedi && prec.envoye !== versIso(auj)) {
        // en retard : relance groupée le samedi, chaque semaine pour l'important, le premier samedi du mois sinon
        if (e.op.importance === 'haute' || auj.getUTCDate() <= 7) envoyer = true;
      }
      if (envoyer) { aEnvoyer.push(e); prec.envoye = versIso(auj); }
      prec.paliers = Array.from(new Set(prec.paliers.concat(franchis)));
      if (franchis.length || prec.envoye) ops[e.op.id] = prec;
    });
    const lignes = [];
    let retard = false;
    aEnvoyer.forEach(e => {
      const enRetard = e.joursRestants < 0 || (e.kmRestants != null && e.kmRestants < 0);
      retard = retard || enRetard;
      const quand = e.joursRestants < 0 ? `en retard de ${-e.joursRestants} j` : e.joursRestants === 0 ? "aujourd'hui" : `dans ${e.joursRestants} j (${versDate(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })})`;
      let detail = '';
      if (e.critere === 'km' && e.kmRestants != null) detail = ` · ${e.kmRestants < 0 ? 'dépassé de ' + Math.abs(e.kmRestants) : 'encore ' + e.kmRestants} km`;
      else if (e.op.km && e.dernier.km != null && kmNow != null) detail = ` · limite de temps, ${Math.max(kmNow - e.dernier.km, 0).toLocaleString('fr-FR')} km depuis`;
      lignes.push(`• ${e.op.nom} : ${quand}${detail}`);
    });
    // relevé de kilométrage : demandé le jour prévu, puis relancé le samedi
    const pr = planReleve(d, auj);
    const rel = Object.assign({}, etat.releve || {});
    let km = false;
    if (pr.aFaire && (!rel.envoye || (samedi && rel.envoye !== versIso(auj) && ecartJours(versDate(rel.envoye), auj) >= 5))) { km = true; rel.envoye = versIso(auj); }
    if (!pr.aFaire) delete rel.envoye;
    const msgs = [];
    if (lignes.length || km) {
      const est = kmEstime(d, auj);
      if (km) lignes.push(pr.joursDepuis == null ? '• Kilométrage : à renseigner pour lancer les calculs'
        : `• Kilométrage : dernier relevé il y a ${pr.joursDepuis} j (estimation ${est != null ? est.toLocaleString('fr-FR') : '?'} km), note le compteur`);
      const titre = retard ? 'Carnet 206+ : entretien en retard' : aEnvoyer.length ? 'Carnet 206+ : entretien à prévoir' : 'Carnet 206+ : kilométrage';
      msgs.push({ titre, message: lignes.join('\n') + (aEnvoyer.length ? '\nDéjà fait ? Ouvre l\'appli et touche « C\'est fait ».' : ''), priorite: retard ? 4 : 3, tags: retard ? ['warning'] : aEnvoyer.length ? ['wrench'] : ['round_pushpin'] });
    }
    return { messages: msgs, etat: { ops, releve: rel, calcule: versIso(auj) } };
  }

  function nouvelId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  const api = { versDate, versIso, aujourdhui, ajouterMois, ecartJours, donneesVides, normaliser, fusionner,
    pointsKm, dernierPoint, rythme, kmEstime, operationsActives, dernierFait, echeance, toutesEcheances,
    planReleve, paliersDe, depensesToutes, statistiques, rappelsDuJour, nouvelId };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.MOTEUR = api;
})(typeof window !== 'undefined' ? window : globalThis);
