import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type UnboxingPlayer = {
  configure(options: {
    active: boolean;
    paused: boolean;
    reduced: boolean;
  }): void;
  seek(chapter: number): void;
  dispose(): void;
};

const duration = 20;
const ease = (a: number, b: number, t: number) => {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const cet = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Etc/GMT-1',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function createUnboxingPlayer(
  canvas: HTMLCanvasElement,
  onChapter: (chapter: number) => void,
): UnboxingPlayer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setClearColor(0x151a16, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.6;
  room.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const rig = new THREE.Group();
  scene.add(rig);
  const ivory = new THREE.MeshStandardMaterial({
    color: 0xeeeae1,
    roughness: 0.62,
    metalness: 0.02,
  });
  const paper = new THREE.MeshStandardMaterial({
    color: 0xddd8ce,
    roughness: 0.85,
  });
  const titanium = new THREE.MeshStandardMaterial({
    color: 0xa6a397,
    roughness: 0.3,
    metalness: 0.94,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x343a38,
    roughness: 0.3,
    metalness: 0.85,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x080b0b,
    roughness: 0.22,
    metalness: 0.1,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x14232b,
    metalness: 0.45,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });
  const white = new THREE.MeshPhysicalMaterial({
    color: 0xf7f6ed,
    roughness: 0.2,
    metalness: 0.08,
    clearcoat: 1,
  });

  function roundedGeometry(w: number, h: number, d: number, r: number) {
    const horizontal = h < d && h < w;
    const side = !horizontal && w < h && w < d;
    const a = horizontal ? w : side ? d : w,
      b = horizontal ? d : h,
      depth = horizontal ? h : side ? w : d;
    const radius = Math.min(r, a / 2, b / 2);
    const x = -a / 2,
      y = -b / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + a - radius, y);
    shape.quadraticCurveTo(x + a, y, x + a, y + radius);
    shape.lineTo(x + a, y + b - radius);
    shape.quadraticCurveTo(x + a, y + b, x + a - radius, y + b);
    shape.lineTo(x + radius, y + b);
    shape.quadraticCurveTo(x, y + b, x, y + b - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    const bevel = Math.min(depth * 0.14, 0.02);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 10,
    });
    const positions = geometry.getAttribute('position'),
      uv = geometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i++)
      uv.setXY(
        i,
        (positions.getX(i) + a / 2) / a,
        (positions.getY(i) + b / 2) / b,
      );
    geometry.translate(0, 0, -depth / 2);
    if (horizontal) geometry.rotateX(-Math.PI / 2);
    if (side) geometry.rotateY(Math.PI / 2);
    return geometry;
  }
  function rounded(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    r: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const mesh = new THREE.Mesh(roundedGeometry(w, h, d, r), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(
    parent: THREE.Object3D,
    radius: number,
    depth: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, depth, 32),
      material,
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function texture(
    draw: (ctx: CanvasRenderingContext2D) => void,
    w = 512,
    h = 1024,
  ) {
    const source = document.createElement('canvas');
    source.width = w;
    source.height = h;
    const ctx = source.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    draw(ctx);
    const map = new THREE.CanvasTexture(source);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return map;
  }
  const wallpaper = texture((ctx) => {
    const bg = ctx.createLinearGradient(0, 0, 512, 1024);
    bg.addColorStop(0, '#0b1214');
    bg.addColorStop(0.5, '#2b443c');
    bg.addColorStop(1, '#b9c9ab');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.translate(240 + i * 20, 610 - i * 90);
      ctx.rotate(-0.48);
      const g = ctx.createLinearGradient(-180, 0, 300, 0);
      g.addColorStop(0, '#829e8240');
      g.addColorStop(0.45, '#e7e4c9');
      g.addColorStop(0.53, '#8daca0');
      g.addColorStop(1, '#132e28');
      ctx.strokeStyle = g;
      ctx.lineWidth = 28 - i * 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 170 + i * 35, 440, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
  const screenMaterial = new THREE.MeshPhysicalMaterial({
    map: wallpaper,
    emissiveMap: wallpaper,
    emissive: 0xffffff,
    emissiveIntensity: 0.65,
    roughness: 0.13,
    metalness: 0.04,
    clearcoat: 1,
  });

  function phone(back = false) {
    const group = new THREE.Group();
    rounded(group, 1.72, 3.5, 0.19, 0.19, titanium);
    const rear = new THREE.MeshStandardMaterial({
      color: back ? 0x7d867b : 0xb1afa3,
      metalness: 0.38,
      roughness: 0.48,
    });
    rounded(group, 1.65, 3.42, 0.04, 0.18, rear, 0, 0, -0.11);
    rounded(group, 1.64, 3.42, 0.035, 0.19, black, 0, 0, 0.108);
    rounded(group, 1.55, 3.31, 0.012, 0.17, screenMaterial, 0, 0, 0.133);
    rounded(group, 0.42, 0.105, 0.018, 0.05, black, 0, 1.48, 0.15);
    cylinder(group, 0.022, 0.01, glass, 0.13, 1.48, 0.164);
    rounded(group, 0.48, 0.023, 0.012, 0.01, ivory, 0, -1.55, 0.15);
    rounded(group, 0.035, 0.5, 0.06, 0.015, titanium, 0.875, 0.43, 0);
    rounded(group, 0.035, 0.27, 0.06, 0.015, titanium, -0.875, 0.5, 0);
    rounded(group, 0.035, 0.27, 0.06, 0.015, titanium, -0.875, 0.1, 0);
    // Separate lens barrels, polished rings and layered optical glass.
    rounded(group, 0.82, 0.92, 0.095, 0.16, rear, -0.32, 1.08, -0.17);
    for (const [x, y] of [
      [-0.52, 1.3],
      [-0.1, 1.06],
      [-0.52, 0.86],
    ]) {
      cylinder(group, 0.185, 0.07, titanium, x, y, -0.245);
      cylinder(group, 0.157, 0.08, black, x, y, -0.29);
      cylinder(group, 0.12, 0.018, glass, x, y, -0.337);
      cylinder(
        group,
        0.056,
        0.02,
        new THREE.MeshPhysicalMaterial({
          color: 0x23485c,
          metalness: 0.45,
          roughness: 0.05,
          clearcoat: 1,
        }),
        x + 0.012,
        y + 0.01,
        -0.35,
      );
    }
    cylinder(group, 0.052, 0.02, ivory, -0.1, 1.43, -0.25);
    for (let i = 0; i < 5; i++)
      cylinder(
        group,
        0.014,
        0.015,
        black,
        -0.5 + i * 0.07,
        -1.76,
        0,
      ).rotation.x = 0;
    rounded(group, 0.21, 0.025, 0.07, 0.01, black, 0, -1.76, 0);
    return group;
  }
  const mainPhone = phone();
  rig.add(mainPhone);
  const backPhone = phone(true);
  rig.add(backPhone);
  backPhone.scale.setScalar(0.78);

  const box = new THREE.Group();
  rig.add(box);
  rounded(box, 2.16, 0.3, 4.12, 0.12, paper, 0, -1.6, 0);
  // An actual recessed tray: four raised sides around a dark fitted insert.
  rounded(
    box,
    1.91,
    0.055,
    3.86,
    0.12,
    new THREE.MeshStandardMaterial({ color: 0x41443c, roughness: 0.95 }),
    0,
    -1.43,
    0,
  );
  rounded(box, 0.14, 0.18, 4.05, 0.06, ivory, -1.02, -1.42, 0);
  rounded(box, 0.14, 0.18, 4.05, 0.06, ivory, 1.02, -1.42, 0);
  rounded(box, 2.02, 0.18, 0.13, 0.05, ivory, 0, -1.42, -1.99);
  rounded(box, 2.02, 0.18, 0.13, 0.05, ivory, 0, -1.42, 1.99);
  const lid = new THREE.Group();
  rig.add(lid);
  rounded(lid, 2.2, 0.23, 4.16, 0.12, ivory);
  const lidArt = texture((ctx) => {
    ctx.fillStyle = '#eeece5';
    ctx.fillRect(0, 0, 512, 1024);
    ctx.strokeStyle = '#b0b5aa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(100, 140, 312, 690, 58);
    ctx.stroke();
    const g = ctx.createLinearGradient(100, 140, 412, 830);
    g.addColorStop(0, '#b4bdb1');
    g.addColorStop(0.5, '#e0e1d3');
    g.addColorStop(1, '#7e9085');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(110, 150, 292, 670, 50);
    ctx.fill();
    ctx.fillStyle = '#69786d';
    ctx.beginPath();
    ctx.roundRect(222, 171, 68, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#686d62';
    ctx.font = '26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('heaven.', 256, 940);
  });
  const lidPrint = new THREE.Mesh(
    new THREE.PlaneGeometry(2.14, 4.1),
    new THREE.MeshStandardMaterial({ map: lidArt, roughness: 0.7 }),
  );
  lidPrint.rotation.x = -Math.PI / 2;
  lidPrint.position.y = 0.119;
  lid.add(lidPrint);

  const earbuds = new THREE.Group();
  rig.add(earbuds);
  rounded(earbuds, 1.05, 0.67, 0.52, 0.22, white, 0, 0, 0);
  rounded(earbuds, 1.05, 0.17, 0.53, 0.08, white, 0, 0.36, -0.11).rotation.x =
    -0.5;
  for (const x of [-0.25, 0.25]) {
    const bud = new THREE.Group();
    earbuds.add(bud);
    bud.position.set(x, 0.32, 0.1);
    bud.rotation.z = x > 0 ? -0.15 : 0.15;
    rounded(bud, 0.14, 0.48, 0.14, 0.065, white, 0, 0.2, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), white);
    head.scale.set(1, 0.8, 0.85);
    head.position.set(0, 0.44, 0.025);
    bud.add(head);
    const grill = cylinder(bud, 0.055, 0.015, black, 0, 0.45, 0.16);
    grill.scale.y = 0.6;
  }
  cylinder(
    earbuds,
    0.022,
    0.015,
    new THREE.MeshBasicMaterial({ color: 0x8aca75 }),
    0,
    -0.12,
    0.27,
  );

  const watch = new THREE.Group();
  rig.add(watch);
  const strap = new THREE.MeshStandardMaterial({
    color: 0x6c7560,
    roughness: 0.85,
  });
  rounded(watch, 0.62, 2.25, 0.1, 0.13, strap, 0, 0, -0.05);
  for (let i = 0; i < 5; i++)
    rounded(watch, 0.11, 0.055, 0.018, 0.02, black, 0, -0.68 - i * 0.13, 0.01);
  rounded(watch, 0.92, 1.09, 0.23, 0.23, titanium);
  rounded(watch, 0.81, 0.98, 0.055, 0.22, black, 0, 0, 0.137);
  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 256;
  faceCanvas.height = 320;
  const faceCtx = faceCanvas.getContext('2d');
  if (!faceCtx) throw new Error('Watch face unavailable');
  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  rounded(
    watch,
    0.73,
    0.9,
    0.01,
    0.18,
    new THREE.MeshBasicMaterial({ map: faceTexture }),
    0,
    0,
    0.171,
  );
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.1, 24),
    titanium,
  );
  crown.rotation.z = Math.PI / 2;
  crown.position.set(0.51, 0.2, 0);
  watch.add(crown);
  let lastMinute = '';
  function updateWatch() {
    const value = cet.format(new Date());
    if (value === lastMinute) return;
    lastMinute = value;
    const ctx = faceCtx!;
    const bg = ctx.createLinearGradient(0, 0, 256, 320);
    bg.addColorStop(0, '#101a18');
    bg.addColorStop(1, '#526151');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 320);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3f1df';
    ctx.font = 'bold 95px Arial';
    const [h, m] = value.split(':');
    ctx.fillText(h, 128, 130);
    ctx.fillText(m, 128, 223);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#d4cfac';
    ctx.fillText('C E T', 128, 273);
    faceTexture.needsUpdate = true;
  }

  scene.add(new THREE.HemisphereLight(0xf2f5ef, 0x393027, 1.25));
  const key = new THREE.DirectionalLight(0xfff6e7, 2.8);
  key.position.set(-4, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe3f0ff, 1.1);
  fill.position.set(6, 2, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xe2a175, 1.7);
  rim.position.set(-2, 3, -5);
  scene.add(rim);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.2 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.79;
  floor.receiveShadow = true;
  scene.add(floor);
  let width = 1,
    height = 1;
  const resize = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    width = parent.clientWidth;
    height = parent.clientHeight;
    renderer.setSize(width, height, false);
    rig.scale.setScalar(width < 500 ? 1.1 : 1);
    camera.aspect = width / height;
    camera.position.set(6.1, 5.2, 11.4);
    camera.lookAt(0, 0.1, 0);
    camera.fov = width / height < 0.85 ? 43 : 34;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement!);
  resize();
  let time = 0,
    last = 0,
    chapter = -1,
    active = false,
    paused = false,
    reduced = false,
    disposed = false;
  function draw() {
    const t = time;
    const opened = ease(4.4, 8.5, t) * (1 - ease(18.6, 20, t));
    const rise = ease(7, 11, t) * (1 - ease(18.5, 20, t));
    const ensemble = ease(10, 13.5, t) * (1 - ease(18.8, 20, t));
    const bob = reduced ? 0 : Math.sin(t * 1.1) * 0.045;
    mainPhone.position.set(
      0.1 + rise * 0.3,
      -1.15 + rise * 1.8 + bob * rise,
      0,
    );
    mainPhone.rotation.set(
      (-Math.PI / 2) * (1 - rise) - 0.08 * rise,
      -0.23 * rise,
      -0.09 * rise,
    );
    const settled = ease(12, 15, t) * opened;
    lid.position.set(
      -2.55 * opened,
      -0.94 + opened * 1.55 - settled * 1.9,
      -0.45 * opened,
    );
    lid.rotation.set(-0.22 * opened, 0.13 * opened, -0.25 * opened);
    backPhone.visible = ensemble > 0.01;
    backPhone.position.set(1.8 * ensemble, 0.1 + bob, -0.75);
    backPhone.rotation.set(-0.06, Math.PI + 0.35, 0.12);
    earbuds.visible = ensemble > 0.01;
    earbuds.scale.setScalar(0.1 + ensemble * 0.95);
    earbuds.position.set(-2.25, 0.25 + bob, 0.9);
    earbuds.rotation.set(0.1, 0.25, -0.16);
    watch.visible = ensemble > 0.01;
    watch.scale.setScalar(0.1 + ensemble * 0.9);
    watch.position.set(3.15, -0.15 - bob, 0.9);
    watch.rotation.set(-0.08, -0.35, 0.16);
    screenMaterial.emissiveIntensity = 0.03 + rise * 0.7;
    rig.rotation.y = reduced ? -0.03 : Math.sin(t * 0.2) * 0.025;
    const next = reduced ? 3 : Math.min(3, Math.floor(t / 5));
    if (next !== chapter) {
      chapter = next;
      onChapter(next);
    }
    updateWatch();
    renderer.render(scene, camera);
  }
  function animate(timestamp: number) {
    if (disposed) return;
    const delta = last ? Math.min((timestamp - last) / 1000, 0.06) : 0;
    last = timestamp;
    if (active && !paused && !reduced && !document.hidden)
      time = (time + delta) % duration;
    if (
      active &&
      !document.hidden &&
      ((!paused && !reduced) || timestamp - lastStillFrame > 1000)
    ) {
      lastStillFrame = timestamp;
      draw();
    }
  }
  const visibility = () => {
    last = 0;
  };
  document.addEventListener('visibilitychange', visibility);
  let lastStillFrame = 0;
  draw();
  const lost = (event: Event) => {
    event.preventDefault();
    canvas.parentElement
      ?.closest('section')
      ?.setAttribute('data-ready', 'false');
  };
  canvas.addEventListener('webglcontextlost', lost);
  return {
    configure(options) {
      if (options.reduced && !reduced) time = 17;
      active = options.active;
      paused = options.paused;
      reduced = options.reduced;
      last = 0;
      renderer.setAnimationLoop(active ? animate : null);
      draw();
    },
    seek(next) {
      time = Math.max(0, Math.min(3, next)) * 5 + 1.5;
      draw();
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        maps = new Set<THREE.Texture>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            materials.add(material);
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture) maps.add(value);
          }
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      maps.forEach((m) => m.dispose());
      environment.dispose();
      renderer.dispose();
    },
  };
}
