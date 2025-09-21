TwinVision — Pipeline d’Avatar 3D (TWINFORGE)

Version : 1.0
Statut : Prêt pour la prod (gel des contrats au 2025‑09‑13)
Portée : Avatar corps entier photoréaliste + hooks « Face Scan ».

⸻

1) Résumé (TL;DR)

TwinVision transforme deux photos (face/profil) en un avatar 3D riggé et photoréaliste. Le pipeline enchaîne des Supabase Edge Functions avec des contraintes pilotées par la base (bornes physiologiques, enveloppe K=5, règles spécifiques au genre). Les résultats sont historisés dans body_scans et mis en cache pour le rendu via user_profile.preferences.avatar. La validation « défense en profondeur » garantit des sorties cohérentes même en cas d’erreurs IA.

⸻

2) Périmètre & Versionnage
	•	Gel de contrat : schémas d’entrées/sorties, clés JSON et règles de validation sont gelés.
	•	SemVer : toute rupture → MAJOR; ajout compatible → MINOR; correctif → PATCH.
	•	Compat. ascendante : champs optionnels uniquement.

⸻

3) Architecture Générale

Client (Web/App)
  └─ Capture photos & pré‑checks
       └─ Upload -> Storage (URLs signées)
            └─ Edge: scan-estimate  ───────┐  mesures, peau, meta photos
                   │                        │
                   ▼                        │
            Edge: scan-semantic             │  profil sémantique
                   ▼                        │
            Edge: scan-match                │  5 archétypes + enveloppe K=5
                   ▼                        │
            Edge: scan-refine-morphs        │  morphs finaux + masses
                   ▼                        │
            Edge: scan-commit  ─────────────┘  persistance + fast‑path profil
                   ▼
           Frontend 3D Viewer (Three.js)

Principes : DB‑first, IA contrainte, logs structurés, idempotence.

⸻

4) Flux Global & Contrats

Les sections 5→10 décrivent chaque étape (entrées, responsabilités, sorties). Les valeurs de données normées (ex. resolvedGender) restent en anglais pour la compatibilité BDD.

⸻

5) Frontend — Capture Photo

Objectif : récupérer 2 JPEG (face/profil) + rapport de capture.

Validation locale : format JPEG, taille, netteté/expo; EXIF stripping; compression.

Rapport de capture (client → Edge)

{
  "clientScanId": "<string>",
  "photos": [
    { "kind": "front",   "url": "<signed-url>", "sizeKB": <number> },
    { "kind": "profile", "url": "<signed-url>", "sizeKB": <number> }
  ],
  "userMetrics": { "height_cm": <number>, "weight_kg": <number>, "gender": "masculine|feminine|other" },
  "quality": { "score": <0.0-1.0>, "checks": ["blur","exposure","format"] }
}


⸻

6) Edge — scan-estimate

Entrée

{ "clientScanId": "<string>", "userId": "<uuid>", "resolvedGender": "male|female|other", "photos": [{"url":"<signed-url>","kind":"front|profile"}] }

Rôle : keypoints, mesures (taille/poitrine/taille/hanches), BMI, estimations graisse/muscle, skin tone v2. Clamp BDD des plages numériques.

Sortie : estimate_result

{
  "measures": { "waist_cm": <number>, "hips_cm": <number>, "chest_cm": <number>, "bmi": <number> },
  "biometrics": { "fat_pct_est": <number>, "muscle_pct_est": <number> },
  "skin_tone": { "model": "v2", "rgb": {"r": <int>, "g": <int>, "b": <int>}, "confidence": <0.0-1.0> },
  "confidence": <0.0-1.0>,
  "photos_metadata": { "front": {"ok": true}, "profile": {"ok": true} }
}


⸻

7) Edge — scan-semantic

Entrée : estimate_result + métadonnées.

Rôle : mapping mesures → classes sémantiques (dictionnaires BDD uniquement).

Sortie : semantic_result

{
  "semantic_profile": {
    "obesity": "Underweight|Normal|Overweight|Obese",
    "muscularity": "Low|Medium|High",
    "morphotype": "Rectangle|Pear|InvertedTriangle|Hourglass|..."
  },
  "confidence": <0.0-1.0>,
  "adjustments_made": <int>
}


⸻

8) Edge — scan-match

Entrée : semantic_result + genre.

Rôle : filtrage strict (genre/BMI/muscularité), sélection Top‑5 archétypes, calcul enveloppe K=5 (min/max par morph).

Sortie : match_result

