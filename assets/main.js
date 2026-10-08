import * as THREE from "three";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

/* =========================================================
   1. Hero 3D scene — "AI core": neural shell, orbit rings,
      signal pulses and a particle field on a white canvas.
   ========================================================= */
function initScene() {
  const canvas = document.getElementById("scene");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    canvas.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const BLUE = new THREE.Color("#0b5cff");
  const CYAN = new THREE.Color("#19d3ff");
  const NAVY = new THREE.Color("#0a2a6b");

  // Soft round sprite for points
  const sprite = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.35, "rgba(255,255,255,0.9)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const root = new THREE.Group();
  scene.add(root);
  const core = new THREE.Group();
  root.add(core);

  // --- Wireframe icosahedron shell
  const ico = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.75, 1)),
    new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.55 })
  );
  core.add(ico);
  const ico2 = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.15, 0)),
    new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.8 })
  );
  core.add(ico2);

  // --- Glowing inner sphere (fibonacci points)
  const innerN = 420;
  const innerPos = new Float32Array(innerN * 3);
  for (let i = 0; i < innerN; i++) {
    const y = 1 - (i / (innerN - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = Math.PI * (3 - Math.sqrt(5)) * i;
    innerPos.set([Math.cos(th) * r * 0.85, y * 0.85, Math.sin(th) * r * 0.85], i * 3);
  }
  const innerGeo = new THREE.BufferGeometry();
  innerGeo.setAttribute("position", new THREE.BufferAttribute(innerPos, 3));
  const inner = new THREE.Points(
    innerGeo,
    new THREE.PointsMaterial({ color: BLUE, size: 0.07, map: sprite, transparent: true, depthWrite: false, opacity: 0.9 })
  );
  core.add(inner);

  // --- Neural network shell: nodes + proximity edges
  const nodeN = 140;
  const nodes = [];
  for (let i = 0; i < nodeN; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(2.4 + Math.random() * 0.9);
    nodes.push(v);
  }
  const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
  const nodeColors = new Float32Array(nodeN * 3);
  nodes.forEach((_, i) => {
    const c = Math.random() < 0.3 ? CYAN : Math.random() < 0.5 ? NAVY : BLUE;
    nodeColors.set([c.r, c.g, c.b], i * 3);
  });
  nodeGeo.setAttribute("color", new THREE.BufferAttribute(nodeColors, 3));
  const nodePts = new THREE.Points(
    nodeGeo,
    new THREE.PointsMaterial({ size: 0.16, map: sprite, vertexColors: true, transparent: true, depthWrite: false })
  );
  const net = new THREE.Group();
  net.add(nodePts);

  const edges = [];
  const edgePos = [];
  for (let i = 0; i < nodeN; i++) {
    for (let j = i + 1; j < nodeN; j++) {
      if (nodes[i].distanceTo(nodes[j]) < 1.15) {
        edges.push([i, j]);
        edgePos.push(...nodes[i].toArray(), ...nodes[j].toArray());
      }
    }
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3));
  net.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.18 })));

  // Spokes from core to some nodes
  const spokePos = [];
  nodes.forEach((n, i) => {
    if (i % 6 === 0) spokePos.push(...n.clone().setLength(1.75).toArray(), ...n.toArray());
  });
  const spokeGeo = new THREE.BufferGeometry();
  spokeGeo.setAttribute("position", new THREE.Float32BufferAttribute(spokePos, 3));
  net.add(new THREE.LineSegments(spokeGeo, new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.25 })));
  root.add(net);

  // --- Signal pulses travelling along edges
  const pulseN = Math.min(60, edges.length);
  const pulses = Array.from({ length: pulseN }, () => ({
    e: edges[(Math.random() * edges.length) | 0],
    t: Math.random(),
    s: 0.25 + Math.random() * 0.6,
  }));
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pulseN * 3), 3));
  const pulsePts = new THREE.Points(
    pulseGeo,
    new THREE.PointsMaterial({ color: CYAN, size: 0.2, map: sprite, transparent: true, depthWrite: false })
  );
  net.add(pulsePts);

  // --- Orbit rings with satellites
  const rings = [];
  [
    { r: 3.6, tilt: [1.2, 0.2, 0], color: BLUE, speed: 0.35 },
    { r: 4.1, tilt: [0.4, 0.9, 0.3], color: CYAN, speed: -0.25 },
    { r: 4.6, tilt: [1.7, -0.5, 0.6], color: NAVY, speed: 0.18 },
  ].forEach((cfg) => {
    const g = new THREE.Group();
    g.rotation.set(...cfg.tilt);
    const curve = new THREE.EllipseCurve(0, 0, cfg.r, cfg.r);
    const pts = curve.getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0));
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: cfg.color, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.45 })
    );
    ring.computeLineDistances();
    g.add(ring);
    const sat = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12),
      new THREE.MeshBasicMaterial({ color: cfg.color })
    );
    g.add(sat);
    root.add(g);
    rings.push({ g, sat, r: cfg.r, speed: cfg.speed, a: Math.random() * Math.PI * 2 });
  });

  // --- Ambient particle field
  const dustN = isTouch ? 700 : 1400;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 20 - 4], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: new THREE.Color("#5c8dff"), size: 0.06, map: sprite, transparent: true, opacity: 0.55, depthWrite: false })
  );
  scene.add(dust);

  // --- Layout + interaction
  let baseX = 3.2, baseScale = 1;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (w < 980) { baseX = 0; baseScale = w < 640 ? 0.62 : 0.8; }
    else { baseX = 3.4; baseScale = 1; }
  }
  resize();
  window.addEventListener("resize", resize);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let scrollP = 0;
  const onScroll = () => { scrollP = Math.min(window.scrollY / window.innerHeight, 3); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  let visible = true;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) loop(); });

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const speed = reduceMotion ? 0.15 : 1;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Scroll: core drifts right/back and fades after hero
    const s = Math.min(scrollP, 1);
    const narrow = window.innerWidth < 980;
    root.position.x = baseX + (narrow ? 0 : s * 1.2);
    root.position.y = narrow ? 1.4 + s * 2 : -s * 0.6;
    root.position.z = -s * 4;
    root.scale.setScalar(baseScale);
    const fade = (1 - Math.min(scrollP, 1.2) * 0.62) * (narrow ? 0.42 : 1);
    root.traverse((o) => { if (o.material) o.material.opacity = (o.material.userData.base ??= o.material.opacity) * fade; });

    root.rotation.y += dt * 0.12 * speed;
    root.rotation.x = pointer.y * 0.35 + scrollP * 0.4;
    root.rotation.z = pointer.x * -0.15;
    core.rotation.y -= dt * 0.5 * speed;
    core.rotation.x += dt * 0.2 * speed;
    ico2.rotation.z += dt * 0.6 * speed;
    inner.scale.setScalar(1 + Math.sin(t * 2) * 0.06);

    rings.forEach((r) => {
      r.a += dt * r.speed * speed;
      r.sat.position.set(Math.cos(r.a) * r.r, Math.sin(r.a) * r.r, 0);
      r.sat.rotation.x += dt * 2;
      r.sat.rotation.y += dt * 2;
    });

    const pp = pulseGeo.attributes.position;
    pulses.forEach((p, i) => {
      p.t += dt * p.s * speed;
      if (p.t > 1) { p.t = 0; p.e = edges[(Math.random() * edges.length) | 0]; }
      tmp.lerpVectors(nodes[p.e[0]], nodes[p.e[1]], p.t);
      pp.setXYZ(i, tmp.x, tmp.y, tmp.z);
    });
    pp.needsUpdate = true;

    dust.rotation.y = t * 0.01 + pointer.x * 0.05;
    dust.position.y = scrollP * 1.5;

    camera.position.x = pointer.x * 0.4;
    camera.position.y = -pointer.y * 0.3;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  function loop() {
    if (!visible) return;
    frame();
    requestAnimationFrame(loop);
  }
  loop();
}

