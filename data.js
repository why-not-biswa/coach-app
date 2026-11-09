/* Coach app plan data. Source: knowledge-base-v1.md + plan v3. Edit here to change the plan. */
(function () {
  // X(id, name, dose, why, options)
  // options: sec (section), k (kind: reps | hold | timed | interval | info), sets, reps, s (work seconds),
  // rest (seconds), m (muscles), pl (plane), j (joint actions), c (contraction), from/to (season block range), q (video search)
  function X(id, name, dose, why, o) { return Object.assign({ id: id, name: name, dose: dose, why: why, k: 'reps', sets: 1, rest: 60, m: [] }, o || {}); }

  // Tennis-ball series: run as timed steps inside the exercise (player shows one drill at a time). q = video search words.
  var DRILLS = [
    { n: 'Wall toss, alternate hands', d: 'Stand 1.5 m from the wall. Throw and catch, right then left. Keep a steady rhythm.', q: 'tennis ball wall toss alternate hands drill' },
    { n: 'Cross catch', d: 'Throw with the right, catch with the left. Halfway, switch sides.', q: 'tennis ball cross catch drill' },
    { n: 'Single-leg wall toss', d: 'Stand on one leg and toss. Halfway, switch legs. Grip the floor with the foot.', q: 'single leg tennis ball wall toss balance drill' },
    { n: 'Peripheral catch', d: 'Fix your eyes on one mark. Toss the ball to the edge of your vision and catch it without moving your eyes.', q: 'peripheral vision ball catch drill' },
    { n: 'Drop catch', d: 'Hold the ball at shoulder height, drop it, and catch it with the other hand before the second bounce.', q: 'tennis ball drop catch reaction drill' },
    { n: 'Foot control', d: 'Tap the ball with alternate soles, then roll it in a figure 8 between your feet.', q: 'tennis ball foot control drill' },
    { n: 'Two-ball wall juggle', d: 'Two balls against the wall, one in each hand. Stay relaxed.', from: 1, q: 'two ball wall juggle drill' }
  ];
  // parts: one exercise item made of steps that the player runs one by one, each with its own timer and video search.
  // { n: name, s: seconds (timed) OR r: reps / x: text such as '20 m' (waits for a tap), sets (default 1),
  //   rest: seconds after each set (and before the next part), q: video search words, d: how-to text }.
  // The item keeps its ID, so logs stay the same. Each split keeps the coach's total time and dose.
  // Coach to confirm (the dose does not give the split):
  //   m_cars (90 s over 7 joints), n_cat (60 + 30 + 30), n_9090 (60 s for the switches),
  //   n_neck (20 s for 10 nods; wrist stretches 15 s each, one arm), r_yoga (all part times),
  //   fa_wu (8 min = 4 × 2 min), fb_wu (6 min = 3 × 2 min),
  //   fb_drill (A-skip and B-skip 2 × 20 m each; 30 s rest between sets),
  //   a_plate (2 × 6 / direction of each movement, one movement at a time), b_ytw (wrist circles 6 / direction),
  //   b_cd4 and b_cd5 (right side first).
  var TENNIS = [
    'Wall toss, alternate hands, 1.5 m from the wall (60 s): both hands, rhythm',
    'Cross catch: throw right, catch left (30 s / side): timing',
    'Single-leg wall toss (30 s / leg): balance, ankle control',
    'Peripheral catch: eyes fixed on one mark, toss to the edge of vision (60 s)',
    'Drop catch: drop from shoulder height, catch before the 2nd bounce with the other hand (60 s): reaction',
    'Foot control: alternate sole taps, then figure-8 between the feet (60 s)',
    'Two-ball wall juggle (60 s, from Block 1): focus'
  ];

  var S = {};

  S.morning = { id: 'morning', name: 'Morning flow', short: 'AM', load: 'Low', mins: 10, items: [
    X('m_croc', 'Crocodile breathing', '6 breaths · 4 s in / 6 s out · nose', 'Breath leads. The diaphragm pumps lymph and venous blood; the lymph system has no pump of its own. Stops desk chest-breathing.', { sec: 'Wake up', k: 'timed', s: 60, m: ['abs', 'lowback'], pl: 'n/a', j: 'Diaphragm', c: 'Breathing' }),
    X('m_roll', 'Tennis-ball foot roll', '30 s / foot', 'Fascia work. Rolling the sole gave short-term hamstring and ankle range gains; half the gain came in the first 2 min (Wilke 2021).', { sec: 'Wake up', k: 'hold', sets: 2, s: 30, rest: 5, m: ['feet'], c: 'Pressure' }),
    X('m_foot', 'Short foot holds + towel scrunches', '5 × 5 s / foot, then 30 s scrunches', 'Flat feet. Short foot improved foot posture in programs over 6 weeks (Cheng 2024). Towel scrunches kept by your choice.', { sec: 'Wake up', k: 'hold', m: ['feet', 'tibialis'], pl: 'Frontal', j: 'Arch lift', c: 'Isometric', parts: [
      { n: 'Short foot hold · left', s: 5, sets: 5, rest: 5, q: 'short foot exercise' },
      { n: 'Short foot hold · right', s: 5, sets: 5, rest: 5, q: 'short foot exercise' },
      { n: 'Towel scrunches', s: 30, q: 'towel scrunches foot exercise' }] }),
    X('m_cars', 'Joint circles (CARs)', '2 slow circles / direction: neck, shoulders, elbows, wrists, hips, knees, ankles', 'Bulletproof joints every day. Neck: pain-free range only, no far tilt back.', { sec: 'Joints', k: 'timed', m: ['neck', 'delts', 'forearms', 'hipflexors', 'glutes', 'calves'], pl: 'All', j: 'All joints', c: 'Controlled rotation', parts: [
      { n: 'Neck circles', s: 12, q: 'neck CARs controlled articular rotation' },
      { n: 'Shoulder circles', s: 13, q: 'shoulder CARs controlled articular rotation' },
      { n: 'Elbow circles', s: 13, q: 'elbow CARs controlled articular rotation' },
      { n: 'Wrist circles', s: 13, q: 'wrist CARs controlled articular rotation' },
      { n: 'Hip circles', s: 13, q: 'hip CARs controlled articular rotation' },
      { n: 'Knee circles', s: 13, q: 'knee CARs controlled articular rotation' },
      { n: 'Ankle circles', s: 13, q: 'ankle CARs controlled articular rotation' }] }),
    X('m_surya', 'Surya Namaskar', '2 slow rounds · 1 breath per pose', 'Yoga. Hip flexion and extension, ankle dorsiflexion in Downward Dog, spine flexion and extension.', { sec: 'Joints', k: 'timed', s: 120, m: ['hipflexors', 'hamstrings', 'calves', 'lowback', 'chest', 'delts'], pl: 'Sagittal', j: 'Hip, spine, ankle', c: 'Dynamic' }),
    X('m_rope', 'Easy rope skipping (or bounce in place)', '45 s · relaxed', 'Calf muscle pump moves lymph and blood. Ankle stiffness for footwork. Rope is a core ProBodX tool.', { sec: 'Joints', k: 'timed', s: 45, m: ['calves', 'feet'], pl: 'Sagittal', j: 'Ankle', c: 'Fast SSC' }),
    X('m_span', 'Spanish squat hold (band behind knees)', '1 × 30–45 s', 'Quad and knee-tendon load with low knee shear. Protects the knees from jump volume.', { sec: 'Basic strength · Flow A', flow: 'A', k: 'hold', s: 40, m: ['quads'], pl: 'Sagittal', j: 'Knee flexion hold', c: 'Isometric' }),
    X('m_wrist', 'Wrist-extension isometric', '30 s / hand · ~70% effort', 'Tennis elbow. Isometrics are well tolerated and may reduce pain short term (evidence limited long term).', { sec: 'Basic strength · Flow A', flow: 'A', k: 'hold', sets: 2, s: 30, rest: 10, m: ['forearms'], pl: 'Sagittal', j: 'Wrist extension', c: 'Isometric' }),
    X('m_neck', 'Neck isometrics (front, back, sides)', '10 s / direction · 50% effort', 'Traps and neck. Weaker necks are linked to more concussions (Collins 2014). No over-extension.', { sec: 'Basic strength · Flow A', flow: 'A', k: 'hold', sets: 4, s: 10, rest: 5, m: ['neck', 'traps'], pl: 'All', j: 'Neck', c: 'Isometric' }),
    X('m_deep', 'Deep squat practice (hold a door frame)', '60 s total', 'You cannot sit in a deep squat yet. Daily time at depth = ladder steps L1–L5.', { sec: 'Basic strength · Flow B', flow: 'B', k: 'hold', s: 60, m: ['quads', 'glutes', 'adductors', 'calves'], pl: 'Sagittal', j: 'Triple flexion', c: 'Isometric (long-length)' }),
    X('m_calf', 'Slow calf raise on a step (3 s down)', '1 × 10', 'Calves and ankle range. Loaded full-range work increases range like stretching (Afonso 2021).', { sec: 'Basic strength · Flow B', flow: 'B', reps: 10, m: ['calves'], pl: 'Sagittal', j: 'Plantarflexion', c: 'Eccentric focus' }),
    X('m_hollow', 'Hollow hold', '1 × 20–30 s', 'Core position for levers and handstand.', { sec: 'Basic strength · Flow B', flow: 'B', k: 'hold', s: 25, m: ['abs', 'hipflexors'], pl: 'Sagittal', j: 'Anti-extension', c: 'Isometric' }),
    X('m_box', 'Box breathing', '30 s · 4-4-4-4', 'Finish alert and calm.', { sec: 'Close', k: 'timed', s: 30, m: ['abs'], c: 'Breathing' })
  ]};

  S.night = { id: 'night', name: 'Night release', short: 'PM', load: 'Low', mins: 20, items: [
    X('n_cat', 'Cat–cow, then thread the needle', '2 min · breath-led', 'Spine flexion, extension, rotation after the desk.', { k: 'timed', m: ['lowback', 'upperback'], pl: 'Sagittal + Transverse', j: 'Spine', c: 'Dynamic', parts: [
      { n: 'Cat–cow', s: 60, q: 'cat cow stretch' },
      { n: 'Thread the needle · left', s: 30, q: 'thread the needle stretch' },
      { n: 'Thread the needle · right', s: 30, q: 'thread the needle stretch' }] }),
    X('n_ball', 'Tennis-ball release: forearm extensors, upper traps', '45 s R forearm · 30 s L · 30 s / trap', 'Tennis elbow and traps. Short-term relief; the strength work fixes the tendon.', { k: 'timed', m: ['forearms', 'traps'], c: 'Pressure', parts: [
      { n: 'Forearm extensors · right', s: 45, q: 'tennis ball forearm extensor release' },
      { n: 'Forearm extensors · left', s: 30, q: 'tennis ball forearm extensor release' },
      { n: 'Upper trap · right', s: 30, q: 'tennis ball upper trap release' },
      { n: 'Upper trap · left', s: 30, q: 'tennis ball upper trap release' }] }),
    X('n_hip', 'Half-kneeling hip-flexor stretch (glute squeezed, arm up)', '60 s / side', 'Opens hip extension. The desk keeps hips in flexion; power comes from extension.', { k: 'hold', sets: 2, s: 60, rest: 5, m: ['hipflexors', 'quads'], pl: 'Sagittal', j: 'Hip extension', c: 'Static stretch' }),
    X('n_calf', 'Wall calf stretch: straight knee, then bent knee', '30 s + 30 s / leg', 'Tight ankles. Static calf stretch: about 2–3° gain (Young 2013).', { k: 'hold', m: ['calves'], pl: 'Sagittal', j: 'Dorsiflexion', c: 'Static stretch', parts: [
      { n: 'Straight knee · left', s: 30, rest: 5, q: 'wall calf stretch straight knee gastrocnemius' },
      { n: 'Bent knee · left', s: 30, rest: 5, q: 'wall calf stretch bent knee soleus' },
      { n: 'Straight knee · right', s: 30, rest: 5, q: 'wall calf stretch straight knee gastrocnemius' },
      { n: 'Bent knee · right', s: 30, q: 'wall calf stretch bent knee soleus' }] }),
    X('n_ham', 'Hamstring: nerve sliders (if self-test positive) or strap stretch', '2 × 10 / side, or 45 s / side', 'Ankle position changes hamstring range through nerve tension. Gentle sliding if the nerve is the cause.', { k: 'reps', sets: 4, reps: 10, rest: 10, m: ['hamstrings'], pl: 'Sagittal', j: 'Hip flexion, knee extension', c: 'Neural glide' }),
    X('n_9090', '90/90 hip switches, then hold each side', '6 switches · 30 s / side', 'Hip internal and external rotation: base of rotational power.', { k: 'timed', m: ['glutes', 'adductors', 'hipflexors'], pl: 'Transverse', j: 'Hip rotation', c: 'Dynamic + hold', parts: [
      { n: '90/90 hip switches · 6 slow', s: 60, q: '90 90 hip switch' },
      { n: '90/90 hold · left', s: 30, q: '90 90 hip stretch' },
      { n: '90/90 hold · right', s: 30, q: '90 90 hip stretch' }] }),
    X('n_squat', 'Supported deep squat, then child\'s pose', '60 s + 30 s', 'More time at depth; begin relaxation.', { k: 'timed', m: ['quads', 'glutes', 'adductors', 'lowback'], c: 'Isometric (long-length)', parts: [
      { n: 'Supported deep squat', s: 60, q: 'supported deep squat hold' },
      { n: 'Child\'s pose', s: 30, q: 'child\'s pose' }] }),
    X('n_neck', 'Neck side stretch, chin nods, wrist stretches', '20 s / side · 10 nods · 15 s each', 'Neck and wrists every day. No neck extension.', { k: 'timed', m: ['neck', 'traps', 'forearms'], c: 'Static stretch', parts: [
      { n: 'Neck side stretch · left', s: 20, q: 'neck side stretch' },
      { n: 'Neck side stretch · right', s: 20, q: 'neck side stretch' },
      { n: 'Chin nods · 10 slow', s: 20, q: 'chin nod deep neck flexor exercise' },
      { n: 'Wrist flexor stretch', s: 15, q: 'wrist flexor stretch' },
      { n: 'Wrist extensor stretch', s: 15, q: 'wrist extensor stretch' }] }),
    X('n_sigh', 'Legs up the wall + cyclic sighing', '5 min · 2 nose inhales, 1 long mouth exhale', 'Cyclic sighing 5 min/day improved mood more than meditation (Balban 2023). Slow breathing raises vagal HRV (Laborde 2022).', { k: 'timed', s: 300, m: ['abs'], c: 'Breathing' })
  ]};

  S.boxing = { id: 'boxing', name: 'Boxing + Armor', short: 'BOX', load: 'High', mins: 85, items: [
    X('bx_class', 'Boxing class (your coach plans it)', '60 min · warm-up, shadow, technique, bag, cool-down', 'Not planned here. Log RPE and notes only.', { sec: 'Class', k: 'timed', s: 3600, m: ['delts', 'obliques', 'calves', 'glutes'], pl: 'Transverse', c: 'Mixed' }),
    X('ar_neck', 'Neck 4-way isometric (hand or towel)', '2 × 10 s / direction · 50–70%', 'Neck strength linked to lower concussion odds (Collins 2014). Block 1: band; Block 2: plate neck curls.', { sec: 'Armor · neck and traps', k: 'hold', sets: 8, s: 10, rest: 10, m: ['neck', 'traps'], pl: 'All', j: 'Neck', c: 'Isometric' }),
    X('ar_shrug', 'Shrug, 2 s hold at the top', '2 × 15', 'Your traps get injured often. A strong trap tolerates punches and clinch.', { sec: 'Armor · neck and traps', sets: 2, reps: 15, m: ['traps'], pl: 'Frontal', j: 'Scapular elevation', c: 'Concentric + hold' }),
    X('ar_carry', 'Farmer carry', '2 × 30 m', 'Grip, forearms, traps, core together.', { sec: 'Armor · neck and traps', k: 'timed', sets: 2, s: 30, rest: 60, m: ['forearms', 'traps', 'obliques', 'abs'], c: 'Isometric' }),
    X('ar_y', 'Prone Y-raise (lower trap)', '2 × 10 · 2 s hold', 'Balances the upper trap; keeps the shoulder blade down when you punch.', { sec: 'Armor · neck and traps', sets: 2, reps: 10, m: ['traps', 'upperback', 'reardelts'], pl: 'Frontal', j: 'Scapular depression', c: 'Concentric + hold' }),
    X('ar_wiso', 'Wrist-extension isometric with dumbbell', '3 × 30–45 s · pain ≤ 3/10', 'Short-term pain relief; tendon load.', { sec: 'Armor · elbow rehab', k: 'hold', sets: 3, s: 40, rest: 45, m: ['forearms'], j: 'Wrist extension', c: 'Isometric' }),
    X('ar_wecc', 'Eccentric wrist extension (lower in 4 s)', '3 × 15 · 2–5 kg', 'Eccentric exercise improved pain and strength in tennis elbow (meta-analysis 2021).', { sec: 'Armor · elbow rehab', sets: 3, reps: 15, m: ['forearms'], j: 'Wrist flexion under load', c: 'Eccentric' }),
    X('ar_rot', 'Forearm rotation (dumbbell held at one end)', '2 × 12 / direction', 'The fist turns over in every straight punch.', { sec: 'Armor · elbow rehab', sets: 2, reps: 12, m: ['forearms'], pl: 'Transverse', j: 'Pronation / supination', c: 'Concentric + eccentric' }),
    X('ar_lock', 'Band triceps push-down to full lockout, slow', '2 × 15 · light', 'Rebuilds tolerance at lockout. Add load only if pain ≤ 3/10.', { sec: 'Armor · elbow rehab', sets: 2, reps: 15, m: ['triceps'], pl: 'Sagittal', j: 'Elbow extension', c: 'Concentric + eccentric' }),
    X('ar_pallof', 'Pallof press (band)', '2 × 10 / side · 2 s hold', 'Anti-rotation: resist rotation before you make it.', { sec: 'Armor · core and reaction', sets: 2, reps: 10, m: ['obliques', 'abs'], pl: 'Transverse', j: 'Anti-rotation', c: 'Isometric' }),
    X('ar_roll', 'Ab roller from the knees', '2 × 6–10', 'Anti-extension. Ladder track C.', { sec: 'Armor · core and reaction', sets: 2, reps: 8, m: ['abs', 'lats'], pl: 'Sagittal', j: 'Anti-extension', c: 'Eccentric + concentric' }),
    X('ar_tennis', 'Tennis-ball reaction series', '6 drills × 45 s', 'Focus, peripheral vision, balance, both hands and both legs, reaction time. Transfer to fight reaction time is not proven; treat it as coordination and focus practice.', { sec: 'Armor · core and reaction', k: 'drills', ds: 45, m: ['forearms', 'calves', 'feet'], c: 'Skill' })
  ]};

  S.gymA = { id: 'gymA', name: 'Gym A · legs, plyos, throws', short: 'GYM A', load: 'High', mins: 90, items: [
    X('a_rope', 'Rope skipping', '2 min', 'Raise temperature; ankle stiffness.', { sec: 'Warm-up', k: 'timed', s: 120, m: ['calves'], c: 'Fast SSC' }),
    X('a_tant', 'Tantrums: on your back, hit a yoga ball fast with your heels', '2 × 15 s', 'Fast hamstring and glute contractions. No ball: fast heel taps on the mat.', { sec: 'Warm-up', k: 'hold', sets: 2, s: 15, rest: 30, m: ['hamstrings', 'glutes'], pl: 'Sagittal', j: 'Hip extension, knee flexion', c: 'Fast concentric' }),
    X('a_span', 'Spanish squat band hold', '2 × 30 s', 'Knee-tendon prep before jumps.', { sec: 'Warm-up', k: 'hold', sets: 2, s: 30, rest: 30, m: ['quads'], j: 'Knee flexion hold', c: 'Isometric' }),
    X('a_ktw', 'Knee-to-wall ankle rocks', '10 / side', 'Tight ankles: dorsiflexion before squats and landings.', { sec: 'Warm-up', sets: 2, reps: 10, rest: 10, m: ['calves'], pl: 'Sagittal', j: 'Dorsiflexion', c: 'Dynamic' }),
    X('a_coss', 'Cossack squat to a box', '5 / side', 'Adductors and frontal-plane hip mobility. Ladder L7.', { sec: 'Warm-up', sets: 2, reps: 5, rest: 30, m: ['adductors', 'quads', 'glutes'], pl: 'Frontal', j: 'Hip abduction, knee flexion', c: 'Eccentric + concentric' }),
    X('a_pogo', 'Pogo jumps', '3 × 10', 'Fast stretch-shortening cycle; stiff ankles for footwork. Block 0 ≈ 60 contacts.', { sec: 'Plyos', sets: 3, reps: 10, rest: 60, m: ['calves', 'feet'], pl: 'Sagittal', j: 'Ankle', c: 'Fast SSC' }),
    X('a_lath', 'Lateral line hops', '2 × 10', 'Frontal-plane power; ankle control for flat feet.', { sec: 'Plyos', sets: 2, reps: 10, rest: 60, m: ['calves', 'adductors', 'glutes'], pl: 'Frontal', j: 'Ankle, hip', c: 'Fast SSC' }),
    X('a_latbox', 'Lateral jump onto a low box', '2 × 4 / side', '"Lateral + box". The box reduces landing force.', { sec: 'Plyos', sets: 2, reps: 4, rest: 60, m: ['glutes', 'quads', 'adductors'], pl: 'Frontal', j: 'Triple extension', c: 'Slow SSC' }),
    X('a_seat', 'Seated box jump', '3 × 3', 'Starts from zero speed: pure concentric power. Safe landing.', { sec: 'Plyos', sets: 3, reps: 3, rest: 75, m: ['quads', 'glutes', 'calves'], pl: 'Sagittal', j: 'Triple extension', c: 'Concentric (ballistic)' }),
    X('a_sciss', 'Scissor tuck jumps', 'Block 1 onward', 'High landing force. Wait until landings are clean.', { sec: 'Plyos', from: 1, sets: 3, reps: 4, rest: 75, m: ['quads', 'hipflexors', 'glutes'], pl: 'Sagittal', c: 'Slow SSC' }),
    X('a_drop', 'Drop jumps', 'Block 2 onward · 30–45 cm', 'Verkhoshansky shock method. Prerequisite: drop-and-stick in Block 1.', { sec: 'Plyos', from: 2, sets: 3, reps: 4, rest: 90, m: ['calves', 'quads', 'glutes'], pl: 'Sagittal', c: 'Fast SSC (shock)' }),
    X('a_scoop', 'Medicine-ball rotational scoop toss to a wall', '3 × 5 / side', 'Hip-led rotation, the chain of a hook. Ballistic: no slowing at the end.', { sec: 'Throws', sets: 3, reps: 5, rest: 60, m: ['obliques', 'glutes', 'abs'], pl: 'Transverse', j: 'Hip and trunk rotation', c: 'Ballistic' }),
    X('a_plate', 'Single-plate series (Russian): halos, around-the-world, chops', '2 × 6 / direction · 5–10 kg', 'Shoulder mobility under load; rotation and anti-rotation.', { sec: 'Throws', rest: 45, m: ['delts', 'obliques', 'abs', 'traps'], pl: 'Transverse + Frontal', j: 'Shoulder, trunk', c: 'Dynamic', parts: [
      { n: 'Plate halos', r: 6, x: '6 / direction', sets: 2, rest: 45, q: 'plate halo exercise' },
      { n: 'Plate around-the-world', r: 6, x: '6 / direction', sets: 2, rest: 45, q: 'plate around the world exercise' },
      { n: 'Plate chops', r: 6, x: '6 / direction', sets: 2, rest: 45, q: 'plate wood chop exercise' }] }),
    X('a_goblet', 'Goblet squat to a box (Block 2: barbell front squat)', '3 × 8 · RPE 6–7', 'Thighs. Weight in front = counterbalance for the deep squat.', { sec: 'Strength', sets: 3, reps: 8, rest: 120, m: ['quads', 'glutes', 'adductors'], pl: 'Sagittal', j: 'Hip and knee extension', c: 'Concentric + eccentric' }),
    X('a_step', 'Front-rack step-up', '3 × 8 / side · knee-height box', 'Single-leg drive like the rear leg in a cross. Upright posture.', { sec: 'Strength', sets: 3, reps: 8, rest: 90, m: ['quads', 'glutes', 'upperback'], pl: 'Sagittal', j: 'Hip and knee extension', c: 'Concentric' }),
    X('a_rfe', 'Rear-foot-elevated single-leg deadlift', '3 × 8 / side', 'Hamstrings, glutes, balance; arch control for flat feet.', { sec: 'Strength', sets: 3, reps: 8, rest: 90, m: ['hamstrings', 'glutes', 'lowback', 'feet'], pl: 'Sagittal', j: 'Hip hinge', c: 'Eccentric + concentric' }),
    X('a_curtsy', 'Landmine curtsy lunge (angled barbell)', '2 × 8 / side', 'Hip control in frontal and transverse planes; protects the knee when you pivot.', { sec: 'Strength', sets: 2, reps: 8, rest: 75, m: ['glutes', 'adductors', 'quads'], pl: 'Frontal + Transverse', j: 'Hip adduction, rotation', c: 'Eccentric + concentric' }),
    X('a_nordic', 'Nordic curl (feet under padded loaded barbell)', '2 × 3 slow lowers', 'About 50% fewer hamstring injuries (van Dyk 2019). Catch with your hands.', { sec: 'Strength', sets: 2, reps: 3, rest: 120, m: ['hamstrings'], pl: 'Sagittal', j: 'Knee flexion', c: 'Eccentric' }),
    X('a_calf', 'Calf raise (straight + bent knee, 3 s down) + tibialis raise', '2 × 12 each · 2 × 15', 'Calves, ankles, knees. Tibialis supports the arch and shins.', { sec: 'Strength', rest: 45, m: ['calves', 'tibialis'], pl: 'Sagittal', j: 'Plantar / dorsiflexion', c: 'Eccentric focus', parts: [
      { n: 'Calf raise · straight knee, 3 s down', r: 12, sets: 2, rest: 45, q: 'straight knee calf raise slow eccentric' },
      { n: 'Calf raise · bent knee, 3 s down', r: 12, sets: 2, rest: 45, q: 'bent knee calf raise soleus' },
      { n: 'Tibialis raise', r: 15, sets: 2, rest: 45, q: 'tibialis raise' }] }),
    X('a_twist', 'Medicine-ball throws in a Russian twist', '2 × 10 / side · 3–4 kg', 'Rotational power with a release.', { sec: 'Loaded core', sets: 2, reps: 10, rest: 45, m: ['obliques', 'abs'], pl: 'Transverse', j: 'Trunk rotation', c: 'Ballistic' }),
    X('a_seesaw', 'Weighted see-saws (form to confirm)', '2 × 8 / side', 'Your listed exercise. Dose set when the form is confirmed.', { sec: 'Loaded core', sets: 2, reps: 8, rest: 45, m: ['abs', 'obliques'], c: 'TBC' }),
    X('a_kswing', 'Barbell knee swings (form to confirm)', '2 × 8 / side', 'Your listed exercise. Dose set when the form is confirmed.', { sec: 'Loaded core', sets: 2, reps: 8, rest: 45, m: ['abs', 'obliques', 'hipflexors'], c: 'TBC' }),
    X('a_hollow', 'Hollow hold (Block 2: plate overhead)', '3 × 20–30 s', 'Anti-extension: base of levers and handstand.', { sec: 'Loaded core', k: 'hold', sets: 3, s: 25, rest: 45, m: ['abs', 'hipflexors'], pl: 'Sagittal', j: 'Anti-extension', c: 'Isometric' }),
    X('a_cd1', 'Easy walk or very slow rope', '60 s · HR below 120', 'Brings heart rate down gradually.', { sec: 'Cool-down', k: 'timed', s: 60, m: ['calves'] }),
    X('a_cd2', 'Half-kneeling quad and hip-flexor stretch', '30 s / side', 'Quads and hip flexors after squats, step-ups, lunges.', { sec: 'Cool-down', k: 'hold', sets: 2, s: 30, rest: 5, m: ['quads', 'hipflexors'], c: 'Static stretch' }),
    X('a_cd3', 'Standing hamstring stretch, light', '20 s / side', 'After Nordics and RDLs. Light: eccentric damage, do not force range.', { sec: 'Cool-down', k: 'hold', sets: 2, s: 20, rest: 5, m: ['hamstrings'], c: 'Static stretch' }),
    X('a_cd4', 'Adductor rock-back', '8 slow rocks / side', 'Adductors after Cossacks and lateral jumps.', { sec: 'Cool-down', sets: 2, reps: 8, rest: 5, m: ['adductors'], c: 'Dynamic stretch' }),
    X('a_cd5', 'Wall calf stretch: straight, then bent knee', '15 s + 15 s / leg', 'Calves and Achilles after pogos.', { sec: 'Cool-down', k: 'hold', m: ['calves'], c: 'Static stretch', parts: [
      { n: 'Straight knee · left', s: 15, rest: 3, q: 'wall calf stretch straight knee gastrocnemius' },
      { n: 'Bent knee · left', s: 15, rest: 3, q: 'wall calf stretch bent knee soleus' },
      { n: 'Straight knee · right', s: 15, rest: 3, q: 'wall calf stretch straight knee gastrocnemius' },
      { n: 'Bent knee · right', s: 15, q: 'wall calf stretch bent knee soleus' }] }),
    X('a_cd6', '90/90 breathing (feet on a box)', '45 s · long exhale', 'Moves the body toward rest.', { sec: 'Cool-down', k: 'timed', s: 45, m: ['abs'], c: 'Breathing' })
  ]};

  S.gymB = { id: 'gymB', name: 'Gym B · pull, push, rotation', short: 'GYM B', load: 'Med–High', mins: 90, items: [
    X('b_rope', 'Rope skipping', '2 min', 'Raise temperature.', { sec: 'Warm-up', k: 'timed', s: 120, m: ['calves'] }),
    X('b_scap', 'Band pull-aparts · scapular pull-ups · push-up plus', '15 · 8 · 10', 'Shoulder-blade control before load.', { sec: 'Warm-up', rest: 20, m: ['upperback', 'traps', 'chest', 'reardelts'], pl: 'Frontal + Transverse', j: 'Scapula', c: 'Dynamic', parts: [
      { n: 'Band pull-aparts', r: 15, rest: 20, q: 'band pull apart' },
      { n: 'Scapular pull-ups', r: 8, rest: 20, q: 'scapular pull up' },
      { n: 'Push-up plus', r: 10, q: 'push up plus serratus' }] }),
    X('b_ytw', 'Y-T-W on incline bench · wrist circles', '6 each', 'Lower trap, rotator cuff, wrists.', { sec: 'Warm-up', rest: 15, m: ['traps', 'reardelts', 'forearms'], c: 'Concentric', parts: [
      { n: 'Y-raise on incline bench', r: 6, rest: 15, q: 'incline bench Y raise' },
      { n: 'T-raise on incline bench', r: 6, rest: 15, q: 'incline bench T raise' },
      { n: 'W-raise on incline bench', r: 6, rest: 15, q: 'incline bench W raise' },
      { n: 'Wrist circles', r: 6, x: '6 / direction', q: 'wrist circles warm up' }] }),
    X('b_bthrow', 'Bench press throws (Smith; or lying med-ball chest throw)', '4 × 3 · light, max speed', 'Ballistic push: the force path of a straight punch.', { sec: 'Power and throws', sets: 4, reps: 3, rest: 90, m: ['chest', 'triceps', 'delts'], pl: 'Sagittal', j: 'Shoulder flexion, elbow extension', c: 'Ballistic' }),
    X('b_slam', 'Medicine-ball overhead slam', '3 × 5', 'Full-body power with a hard exhale.', { sec: 'Power and throws', sets: 3, reps: 5, rest: 60, m: ['lats', 'abs', 'triceps'], pl: 'Sagittal', c: 'Ballistic' }),
    X('b_lpunch', 'Half-kneeling landmine punch-press', '3 × 5 / side · fast', 'Soviet-style punch strength with a safe arc. Do not punch with loose weights.', { sec: 'Power and throws', sets: 3, reps: 5, rest: 60, m: ['delts', 'chest', 'triceps', 'obliques'], pl: 'Transverse + Sagittal', c: 'Dynamic effort' }),
    X('b_pull', 'Strict pull-ups', '5 × 3–4 (~50% of max)', 'Grease the Groove: many quality reps far from failure. Ladder P.', { sec: 'Strength', ladRef: 'P', sets: 5, reps: 3, rest: 90, m: ['lats', 'biceps', 'upperback', 'forearms'], pl: 'Frontal', j: 'Shoulder adduction, elbow flexion', c: 'Concentric + eccentric' }),
    X('b_lpress', 'Half-kneeling landmine press', '3 × 8 / side', 'Strong, mobile shoulders without loading neck and traps overhead.', { sec: 'Strength', sets: 3, reps: 8, rest: 75, m: ['delts', 'triceps', 'abs'], pl: 'Sagittal', j: 'Shoulder flexion', c: 'Concentric + eccentric' }),
    X('b_row', 'Chest-supported row', '3 × 10', 'Upper-back posture; protects neck and traps.', { sec: 'Strength', sets: 3, reps: 10, rest: 75, m: ['upperback', 'lats', 'reardelts', 'biceps'], pl: 'Sagittal', j: 'Shoulder extension, retraction', c: 'Concentric + eccentric' }),
    X('b_dip', 'Dips', '3 × 6–8 · stop at 3/10 elbow pain', 'Ladder U.', { sec: 'Strength', ladRef: 'U', sets: 3, reps: 7, rest: 90, m: ['chest', 'triceps', 'delts'], pl: 'Sagittal', j: 'Shoulder extension, elbow extension', c: 'Concentric + eccentric' }),
    X('b_lrot', 'Landmine rotation (angled barbell)', '3 × 6 / side', 'Rotational strength; turn from the hips.', { sec: 'Strength', sets: 3, reps: 6, rest: 60, m: ['obliques', 'glutes', 'delts'], pl: 'Transverse', j: 'Hip and trunk rotation', c: 'Concentric + eccentric' }),
    X('b_bext', '45° back extension, 2 s hold at top', '2 × 12', 'Glutes and spinal erectors; counters the desk posture.', { sec: 'Strength', sets: 2, reps: 12, rest: 60, m: ['lowback', 'glutes', 'hamstrings'], pl: 'Sagittal', j: 'Hip and spine extension', c: 'Concentric + hold' }),
    X('b_face', 'Face pull + band external rotation', '2 × 15 · 2 × 12', 'Shoulder health after many punches.', { sec: 'Strength', rest: 45, m: ['reardelts', 'upperback', 'traps'], pl: 'Transverse', j: 'External rotation', c: 'Concentric', parts: [
      { n: 'Face pull', r: 15, sets: 2, rest: 45, q: 'cable face pull' },
      { n: 'Band external rotation', r: 12, sets: 2, rest: 45, q: 'band shoulder external rotation' }] }),
    X('b_grip', 'Plate pinch hold or wrist roller', '2 × 30 s', 'Forearm strength.', { sec: 'Strength', k: 'hold', sets: 2, s: 30, rest: 60, m: ['forearms'], c: 'Isometric' }),
    X('b_roll', 'Ab roller from the knees', '3 × 6–8', 'Anti-extension. Ladder C.', { sec: 'Core', sets: 3, reps: 7, rest: 60, m: ['abs', 'lats'], pl: 'Sagittal', j: 'Anti-extension', c: 'Eccentric + concentric' }),
    X('b_knee', 'Hanging knee raise', '2 × 10', 'Path to levers; adds hang time for grip.', { sec: 'Core', sets: 2, reps: 10, rest: 60, m: ['abs', 'hipflexors', 'forearms'], pl: 'Sagittal', j: 'Hip flexion', c: 'Concentric + eccentric' }),
    X('b_cd1', 'Easy walk or very slow rope', '45 s · HR below 120', 'Heart rate down gradually.', { sec: 'Cool-down', k: 'timed', s: 45, m: ['calves'] }),
    X('b_cd2', 'Dead hang, relaxed', '30 s', 'Lengthens the lats; decompresses the spine.', { sec: 'Cool-down', k: 'hold', s: 30, m: ['lats', 'forearms'], c: 'Static stretch' }),
    X('b_cd3', 'Doorway or rack chest stretch', '30 s / side', 'Chest after throws and dips; counters guard posture.', { sec: 'Cool-down', k: 'hold', sets: 2, s: 30, rest: 5, m: ['chest', 'delts'], c: 'Static stretch' }),
    X('b_cd4', 'Forearm flexor, then extensor stretch (gentle)', '20 s each / arm', 'Keeps the right elbow calm. No pain.', { sec: 'Cool-down', k: 'hold', m: ['forearms'], c: 'Static stretch', parts: [
      { n: 'Forearm flexor stretch · right', s: 20, rest: 3, q: 'wrist flexor stretch' },
      { n: 'Forearm extensor stretch · right', s: 20, rest: 3, q: 'wrist extensor stretch' },
      { n: 'Forearm flexor stretch · left', s: 20, rest: 3, q: 'wrist flexor stretch' },
      { n: 'Forearm extensor stretch · left', s: 20, q: 'wrist extensor stretch' }] }),
    X('b_cd5', 'Upper-trap and levator stretch', '20 s / side each', 'Traps get injured often. No neck extension.', { sec: 'Cool-down', k: 'hold', m: ['traps', 'neck'], c: 'Static stretch', parts: [
      { n: 'Upper-trap stretch · right', s: 20, rest: 3, q: 'upper trapezius stretch' },
      { n: 'Upper-trap stretch · left', s: 20, rest: 3, q: 'upper trapezius stretch' },
      { n: 'Levator stretch · right', s: 20, rest: 3, q: 'levator scapulae stretch' },
      { n: 'Levator stretch · left', s: 20, q: 'levator scapulae stretch' }] }),
    X('b_cd6', 'Slow nasal breathing, long exhale', '30 s', 'Moves the body toward rest.', { sec: 'Cool-down', k: 'timed', s: 30, m: ['abs'], c: 'Breathing' })
  ]};

  S.fieldA = { id: 'fieldA', name: 'Field A · aerobic + ladder', short: 'FLD A', load: 'Low–Med', mins: 80, items: [
    X('fa_wu', 'Warm-up: rope, leg swings, ankle rocks, A-march', '8 min', 'Prepares ankles and hips for running.', { sec: 'Warm-up', k: 'timed', m: ['calves', 'hipflexors', 'glutes'], parts: [
      { n: 'Rope skipping', s: 120, q: 'easy rope skipping warm up' },
      { n: 'Leg swings', s: 120, q: 'leg swings front and side' },
      { n: 'Ankle rocks', s: 120, q: 'knee to wall ankle rocks' },
      { n: 'A-march', s: 120, q: 'A march running drill' }] }),
    X('fa_z2', 'Zone 2 run–walk', 'Run 3 min / walk 1 min × 8 · 120–140 bpm', 'Aerobic base. You can run ~800 m now, so start with run–walk. ~80% of endurance training is low intensity (Seiler).', { sec: 'Aerobic', k: 'interval', sets: 8, s: 180, rest: 60, m: ['quads', 'calves', 'hamstrings', 'glutes'], pl: 'Sagittal', c: 'Aerobic' }),
    X('fa_lP', 'Ladder · Pull', 'Current step', 'Your current Pull step. Practise far from failure; test when fresh.', { sec: 'Ladder (25 min)', lad: 'P' }),
    X('fa_lU', 'Ladder · Push', 'Current step', 'Your current Push step.', { sec: 'Ladder (25 min)', lad: 'U' }),
    X('fa_lC', 'Ladder · Core', 'Current step', 'Your current Core step.', { sec: 'Ladder (25 min)', lad: 'C' }),
    X('fa_lH', 'Ladder · Handstand', 'Current step', 'Your current Handstand step.', { sec: 'Ladder (25 min)', lad: 'H' }),
    X('fa_split', 'Travel strength: split squat', '3 × 12 / side', 'Only when you cannot reach the gym.', { sec: 'Travel strength (no gym)', sets: 3, reps: 12, rest: 60, m: ['quads', 'glutes'], pl: 'Sagittal', c: 'Concentric + eccentric' }),
    X('fa_bridge', 'Travel strength: single-leg glute bridge', '3 × 12 / side', 'Glutes and hamstrings.', { sec: 'Travel strength (no gym)', sets: 3, reps: 12, rest: 45, m: ['glutes', 'hamstrings'], pl: 'Sagittal', j: 'Hip extension', c: 'Concentric + hold' }),
    X('fa_goblet', 'Travel strength: goblet squat 7.5 kg', '3 × 15', 'Thighs and deep-squat path.', { sec: 'Travel strength (no gym)', sets: 3, reps: 15, rest: 60, m: ['quads', 'glutes', 'adductors'], pl: 'Sagittal', c: 'Concentric + eccentric' }),
    X('fa_brow', 'Travel strength: band row', '3 × 15', 'Upper-back posture.', { sec: 'Travel strength (no gym)', sets: 3, reps: 15, rest: 45, m: ['upperback', 'lats', 'reardelts'], pl: 'Sagittal', c: 'Concentric + eccentric' }),
    X('fa_tennis', 'Tennis-ball series', '6 drills × 60 s', 'Focus, peripheral vision, balance, both hands and both legs, reaction time. Transfer to fight reaction time is not proven; treat it as coordination and focus practice.', { sec: 'Skill', k: 'drills', ds: 60, m: ['forearms', 'calves', 'feet'], c: 'Skill' }),
    X('fa_cd', 'Cool-down: walk + nasal breathing', '5 min', 'Down-regulation.', { sec: 'Cool-down', k: 'timed', s: 300, m: ['abs'] })
  ]};

  S.fieldB = { id: 'fieldB', name: 'Field B · speed, plyos, intervals', short: 'FLD B', load: 'High', mins: 80, items: [
    X('fb_wu', 'Rope, leg swings, walking lunge with rotation', '6 min', 'All three planes before speed work.', { sec: 'Warm-up', k: 'timed', m: ['hipflexors', 'glutes', 'obliques', 'calves'], parts: [
      { n: 'Rope skipping', s: 120, q: 'easy rope skipping warm up' },
      { n: 'Leg swings', s: 120, q: 'leg swings front and side' },
      { n: 'Walking lunge with rotation', s: 120, q: 'walking lunge with rotation' }] }),
    X('fb_drill', 'A-skip, B-skip, wall drill, pogo', '2 × 20 m · 3 × 5 s · 2 × 10', 'Sprint mechanics; strong ankles.', { sec: 'Warm-up', rest: 30, m: ['hipflexors', 'calves', 'glutes'], pl: 'Sagittal', c: 'Fast SSC', parts: [
      { n: 'A-skip', x: '20 m', sets: 2, rest: 30, q: 'A skip sprint drill' },
      { n: 'B-skip', x: '20 m', sets: 2, rest: 30, q: 'B skip sprint drill' },
      { n: 'Wall drill', s: 5, sets: 3, rest: 30, q: 'wall drill sprint acceleration' },
      { n: 'Pogo jumps', r: 10, sets: 2, rest: 30, q: 'pogo jumps' }] }),
    X('fb_fall', 'Falling start sprint', '4 × 10 m · 85–90%', 'Acceleration mechanics.', { sec: 'Accel · decel · COD', sets: 4, reps: 1, rest: 90, m: ['glutes', 'quads', 'calves', 'hamstrings'], pl: 'Sagittal', j: 'Triple extension', c: 'Concentric' }),
    X('fb_stop', 'Sprint, stop in 3 steps, hold 3 s', '4 × 10 m', 'Deceleration = eccentric strength; weak decel is a common knee-injury cause.', { sec: 'Accel · decel · COD', sets: 4, reps: 1, rest: 90, m: ['quads', 'glutes', 'hamstrings'], pl: 'Sagittal', j: 'Triple flexion', c: 'Eccentric' }),
    X('fb_cod', '5-10-5 pro agility', '3 × · 75% speed', 'Change-of-direction patterns. Block 2: T-drill. Block 3: reactive.', { sec: 'Accel · decel · COD', sets: 3, reps: 1, rest: 90, m: ['adductors', 'glutes', 'quads', 'calves'], pl: 'Frontal', c: 'Eccentric + concentric' }),
    X('fb_bstick', 'Lateral bound and stick', '2 × 4 / side', 'Landing control first.', { sec: 'Plyos', sets: 2, reps: 4, rest: 60, m: ['glutes', 'adductors', 'quads'], pl: 'Frontal', c: 'Eccentric (landing)' }),
    X('fb_bbroad', 'Lateral bound to broad jump', '2 × 3 / side', 'Side power into forward power, like footwork.', { sec: 'Plyos', sets: 2, reps: 3, rest: 75, m: ['glutes', 'quads', 'calves', 'adductors'], pl: 'Frontal → Sagittal', c: 'Slow SSC' }),
    X('fb_i0', 'Intervals: 8 × 1 min hard / 2 min walk', '150–165 bpm on the hard minute', 'Detrained: build tolerance before VO2max work.', { sec: 'Intervals', from: 0, to: 0, k: 'interval', sets: 8, s: 60, rest: 120, m: ['quads', 'calves', 'glutes', 'hamstrings'], c: 'Threshold' }),
    X('fb_4x4', 'Norwegian 4×4: 4 min at 90–95% HRmax / 3 min jog', '168–178 bpm', '4×4 raised VO2max about 7% in 8 weeks (Helgerud 2007).', { sec: 'Intervals', from: 1, to: 2, k: 'interval', sets: 4, s: 240, rest: 180, m: ['quads', 'calves', 'glutes', 'hamstrings'], c: 'VO2max' }),
    X('fb_rounds', 'Boxing rounds: 3 min hard / 1 min easy', '6–10 rounds', 'Fight-specific fatigue resistance (fatigue maximisation).', { sec: 'Intervals', from: 3, to: 4, k: 'interval', sets: 8, s: 180, rest: 60, m: ['delts', 'obliques', 'calves', 'quads'], c: 'Glycolytic' }),
    X('fb_lL', 'Ladder · Legs', 'Current step', 'Deep squat → Cossack → pistol. Your current Legs step.', { sec: 'Legs ladder (10 min)', lad: 'L' }),
    X('fb_cd', 'Cool-down: walk + nasal breathing', '5 min', 'Down-regulation.', { sec: 'Cool-down', k: 'timed', s: 300, m: ['abs'] })
  ]};

  S.recovery = { id: 'recovery', name: 'Recovery', short: 'REC', load: 'Low', mins: 85, items: [
    X('r_easy', 'Long easy movement: hike, walk, or easy jog', '45–60 min · below 135 bpm', 'Aerobic volume with no recovery cost.', { k: 'timed', s: 2700, m: ['quads', 'calves', 'glutes'], c: 'Aerobic' }),
    X('r_yoga', 'Yoga flow: 5 Surya Namaskar, low lunge, pigeon, lizard, forward fold', '20 min', 'Hips and ankles. Yoga has the best evidence for sleep among exercise types.', { k: 'timed', m: ['hipflexors', 'glutes', 'hamstrings', 'calves'], c: 'Dynamic + static', parts: [
      { n: 'Surya Namaskar · 5 rounds', s: 300, q: 'surya namaskar sun salutation' },
      { n: 'Low lunge · left', s: 120, q: 'low lunge yoga pose' },
      { n: 'Low lunge · right', s: 120, q: 'low lunge yoga pose' },
      { n: 'Pigeon · left', s: 150, q: 'pigeon pose yoga' },
      { n: 'Pigeon · right', s: 150, q: 'pigeon pose yoga' },
      { n: 'Lizard · left', s: 120, q: 'lizard pose yoga' },
      { n: 'Lizard · right', s: 120, q: 'lizard pose yoga' },
      { n: 'Forward fold', s: 120, q: 'standing forward fold yoga' }] }),
    X('r_lH', 'Ladder · Handstand (light)', 'Current step', 'Skill practice, not fatigue. Recovery day: practise only, no test.', { sec: 'Skill ladder (10 min)', lad: 'H', light: true }),
    X('r_lC', 'Ladder · Core (light)', 'Current step', 'Skill practice, not fatigue. Recovery day: practise only, no test.', { sec: 'Skill ladder (10 min)', lad: 'C', light: true }),
    X('r_tennis', 'Tennis-ball series', '6 drills × 45 s', 'Coordination and both sides, at an easy pace.', { k: 'drills', ds: 45, m: ['forearms', 'calves', 'feet'], c: 'Skill' })
  ]};

  var LADDER_MUSCLES = { P: ['lats', 'biceps', 'upperback', 'forearms'], U: ['chest', 'triceps', 'delts'], L: ['quads', 'glutes', 'adductors', 'calves'], C: ['abs', 'obliques', 'hipflexors'], H: ['delts', 'traps', 'triceps', 'forearms', 'abs'] };
  var LADDER = {
    P: { name: 'Pull', steps: ['Dead hang 30 s', 'Scap pull-ups 3 × 10', 'Dead hang 60 s', 'Negative pull-up 5 s × 5', 'Pull-ups 5', 'Pull-ups 8', 'Chin-ups 10 + active hang 30 s', 'Pull-ups 10', 'Pull-ups 3 × 8 (2 min rest)', 'Pull-ups 12', 'Weighted pull-up +5 kg × 5', 'Chest-to-bar pull-ups 8', 'Pull-ups 15', 'Weighted pull-up +10 kg × 5', 'Archer pull-ups 3 / side', 'L-sit pull-ups 8', 'Weighted pull-up +20 kg × 3', 'Archer pull-ups 6 / side', 'Typewriter pull-ups 4 / side', 'One-arm pull-up negative 5 s / side'] },
    U: { name: 'Push', steps: ['Push-ups 10', 'Push-ups 20', 'Push-ups 30', 'Diamond push-ups 15', 'Dips 10', 'Decline push-ups 20', 'Dips 15', 'Pike push-ups 12', 'Archer push-ups 6 / side', 'Dips 20', 'Elevated pike push-ups 10', 'Clap push-ups 10', 'Weighted dips +10 kg × 8', 'Pseudo-planche push-ups 10', 'Wall HSPU partial × 5', 'Archer push-ups 10 / side', 'Wall HSPU full × 5', 'Weighted dips +20 kg × 5', 'Incline one-arm push-up 5 / side', 'One-arm push-up 3 / side'] },
    L: { name: 'Legs', steps: ['Supported deep squat 60 s', 'Counterbalance deep squat (7.5 kg) 60 s', 'Heels-raised deep squat 60 s', 'Free deep squat, heels flat, 30 s', 'Deep squat 2 min total', 'Split squat 3 × 12 / side', 'Cossack squat to box 8 / side', 'RFE split squat 12 / side', 'Cossack squat full depth 8 / side', 'Deep squat 3 min relaxed', 'Pistol to high box 8 / side', 'Assisted shrimp squat 5 / side', 'Pistol to low box 8 / side', 'Weighted Cossack (7.5 kg) 8 / side', 'Assisted pistol (hold a post) 5 / side', 'Counterbalance pistol (7.5 kg) 5 / side', 'Shrimp squat 5 / side', 'Pistol 3 / side', 'Pistol 8 / side', 'Jumping pistol 3 / side'] },
    C: { name: 'Core', steps: ['Dead bug 10 / side', 'Hollow hold 20 s', 'Hollow hold 30 s', 'Hollow rocks 20', 'Hollow hold 45 s', 'Side plank 45 s / side', 'Ab roller (knees) 10', 'Hollow hold 60 s', 'Hanging knee raises 15', 'Tuck L-sit 15 s', 'Hanging leg raises 10', 'Ab roller (knees) full reach 15', 'L-sit 10 s', 'Tuck front lever 10 s', 'Toes-to-bar 10', 'Dragon flag negatives 5', 'Standing ab roller (partial) 5', 'Advanced tuck front lever 10 s', 'L-sit 20 s', 'One-leg front lever 5 s'] },
    H: { name: 'Handstand', steps: ['Feet-on-wall plank 30 s', 'Chest-to-wall handstand 30 s', 'Chest-to-wall 45 s', 'Chest-to-wall 60 s', 'Wall shoulder taps 10', 'Crow pose 20 s', 'Kick-up to wall, heel pulls 10', 'Chest-to-wall 90 s', 'Wall walks 5', 'Free handstand 3 × 3 s', 'Free handstand 5 s', 'Free handstand 10 s', 'Pike-press negative to wall 5', 'Free handstand 15 s', 'Free handstand 20 s', 'Handstand walk 5 steps', 'Free handstand 30 s', 'Tuck press to handstand at wall 3', 'Free handstand 45 s', 'Free handstand 60 s or 10-step walk'] }
  };

  // One broad benefit per exercise, in the language of your plan ("Tag — sentence").
  var BENEFIT = {
    m_croc: 'Recovery — wakes the breath and moves lymph.', m_roll: 'Mobility — frees the ankles and hamstrings for the day.', m_foot: 'Joint armor — builds the arch for flat feet.',
    m_cars: 'Joint armor — every joint through full range, daily.', m_surya: 'Mobility — opens hips, spine, and ankles.', m_rope: 'Footwork — light, springy ankles.',
    m_span: 'Joint armor — knee tendons ready for jumps.', m_wrist: 'Joint armor — calms and loads the tennis elbow.', m_neck: 'Boxing armor — a stronger neck takes punches better.',
    m_deep: 'Mobility — towards a free deep squat.', m_calf: 'Joint armor — strong calves, open ankles.', m_hollow: 'Core — the base of levers and handstands.', m_box: 'Focus — start the day calm and alert.',
    n_cat: 'Recovery — undo the desk posture.', n_ball: 'Recovery — release the forearm and traps.', n_hip: 'Mobility — open the hips that sat all day.', n_calf: 'Mobility — longer calves, freer ankles.',
    n_ham: 'Mobility — free hamstrings without forcing.', n_9090: 'Mobility — hip rotation for hooks.', n_squat: 'Mobility — more time in the deep squat.', n_neck: 'Recovery — relaxed neck and wrists.',
    n_sigh: 'Recovery — switch the nervous system to rest.',
    bx_class: 'Boxing — skill, rhythm, and ring fitness.', ar_neck: 'Boxing armor — neck strength protects the head.', ar_shrug: 'Boxing armor — strong traps, fewer strains.',
    ar_carry: 'Strength — grip, traps, and core as one.', ar_y: 'Joint armor — balanced shoulders for punching.', ar_wiso: 'Joint armor — tennis elbow rehab, step 1.',
    ar_wecc: 'Joint armor — tennis elbow rehab, step 2.', ar_rot: 'Boxing — a strong fist turn on every punch.', ar_lock: 'Joint armor — a pain-free punch lockout.',
    ar_pallof: 'Core — resist rotation before you make it.', ar_roll: 'Core — a strong front line.', ar_tennis: 'Reflexes — eyes, hands, and reaction.',
    a_rope: 'Warm-up — raise heat, wake the ankles.', a_tant: 'Power — fast hamstrings and glutes.', a_span: 'Joint armor — knee tendons ready for jumps.', a_ktw: 'Mobility — ankle range before loading.',
    a_coss: 'Mobility — side-to-side hip range.', a_pogo: 'Power — elastic ankles for footwork.', a_lath: 'Power — quick sideways feet.', a_latbox: 'Power — sideways explosiveness, safe landing.',
    a_seat: 'Power — pure starting strength.', a_sciss: 'Power — fast knee drive.', a_drop: 'Power — reactive spring (shock method).', a_scoop: 'Boxing power — hip-driven rotation, like a hook.',
    a_plate: 'Boxing power — rotation and strong shoulders.', a_goblet: 'Strength — strong thighs and a deep squat.', a_step: 'Boxing power — single-leg drive.', a_rfe: 'Strength — hamstrings, glutes, and balance.',
    a_curtsy: 'Joint armor — knee control when you pivot.', a_nordic: 'Injury shield — about half the hamstring injury risk.', a_calf: 'Joint armor — calves, shins, and arches.',
    a_twist: 'Boxing power — rotational speed.', a_seesaw: 'Core — your listed exercise (form to confirm).', a_kswing: 'Core — your listed exercise (form to confirm).', a_hollow: 'Core — the base of levers and handstands.',
    a_cd1: 'Cool-down — bring the heart rate down.', a_cd2: 'Cool-down — release quads and hip flexors.', a_cd3: 'Cool-down — ease the hamstrings.', a_cd4: 'Cool-down — release the inner thighs.',
    a_cd5: 'Cool-down — release calves and Achilles.', a_cd6: 'Cool-down — switch to rest.',
    b_rope: 'Warm-up — raise heat, wake the ankles.', b_scap: 'Joint armor — shoulder blades ready to work.', b_ytw: 'Joint armor — rotator cuff and wrists ready.', b_bthrow: 'Boxing power — explosive straight punches.',
    b_slam: 'Power — full-body force with the breath.', b_lpunch: 'Boxing power — punch strength on a safe arc.', b_pull: 'Strength — pull-ups, built the Russian way.', b_lpress: 'Strength — strong, mobile shoulders.',
    b_row: 'Posture — a strong upper back for desk and guard.', b_dip: 'Strength — pressing power.', b_lrot: 'Boxing power — rotation from the hips.', b_bext: 'Posture — a strong back and glutes.',
    b_face: 'Joint armor — healthy shoulders after punches.', b_grip: 'Strength — forearms and grip.', b_roll: 'Core — a strong front line.', b_knee: 'Core — the path to levers.',
    b_cd1: 'Cool-down — bring the heart rate down.', b_cd2: 'Cool-down — lengthen the lats.', b_cd3: 'Cool-down — open the chest.', b_cd4: 'Cool-down — calm the forearms and elbow.', b_cd5: 'Cool-down — release the traps.', b_cd6: 'Cool-down — switch to rest.',
    fa_wu: 'Warm-up — ready to run.', fa_z2: 'Engine — an aerobic base for recovery between rounds.', fa_split: 'Strength — strong legs on travel days.', fa_bridge: 'Strength — glutes on travel days.',
    fa_goblet: 'Strength — thighs on travel days.', fa_brow: 'Posture — upper back on travel days.', fa_tennis: 'Reflexes — eyes, hands, and reaction.', fa_cd: 'Cool-down — switch to rest.',
    fb_wu: 'Warm-up — move in all three planes.', fb_drill: 'Speed — clean sprint mechanics.', fb_fall: 'Speed — first-step acceleration.', fb_stop: 'Injury shield — safe braking protects the knees.',
    fb_cod: 'Speed — change direction fast.', fb_bstick: 'Joint armor — controlled landings.', fb_bbroad: 'Power — side power into forward power.', fb_i0: 'Engine — tolerance for hard work.',
    fb_4x4: 'Engine — raises VO2max.', fb_rounds: 'Engine — fight-round fitness.', fb_cd: 'Cool-down — switch to rest.',
    r_easy: 'Recovery — easy movement, faster recovery.', r_yoga: 'Mobility — hips, ankles, and better sleep.', r_tennis: 'Reflexes — eyes, hands, and reaction.',
    _ladder: 'Skill — bodyweight mastery, step by step.'
  };

  window.PLAN = {
    appName: "Let's be Kobe",
    benefit: BENEFIT,
    sessions: S,
    middle: ['boxing', 'gymA', 'gymB', 'fieldA', 'fieldB', 'recovery'],
    // getDay(): 0 Sun ... 6 Sat
    week: { 0: ['recovery'], 1: ['boxing'], 2: ['gymA'], 3: ['fieldA'], 4: ['boxing'], 5: ['gymB'], 6: ['fieldB', 'boxing'] },
    flow: { 0: 'A', 1: 'A', 2: 'B', 3: 'A', 4: 'B', 5: 'A', 6: 'B' },
    loadRank: { 'Low': 0, 'Low–Med': 1, 'Med–High': 2, 'High': 3 },
    phases: [
      { n: 0, name: 'Re-entry', start: '2026-11-09', end: '2026-12-06', focus: 'Tendons, technique, aerobic base, habit. Week 4 = retest. Gym RPE 6–7. Plyos ~60 low contacts.' },
      { n: 1, name: 'Accumulation', start: '2026-12-07', end: '2027-01-31', focus: 'Work capacity, muscle, strength endurance. 3–4 × 8–12 at RPE 7–8. Plyos 80–100. 4×4 once a week.' },
      { n: 2, name: 'Transmutation', start: '2027-02-01', end: '2027-04-25', focus: 'Max strength + power. 4–5 × 3–5 at RPE 8. Contrast training. Drop jumps 30–45 cm.' },
      { n: 3, name: 'Realization', start: '2027-04-26', end: '2027-07-18', focus: 'Speed-strength, fight conditioning. Fast 2–4 reps. Boxing rounds 3/1.' },
      { n: 4, name: 'Fight camp + taper', start: '2027-07-19', end: '2027-08-31', focus: 'Peak. Last 2 weeks: volume −40 to −60%, keep intensity and frequency (Bosquet 2007).' }
    ],
    ladder: LADDER,
    ladderMuscles: LADDER_MUSCLES,
    ladderStart: { P: 6, U: 4, L: 1, C: 4, H: 3 },
    tennis: TENNIS,
    drills: DRILLS,
    philosophy: [
      'Longevity first. Muscle and appearance are results, not targets.',
      'The joint is the root. Strength is the branch. Daily work for knees, ankles, elbows, wrists, neck.',
      'Breath leads movement. Each module starts and ends with breathing.',
      'Movement every day, low injury risk. Protect the habit first.',
      'Soviet method: general preparation, then special. Block periodization, shock method, single-plate work, Grease the Groove.',
      'Marinovich (ProBodX): whole body, nervous system first, light tools, each exercise prepares the next, stop before quality drops.',
      'All strength serves boxing.',
      'Each decision has a source. Where there is no paper, it is coaching practice.'
    ],
    rules: [
      ['Quality stop', 'Stop the set when form or speed drops. Never to failure in Block 0.'],
      ['Pain rule', 'Pain ≤ 3/10 during the exercise, gone by the next morning. If not, reduce the load next session.'],
      ['Readiness', 'Resting HR ≥ 7 bpm above your 7-day average, or sleep < 6 h → make the day one level easier.'],
      ['High–Low', 'Maximum 2 High days in a row.'],
      ['48 h rule', 'Keep 48 h between Gym A and Field B.'],
      ['Drink night', 'Only before a Low day. Never after Gym A. Max 2 drinks, 1 water per drink, protein first.'],
      ['Sleep', 'Target 7.5–8 h.']
    ],
    posture: [
      ['Pull-up', 'Active hang (shoulders away from ears), ribs down, chin over bar, no kipping, straight arms at the bottom without shrugging.'],
      ['Push-up', 'Straight line head to heel, elbows ~45°, push the floor away at the top.'],
      ['Dip', 'Shoulders down; go only as deep as you stay pain-free.'],
      ['Squat', 'Tripod foot (big toe, little toe, heel); knees follow toes.'],
      ['Hollow', 'Low back on the floor; if it lifts, bend the knees.'],
      ['Handstand', 'Wrists, shoulders, hips in one line; push tall through the shoulders.']
    ]
  };
})();
