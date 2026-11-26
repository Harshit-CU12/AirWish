import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ChevronDown,
  ChevronUp,
  Expand,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { RoomMonitor } from '../types/sentinel';
import { getCpcbCategory } from '../utils/aqi';
import { getRoomIndoorAqi } from '../utils/filtration';
import {
  buildSanctuaryScene,
  ROOM_LAYOUT_CENTERS,
  type SanctuarySceneHandle,
} from '../scene/buildSanctuaryScene';

interface Sanctuary3DVisualizerProps {
  stationName: string;
  outdoorAqi: number;
  rooms: RoomMonitor[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  safeModeActive: boolean;
  onToggleSafeMode: () => void;
  expanded?: boolean;
  onExpandView?: () => void;
}

type CameraPresetKey =
  | 'overview'
  | 'living-room'
  | 'kids-room'
  | 'elderly-suite'
  | 'master-bedroom';

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  overview: {
    pos: [9.2, 7.6, 10.2],
    target: [0, 0.55, 0],
    label: 'Whole Home',
  },
  'living-room': {
    pos: [-6.0, 4.4, 6.2],
    target: [-2.1, 0.75, 1.85],
    label: 'Living Room',
  },
  'kids-room': {
    pos: [6.0, 4.4, 6.2],
    target: [2.1, 0.75, 1.85],
    label: 'Kids Bedroom',
  },
  'elderly-suite': {
    pos: [-6.0, 4.4, -6.2],
    target: [-2.1, 0.75, -1.85],
    label: 'Elderly Suite',
  },
  'master-bedroom': {
    pos: [6.0, 4.4, -6.2],
    target: [2.1, 0.75, -1.85],
    label: 'Master Bedroom',
  },
};

