function toggleMenu() {
  document.querySelector("nav ul").classList.toggle("active");
}

    (function () {
      const canvas = document.getElementById('bg3d');

      // Respect reduced motion
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      let renderer, scene, camera, stars, starGeo, rafId;
      let targetRotX = 0, targetRotY = 0;
      let rotX = 0, rotY = 0;

      // Graceful fallback if WebGL not available
      try {
        init();
        animate();
      } catch (e) {
        console.warn('WebGL not available, using CSS fallback.', e);
        canvas.classList.add('fallback-anim');
      }

      function init() {
        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0); // transparent

        // Scene & Camera
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        camera.position.set(0, 0, 140);

        // Starfield (points)
        const starCount = 5000; // adjust for performance
        starGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        // Random points within a sphere shell
        const radiusMin = 80, radiusMax = 400;
        for (let i = 0; i < starCount; i++) {
          const r = THREE.MathUtils.lerp(radiusMin, radiusMax, Math.random() ** 1.2);
          const theta = Math.acos(THREE.MathUtils.randFloatSpread(2)); // 0..PI
          const phi = THREE.MathUtils.randFloat(0, Math.PI * 2);
          const x = r * Math.sin(theta) * Math.cos(phi);
          const y = r * Math.sin(theta) * Math.sin(phi);
          const z = r * Math.cos(theta);
          const i3 = i * 3;
          positions[i3] = x;
          positions[i3 + 1] = y;
          positions[i3 + 2] = z;
          sizes[i] = Math.random() * 1.6 + 0.4;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const starMat = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 1.2,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });

        stars = new THREE.Points(starGeo, starMat);
        scene.add(stars);

        // Subtle fog/vignette via postless trick: add a faint sphere with gradient alpha
        const vignetteGeo = new THREE.SphereGeometry(600, 32, 32);
        const vignetteMat = new THREE.MeshBasicMaterial({ color: 0x0b1020, transparent: true, opacity: 0.18, side: THREE.BackSide });
        const vignette = new THREE.Mesh(vignetteGeo, vignetteMat);
        scene.add(vignette);

        // Interactions
        window.addEventListener('resize', onResize);
        window.addEventListener('mousemove', onPointerMove, { passive: true });
        window.addEventListener('deviceorientation', onTilt, { passive: true });

        onResize();
      }

      function onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }

      function onPointerMove(e) {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        targetRotY = nx * 0.3;
        targetRotX = ny * -0.25;
      }

      function onTilt(e) {
        if (!e.beta && !e.gamma) return;
        const nx = THREE.MathUtils.clamp(e.gamma / 45, -1, 1); // left/right
        const ny = THREE.MathUtils.clamp(e.beta / 45, -1, 1);  // front/back
        targetRotY = nx * 0.25;
        targetRotX = ny * -0.2;
      }

      function animate() {
        rafId = requestAnimationFrame(animate);

        // Smooth rotation towards target
        rotX += (targetRotX - rotX) * 0.05;
        rotY += (targetRotY - rotY) * 0.05;

        // Idle drift when not moving, reduced if prefers-reduced-motion
        const t = performance.now() * (reduceMotion ? 0.00005 : 0.0002);
        const idleX = Math.sin(t * 0.8) * (reduceMotion ? 0.02 : 0.06);
        const idleY = Math.cos(t * 1.1) * (reduceMotion ? 0.02 : 0.06);

        stars.rotation.x += 0.0007 + idleX * 0.001;
        stars.rotation.y += 0.0009 + idleY * 0.001;

        camera.position.x = rotY * 8;
        camera.position.y = rotX * 6;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      }

      // Cleanup on page hide (optional)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (rafId) cancelAnimationFrame(rafId);
        } else {
          animate();
        }
      }, { passive: true });
    })();