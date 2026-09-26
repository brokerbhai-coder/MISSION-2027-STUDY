(function(){
  'use strict';

  /* ============================================================
     0. DEMO MODE — set to false for production integration
  ============================================================ */
  var DEMO_MODE = false;

  /* ============================================================
     1. CORE CONSTANTS
  ============================================================ */
  var STAGE_COUNT          = 20;
  var LEVELS_PER_STAGE     = 60;
  var MAX_LEVEL             = STAGE_COUNT * LEVELS_PER_STAGE; // 1200
  var MAJOR_FLOOR_INTERVAL = 5;

  /* ============================================================
     2. STAGE CONFIGURATION — 20 visually distinct 3D buildings
        (color + roof + windows + corners + decorations all vary)
  ============================================================ */
  var STAGES = [
    { name:'Golden Academy',         primary:'#d9b358', light:'#f3dfa0', dark:'#3a2f16', glow:'#ffe9ad',
      roof:'flat',            windows:'rect',        corners:'square',            deco:['lights'],                       special:false },
    { name:'Blue Tower',             primary:'#3b82f6', light:'#a8c8ff', dark:'#132242', glow:'#8ec4ff',
      roof:'pointed',         windows:'narrow',      corners:'chamfered',         deco:['glow-edge'],                    special:false },
    { name:'Green Eco Building',     primary:'#22c55e', light:'#9ae8b4', dark:'#0f2a1c', glow:'#8fe3ac',
      roof:'dome',            windows:'round',       corners:'rounded',           deco:['leaf'],                        special:false },
    { name:'Purple Tech Tower',      primary:'#8b5cf6', light:'#cdbdfd', dark:'#251a42', glow:'#c4b1fb',
      roof:'antenna',         windows:'slit',        corners:'angular',           deco:['lines'],                       special:false },
    { name:'Orange Achievement Building', primary:'#f59e0b', light:'#ffd27a', dark:'#3a2707', glow:'#ffcf6b',
      roof:'crown',           windows:'rect-bright', corners:'square',            deco:['flag','glow'],                 special:true  },
    { name:'Cyan Sky Building',      primary:'#22d3ee', light:'#b7f3fb', dark:'#0c2e35', glow:'#a5f3fc',
      roof:'flat-wide',       windows:'rect',        corners:'square',            deco:['clean'],                       special:false },
    { name:'Pink Creative Building', primary:'#ec4899', light:'#fbc7dd', dark:'#3a1024', glow:'#fbb6ce',
      roof:'pointed',         windows:'creative',    corners:'chamfered',         deco:['strips'],                      special:false },
    { name:'Lime Eco Tower',         primary:'#84cc16', light:'#e1f6ad', dark:'#22300a', glow:'#d9f99d',
      roof:'dome',            windows:'organic',     corners:'rounded',           deco:['vine'],                        special:false },
    { name:'Blue Crystal Tower',     primary:'#2563eb', light:'#a9c6fb', dark:'#101c3d', glow:'#93c5fd',
      roof:'antenna',         windows:'diamond',     corners:'faceted',           deco:['crystal'],                     special:false },
    { name:'Golden Palace',          primary:'#e8c766', light:'#fff0c2', dark:'#3a2c09', glow:'#ffe9a8',
      roof:'crown',           windows:'rect-bright', corners:'square',            deco:['star','glow'],                 special:true  },
    { name:'Cyan Research Center',   primary:'#0891b2', light:'#a0e9f5', dark:'#0b2830', glow:'#67e8f9',
      roof:'flat',            windows:'lab',         corners:'column',            deco:['columns'],                     special:false },
    { name:'Purple Skylab',          primary:'#a78bfa', light:'#e4d9fe', dark:'#271a47', glow:'#ddd6fe',
      roof:'pointed-float',   windows:'slit',        corners:'angular',           deco:['ring'],                        special:false },
    { name:'Emerald Academy',        primary:'#059669', light:'#a8ecd3', dark:'#082e24', glow:'#6ee7b7',
      roof:'dome',            windows:'arch',        corners:'rounded-symmetric', deco:['symmetric'],                   special:false },
    { name:'Command Tower',          primary:'#e11d48', light:'#fbb8c4', dark:'#3a0b17', glow:'#fda4af',
      roof:'antenna',         windows:'slit',        corners:'angular',           deco:['beacon'],                      special:false },
    { name:'Golden Grand Hall',      primary:'#f0c419', light:'#fff3b0', dark:'#3a2c00', glow:'#ffe98a',
      roof:'crown',           windows:'rect-bright', corners:'square',            deco:['flag','star','glow'],          special:true  },
    { name:'Cyan Sky City',          primary:'#06b6d4', light:'#b0f0fb', dark:'#082a30', glow:'#a5f3fc',
      roof:'flat-multi',      windows:'rect',        corners:'multi',             deco:['glow-edge'],                   special:false },
    { name:'Violet Future Tower',    primary:'#7c3aed', light:'#d9c8fd', dark:'#22103d', glow:'#c4b5fd',
      roof:'pointed-antenna', windows:'diamond',     corners:'angular',           deco:['antenna-glow'],                special:false },
    { name:'Emerald Future Academy', primary:'#10b981', light:'#b6f3da', dark:'#082e24', glow:'#a7f3d0',
      roof:'dome',            windows:'arch',        corners:'rounded',           deco:['green-ring'],                  special:false },
    { name:'Blue Legend Tower',      primary:'#1d4ed8', light:'#a6c3fb', dark:'#0c1636', glow:'#93c5fd',
      roof:'antenna',         windows:'diamond',     corners:'faceted',           deco:['blue-beacon'],                 special:false },
    { name:'Final Legend Building',  primary:'#f5d76e', light:'#ffffff', dark:'#3a2d0d', glow:'#fff2b8',
      roof:'crown',           windows:'rect-bright', corners:'square',            deco:['flag','star','beacon','glow'], special:true, finale:true }
  ];

  if (STAGES.length !== STAGE_COUNT) {
    // Safety net — should never happen, kept as a hard guarantee of §61 checklist.
    throw new Error('STAGES config must contain exactly ' + STAGE_COUNT + ' entries.');
  }

  /* ============================================================
     3. MATH — level -> stage -> floor  (§3, §4, §5)
  ============================================================ */
  function computeStageAndFloor(rawLevel){
    var n = Math.floor(Number(rawLevel));
    if (!isFinite(n) || isNaN(n)) n = 1;
    var level = Math.min(MAX_LEVEL, Math.max(1, n));
    var stage0 = Math.floor((level - 1) / LEVELS_PER_STAGE); // 0-based internally
    var floor  = ((level - 1) % LEVELS_PER_STAGE) + 1;        // 1..60
    return { level: level, stage0: stage0, stage: stage0 + 1, floor: floor };
  }

  function clampPct(rawPct){
    var n = Number(rawPct);
    if (!isFinite(n) || isNaN(n)) n = 0;
    return Math.min(100, Math.max(0, n));
  }

  /* ============================================================
     4. DOM BUILDERS
  ============================================================ */
  function createFloors(count){
    var floors = [];
    for (var i = 1; i <= count; i++){
      var floorEl = document.createElement('div');
      floorEl.className = 'lb-floor';
      if (i % MAJOR_FLOOR_INTERVAL === 0) floorEl.className += ' lb-floor-major';
      floorEl.dataset.floor = String(i);
      var fill = document.createElement('div');
      fill.className = 'lb-fill';
      floorEl.appendChild(fill);
      floors.push(floorEl);
    }
    return floors;
  }

  function buildAntenna(buildingEl){
    var rod = document.createElement('div');
    rod.className = 'lb-antenna-rod';
    var tip = document.createElement('div');
    tip.className = 'lb-antenna-tip';
    buildingEl.appendChild(rod);
    buildingEl.appendChild(tip);
    return tip;
  }

  function buildCrownTeeth(roofEl){
    for (var i = 0; i < 3; i++){
      var tooth = document.createElement('div');
      tooth.className = 'lb-crown-tooth';
      tooth.style.left = (18 + i * 32) + '%';
      roofEl.appendChild(tooth);
    }
  }

  var DECO_BUILDERS = {
    'lights':   function(b){ var d=document.createElement('div'); d.className='lb-deco-lights'; b.front.appendChild(d); },
    'leaf':     function(b){ var d=document.createElement('div'); d.className='lb-deco-leaf'; b.building.appendChild(d); },
    'lines':    function(b){ var d=document.createElement('div'); d.className='lb-deco-lines'; b.front.appendChild(d); },
    'flag': function(b){
      var pole=document.createElement('div'); pole.className='lb-deco-flag-pole';
      var cloth=document.createElement('div'); cloth.className='lb-deco-flag-cloth';
      b.roof.appendChild(pole); b.roof.appendChild(cloth);
    },
    'strips':   function(b){ var d=document.createElement('div'); d.className='lb-deco-strips'; b.side.appendChild(d); },
    'vine':     function(b){ var d=document.createElement('div'); d.className='lb-deco-vine'; b.building.appendChild(d); },
    'crystal':  function(b){ var d=document.createElement('div'); d.className='lb-deco-crystal'; b.front.appendChild(d); },
    'star':     function(b){ var d=document.createElement('div'); d.className='lb-deco-star'; b.roof.appendChild(d); },
    'columns':  function(b){ var d=document.createElement('div'); d.className='lb-deco-columns'; b.front.appendChild(d); },
    'ring':     function(b){ var d=document.createElement('div'); d.className='lb-deco-ring'; b.roof.appendChild(d); },
    'symmetric':function(b){ var d=document.createElement('div'); d.className='lb-deco-symmetric'; b.front.appendChild(d); },
    'clean':    function(){ /* intentionally no extra decoration */ },
    'glow':     function(b){ var d=document.createElement('div'); d.className='lb-deco-glow'; b.building.appendChild(d); },
    'glow-edge':function(b){ DECO_BUILDERS.glow(b); },
    'beacon':       function(b){ giveBeacon(b); },
    'antenna-glow': function(b){ giveBeacon(b); },
    'blue-beacon':  function(b){ giveBeacon(b); },
    'green-ring':   function(b){ DECO_BUILDERS.ring(b); }
  };

  function giveBeacon(b){
    var tip = b.building.querySelector('.lb-antenna-tip');
    if (tip){
      tip.classList.add('lb-glow');
      return;
    }
    // fallback: no antenna present on this roof type — add a standalone glow dot at the apex
    var dot = document.createElement('div');
    dot.className = 'lb-antenna-tip lb-glow';
    dot.style.bottom = '100%';
    dot.style.left = '50%';
    b.roof.appendChild(dot);
  }

  function buildStageDOM(cfg){
    var building = document.createElement('div');
    building.className = 'lb-building';
    if (cfg.finale) building.className += ' lb-building--finale';
    building.dataset.roof    = cfg.roof;
    building.dataset.windows = cfg.windows;
    building.dataset.corners = cfg.corners;
    building.style.setProperty('--stage-primary', cfg.primary);
    building.style.setProperty('--stage-light',   cfg.light);
    building.style.setProperty('--stage-dark',    cfg.dark);
    building.style.setProperty('--stage-glow',    cfg.glow);

    var front = document.createElement('div');
    front.className = 'lb-front';

    var windowsOverlay = document.createElement('div');
    windowsOverlay.className = 'lb-windows';
    front.appendChild(windowsOverlay);

    var floorsWrap = document.createElement('div');
    floorsWrap.className = 'lb-floors';
    var floorEls = createFloors(LEVELS_PER_STAGE);
    for (var i = 0; i < floorEls.length; i++) floorsWrap.appendChild(floorEls[i]);
    front.appendChild(floorsWrap);

    var entrance = document.createElement('div');
    entrance.className = 'lb-entrance';
    front.appendChild(entrance);

    var side = document.createElement('div');
    side.className = 'lb-side';

    var roof = document.createElement('div');
    roof.className = 'lb-roof';
    var roofSlab = document.createElement('div');
    roofSlab.className = 'lb-roof-slab';
    roof.appendChild(roofSlab);
    if (cfg.roof === 'crown') buildCrownTeeth(roof);

    building.appendChild(front);
    building.appendChild(side);
    building.appendChild(roof);

    if (cfg.roof === 'antenna' || cfg.roof === 'pointed-antenna'){
      buildAntenna(building);
    }

    var refs = { building:building, front:front, side:side, roof:roof, floorEls:floorEls };

    (cfg.deco || []).forEach(function(decoKey){
      var builder = DECO_BUILDERS[decoKey];
      if (builder) builder(refs);
    });

    return refs;
  }

  function updateFloors(refs, floor, pct, prevFloor, prevPct){
    var floorEls = refs.floorEls;
    for (var i = 1; i <= floorEls.length; i++){
      var el = floorEls[i - 1];
      var fill = el.firstChild;
      el.classList.remove('lb-complete', 'lb-current', 'lb-future', 'lb-achieve');
      if (i < floor){
        el.classList.add('lb-complete');
        fill.style.width = '100%';
      } else if (i === floor){
        el.classList.add('lb-current');
        fill.style.width = pct + '%';
        if (pct >= 100) el.classList.add('lb-complete');
        var justCompleted = pct >= 100 && !(prevFloor === floor && prevPct >= 100);
        if (justCompleted){
          el.classList.add('lb-achieve');
          window.setTimeout(function(target){
            return function(){ target.classList.remove('lb-achieve'); };
          }(el), 850);
        }
      } else {
        el.classList.add('lb-future');
        fill.style.width = '0%';
      }
    }
  }

  function buildAriaLabel(cfg, computed, pct){
    return 'Stage ' + computed.stage + ' — ' + cfg.name + ', Level ' + computed.level +
           ', Floor ' + computed.floor + ' of ' + LEVELS_PER_STAGE + ', ' + Math.round(pct) + '% complete';
  }

  /* ============================================================
     5. PUBLIC API — renderLevelBuilding(container, { level, pct })
  ============================================================ */
  function renderLevelBuilding(container, data){
    if (!container || !container.appendChild){
      console.error('renderLevelBuilding: a valid container element is required.');
      return;
    }
    data = data || {};
    var computed = computeStageAndFloor(data.level);
    var pct = clampPct(data.pct);
    var cfg = STAGES[computed.stage0];

    var state = container.__lbState;
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', buildAriaLabel(cfg, computed, pct));

    if (!container.classList.contains('level-building-card')){
      container.classList.add('level-building-card');
    }

    if (state && state.stage0 === computed.stage0){
      // ---- Same stage: reuse existing DOM, just update floors (§40, §41) ----
      updateFloors(state.refs, computed.floor, pct, state.lastFloor, state.lastPct);
      state.lastFloor = computed.floor;
      state.lastPct = pct;
      state.level = computed.level;
      return;
    }

    // ---- Stage changed (or first render): build a brand-new building (§14, §42) ----
    var oldScene = container.querySelector('.lb-scene');
    var refs = buildStageDOM(cfg);
    updateFloors(refs, computed.floor, pct, -1, -1);

    var newScene = document.createElement('div');
    newScene.className = 'lb-scene stage-enter';
    newScene.appendChild(refs.building);

    function attachNew(){
      container.appendChild(newScene);
      window.setTimeout(function(){ newScene.classList.remove('stage-enter'); }, 520);
    }

    if (oldScene){
      oldScene.classList.add('stage-exit');
      window.setTimeout(function(){
        if (oldScene.parentNode) oldScene.parentNode.removeChild(oldScene);
        attachNew();
      }, 330);
    } else {
      attachNew();
    }

    container.__lbState = {
      stage0: computed.stage0,
      refs: refs,
      lastFloor: computed.floor,
      lastPct: pct,
      level: computed.level
    };
  }

  // Tap micro-interaction (§47) — no continuous animation, just a brief settle.
  function wireTapInteraction(container){
    var tapTimer = null;
    container.addEventListener('pointerdown', function(){
      container.classList.add('lb-tapped');
      if (tapTimer) window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(function(){ container.classList.remove('lb-tapped'); }, 450);
    });
  }

  window.renderLevelBuilding = renderLevelBuilding;

  /* ============================================================
     6. BOUNDARY TEST SUITE (§53, §61) — internal verification only
  ============================================================ */
  var BOUNDARY_LEVELS = [1,60,61,120,121,180,181,240,241,300,301,360,361,420,421,480,
    481,540,541,600,601,660,661,720,721,780,781,840,841,900,901,960,961,1020,1021,1080,1081,1140,1141,1200];

  var EXPECTED = {}; // level -> {stage, floor}, derived independently from the stage list above
  (function precomputeExpected(){
    for (var s = 1; s <= STAGE_COUNT; s++){
      EXPECTED[(s - 1) * LEVELS_PER_STAGE + 1]   = { stage: s, floor: 1 };
      EXPECTED[s * LEVELS_PER_STAGE]              = { stage: s, floor: LEVELS_PER_STAGE };
    }
  })();

  function runBoundaryTests(){
    var lines = [];
    var pass = 0, fail = 0;
    BOUNDARY_LEVELS.forEach(function(lvl){
      var got = computeStageAndFloor(lvl);
      var exp = EXPECTED[lvl];
      var ok = exp && got.stage === exp.stage && got.floor === exp.floor;
      if (ok) pass++; else fail++;
      lines.push((ok ? 'OK ' : 'FAIL ') + 'L' + lvl + ' -> Stage ' + got.stage + ' Floor ' + got.floor +
        (ok ? '' : ' (expected Stage ' + exp.stage + ' Floor ' + exp.floor + ')'));
    });
    // extra edge clamps
    var over = computeStageAndFloor(1201);
    var over2 = computeStageAndFloor(50000);
    var under = computeStageAndFloor(0);
    var underNeg = computeStageAndFloor(-5);
    lines.push((over.level === 1200 ? 'OK ' : 'FAIL ') + 'clamp 1201 -> level ' + over.level);
    lines.push((over2.level === 1200 ? 'OK ' : 'FAIL ') + 'clamp 50000 -> level ' + over2.level);
    lines.push((under.level === 1 ? 'OK ' : 'FAIL ') + 'clamp 0 -> level ' + under.level);
    lines.push((underNeg.level === 1 ? 'OK ' : 'FAIL ') + 'clamp -5 -> level ' + underNeg.level);
    if (over.level === 1200) pass++; else fail++;
    if (over2.level === 1200) pass++; else fail++;
    if (under.level === 1) pass++; else fail++;
    if (underNeg.level === 1) pass++; else fail++;

    lines.push('');
    lines.push(pass + ' / ' + (pass + fail) + ' checks passed');
    return { text: lines.join('\n'), pass: pass, fail: fail };
  }

  window.__LB_TEST__ = { computeStageAndFloor: computeStageAndFloor, STAGES: STAGES, runBoundaryTests: runBoundaryTests };

  /* ============================================================
     7. DEMO WIRING (only active when DEMO_MODE = true)
  ============================================================ */
  function initDemo(){
    var widget = document.getElementById('levelBuildingWidget');
    if (!widget) return;
    wireTapInteraction(widget);

    if (!DEMO_MODE){
      // Production: do nothing automatically. The host website calls
      // renderLevelBuilding(widget, { level: currentLevel, pct: currentPercentage })
      // itself once real student data is available.
      return;
    }

    var demoState = { level: 75, pct: 60 };
    renderLevelBuilding(widget, demoState);

    var panel = document.getElementById('lbTestPanel');
    var readout = document.getElementById('lbReadout');
    var status = document.getElementById('lbTestStatus');
    panel.style.display = 'block';

    function refresh(){
      renderLevelBuilding(widget, demoState);
      var c = computeStageAndFloor(demoState.level);
      readout.textContent = 'Level ' + c.level + ' — Stage ' + c.stage + ' (' + STAGES[c.stage0].name + ') — Floor ' + c.floor + '/60 — ' + Math.round(clampPct(demoState.pct)) + '%';
    }
    refresh();

    panel.addEventListener('click', function(ev){
      var btn = ev.target.closest ? ev.target.closest('button') : null;
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'level-minus') demoState.level = Math.max(1, demoState.level - 1);
      if (act === 'level-plus')  demoState.level = Math.min(MAX_LEVEL, demoState.level + 1);
      if (act === 'pct-minus')   demoState.pct = Math.max(0, demoState.pct - 10);
      if (act === 'pct-plus')    demoState.pct = Math.min(100, demoState.pct + 10);
      if (act === 'stage-jump'){
        var c = computeStageAndFloor(demoState.level);
        var nextStage0 = Math.min(STAGE_COUNT - 1, c.stage0 + 1);
        demoState.level = nextStage0 * LEVELS_PER_STAGE + 1;
        demoState.pct = 0;
      }
      if (act === 'run-tests'){
        var result = runBoundaryTests();
        status.textContent = result.text;
      }
      refresh();
    });

    // Auto-run the boundary suite once on load so problems are visible immediately.
    var initial = runBoundaryTests();
    status.textContent = initial.text;
    console.log('[LevelBuilding] boundary self-test:', initial.pass + '/' + (initial.pass + initial.fail), 'passed');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initDemo);
  } else {
    initDemo();
  }

})();