/* =========================================================
   2. Interactive 3D tag sphere (DOM, drag to rotate)
   ========================================================= */
function initTagSphere() {
  const el = document.getElementById("tagsphere");
  if (!el) return;
  const groups = [
    ["#0b5cff", ["Python", "XGBoost", "LightGBM", "TensorFlow", "Keras", "OpenCV", "Azure ML", "Azure AI Foundry", "Vertex AI", "LangChain", "RAG", "Agentic AI", "Doc Intelligence", "Computer Vision", "GitHub Copilot", "M365 Copilot", "Gemini", "Agent Skills"]],
    ["#00a8ff", ["Microsoft Fabric", "Power BI", "SQL", "BigQuery", "SAP BW", "SSIS", "SSAS", "Power Query"]],
    ["#0a2a6b", ["Azure", "Google Cloud", "Docker", "APIs", "Git", "Azure DevOps", "CI/CD", "C#", ".NET"]],
    ["#5b6cff", ["Power Automate", "RPA", "SAP ECC", "SAP IBP", "Enterprise Search", "OCR"]],
  ];
  const tags = [];
  groups.forEach(([color, list]) => list.forEach((name) => tags.push({ name, color })));

  const N = tags.length;
  const items = tags.map((t, i) => {
    const span = document.createElement("span");
    span.textContent = t.name;
    span.style.color = t.color;
    el.appendChild(span);
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = Math.PI * (3 - Math.sqrt(5)) * i;
    return { span, x: Math.cos(th) * r, y, z: Math.sin(th) * r, w: 0, h: 0 };
  });

  let R = 200;
  const measure = () => {
    R = el.clientWidth * 0.36;
    items.forEach((it) => { it.w = it.span.offsetWidth; it.h = it.span.offsetHeight; });
  };
  measure();
  window.addEventListener("resize", measure);
  document.fonts?.ready.then(measure);

  let vx = 0.004, vy = 0.003, dragging = false, lx = 0, ly = 0;
  el.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    vy = (e.clientX - lx) * 0.0009;
    vx = -(e.clientY - ly) * 0.0009;
    lx = e.clientX; ly = e.clientY;
  });
  const end = () => { dragging = false; };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  let onScreen = false;
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(el);

  function rotate(ax, ay) {
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
    items.forEach((it) => {
      const y1 = it.y * cx - it.z * sx;
      const z1 = it.y * sx + it.z * cx;
      const x2 = it.x * cy + z1 * sy;
      const z2 = -it.x * sy + z1 * cy;
      it.x = x2; it.y = y1; it.z = z2;
    });
  }
  function draw() {
    items.forEach((it) => {
      const scale = 0.6 + (it.z + 1) * 0.3;
      const px = it.x * R - it.w / 2;
      const py = it.y * R - it.h / 2;
      it.span.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${scale})`;
      it.span.style.opacity = (0.25 + (it.z + 1) * 0.375).toFixed(2);
      it.span.style.zIndex = String(Math.round((it.z + 1) * 100));
    });
  }
  function tick() {
    if (onScreen) {
      if (!dragging) {
        vx += (0.0015 - vx) * 0.02;
        vy += (0.003 - vy) * 0.02;
      }
      rotate(reduceMotion ? vx * 0.2 : vx, reduceMotion ? vy * 0.2 : vy);
      draw();
    }
    requestAnimationFrame(tick);
  }
  draw();
  tick();
}

/* =========================================================
   3. UI: 3D tilt, reveal, counters, typing, nav, progress
   ========================================================= */
function initTilt() {
  if (isTouch || reduceMotion) return;
  document.querySelectorAll(".tilt").forEach((card) => {
    const max = card.classList.contains("id-card") ? 14 : 7;
    if (card.classList.contains("id-card")) {
      const shine = document.createElement("div");
      shine.className = "shine";
      card.appendChild(shine);
    }
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateY(${(px - 0.5) * max}deg) rotateX(${(0.5 - py) * max}deg) translateZ(0)`;
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

function initReveal() {
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
        // let tilt take over the transform once revealed
        setTimeout(() => e.target.classList.remove("reveal"), 900);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 80}ms`;
    io.observe(el);
  });
}

function initCounters() {
  const fmt = (n) => n.toLocaleString("en-US");
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = +el.dataset.count;
    const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = pre + fmt(target) + suf; return; }
    const dur = 1800, start = performance.now() + 300;
    const step = (now) => {
      const p = Math.max(0, Math.min((now - start) / dur, 1));
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + fmt(Math.round(target * eased)) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function initTyping() {
  const el = document.getElementById("typed");
  const words = [
    "Senior AI Architect",
    "Enterprise AI Transformation Leader",
    "Head of AI Insights @ F&N",
    "Agentic AI · RAG · Copilots",
    "Doctor of Business Administration",
    "Lecturer · Researcher · Mentor",
  ];
  if (reduceMotion) return;
  let w = 0, i = words[0].length, deleting = true;
  setTimeout(function type() {
    const word = words[w];
    i += deleting ? -1 : 1;
    el.textContent = word.slice(0, i);
    let delay = deleting ? 28 : 55;
    if (!deleting && i === word.length) { deleting = true; delay = 2200; }
    else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
    setTimeout(type, delay);
  }, 2600);
}

function initNav() {
  const bar = document.querySelector(".scroll-progress span");
  const links = [...document.querySelectorAll(".nav nav a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${(window.scrollY / h) * 100}%`;
    let current = null;
    sections.forEach((s) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) current = s.id; });
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${current}`));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  document.getElementById("yr").textContent = new Date().getFullYear();
}

initScene();
initTagSphere();
initTilt();
initReveal();
initCounters();
initTyping();
initNav();