{
  "selected_archetypes": [{"id": "<string>", "score": <number>}],
  "k5_envelope": { "<morphKey>": { "min": <number>, "max": <number> } },
  "stats": { "total": <int>, "after_gender": <int>, "after_muscular": <int>, "after_bmi": <int>, "final": 5 },
  "semantic_coherence_score": <0.0-1.0>
}


⸻

9) Edge — scan-refine-morphs

Entrée : estimate_result + semantic_result + match_result.

Rôle : prompt IA riche (photos+semantics+K=5+mesures) → final_shape_params & final_limb_masses. Triple clamp : 1) enveloppe K=5, 2) bornes BDD, 3) règles spécifiques au genre. Drop des clés hors allow‑list BDD.

Sortie

{
  "final_shape_params": { "<morphKey>": <number> },
  "final_limb_masses": { "armMass": <number>, "forearmMass": <number>, "thighMass": <number>, "calfMass": <number>, "torsoMass": <number>, "neckMass": <number> },
  "ai_confidence": <0.0-1.0>,
  "clamped_keys": ["<morphKey>"]
}


⸻

10) Edge — scan-commit

Rôle : historiser le scan dans body_scans + mettre à jour le fast‑path user_profile.preferences.avatar.

Entrée

{ "clientScanId": "<string>", "userId": "<uuid>", "resolvedGender": "male|female|other", "estimate_result": { ... }, "semantic_result": { ... }, "match_result": { ... }, "refine_result": { ... } }

Sortie

{ "success": true, "scan_id": "<uuid>", "processing_complete": true }


⸻

11) Viewer 3D & Rendu
	•	Chargement : 1) user_profile.preferences.avatar (fast), 2) fallback « dernier scan ».
	•	Application : base mesh genré → blendshapes final_shape_params → échelles osseuses final_limb_masses → skin tone v2 via MeshPhysicalMaterial (SSS).

⸻

12) Stratégie de Validation (Défense en Profondeur)
	1.	Enveloppe K=5 (prio 1) : aucun morph hors [min,max] par archétypes.
	2.	Bornes physiologiques BDD (prio 2).
	3.	Règles de genre (prio 3) : morphs anatomiques contraints selon resolvedGender.
	4.	Allow‑list Front : clés non listées ignorées côté viewer.

Invariants
	•	Masses de membres numériques uniquement.
	•	États UI sans effet sur les données persistées.

⸻

13) Modèle de Persistance (Postgres/Supabase)

body_scans
	•	id uuid (pk) • user_id uuid • client_scan_id text • resolved_gender text
	•	estimate_result jsonb • semantic_result jsonb • match_result jsonb • refine_result jsonb
	•	skin_tone_v2 jsonb • created_at timestamptz default now()

user_profile.preferences.avatar

{
  "version": "1.x",
  "resolved_gender": "male|female|other",
  "final_shape_params": {"...": 0.0},
  "final_limb_masses": {"armMass": 1.0, "...": 1.0},
  "skin_tone": { "model": "v2", "rgb": {"r": 0, "g": 0, "b": 0} }
}

Rendu fast‑path obligatoire lorsque présent.

⸻

14) Observabilité Opérationnelle (Logs)

IDs de corrélation : clientScanId (client) & scan_id (serveur).
Log shape requis

{ "level": "info|warn|error", "message": "<catégorie> — court message", "timestamp": "ISO-8601", "context": { "clientScanId": "...", "serverScanId": "...", "userId": "..." } }

KPIs cibles : p95 par étape (estimate <6s, semantic <3s, match <2s, refine <15s) ; E2E <45s ; violations enveloppe/BDD = 0.

(Voir §17 pour Analytics produit & métriques métier.)

⸻

15) Idempotence, Retrys & Ordonnancement
	•	Clé d’idempotence : (userId, clientScanId).
	•	scan-commit : upsert du fast‑path + insert unique dans body_scans. Ré‑appel → même scan_id.

⸻

16) Sécurité et Authentification

16.1 Authentification Supabase
	•	Email/Password : Authentification principale.
	•	RLS : Row Level Security activé pour toutes les tables (accès par user_id).
	•	Service Role : Edge Functions avec bypass RLS restreint (actions atomiques et auditables).

16.2 Validation & Sanitization
	•	Input Validation : schémas stricts (zod/valibot) côté client et serveur.
	•	EXIF Stripping : suppression des métadonnées photos avant upload.
	•	Content Filtering : sanitization des meshes/matériaux PG‑13 (aucun contenu explicite, textures sûres).

16.3 Confidentialité & Accès Données
	•	Stockage : buckets privés + URLs signées court‑terme.
	•	Minimisation : preferences.avatar ne contient que le strict nécessaire.
	•	Logs : pas de photos/biométriques bruts; userId autorisé pour corrélation.
	•	Droit à l’effacement (GDPR) : job supprime photos + body_scans + preferences.avatar.