// Zero-GC scratch objects shared across frames
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyEuler = new THREE.Euler();
const _dummyScale = new THREE.Vector3();
const _tmpColor = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function Sanctuary3DVisualizer({
  stationName,
  outdoorAqi,
  rooms,
  selectedRoomId,
  onSelectRoom,
  safeModeActive,
  onToggleSafeMode,
  expanded = false,
  onExpandView,
}: Sanctuary3DVisualizerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetKey>('overview');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  // Live reactive telemetry refs so Three.js loop never tears down on state changes
  const stateRef = useRef({
    outdoorAqi,
    rooms,
    selectedRoomId,
  });
  stateRef.current = { outdoorAqi, rooms, selectedRoomId };

  const cameraGoalRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS.overview.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.overview.target),
  });

  function applyCameraPreset(preset: CameraPresetKey) {
    setCameraPreset(preset);
    const cfg = CAMERA_PRESETS[preset];
    cameraGoalRef.current.pos.set(...cfg.pos);
    cameraGoalRef.current.target.set(...cfg.target);
    cameraGoalRef.current.active = true;
    if (preset !== 'overview') {
      onSelectRoom(preset);
    }
  }

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(300, container.clientHeight);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    const handleContextRestored = () => {
      setWebglUnavailable(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored
    );

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070C16');
    scene.fog = new THREE.FogExp2('#070C16', 0.032);

    // Procedural Studio Environment Map for metallic bezels & glass highlights
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 4.8;
    controls.maxDistance = 19;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.update();

    // Cancel scripted camera transition if user manually orbits
    const onControlStart = () => {
      cameraGoalRef.current.active = false;
    };
    controls.addEventListener('start', onControlStart);

    // Three-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x7bd0ff, 0x0b1222, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.9);
    keyLight.position.set(8, 13, 9);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 35;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimBackLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimBackLight.position.set(-9, 6, -10);
    scene.add(rimBackLight);

    const handle: SanctuarySceneHandle = buildSanctuaryScene(
      scene,
      stateRef.current.rooms,
      renderer.capabilities.getMaxAnisotropy()
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(280, Math.floor(entry.contentRect.width));
      const h = Math.max(260, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext();
      if ('fenceSync' in gl && typeof (gl as WebGL2RenderingContext).fenceSync === 'function') {
        const gl2 = gl as WebGL2RenderingContext;
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl2.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl2.deleteSync(sync);
            return;
          }
          const state = sync && gl2.getSyncParameter(sync, gl2.SYNC_STATUS);
          if (state === gl2.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl2.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function updateScene(dt: number) {
      elapsed += dt;
      const { outdoorAqi: curOutdoorAqi, rooms: curRooms, selectedRoomId: selId } =
        stateRef.current;

      // 1. Smooth damped camera preset transitions
      if (cameraGoalRef.current.active) {
        const lambda = 5.5;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          cameraGoalRef.current.pos.x,
          lambda,
          dt
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          cameraGoalRef.current.pos.y,
          lambda,
          dt
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          cameraGoalRef.current.pos.z,
          lambda,
          dt
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          cameraGoalRef.current.target.x,
          lambda,
          dt
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          cameraGoalRef.current.target.y,
          lambda,
          dt
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          cameraGoalRef.current.target.z,
          lambda,
          dt
        );

        if (
          camera.position.distanceToSquared(cameraGoalRef.current.pos) < 0.002 &&
          controls.target.distanceToSquared(cameraGoalRef.current.target) < 0.002
        ) {
          cameraGoalRef.current.active = false;
        }
      }
      controls.update();

      // 2. Sync outdoor smog material & rim light to live CPCB AQI
      const outdoorCat = getCpcbCategory(curOutdoorAqi);
      _tmpColor.set(outdoorCat.rimColor);
      handle.outdoorSmogMat.color.lerp(_tmpColor, Math.min(1, dt * 4));
      handle.outdoorSmogMat.emissive.lerp(_tmpColor, Math.min(1, dt * 4));
      handle.ambientRimLight.color.lerp(_tmpColor, Math.min(1, dt * 4));
      const smogSeverityFactor = THREE.MathUtils.clamp(curOutdoorAqi / 420, 0.2, 1.15);
      handle.outdoorSmogMat.opacity = THREE.MathUtils.clamp(
        0.22 + smogSeverityFactor * 0.56,
        0.22,
        0.82
      );
      handle.ambientRimLight.intensity = 3.2 + smogSeverityFactor * 5.2;

      // 3. Update exterior swirling smog instanced particles
      const visibleSmogCount = Math.max(
        28,
        Math.min(handle.smogCount, Math.round(handle.smogCount * smogSeverityFactor))
      );
      for (let i = 0; i < handle.smogCount; i++) {
        if (i >= visibleSmogCount) {
          _dummyScale.set(0, 0, 0);
          _dummyMatrix.compose(_dummyPos.set(0, -10, 0), _dummyQuat, _dummyScale);
          handle.outdoorSmogMesh.setMatrixAt(i, _dummyMatrix);
          continue;
        }
        const baseAngle = handle.smogSeeds[i * 5 + 0];
        const radius = handle.smogSeeds[i * 5 + 1];
        const baseY = handle.smogSeeds[i * 5 + 2];
        const speed = handle.smogSeeds[i * 5 + 3];
        const scale = handle.smogSeeds[i * 5 + 4] * (0.65 + smogSeverityFactor * 0.55);

        const angle = baseAngle + elapsed * speed;
        const px = Math.cos(angle) * radius;
        const pz = Math.sin(angle) * (radius * 0.84);
        const py = baseY + Math.sin(elapsed * 1.1 + i) * 0.22;

        _dummyPos.set(px, py, pz);
        _dummyEuler.set(elapsed * 0.5 + i, angle, elapsed * 0.3);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.setScalar(scale);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        handle.outdoorSmogMesh.setMatrixAt(i, _dummyMatrix);
      }
      handle.outdoorSmogMesh.instanceMatrix.needsUpdate = true;

      // 4. Update each room's HEPA turbine RPM, filter color, zone floor glow, & window shield height
      const speedByMode = { off: 0, sleep: 2.2, auto: 6.0, turbo: 12.5 };
      curRooms.forEach((room) => {
        const rig = handle.roomRigs.get(room.id);
        if (!rig) return;

        const rpmSpeed = speedByMode[room.purifierMode];
        rig.turbineAngle += dt * rpmSpeed;
        rig.turbineGroup.rotation.y = rig.turbineAngle;

        // Smooth motorized glass shield raising/lowering
        const targetShieldY = room.windowsSealed ? 0 : -0.94;
        rig.currentShieldY = THREE.MathUtils.damp(
          rig.currentShieldY,
          targetShieldY,
          6.5,
          dt
        );
        rig.shieldGroup.position.y = rig.currentShieldY;

        // Shield glass tint: cyan sanctuary when sealed, warning orange when unsealed
        const shieldHex = room.windowsSealed ? '#06B6D4' : '#F97316';
        _tmpColor.set(shieldHex);
        rig.shieldRimMat.color.lerp(_tmpColor, Math.min(1, dt * 6));
        rig.shieldRimMat.emissive.lerp(_tmpColor, Math.min(1, dt * 6));
        rig.shieldGlassMat.color.lerp(_tmpColor, Math.min(1, dt * 6));
        rig.shieldGlassMat.opacity = room.windowsSealed ? 0.28 : 0.12;

        // Filter core ring tint (amber alert when < 20%, clean cyan otherwise)
        _tmpColor.set(room.hepaFilterLifePct < 20 ? '#F97316' : '#06B6D4');
        rig.filterCoreMat.color.lerp(_tmpColor, Math.min(1, dt * 5));
        rig.filterCoreMat.emissive.lerp(_tmpColor, Math.min(1, dt * 5));

        // Top status ring & zone floor highlight
        const roomAqi = getRoomIndoorAqi(room);
        const roomCat = getCpcbCategory(roomAqi);
        _tmpColor.set(roomAqi <= 60 ? '#06B6D4' : roomCat.rimColor);
        rig.statusRingMat.emissive.lerp(_tmpColor, Math.min(1, dt * 5));
        rig.statusRingMat.emissiveIntensity =
          room.purifierMode === 'off' ? 0.15 : room.purifierMode === 'turbo' ? 1.8 : 1.1;

        rig.zoneBorderMat.emissive.lerp(_tmpColor, Math.min(1, dt * 5));
        rig.zoneBorderMat.emissiveIntensity = room.id === selId ? 0.42 : 0.14;
      });

      // 5. Update interior laminar clean-air upward helical streams above active purifiers
      for (let i = 0; i < handle.cleanCount; i++) {
        const roomIdx = Math.floor(handle.cleanSeeds[i * 5 + 0]);
        const room = curRooms[roomIdx];
        const rig = room ? handle.roomRigs.get(room.id) : undefined;
        if (!room || !rig || room.purifierMode === 'off') {
          _dummyScale.set(0, 0, 0);
          _dummyMatrix.compose(_dummyPos.set(0, -10, 0), _dummyQuat, _dummyScale);
          handle.indoorAirMesh.setMatrixAt(i, _dummyMatrix);
          continue;
        }

        const modeSpeed =
          room.purifierMode === 'turbo'
            ? 0.92
            : room.purifierMode === 'auto'
              ? 0.56
              : 0.28;
        const phase = (handle.cleanSeeds[i * 5 + 1] + elapsed * modeSpeed) % 1;
        const angleOffset = handle.cleanSeeds[i * 5 + 2];
        const baseRad = handle.cleanSeeds[i * 5 + 3];
        const seedScale = handle.cleanSeeds[i * 5 + 4];

        const spiralAngle = angleOffset + phase * Math.PI * 3.2;
        const spreadRad = baseRad + phase * 0.62;
        const px = rig.center.x + Math.cos(spiralAngle) * spreadRad;
        const pz = rig.center.z + Math.sin(spiralAngle) * spreadRad;
        const py = 1.62 + phase * 1.95;

        const fadeScale = Math.sin(phase * Math.PI) * seedScale;
        _dummyPos.set(px, py, pz);
        _dummyQuat.identity();
        _dummyScale.setScalar(fadeScale);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        handle.indoorAirMesh.setMatrixAt(i, _dummyMatrix);
      }
      handle.indoorAirMesh.instanceMatrix.needsUpdate = true;
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      updateScene(dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    // Initial render kick
    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored
      );
      handle.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  const sealedCount = rooms.filter((r) => r.windowsSealed).length;
  const activePurifiers = rooms.filter((r) => r.purifierMode !== 'off').length;
  const outdoorCat = getCpcbCategory(outdoorAqi);

  return (
    <section
      aria-label="Interactive 3D AirWish Sanctuary and HEPA airflow visualizer"
      data-testid="sanctuary-3d-section"
      className="relative overflow-hidden rounded-2xl border border-[#2A364F] bg-[#070C16]"
      style={{
        height: expanded ? 'min(74vh, 680px)' : '430px',
        minHeight: expanded ? '520px' : '380px',
      }}
    >
      {/* Isolated WebGL Canvas Mount — no sibling HUD overlays inside this ref */}
      {webglUnavailable ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="font-display text-base font-semibold text-[#F8FAFC]">
            3D Airflow View Unavailable
          </p>
          <p className="max-w-md text-xs text-[#94A3B8]">
            WebGL rendering is disabled in this browser context. All CPCB AQI
            telemetry and room HEPA controls remain fully active.
          </p>
        </div>
      ) : (
        <div
          ref={mountRef}
          data-testid="sanctuary-3d-canvas"
          className="h-full w-full cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Minimal Top-Left Spec Header (solid translucent rgba — NO backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute left-4 top-4 right-4 z-10 flex items-start justify-between gap-3">
        <div className="pointer-events-auto rounded-xl border border-[#2A364F] bg-[#090D16]/88 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-bold text-[#F8FAFC]">
              3D Sanctuary Airflow &amp; Smog Shield
            </h2>
            <span
              className="font-mono text-[11px] font-semibold tabular-nums"
              style={{ color: outdoorCat.textHex }}
            >
              Outdoor {outdoorAqi} ({outdoorCat.label})
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-[#94A3B8] tabular-nums">
            {stationName} · {sealedCount}/{rooms.length} glass shields sealed ·{' '}
            {activePurifiers} HEPA turbines active · Drag to orbit
          </p>
        </div>

        {!expanded && onExpandView && (
          <button
            type="button"
            onClick={onExpandView}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-[#2A364F] bg-[#090D16]/90 px-3 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#06B6D4] transition-colors whitespace-nowrap shrink-0"
          >
            <Expand className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
            <span>Expand 3D View</span>
          </button>
        )}
      </div>

      {/* Collapsible Unified Bottom Center Dock (Zero left/right viewport occlusion, no backdrop-blur) */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex w-[min(94%,820px)] -translate-x-1/2 flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          aria-expanded={!dockCollapsed}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#2A364F] bg-[#090D16]/92 px-3 py-1 text-[11px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Show 3D Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2A364F] bg-[#090D16]/92 px-3 py-2.5">
            {/* Camera Focus Presets */}
            <div
              role="group"
              aria-label="3D camera focus zone"
              className="flex flex-wrap items-center gap-1"
            >
              {(Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((key) => {
                const isActive = cameraPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyCameraPreset(key)}
                    aria-pressed={isActive}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#06B6D4] text-[#090D16]'
                        : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {CAMERA_PRESETS[key].label}
                  </button>
                );
              })}
            </div>

            {/* Quick 3D Sanctuary Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => applyCameraPreset('overview')}
                className="inline-flex items-center gap-1 rounded-md border border-[#2A364F] bg-[#131B2E] px-2.5 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors whitespace-nowrap"
                aria-label="Reset 3D camera"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={onToggleSafeMode}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  safeModeActive
                    ? 'border border-[#10B981]/50 bg-[#10B981]/20 text-[#6EE7B7]'
                    : 'bg-[#06B6D4] text-[#090D16] hover:bg-[#38BDF8]'
                }`}
              >
                {safeModeActive ? (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{safeModeActive ? 'Shields Locked' : 'Lock Shields'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
