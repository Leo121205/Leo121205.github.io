// bg3d.js — Fond 3D (Gaming PC) + message si WebGL/CDN bloqué

(function () {
  const canvas = document.getElementById("bg3d");
  if (!canvas) return;

  // Petit bandeau debug (tu peux l'enlever plus tard)
  const debug = document.createElement("div");
  debug.style.cssText =
    "position:fixed;bottom:12px;left:12px;z-index:99999;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.55);color:#fff;font:13px Arial;max-width:70vw;";
  debug.textContent = "3D: chargement…";
  document.body.appendChild(debug);

  // Charger THREE via CDN (non-module)
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  Promise.resolve()
    .then(() => loadScript("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"))
    .then(() => loadScript("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js"))
    .then(() => {
      if (typeof THREE === "undefined") {
        debug.textContent = "3D: THREE non chargé (CDN bloqué). Désactive AdBlock/Brave Shields sur ce site.";
        return;
      }

      // Test WebGL
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      } catch (e) {
        debug.textContent = "3D: WebGL désactivé (accélération matérielle). Active l'accélération matérielle du navigateur.";
        return;
      }

      debug.textContent = "3D: OK ✅ (tu peux masquer ce message plus tard)";

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(2.2, 1.2, 3.2);

      const controls = new THREE.OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 2.2;
      controls.maxDistance = 6;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const key = new THREE.DirectionalLight(0xffffff, 0.9);
      key.position.set(3, 4, 2);
      scene.add(key);

      const pc = new THREE.Group();
      scene.add(pc);

      // Tower
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 2.0, 0.75),
        new THREE.MeshStandardMaterial({ color: 0x0b1220, metalness: 0.4, roughness: 0.35 })
      );
      tower.position.set(0, 1.0, 0);
      pc.add(tower);

      // Glass (simple)
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 1.9),
        new THREE.MeshStandardMaterial({ color: 0x0b1220, transparent: true, opacity: 0.25 })
      );
      glass.position.set(0.56, 1.0, 0);
      glass.rotation.y = -Math.PI / 2;
      pc.add(glass);

      // RGB Rings
      const ringGeo = new THREE.TorusGeometry(0.23, 0.03, 16, 80);
      const fanYs = [1.55, 1.10, 0.65];

      const rings = fanYs.map((y) => {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x4cc9f0,
          emissive: 0x4cc9f0,
          emissiveIntensity: 2.2,
          metalness: 0.2,
          roughness: 0.25
        });
        const ring = new THREE.Mesh(ringGeo, mat);
        ring.position.set(0, y, 0.39);
        ring.rotation.x = Math.PI / 2;
        pc.add(ring);
        return ring;
      });

      // GPU glow
      const gpu = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.08, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x111827, emissive: 0x7c3aed, emissiveIntensity: 1.6 })
      );
      gpu.position.set(0.12, 1.05, 0.05);
      pc.add(gpu);

      pc.rotation.y = -0.45;
      pc.position.set(0, -0.1, 0);

      // Stars
      const starsGeo = new THREE.BufferGeometry();
      const count = 600;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i*3+0] = (Math.random() - 0.5) * 20;
        pos[i*3+1] = (Math.random() - 0.5) * 12;
        pos[i*3+2] = (Math.random() - 0.5) * 20;
      }
      starsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ size: 0.012, transparent: true, opacity: 0.6 }));
      scene.add(stars);

      function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", resize);
      resize();

      function hsvToHex(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        let r=0,g=0,b=0;
        if (h < 60) [r,g,b]=[c,x,0];
        else if (h < 120) [r,g,b]=[x,c,0];
        else if (h < 180) [r,g,b]=[0,c,x];
        else if (h < 240) [r,g,b]=[0,x,c];
        else if (h < 300) [r,g,b]=[x,0,c];
        else [r,g,b]=[c,0,x];
        const R = Math.round((r+m)*255);
        const G = Math.round((g+m)*255);
        const B = Math.round((b+m)*255);
        return (R << 16) + (G << 8) + B;
      }

      let t = 0;
      function animate() {
        requestAnimationFrame(animate);
        t += 0.01;

        rings.forEach((ring, i) => {
          const hue = (t * 80 + i * 120) % 360;
          const col = hsvToHex(hue, 0.75, 1.0);
          ring.material.color.setHex(col);
          ring.material.emissive.setHex(col);
          ring.rotation.z += 0.02 + i * 0.005;
        });

        gpu.material.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.5;

        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    })
    .catch(() => {
      debug.textContent = "3D: scripts CDN bloqués. Désactive AdBlock/Brave Shields ou essaie un autre navigateur.";
    });
})();