⸻

17) Monitoring et Analytics

17.1 Tracking des Événements

// Analytics Body Scan
scanAnalytics.captureStarted({ device_model, scan_id });
scanAnalytics.photoTaken({ view, quality_scores, scan_id });
scanAnalytics.processingCompleted({ success, duration_ms, scan_id });

Événements complémentaires : estimateCompleted({confidence, scan_id}), semanticCompleted({confidence, adjustments, scan_id}), matchCompleted({coherence, scan_id}), refineCompleted({clamped_keys, ai_confidence, scan_id}), commitCompleted({scan_id}).

17.2 Métriques de Performance
	•	Temps de traitement : par étape + pipeline complète.
	•	Qualité photos : scores & taux de rejet.
	•	Confiance IA : distributions par étape.
	•	Erreurs : taux d’échec par composant + codes d’erreur.

17.3 Tableaux de Bord & Alerting
	•	SLO : E2E p95 <45s (alerte à 55s).
	•	Budget erreurs : violations enveloppe/BDD >0 → alerte.
	•	Drift : suivi hebdo des deltas moyens vs bornes K=5/BDD.

⸻

18) Configuration & Environnement
	•	Runtime : Supabase Edge (Deno) • Frontend : React + Three.js.
	•	Secrets : clés IA, DB, signatures storage (gestion Supabase).
	•	Feature flags : skinTone.model=v2 (forcé), faceScan.enabled=false, muscularGating.strict=true.

Variables d’env. (ex.)

AI_PROVIDER_KEY=...
DB_URL=...
DB_ANON_KEY=...
STORAGE_BUCKET_AVATARS=avatars


⸻

19) Runbooks & Dépannage

Violations enveloppe > 0 : vérifier construction K=5 (exactement 5 archétypes) et clamp avant bornes BDD/genre.
Drift des règles de genre : contrôler allow‑list + ranges de politiques; ignorer côté front, coercer côté serveur.
Masses non numériques : filtrer avant persistance/rendu.
Cache genre obsolète : bust sur changement resolved_gender.

Récupération : reconstruire le fast‑path depuis le body_scans le plus récent; régénérer URLs signées.

⸻

20) Extension — Mode Face Scan
	•	Nouveau face-estimate (landmarks/mesures cranio‑faciales).
	•	Optionnel face-match + enveloppe faciale.
	•	Matériaux : micro‑détails peau + shaders yeux.
	•	Persistance : user_profile.preferences.face (sous‑arbre séparé, compat. ascendante).

⸻

21) Contrôle des Changements
	•	SemVer pour le pipeline.
	•	Toute évolution des contrats ou politiques met à jour cette page et incrémente MINOR a minima.
	•	Tracer mapping_version dans refine_result.

⸻

22) Glossaire
	•	K=5 envelope : bornes min/max par morph issues des 5 archétypes les plus proches.
	•	DB‑first : BDD = source de vérité (bornes, vocabulaires, allow‑lists).
	•	Resolved gender : genre normalisé pour le choix du base mesh et les politiques.

⸻

23) Annexes — Formes des Logs Structurés

Photo Capture

{ "level":"info", "message":"📸 [PhotoCapture] Capture report created", "context": { "clientScanId":"<string>", "type":"front|profile", "hasValidation":true, "hasSkinTone":true, "skinToneConfidence": <0.0-1.0> } }

Estimate

{ "level":"info", "message":"Scan-estimate completed successfully", "context": { "clientScanId":"<string>", "confidence": <0.0-1.0>, "hasSkinTone": true } }

Semantic

{ "level":"info", "message":"Scan-semantic completed successfully", "context": { "clientScanId":"<string>", "semanticConfidence": <0.0-1.0>, "adjustmentsMade": <int> } }

Match

{ "level":"info", "message":"Scan-match AUDIT: Completed successfully", "context": { "clientScanId":"<string>", "userBMI": <number>, "selectedArchetypesCount": 5, "semanticCoherenceScore": <0.0-1.0> } }

Refine

{ "level":"info", "message":"Scan-refine-morphs completed successfully", "context": { "clientScanId":"<string>", "finalShapeParamsCount": <int>, "finalLimbMassesCount": <int>, "clampedKeysCount": <int>, "envelopeViolationsCount": 0, "dbViolationsCount": 0 } }

Commit

{ "level":"info", "message":"Scan-commit completed successfully", "context": { "clientScanId":"<string>", "serverScanId":"<uuid>", "dataKeys": ["success","scan_id","processing_complete"] } }

— Fin du document —