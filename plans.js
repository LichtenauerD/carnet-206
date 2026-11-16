/* Plan d'entretien Peugeot 206+ (2009-2013)
 * Sources : plan constructeur relayé par idGarages (révision intermédiaire 30 000 km / 12 mois essence,
 * 24 mois diesel ; révision générale 60 000 km / 48 mois ; filtre d'habitacle et liquide de frein 24 mois ;
 * distribution 150 000 km / 10 ans essence, 240 000 km / 10 ans 1.4 HDi).
 * Les éléments marqués "conseil" ne viennent pas du constructeur : ce sont des contrôles recommandés
 * pour une voiture âgée et peu utilisée, ou des points faibles connus du modèle.
 * Tout intervalle est modifiable dans l'appli (Réglages > Plan d'entretien) pour coller au carnet.
 */
(function (racine) {
  const MOTEURS = {
    tu1: { id: 'tu1', nom: '1.1 essence 60 ch', code: 'TU1 / HFX', energie: 'essence' },
    tu3: { id: 'tu3', nom: '1.4 essence 75 ch', code: 'TU3 / KFV', energie: 'essence' },
    dv4: { id: 'dv4', nom: '1.4 HDi diesel 70 ch', code: 'DV4TD / 8HZ', energie: 'diesel' }
  };

  const ESS = ['tu1', 'tu3'];
  const TOUS = ['tu1', 'tu3', 'dv4'];

  // km : intervalle kilométrique (null = aucun) ; mois : intervalle de temps (null = aucun)
  // source : 'constructeur' | 'conseil' | 'admin'
  const OPERATIONS = [
    { id: 'vidange', nom: 'Vidange et filtre à huile', groupe: 'Révision', icone: 'huile',
      km: 30000, mois: 12, moteurs: ESS, source: 'constructeur', importance: 'haute',
      info: "Révision intermédiaire du constructeur. Comme la voiture roule peu, c'est la limite d'un an qui compte : l'huile vieillit même sans rouler, surtout avec des petits trajets." },
    { id: 'vidange', nom: 'Vidange et filtre à huile', groupe: 'Révision', icone: 'huile',
      km: 30000, mois: 24, moteurs: ['dv4'], source: 'constructeur', importance: 'haute',
      info: "Révision intermédiaire du constructeur (24 mois sur le 1.4 HDi). Avec beaucoup de petits trajets, une vidange annuelle reste prudente : le 1.4 HDi est connu pour consommer de l'huile, contrôle le niveau régulièrement." },
    { id: 'filtre_air', nom: 'Filtre à air', groupe: 'Révision', icone: 'filtre',
      km: 60000, mois: 48, moteurs: TOUS, source: 'constructeur', importance: 'haute',
      info: 'Remplacé lors de la révision générale.' },
    { id: 'bougies', nom: "Bougies d'allumage", groupe: 'Révision', icone: 'bougie',
      km: 60000, mois: 48, moteurs: ESS, source: 'constructeur', importance: 'haute',
      info: "Remplacées lors de la révision générale. Sur ces moteurs, des bougies ou une bobine fatiguées donnent des démarrages à froid difficiles et des ratés qui peuvent abîmer le catalyseur." },
    { id: 'filtre_gasoil', nom: 'Filtre à gasoil', groupe: 'Révision', icone: 'filtre',
      km: 60000, mois: 48, moteurs: ['dv4'], source: 'constructeur', importance: 'haute',
      info: 'Remplacé lors de la révision générale. Purger l\'eau du filtre si le garage le propose.' },
    { id: 'filtre_habitacle', nom: "Filtre d'habitacle", groupe: 'Révision', icone: 'filtre',
      km: 30000, mois: 24, moteurs: TOUS, source: 'constructeur',
      info: 'Pollen et poussières. Facile à changer soi-même (derrière la boîte à gants ou sous le pare-brise selon la version).' },
    { id: 'liquide_frein', nom: 'Liquide de frein', groupe: 'Freinage', icone: 'frein',
      km: null, mois: 24, moteurs: TOUS, source: 'constructeur', importance: 'haute',
      info: "Le liquide absorbe l'humidité avec le temps, qu'on roule ou non : c'est un intervalle de temps uniquement." },
    { id: 'distribution', nom: 'Kit de distribution et pompe à eau', groupe: 'Moteur', icone: 'distri',
      km: 150000, mois: 120, moteurs: ESS, source: 'constructeur', importance: 'haute', paliers: [90, 30, 14, 7, 0],
      info: "Le plus important du carnet : une courroie qui casse détruit le moteur. Sur une voiture qui roule peu, c'est la limite de 10 ans qui tombe en premier. La pompe à eau, entraînée par la courroie, se change en même temps." },
    { id: 'distribution', nom: 'Kit de distribution et pompe à eau', groupe: 'Moteur', icone: 'distri',
      km: 240000, mois: 120, moteurs: ['dv4'], source: 'constructeur', importance: 'haute', paliers: [90, 30, 14, 7, 0],
      info: "Le plus important du carnet : une courroie qui casse détruit le moteur. Le constructeur annonce 240 000 km ou 10 ans en usage normal (180 000 km en usage sévère). Sur une voiture qui roule peu, c'est la limite de 10 ans qui compte." },

    // Conseils (hors constructeur)
    { id: 'train_arriere', nom: 'Contrôle du train arrière', groupe: 'Points faibles', icone: 'essieu',
      km: 20000, mois: 12, moteurs: TOUS, source: 'conseil',
      info: "Point faible n°1 de la 206 et de la 206+ : les roulements à aiguilles des bras arrière rouillent et prennent du jeu. Signes : claquements à l'arrière sur les bosses, roues arrière qui penchent vers l'intérieur en haut, usure de l'intérieur des pneus arrière. Pris tôt, un kit roulements et axes suffit ; trop tard, il faut un train arrière complet. À faire vérifier à chaque passage au garage." },
    { id: 'niveaux', nom: 'Petit contrôle : niveaux, pression, feux', groupe: 'Moteur', icone: 'refroid',
      km: null, mois: 3, moteurs: TOUS, source: 'conseil', paliers: [0],
      info: "Dix minutes, moteur froid, voiture à plat. 1) Huile : tirer la jauge, l'essuyer, la replonger, le niveau doit être entre les deux traits. 2) Liquide de refroidissement : entre MINI et MAXI sur le vase d'expansion (ne jamais l'ouvrir moteur chaud). 3) Liquide de frein et lave-glace : entre les repères. 4) Pression des pneus à froid, à la station : la valeur est sur l'étiquette dans l'encadrement de la porte conducteur. 5) Faire le tour de la voiture feux allumés, clignotants et stop compris. Sur le 1.4 essence, une baisse du liquide de refroidissement sans fuite visible est le premier signe d'un joint de culasse qui fatigue : à faire vérifier sans attendre." },
    { id: 'train_avant', nom: 'Contrôle du train avant et de la direction', groupe: 'Points faibles', icone: 'essieu',
      km: 20000, mois: 12, moteurs: TOUS, source: 'conseil',
      info: "Rotules, biellettes de direction et de barre stabilisatrice, silentblocs, soufflets de cardan. Signes d'usure : voiture qui tire, claquements en braquant ou sur les bosses, usure irrégulière des pneus avant. Un contrôle de géométrie (parallélisme) s'impose après un changement de pièce de direction ou de pneus." },
    { id: 'amortisseurs', nom: 'Contrôle des amortisseurs', groupe: 'Roues', icone: 'essieu',
      km: 80000, mois: 48, moteurs: TOUS, source: 'conseil',
      info: "Pas d'intervalle constructeur. Contrôle à faire au garage ou au contrôle technique : rebond excessif, fuite d'huile sur le corps, usure en vagues des pneus. On les change par paire sur un même essieu." },
    { id: 'freins_controle', nom: 'Contrôle plaquettes et disques', groupe: 'Freinage', icone: 'frein',
      km: 20000, mois: 12, moteurs: TOUS, source: 'conseil',
      info: "Une voiture qui dort rouille vite ses disques et peut gripper ses étriers. Contrôle visuel et à l'oreille (couinements), et vérification à chaque révision." },
    { id: 'batterie', nom: 'Contrôle de la batterie', groupe: 'Électricité', icone: 'batterie',
      km: null, mois: 12, moteurs: TOUS, source: 'conseil',
      info: "Une voiture peu utilisée décharge sa batterie à l'arrêt (problème aussi signalé sur ce modèle). Faire tester la charge avant l'hiver ; un chargeur d'entretien est utile si elle dort plusieurs semaines. Durée de vie typique : 4 à 6 ans." },
    { id: 'pneus_avant', nom: 'Pneus avant (usure estimée)', groupe: 'Roues', icone: 'pneu',
      km: 40000, mois: 120, moteurs: TOUS, source: 'conseil', seuilKm: 3000, paliers: [30, 0],
      info: "Estimation, pas une mesure : des pneus avant durent en moyenne 35 000 à 45 000 km sur une petite traction comme la 206+, moins avec une conduite sportive ou un train avant fatigué. Au-delà de 10 ans, un pneu est à changer même peu usé (le caoutchouc durcit). Le garagiste ou le témoin d'usure (1,6 mm) tranchent : l'appli te prévient seulement qu'il est temps de regarder. Ajuste l'intervalle si tes pneus s'usent plus vite ou moins vite." },
    { id: 'pneus_arriere', nom: 'Pneus arrière (usure estimée)', groupe: 'Roues', icone: 'pneu',
      km: 60000, mois: 120, moteurs: TOUS, source: 'conseil', seuilKm: 3000, paliers: [30, 0],
      info: "Estimation : sur une traction, les pneus arrière s'usent nettement moins vite que ceux de l'avant (souvent 50 000 à 70 000 km). Exception à surveiller sur la 206+ : une usure de l'intérieur des pneus arrière signale un train arrière fatigué, à faire contrôler. Au-delà de 10 ans, à changer même peu usés." },
    { id: 'pneus', nom: 'Contrôle des pneus (usure et âge)', groupe: 'Roues', icone: 'pneu',
      km: 10000, mois: 12, moteurs: TOUS, source: 'conseil',
      info: "Pression à froid tous les mois si possible, usure (témoins à 1,6 mm) et âge : un pneu qui roule peu durcit et se craquelle. Au-delà de 6 ans, fais-les inspecter chaque année ; au-delà de 10 ans, change-les. L'année se lit sur le flanc (code DOT, 4 chiffres : semaine puis année)." },
    { id: 'courroie_accessoires', nom: "Courroie d'accessoires", groupe: 'Moteur', icone: 'distri',
      km: 120000, mois: 120, moteurs: TOUS, source: 'conseil',
      info: "Le constructeur ne fixe pas d'intervalle : elle est contrôlée à chaque révision (craquelures, sifflements). On la change souvent avec la distribution." },
    { id: 'liquide_refroidissement', nom: 'Liquide de refroidissement', groupe: 'Moteur', icone: 'refroid',
      km: 120000, mois: 60, moteurs: TOUS, source: 'conseil',
      info: "Le constructeur prévoit seulement une mise à niveau. Le remplacement vers 5 ans est un conseil général, à confirmer dans ton carnet. Sur le 1.4 essence, le joint de culasse est le point faible le plus cité : surveille le niveau et la température, une baisse de liquide sans fuite visible doit alerter." },
    { id: 'clim', nom: 'Climatisation (contrôle, recharge)', groupe: 'Confort', icone: 'clim',
      km: null, mois: 24, moteurs: TOUS, source: 'conseil',
      info: "Fais tourner la clim quelques minutes par mois, même l'hiver, pour garder les joints lubrifiés. Pertes de froid et fuites sont signalées sur ce modèle." },
    { id: 'essuie_glaces', nom: 'Balais d\'essuie-glace', groupe: 'Confort', icone: 'essuie',
      km: null, mois: 12, moteurs: TOUS, source: 'conseil',
      info: 'Le caoutchouc durcit avec le temps et le soleil. À changer avant l\'hiver.' },

    // Administratif (dates fixes)
    { id: 'controle_technique', nom: 'Contrôle technique', groupe: 'Administratif', icone: 'ct',
      km: null, mois: 24, moteurs: TOUS, source: 'admin', importance: 'haute',
      info: "Tous les 2 ans, à faire dans les 2 mois précédant l'échéance. Présente-toi avec la carte grise. En cas de contre-visite, elle doit être faite dans les 2 mois." },
    { id: 'assurance', nom: 'Échéance assurance', groupe: 'Administratif', icone: 'assurance',
      km: null, mois: 12, moteurs: TOUS, source: 'admin', importance: 'haute',
      info: "Date anniversaire du contrat. Après un an, la loi Hamon permet de résilier à tout moment ; c'est le moment de comparer." }
  ];

  // Réparations courantes, en mots simples. "ops" : opérations du carnet que la réparation remplace
  // réellement (pièce neuve = échéance remise à zéro). "controle" : contrôle du carnet que le garagiste
  // a pu faire en même temps ; il n'est mis à jour que si l'utilisateur le confirme.
  const REPARATIONS = [
    { id: 'freinage', nom: 'Freins', controle: 'freins_controle', mots: ['frein', 'plaquette', 'disque', 'etrier', 'tambour', 'machoire', 'abs'],
      liste: [['Plaquettes de frein avant'], ['Disques et plaquettes avant'], ['Mâchoires ou tambours arrière'], ['Étrier de frein'], ['Capteur ABS']] },
    { id: 'pneus', nom: 'Pneus et géométrie', controle: 'pneus', mots: ['pneu', 'parallelisme', 'geometrie', 'equilibrage', 'crevaison', 'valve'],
      liste: [['Pneus avant neufs', ['pneus_avant']], ['Pneus arrière neufs', ['pneus_arriere']], ['4 pneus neufs', ['pneus_avant', 'pneus_arriere'], ['4 pneus', 'quatre pneus']], ['Géométrie (parallélisme)', [], ['geometrie', 'parallelisme']], ['Réparation de crevaison']] },
    { id: 'train_avant', nom: 'Train avant et direction', controle: 'train_avant', mots: ['rotule', 'biellette', 'cardan', 'soufflet', 'triangle', 'silentbloc', 'cremaillere', 'direction', 'roulement de roue avant'],
      liste: [['Rotules de suspension'], ['Biellettes de direction'], ['Biellettes de barre stabilisatrice'], ['Silentblocs de triangle'], ['Soufflet de cardan'], ['Cardan'], ['Roulement de roue avant']] },
    { id: 'train_arriere', nom: 'Train arrière', controle: 'train_arriere', mots: ['train arriere', 'essieu', 'bras arriere', 'roulement de bras', 'traverse', 'roulement de roue arriere'],
      liste: [['Kit roulements de bras arrière'], ['Silentblocs de train arrière'], ['Train arrière complet (échange standard)'], ['Roulement de roue arrière']] },
    { id: 'suspension', nom: 'Amortisseurs et ressorts', controle: 'amortisseurs', mots: ['amorti', 'ressort', 'coupelle', 'suspension'],
      liste: [['Amortisseurs avant'], ['Amortisseurs arrière'], ['Ressort cassé'], ['Coupelles d\'amortisseur']] },
    { id: 'moteur', nom: 'Moteur', mots: ['moteur', 'bobine', 'bougie', 'sonde', 'lambda', 'culasse', 'injecteur', 'papillon', 'ralenti', 'cache culbuteur', 'support moteur', 'courroie'],
      liste: [['Bobine d\'allumage'], ['Sonde lambda'], ['Joint de culasse'], ['Joint de cache-culbuteurs (fuite d\'huile)'], ['Support moteur'], ['Moteur de ralenti ou boîtier papillon']] },
    { id: 'refroidissement', nom: 'Refroidissement', mots: ['radiateur', 'thermostat', 'durite', 'pompe a eau', 'ventilateur', 'refroidissement', 'surchauffe'],
      liste: [['Radiateur'], ['Thermostat'], ['Pompe à eau seule'], ['Durite'], ['Ventilateur ou sonde de ventilateur']] },
    { id: 'embrayage', nom: 'Embrayage et boîte', mots: ['embrayage', 'boite', 'vitesse', 'butee', 'cable'],
      liste: [['Kit embrayage'], ['Câble d\'embrayage'], ['Vidange de boîte'], ['Biellette ou câble de boîte']] },
    { id: 'electricite', nom: 'Batterie et électricité', controle: 'batterie', mots: ['batterie', 'alternateur', 'demarreur', 'fusible', 'leve vitre', 'electrique', 'faisceau', 'bsi'],
      liste: [['Batterie neuve', ['batterie']], ['Alternateur'], ['Démarreur'], ['Lève-vitre'], ['Fusible ou relais']] },
    { id: 'echappement', nom: 'Échappement', mots: ['echappement', 'silencieux', 'pot', 'catalyseur', 'collier'],
      liste: [['Silencieux arrière'], ['Catalyseur'], ['Fixations ou colliers d\'échappement'], ['Ligne d\'échappement complète']] },
    { id: 'clim', nom: 'Climatisation', controle: 'clim', mots: ['clim', 'climatisation', 'compresseur'],
      liste: [['Compresseur de climatisation']] },
    { id: 'eclairage', nom: 'Éclairage et essuie-glaces', mots: ['ampoule', 'phare', 'feu', 'essuie', 'balai', 'optique'],
      liste: [['Ampoule'], ['Optique de phare'], ['Rénovation des phares']] },
    { id: 'carrosserie', nom: 'Carrosserie et vitrage', mots: ['pare brise', 'carrosserie', 'retro', 'vitre', 'serrure', 'portiere', 'choc', 'rayure', 'peinture'],
      liste: [['Pare-brise'], ['Rétroviseur'], ['Serrure ou barillet'], ['Réparation de carrosserie']] },
    { id: 'autre', nom: 'Autre', mots: [], liste: [] }
  ];
  // Mots qui désignent les opérations du carnet sur une facture
  const MOTS_OPS = {
    vidange: ['vidange', 'huile moteur', 'filtre a huile', 'revision'],
    filtre_air: ['filtre a air'],
    bougies: ['bougie'],
    filtre_gasoil: ['filtre a gasoil', 'filtre gasoil', 'filtre a gazole', 'filtre carburant', 'filtre a carburant'],
    filtre_habitacle: ['filtre d habitacle', 'filtre habitacle', 'filtre a pollen', 'pollen'],
    liquide_frein: ['liquide de frein', 'purge frein', 'purge du circuit de frein', 'purge liquide'],
    distribution: ['distribution', 'kit distri', 'courroie de distri'],
    train_arriere: ['controle train arriere', 'controle essieu arriere'],
    niveaux: ['niveaux', 'mise a niveau', 'petit controle'],
    train_avant: ['controle train avant', 'controle direction', 'controle trains roulants'],
    amortisseurs: ['controle amortisseur', 'test amortisseur'],
    freins_controle: ['controle frein', 'controle des freins', 'controle plaquette'],
    batterie: ['test batterie', 'controle batterie', 'charge batterie'],
    pneus: ['controle pneu', 'pression pneu', 'permutation'],
    pneus_avant: ['pneus avant', 'pneu avant', '2 pneus av', 'pneus av'],
    pneus_arriere: ['pneus arriere', 'pneu arriere', 'pneus ar', 'pneu ar'],
    courroie_accessoires: ['courroie d accessoire', 'courroie accessoire', 'courroie alternateur', 'courroie poly v'],
    liquide_refroidissement: ['liquide de refroidissement', 'antigel', 'purge refroidissement'],
    clim: ['recharge clim', 'recharge de clim', 'climatisation', 'clim'],
    essuie_glaces: ['essuie glace', 'balai', 'balais'],
    controle_technique: ['controle technique', 'contre visite'],
    assurance: ['assurance']
  };
  const VIDES = ['changement', 'changer', 'change', 'remplacement', 'remplacer', 'remplace', 'reparation', 'reparer', 'neuf', 'neuve', 'neufs', 'neuves', 'des', 'de', 'du', 'la', 'le', 'les', 'et', 'un', 'une', 'pose', 'fourniture', 'x2', 'au', 'a', 'en', 'sur', 'avec', 'mo', 'main', 'oeuvre', 'piece', 'pieces', 'fait'];
  const sansAccent = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-']/g, ' ');
  // devine la catégorie d'après un texte libre ("changement des rotules" -> train avant)
  function devinerCategorie(texte) {
    const t = sansAccent(texte || '');
    let meilleure = null, score = 0;
    REPARATIONS.forEach(c => c.mots.forEach(m => { if (t.includes(m) && m.length > score) { meilleure = c.id; score = m.length; } }));
    return meilleure;
  }

  const POINTS_FAIBLES = {
    tous: [
      { titre: 'Train arrière', niveau: 'eleve', texte: "Roulements de bras arrière qui rouillent et prennent du jeu. Signes : claquements sur les bosses, roues arrière inclinées vers l'intérieur, usure intérieure des pneus arrière. Pris à temps : kit roulements et axes. Sinon : train arrière en échange standard." },
      { titre: 'Train avant et direction', niveau: 'moyen', texte: 'Voiture qui tire, rotules, silentblocs ou biellettes avec du jeu, usure rapide des pneus avant.' },
      { titre: 'Boîte et embrayage', niveau: 'moyen', texte: 'Marche arrière qui accroche, point mort difficile, embrayage qui patine.' },
      { titre: 'Freinage et ABS', niveau: 'moyen', texte: 'Voyant ABS (souvent un capteur de roue), couinements.' },
      { titre: 'Échappement', niveau: 'faible', texte: 'Corrosion et fixations de silencieux qui cèdent, aggravées par les petits trajets.' }
    ],
    tu1: [
      { titre: 'Démarrage à froid et ralenti', niveau: 'moyen', texte: 'Démarrage en plusieurs tentatives, ralenti instable ou calages. À vérifier : bougies, bobine, moteur pas à pas de ralenti, boîtier papillon.' },
      { titre: 'Refroidissement', niveau: 'moyen', texte: 'Fuites de radiateur, thermostat, pompe à eau. Surveiller le niveau de liquide et la consommation d\'huile.' },
      { titre: 'Rappels constructeur', niveau: 'info', texte: 'Des rappels ont concerné la reprogrammation du calculateur moteur (production jusqu\'en 2009) et les coussinets de bielle. Vérifie que ta voiture est à jour.' }
    ],
    tu3: [
      { titre: 'Joint de culasse', niveau: 'eleve', texte: 'Point le plus cité sur le 1.4 essence. Signes : perte de liquide de refroidissement sans fuite visible, surchauffe, fumée blanche, mayonnaise sous le bouchon d\'huile. Ne jamais rouler en surchauffe.' },
      { titre: 'Allumage et sondes', niveau: 'moyen', texte: 'Bobine d\'allumage, sonde lambda. Ratés et voyant moteur : à traiter vite pour protéger le catalyseur.' },
      { titre: 'Refroidissement', niveau: 'moyen', texte: 'Boîtier de thermostat, radiateur, sonde de ventilateur (ventilateur qui tourne même moteur froid).' },
      { titre: 'Batterie et alternateur', niveau: 'moyen', texte: 'Décharge à l\'arrêt, diodes d\'alternateur. Important pour une voiture qui roule peu.' },
      { titre: 'Embrayage', niveau: 'faible', texte: 'Pas d\'intervalle : il s\'use selon la conduite. Signes : pédale qui patine en côte ou en accélérant, point de patinage très haut, bruit de butée pédale relevée.' }
    ],
    dv4: [
      { titre: 'Embrayage', niveau: 'eleve', texte: 'Le point le plus cité sur le 1.4 HDi : patinage dès 30 000 à 80 000 km selon les témoignages.' },
      { titre: 'Consommation et fuites d\'huile', niveau: 'eleve', texte: 'Consommation entre deux vidanges, fuite à la pompe à huile, joints d\'injecteurs. Contrôle le niveau tous les mois.' },
      { titre: 'Turbo et suralimentation', niveau: 'moyen', texte: 'Électrovanne de turbo, capteur de pression, sifflements. Laisser tourner au ralenti quelques secondes avant de couper après un trajet soutenu.' },
      { titre: 'Bougies de préchauffage', niveau: 'faible', texte: 'Démarrages difficiles par temps froid.' },
      { titre: 'ZFE Strasbourg', niveau: 'eleve', texte: 'Un diesel de 2009 est Crit\'Air 3 : interdit dans l\'Eurométropole à partir du 1er janvier 2027, avec un report au 1er janvier 2028 en cours d\'adoption (annonce du 8 octobre 2026).' }
    ]
  };

  const CRITAIR = {
    essence: { classe: 2, couleur: 'jaune', texte: "Essence immatriculée entre 2006 et 2010 (Euro 4) : Crit'Air 2. Circulation autorisée dans la ZFE de l'Eurométropole de Strasbourg. Strasbourg, Schiltigheim, Ostwald et Holtzheim ont annoncé l'interdiction des Crit'Air 2 en 2028 ; les autres communes doivent se prononcer au plus tard en 2027." },
    diesel: { classe: 3, couleur: 'orange', texte: "Diesel immatriculé entre 2006 et 2010 (Euro 4) : Crit'Air 3. Interdiction dans la ZFE de l'Eurométropole prévue au 1er janvier 2027 ; l'Eurométropole a annoncé le 8 octobre 2026 un report au 1er janvier 2028, arrêté attendu d'ici fin 2026." }
  };

  const SOURCES = [
    { titre: 'Plan d\'entretien Peugeot 206+ (idGarages)', url: 'https://www.idgarages.com/fr-fr/entretien/peugeot/carnet-entretien-peugeot-206-' },
    { titre: 'Fiabilité Peugeot 206 plus (Fiches-auto)', url: 'https://www.fiches-auto.fr/fiabilite-peugeot/fiabilite-281-pannes-peugeot-206-plus.php' },
    { titre: 'Peugeot 206+ : grincements de l\'essieu arrière (L\'argus)', url: 'https://www.largus.fr/actualite-automobile/peugeot-206-une-solution-aux-grincements-de-lessieu-arriere-8195389.html' },
    { titre: 'Courroie de distribution 206 (AD)', url: 'https://www.ad.fr/guides/guide-conseil/distribution/courroie-de-distribution-206-quand-la-changer-et-a-quel-prix' },
    { titre: 'Vignette Crit\'Air (Service-public.fr)', url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F10332' },
    { titre: 'ZFE de l\'Eurométropole de Strasbourg', url: 'https://www.strasbourg.eu/fr/la-zfe-m' },
    { titre: 'Rappels de véhicules (Rappel Conso)', url: 'https://rappel.conso.gouv.fr' }
  ];

  function operationsPour(moteur) {
    return OPERATIONS.filter(o => o.moteurs.includes(moteur || 'tu3'));
  }

  // Catalogue unique : opérations du carnet + réparations courantes
  function catalogue(moteur) {
    const l = operationsPour(moteur).map(o => ({ nom: o.nom, categorie: 'carnet', catNom: o.source === 'admin' ? 'Administratif' : 'Carnet d\'entretien', ops: [o.id], mots: MOTS_OPS[o.id] || [] }));
    REPARATIONS.forEach(c => c.liste.forEach(([nom, ex, mots]) => l.push({ nom, categorie: c.id, catNom: c.nom, ops: ex || [], mots: mots || [] })));
    return l;
  }
  const CONTROLES = ['train_arriere', 'train_avant', 'freins_controle', 'batterie', 'pneus', 'amortisseurs', 'niveaux'];
  // Classe une ligne de facture : renvoie les entrées du catalogue triées par pertinence
  function reconnaitre(texte, moteur) {
    const q = ' ' + sansAccent(texte || '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const mots = q.trim().split(' ').filter(m => m.length > 1 && !VIDES.includes(m)).map(m => m.length > 3 ? m.replace(/s$/, '') : m);
    if (!mots.length) return [];
    return catalogue(moteur).map(e => {
      const meule = sansAccent(e.nom + ' ' + e.mots.join(' ') + ' ' + e.catNom);
      let score = 0, phrase = false;
      e.mots.forEach(m => { if (q.includes(' ' + m) || q.includes(m + ' ')) { score += 3 * m.split(' ').length; phrase = true; } });
      if (sansAccent(e.nom).length > 4 && q.includes(sansAccent(e.nom))) { score += 4; phrase = true; }
      let forts = 0; mots.forEach(m => { if (meule.includes(m)) { score += 1; if (m.length >= 4) forts++; } });
      // une pièce nommée sans le mot "contrôle" désigne un remplacement, pas une vérification
      if (CONTROLES.includes(e.ops[0]) && e.categorie === 'carnet' && !/controle|verif|test|diagnostic|pression/.test(q)) score -= 1.5;
      return { e, score, phrase, forts };
    }).filter(r => (r.phrase || r.forts > 0) && r.score > 0).sort((a, b) => b.score - a.score || (a.e.categorie === 'carnet' ? -1 : 1));
  }

  const api = { MOTEURS, OPERATIONS, REPARATIONS, POINTS_FAIBLES, CRITAIR, SOURCES, operationsPour, devinerCategorie, sansAccent, catalogue, reconnaitre };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.PLANS = api;
})(typeof window !== 'undefined' ? window : globalThis);
