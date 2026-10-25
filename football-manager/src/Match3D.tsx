import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { GameState } from './game.ts';
import { highlightPath, highlights } from './highlights.ts';
import { layout, slotsFor } from './lineup.ts';
import { haptic } from './native';
import './match3d.css';

const L = 105;
const W = 68;
const HALF_L = L / 2;
const HALF_W = W / 2;
const BALL_R = 0.17;

export const CAMS = [
  { id: 'main', label: 'Main' },
  { id: 'low', label: 'Touchline' },
  { id: 'end', label: 'Behind goal' },
  { id: 'high', label: 'Tactical' },
] as const;
export type CamId = (typeof CAMS)[number]['id'];

type Side = 'us' | 'them';
type Clip = {
  pts: THREE.Vector3[];
  kind: 'goal' | 'chance';
  side: Side;
  minute: number;
  text: string;
  scorer: number;
};

type AudioBed = { ctx: AudioContext; gain: GainNode; filter: BiquadFilterNode; base: number };

type Sim = {
  rng: number;
  ball: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  actionT: number;
  actionDur: number;
  holderSide: Side;
  holderI: number;
  arc: number;
  mode: 'play' | 'clip' | 'celebrate';
  clipT: number;
  clipDur: number;
  clipI: number;
  celeb: number;
  scorerSide: Side;
  scorerI: number;
  goalSent: boolean;
  booted: boolean;
  camPos: THREE.Vector3;
  look: THREE.Vector3;
  desired: THREE.Vector3;
  lookD: THREE.Vector3;
  tmp: THREE.Vector3;
  usHome: THREE.Vector3[];
  themHome: THREE.Vector3[];
  lastHud: string;
  spun: number;
};

function v() {
  return new THREE.Vector3();
}
function makeSim(): Sim {
  return {
    rng: 0x1a2b3c4d,
    ball: v(),
    from: v(),
    to: v(),
    actionT: 0,
    actionDur: 1,
    holderSide: 'us',
    holderI: 8,
    arc: 0.8,
    mode: 'play',
    clipT: 0,
    clipDur: 3.15,
    clipI: -1,
    celeb: 0,
    scorerSide: 'us',
    scorerI: 10,
    goalSent: false,
    booted: false,
    camPos: new THREE.Vector3(-4, 4.2, 8),
    look: new THREE.Vector3(),
    desired: v(),
    lookD: v(),
    tmp: v(),
    usHome: Array.from({ length: 11 }, v),
    themHome: Array.from({ length: 11 }, v),
    lastHud: '',
    spun: 0,
  };
}
function rnd(sim: Sim) {
  sim.rng = (Math.imul(1664525, sim.rng) + 1013904223) >>> 0;
  return sim.rng / 4294967296;
}
function lum(hex: string) {
  const n = hex.replace('#', '');
  if (n.length < 6) return 0.5;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function gkShirt(shirt: string) {
  return lum(shirt) > 0.62 ? '#1d3a6e' : '#f0c43a';
}
function shortsColor(shirt: string) {
  return lum(shirt) < 0.45 ? '#f4f1ea' : '#1c2430';
}
function ink(shirt: string) {
  return lum(shirt) < 0.55 ? '#f7f7f2' : '#172026';
}

let grassTex: THREE.CanvasTexture | null = null;
function grass() {
  if (grassTex) return grassTex;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 680;
  const g = c.getContext('2d');
  if (!g) return null;
  const stripes = 16;
  for (let i = 0; i < stripes; i++) {
    g.fillStyle = i % 2 === 0 ? '#1c7d38' : '#16662c';
    g.fillRect((i * c.width) / stripes, 0, c.width / stripes + 1, c.height);
  }
  let n = 0x2f6e2b1;
  const speck = () => ((n = Math.imul(1664525, n) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = speck() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    g.fillRect(speck() * c.width, speck() * c.height, 2, 2);
  }
  const wear = g.createRadialGradient(512, 340, 30, 512, 340, 400);
  wear.addColorStop(0, 'rgba(120, 90, 40, 0.2)');
  wear.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = wear;
  g.fillRect(0, 0, c.width, c.height);
  grassTex = new THREE.CanvasTexture(c);
  grassTex.colorSpace = THREE.SRGBColorSpace;
  grassTex.anisotropy = 8;
  return grassTex;
}
let netTex: THREE.CanvasTexture | null = null;
function net() {
  if (netTex) return netTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  if (!g) return null;
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 1.4;
  for (let x = 0; x <= 128; x += 8) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 64);
    g.stroke();
  }
  for (let y = 0; y <= 64; y += 8) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y);
    g.stroke();
  }
  netTex = new THREE.CanvasTexture(c);
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  netTex.repeat.set(4, 2);
  return netTex;
}
function numberTexture(n: number, color: string) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = color;
  g.font = '800 84px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), 64, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SKIN = ['#f1c7a5', '#e0ac84', '#c68642', '#8d5524', '#f3d2b5', '#a56b45'];
const HAIR = ['#1a1a1a', '#3a2418', '#5a4636', '#111', '#2b2118'];

function ballTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#f7f7f4';
  g.fillRect(0, 0, 512, 512);
  const pent = (x: number, y: number, r: number) => {
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillStyle = '#161616';
    g.fill();
  };
  [[256, 96], [96, 230], [416, 230], [150, 390], [362, 390], [256, 250]].forEach(([x, y]) => pent(x!, y!, 46));
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(256, 256, 200, 0, Math.PI * 2);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function Player({ shirt, n, skin, hair }: { shirt: string; n: number; skin: string; hair: string }) {
  const num = useMemo(() => (n > 0 ? numberTexture(n, ink(shirt)) : null), [n, shirt]);
  const shorts = shortsColor(shirt);
  const kit = { color: shirt, roughness: 0.48, emissive: shirt, emissiveIntensity: 0.22 } as const;
  const skinMat = { color: skin, roughness: 0.62 } as const;
  return (
    <group>
      <group name="legL" position={[-0.11, 0.92, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.2, 4, 8]} />
          <meshStandardMaterial {...skinMat} />
        </mesh>
        <group name="kneeL" position={[0, -0.4, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.16, 3, 8]} />
            <meshStandardMaterial {...kit} />
          </mesh>
          <mesh position={[0, -0.32, 0.06]}>
            <boxGeometry args={[0.11, 0.07, 0.2]} />
            <meshStandardMaterial color="#141414" roughness={0.4} />
          </mesh>
        </group>
      </group>
      <group name="legR" position={[0.11, 0.92, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.2, 4, 8]} />
          <meshStandardMaterial {...skinMat} />
        </mesh>
        <group name="kneeR" position={[0, -0.4, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.16, 3, 8]} />
            <meshStandardMaterial {...kit} />
          </mesh>
          <mesh position={[0, -0.32, 0.06]}>
            <boxGeometry args={[0.11, 0.07, 0.2]} />
            <meshStandardMaterial color="#141414" roughness={0.4} />
          </mesh>
        </group>
      </group>
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.16, 0.12, 4, 10]} />
        <meshStandardMaterial color={shorts} roughness={0.6} />
      </mesh>
      <group name="body" position={[0, 0.98, 0]}>
        <mesh position={[0, 0.32, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.28, 4, 12]} />
          <meshStandardMaterial {...kit} />
        </mesh>
        <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.075, 0.36, 3, 8]} />
          <meshStandardMaterial {...kit} />
        </mesh>
        <mesh position={[0, 0.5, 0.02]}>
          <torusGeometry args={[0.09, 0.028, 6, 14]} />
          <meshStandardMaterial color={shorts} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.08, 8]} />
          <meshStandardMaterial {...skinMat} />
        </mesh>
        <mesh position={[0, 0.74, 0]} castShadow>
          <sphereGeometry args={[0.145, 18, 16]} />
          <meshStandardMaterial {...skinMat} />
        </mesh>
        <mesh position={[0, 0.82, -0.02]} scale={[1.05, 0.55, 1.05]}>
          <sphereGeometry args={[0.145, 12, 10]} />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
        <mesh position={[-0.048, 0.76, 0.125]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#1b1b1b" />
        </mesh>
        <mesh position={[0.048, 0.76, 0.125]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#1b1b1b" />
        </mesh>
        <mesh position={[0, 0.72, 0.13]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.045, 0.012, 0.02]} />
          <meshStandardMaterial color="#7a4030" />
        </mesh>
        <group name="armL" position={[-0.28, 0.48, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.14, 3, 8]} />
            <meshStandardMaterial {...kit} />
          </mesh>
          <group name="elbowL" position={[0, -0.28, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <capsuleGeometry args={[0.042, 0.14, 3, 8]} />
              <meshStandardMaterial {...skinMat} />
            </mesh>
          </group>
        </group>
        <group name="armR" position={[0.28, 0.48, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.14, 3, 8]} />
            <meshStandardMaterial {...kit} />
          </mesh>
          <group name="elbowR" position={[0, -0.28, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <capsuleGeometry args={[0.042, 0.14, 3, 8]} />
              <meshStandardMaterial {...skinMat} />
            </mesh>
          </group>
        </group>
        {num && (
          <>
            <mesh position={[0, 0.34, 0.19]}>
              <planeGeometry args={[0.22, 0.22]} />
              <meshBasicMaterial map={num} transparent depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.34, -0.19]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.24, 0.24]} />
              <meshBasicMaterial map={num} transparent depthWrite={false} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

function Mark({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial color="#f4f7f2" />
    </mesh>
  );
}

function Pitch() {
  const map = useMemo(() => grass(), []);
  const pa = 16.5;
  const paw = 40.32;
  const ga = 5.5;
  const gaw = 18.32;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[150, 110]} />
        <meshStandardMaterial color="#0e3a22" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial map={map ?? undefined} color={map ? '#ffffff' : '#1b7a34'} roughness={0.92} />
      </mesh>
      <Mark x={0} z={0} w={0.12} d={W} />
      <Mark x={0} z={HALF_W - 0.06} w={L} d={0.12} />
      <Mark x={0} z={-HALF_W + 0.06} w={L} d={0.12} />
      <Mark x={HALF_L - 0.06} z={0} w={0.12} d={W} />
      <Mark x={-HALF_L + 0.06} z={0} w={0.12} d={W} />
      {[1, -1].map((s) => (
        <group key={s}>
          <Mark x={s * (HALF_L - pa)} z={0} w={0.12} d={paw} />
          <Mark x={s * (HALF_L - pa / 2)} z={paw / 2} w={pa} d={0.12} />
          <Mark x={s * (HALF_L - pa / 2)} z={-paw / 2} w={pa} d={0.12} />
          <Mark x={s * (HALF_L - ga)} z={0} w={0.12} d={gaw} />
          <Mark x={s * (HALF_L - ga / 2)} z={gaw / 2} w={ga} d={0.12} />
          <Mark x={s * (HALF_L - ga / 2)} z={-gaw / 2} w={ga} d={0.12} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s * (HALF_L - 11), 0.03, 0]}>
            <circleGeometry args={[0.14, 16]} />
            <meshBasicMaterial color="#f4f7f2" />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[9.05, 9.2, 64]} />
        <meshBasicMaterial color="#f4f7f2" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.031, 0]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#f4f7f2" />
      </mesh>
    </group>
  );
}

function Goal({ sign }: { sign: 1 | -1 }) {
  const map = useMemo(() => net(), []);
  const post = 3.66;
  const h = 2.44;
  const white = { color: '#f7f7f7', metalness: 0.55, roughness: 0.28 } as const;
  return (
    <group position={[sign * HALF_L, 0, 0]}>
      {[-post, post].map((z) => (
        <mesh key={z} position={[0, h / 2, z]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, h, 10]} />
          <meshStandardMaterial {...white} />
        </mesh>
      ))}
      <mesh position={[0, h, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, post * 2, 10]} />
        <meshStandardMaterial {...white} />
      </mesh>
      <mesh position={[sign * 1.35, h / 2, 0]} rotation={[0, sign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
        <planeGeometry args={[post * 2, h]} />
        <meshBasicMaterial map={map ?? undefined} transparent opacity={0.85} depthWrite={false} side={THREE.DoubleSide} color="#ffffff" />
      </mesh>
      <mesh position={[sign * 0.7, h, 0]} rotation={[-Math.PI / 2, 0, sign > 0 ? 0 : Math.PI]}>
        <planeGeometry args={[1.4, post * 2]} />
        <meshBasicMaterial map={map ?? undefined} transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Stadium() {
  const colors = ['#d3ef85', '#142326', '#f4f3ed', '#1f6b3a', '#86b5f2', '#efab76'];
  const boards = [];
  for (let i = 0; i < 10; i++) {
    const x = -46 + i * 10.2;
    boards.push(
      <mesh key={`n${i}`} position={[x, 0.55, 35.5]}>
        <boxGeometry args={[9.7, 0.95, 0.18]} />
        <meshStandardMaterial color={colors[i % colors.length]} />
      </mesh>,
      <mesh key={`s${i}`} position={[x, 0.55, -35.5]}>
        <boxGeometry args={[9.7, 0.95, 0.18]} />
        <meshStandardMaterial color={colors[(i + 3) % colors.length]} />
      </mesh>,
    );
  }
  return (
    <group>
      {boards}
      <mesh position={[0, 7, 49]}>
        <boxGeometry args={[124, 16, 16]} />
        <meshStandardMaterial color="#1a222b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 7, -49]}>
        <boxGeometry args={[124, 16, 16]} />
        <meshStandardMaterial color="#1a222b" roughness={0.9} />
      </mesh>
      <mesh position={[64, 6, 0]}>
        <boxGeometry args={[12, 14, 78]} />
        <meshStandardMaterial color="#161d26" roughness={0.9} />
      </mesh>
      <mesh position={[-64, 6, 0]}>
        <boxGeometry args={[12, 14, 78]} />
        <meshStandardMaterial color="#161d26" roughness={0.9} />
      </mesh>
      <mesh position={[0, 15.2, 52]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[120, 0.35, 14]} />
        <meshStandardMaterial color="#243140" />
      </mesh>
      <mesh position={[0, 15.2, -52]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[120, 0.35, 14]} />
        <meshStandardMaterial color="#243140" />
      </mesh>
      {[
        [58, 40],
        [58, -40],
        [-58, 40],
        [-58, -40],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x!, 0, z!]}>
          <mesh position={[0, 14, 0]}>
            <cylinderGeometry args={[0.28, 0.4, 28, 8]} />
            <meshStandardMaterial color="#d5dde6" metalness={0.4} roughness={0.35} />
          </mesh>
          <mesh position={[0, 28.2, 0]}>
            <boxGeometry args={[4.2, 0.45, 1.4]} />
            <meshStandardMaterial color="#fff4d4" emissive="#ffe7b0" emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
      {[
        [HALF_L, HALF_W],
        [HALF_L, -HALF_W],
        [-HALF_L, HALF_W],
        [-HALF_L, -HALF_W],
      ].map(([x, z]) => (
        <group key={`f${x}${z}`} position={[x!, 0, z!]}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.6, 6]} />
            <meshStandardMaterial color="#f2f2f2" />
          </mesh>
          <mesh position={[0.22, 1.4, 0]}>
            <boxGeometry args={[0.46, 0.26, 0.03]} />
            <meshStandardMaterial color="#d3ef85" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const SEAT_N = 24 * 6 * 4;
function Crowd({ pulse }: { pulse: MutableRefObject<number> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seats = useMemo(() => {
    const arr: { x: number; y: number; z: number; p: number }[] = [];
    const add = (x: number, y: number, z: number, p: number) => arr.push({ x, y, z, p });
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 6; j++) {
        const along = (i / 23 - 0.5) * 108;
        const rise = 3.1 + j * 1.15;
        const depth = 42.5 + j * 0.85;
        add(along, rise, depth, i * 0.35);
        add(along, rise, -depth, i * 0.35 + 1);
        add(60 + j * 0.7, rise, (i / 23 - 0.5) * 64, i * 0.2);
        add(-60 - j * 0.7, rise, (i / 23 - 0.5) * 64, i * 0.2 + 2);
      }
    }
    return arr;
  }, []);
  const colors = useMemo(() => ['#c23b3b', '#2a4d8f', '#eceae4', '#1b1b1b', '#d9f06f', '#e7b15a', '#3d6b4f'], []);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    seats.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.scale.set(0.42, 0.55, 0.42);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [seats, dummy, colors]);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const hopAmp = pulse.current > 0 ? 0.34 : 0.045;
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i]!;
      dummy.position.set(s.x, s.y + Math.sin(t * 2.4 + s.p) * hopAmp, s.z);
      dummy.scale.set(0.42, 0.55, 0.42);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, Math.min(SEAT_N, seats.length)]}>
      <sphereGeometry args={[0.42, 6, 5]} />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  );
}

function placeHomes(slots: { x: number; y: number }[], side: 1 | -1, into: THREE.Vector3[]) {
  for (let i = 0; i < 11; i++) {
    const s = slots[i] ?? { x: 50, y: 50 };
    const along = -side * HALF_L + side * (s.y / 100) * L;
    const across = (s.x / 100 - 0.5) * W * side;
    into[i]!.set(along, 0, across);
  }
}
function startPass(sim: Sim) {
  sim.actionT = 0;
  sim.from.copy(sim.ball);
  sim.from.y = BALL_R;
  if (rnd(sim) < 0.22) sim.holderSide = sim.holderSide === 'us' ? 'them' : 'us';
  const homes = sim.holderSide === 'us' ? sim.usHome : sim.themHome;
  let next = 1 + Math.floor(rnd(sim) * 10);
  if (next === sim.holderI) next = (next % 10) + 1;
  const attack = sim.holderSide === 'us' ? 1 : -1;
  sim.to.copy(homes[next]!);
  if (rnd(sim) < 0.28) sim.to.x += attack * (8 + rnd(sim) * 12);
  sim.to.x = THREE.MathUtils.clamp(sim.to.x, -50, 50);
  sim.to.z = THREE.MathUtils.clamp(sim.to.z + (rnd(sim) - 0.5) * 6, -30, 30);
  sim.to.y = BALL_R;
  sim.holderI = next;
  sim.arc = rnd(sim) < 0.18 ? 2.6 : 0.45 + rnd(sim) * 0.9;
  sim.actionDur = 0.62 + rnd(sim) * 0.7;
}
function sampleClip(pts: THREE.Vector3[], t: number, out: THREE.Vector3) {
  const n = Math.max(1, pts.length - 1);
  const x = Math.min(0.999, Math.max(0, t)) * n;
  const i = Math.floor(x);
  const u = x - i;
  const s = u * u * (3 - 2 * u);
  const a = pts[i]!;
  const b = pts[Math.min(pts.length - 1, i + 1)]!;
  out.lerpVectors(a, b, s);
  const shot = i >= n - 1;
  out.y = THREE.MathUtils.lerp(a.y, b.y, s) + Math.sin(Math.PI * s) * (shot ? 3.3 : 1.15);
}

function actor(group: THREE.Object3D | undefined) {
  if (!group) return null;
  return {
    root: group,
    body: group.getObjectByName('body'),
    legL: group.getObjectByName('legL'),
    legR: group.getObjectByName('legR'),
    kneeL: group.getObjectByName('kneeL'),
    kneeR: group.getObjectByName('kneeR'),
    armL: group.getObjectByName('armL'),
    armR: group.getObjectByName('armR'),
    elbowL: group.getObjectByName('elbowL'),
    elbowR: group.getObjectByName('elbowR'),
  };
}

function World({
  state,
  speed,
  cam,
  onHud,
  pulse,
  bed,
}: {
  state: GameState;
  speed: number;
  cam: CamId;
  onHud: (minute: number, text: string, goal: boolean) => void;
  pulse: MutableRefObject<number>;
  bed: MutableRefObject<{ audio: AudioBed | null; failed: boolean }>;
}) {
  const sim = useRef<Sim>(null);
  if (!sim.current) sim.current = makeSim();
  const usG = useRef<THREE.Group>(null);
  const themG = useRef<THREE.Group>(null);
  const refG = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Mesh>(null);
  const blob = useRef<THREE.Mesh>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const ballMap = useMemo(() => ballTexture(), []);
  const hud = useRef(onHud);
  hud.current = onHud;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const camRef = useRef(cam);
  camRef.current = cam;
  const live = useRef({ complete: false, minute: 0 });
  live.current.complete = !!state.match?.complete;
  live.current.minute = state.match?.minute ?? 0;

  const usClub = state.clubs.find((c) => c.id === state.clubId);
  const opp = state.clubs.find((c) => c.id === state.match?.opponentId);
  const usColor = usClub?.color ?? '#86B5F2';
  const themColor = opp?.color ?? '#F28384';
  const oppForm = opp?.style === 'attacking' ? '4-3-3' : opp?.style === 'cautious' ? '5-3-2' : '4-4-2';
  const usSlots = slotsFor(state.tactics.formation);
  const themSlots = slotsFor(oppForm);

  const clips = useMemo(() => {
    const xi = state.match ? layout(state) : [];
    return highlights(state).map((e, i) => {
      const scorer = e.side === 'us' && e.playerId ? Math.max(0, xi.findIndex((p) => p?.id === e.playerId)) : 10;
      const pts = highlightPath(e, i).map((p, k, arr) => {
        let x = (p.x / 100 - 0.5) * L;
        const z = ((p.y / 100) - 0.5) * W;
        const last = k === arr.length - 1;
        if (last && e.kind === 'goal') x += x >= 0 ? 1.35 : -1.35;
        return new THREE.Vector3(x, last ? (e.kind === 'goal' ? 1.15 : 1.05) : 0.22, z);
      });
      return {
        pts,
        kind: e.kind === 'goal' ? 'goal' : 'chance',
        side: (e.side === 'them' ? 'them' : 'us') as Side,
        minute: e.minute,
        text: e.text,
        scorer: scorer < 0 ? 10 : scorer,
      } satisfies Clip;
    });
    // Rebuild when the timeline grows. layout reads the current XI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.match?.timeline.length, state.match?.minute, state.tactics.formation]);

  const clipsRef = useRef(clips);
  clipsRef.current = clips;
  const seen = useRef(-1);

  useFrame((root, delta) => {
    const s = sim.current!;
    const dt = Math.min(delta, 0.05);
    placeHomes(usSlots, 1, s.usHome);
    placeHomes(themSlots, -1, s.themHome);
    if (!s.booted) {
      s.ball.copy(s.usHome[8]!);
      s.ball.y = BALL_R;
      s.holderSide = 'us';
      s.holderI = 8;
      startPass(s);
      s.booted = true;
    }
    if (clips.length !== seen.current) {
      seen.current = clips.length;
      if (clips.length) s.clipI = -2;
      // jump flag: clipI -2 means "play the latest"
    }
    if (s.clipI === -2 && clipsRef.current.length) {
      const i = clipsRef.current.length - 1;
      s.mode = 'clip';
      s.clipT = 0;
      s.clipI = i;
      s.celeb = 0;
      s.goalSent = false;
    }

    let scale = speedRef.current;
    if (s.mode === 'clip' && s.clipT / s.clipDur > 0.68) scale *= 0.48;
    const step = dt * scale;
    const list = clipsRef.current;

    if (s.mode === 'clip' && list[s.clipI]) {
      s.clipT += step;
      const u = Math.min(1, s.clipT / s.clipDur);
      sampleClip(list[s.clipI]!.pts, u, s.ball);
      if (u >= 1) {
        const clip = list[s.clipI]!;
        if (clip.kind === 'goal') {
          s.mode = 'celebrate';
          s.celeb = 2.5;
          s.scorerSide = clip.side;
          s.scorerI = clip.scorer;
        } else {
          s.mode = 'play';
          s.holderSide = clip.side === 'us' ? 'them' : 'us';
          s.holderI = 4;
          startPass(s);
        }
      }
    } else if (s.mode === 'celebrate') {
      s.celeb -= step;
      pulse.current = Math.max(0, s.celeb);
      if (!s.goalSent) {
        s.goalSent = true;
        void haptic('goal');
        const audio = bed.current.audio;
        if (audio) {
          const now = audio.ctx.currentTime;
          audio.gain.gain.cancelScheduledValues(now);
          audio.gain.gain.setValueAtTime(0.09, now);
          audio.filter.frequency.setValueAtTime(1400, now);
          audio.gain.gain.linearRampToValueAtTime(audio.base, now + 1.8);
          audio.filter.frequency.linearRampToValueAtTime(420, now + 1.8);
        }
      }
      if (s.celeb <= 0) {
        s.mode = 'play';
        pulse.current = 0;
        s.holderSide = s.scorerSide;
        s.holderI = 8;
        startPass(s);
      }
    } else {
      pulse.current = 0;
      s.actionT += step;
      const u = Math.min(1, s.actionT / s.actionDur);
      const k = u * u * (3 - 2 * u);
      s.ball.lerpVectors(s.from, s.to, k);
      s.ball.y = BALL_R + Math.sin(Math.PI * k) * s.arc;
      if (u >= 1) startPass(s);
    }

    const moveSide = (rootG: THREE.Group | null, side: Side) => {
      const kids = rootG?.children ?? [];
      const homes = side === 'us' ? s.usHome : s.themHome;
      const attack = side === 'us' ? 1 : -1;
      for (let i = 0; i < Math.min(11, kids.length); i++) {
        const group = kids[i] as THREE.Group;
        const home = homes[i]!;
        const target = s.tmp;
        if (i === 0) {
          const line = attack > 0 ? -HALF_L + 2.2 : HALF_L - 2.2;
          const threat = Math.abs(s.ball.x - line) < 18;
          target.set(line + attack * (threat ? 1.2 : 0), 0, threat ? THREE.MathUtils.clamp(s.ball.z, -3.4, 3.4) : home.z * 0.2);
        } else {
          const slide = THREE.MathUtils.clamp(s.ball.x, -38, 38) * 0.22;
          target.set(home.x + slide, 0, home.z);
          if (s.mode === 'play' && s.holderSide === side && s.holderI === i) {
            target.x = s.ball.x - attack * 0.9;
            target.z = s.ball.z + (i % 2 === 0 ? 0.55 : -0.55);
          }
          const clip = list[s.clipI];
          if ((s.mode === 'clip' || s.mode === 'celebrate') && clip) {
            if (clip.side === side && i >= 8) target.lerp(s.ball, 0.45);
            if (clip.side !== side && i < 5) {
              target.x = THREE.MathUtils.lerp(home.x, attack > 0 ? -36 : 36, 0.6);
              target.z = THREE.MathUtils.lerp(home.z, s.ball.z, 0.4);
            }
          }
          if (s.mode === 'celebrate' && s.scorerSide === side && s.scorerI === i) {
            target.set(attack * 47, 0, s.ball.z >= 0 ? 26 : -26);
          }
        }
        const prevX = group.position.x;
        const prevZ = group.position.z;
        const blend = 1 - Math.exp(-7 * dt * Math.max(1, speedRef.current * 0.35));
        group.position.x += (target.x - group.position.x) * blend;
        group.position.z += (target.z - group.position.z) * blend;
        group.position.y = 0;
        const faceX = s.mode === 'celebrate' && s.scorerSide === side && s.scorerI === i ? attack * 70 : s.ball.x;
        const faceZ = s.ball.z;
        const dx = faceX - group.position.x;
        const dz = faceZ - group.position.z;
        if (dx * dx + dz * dz > 0.04) {
          const yaw = Math.atan2(dx, dz);
          let turn = yaw - group.rotation.y;
          while (turn > Math.PI) turn -= Math.PI * 2;
          while (turn < -Math.PI) turn += Math.PI * 2;
          group.rotation.y += turn * (1 - Math.exp(-10 * dt));
        }
        const spd = Math.hypot(group.position.x - prevX, group.position.z - prevZ) / Math.max(dt, 0.001);
        const amp = Math.min(1, spd / 4.5);
        const moving = amp > 0.12;
        const data = group.userData as { phase?: number };
        data.phase = (data.phase ?? i) + dt * (moving ? 8 + amp * 10 : 2);
        const a = actor(group);
        const armsUp = s.mode === 'celebrate' && s.scorerSide === side && s.scorerI === i;
        const swing = Math.sin(data.phase) * (moving ? 0.95 * Math.max(amp, 0.35) : 0.06);
        if (a?.legL) a.legL.rotation.x = swing;
        if (a?.legR) a.legR.rotation.x = -swing;
        if (a?.kneeL) a.kneeL.rotation.x = moving ? 0.25 + Math.max(0, -swing) * 1.35 : 0.15;
        if (a?.kneeR) a.kneeR.rotation.x = moving ? 0.25 + Math.max(0, swing) * 1.35 : 0.15;
        if (a?.armL) a.armL.rotation.x = armsUp ? -2.5 : -swing * 0.85;
        if (a?.armR) a.armR.rotation.x = armsUp ? -2.5 : swing * 0.85;
        if (a?.elbowL) a.elbowL.rotation.x = armsUp ? 0.2 : 0.45;
        if (a?.elbowR) a.elbowR.rotation.x = armsUp ? 0.2 : 0.45;
        if (a?.body) a.body.rotation.x = armsUp ? -0.15 : moving ? 0.16 * Math.max(amp, 0.4) : 0;
      }
    };
    moveSide(usG.current, 'us');
    moveSide(themG.current, 'them');
    if (refG.current) {
      refG.current.position.set(s.ball.x + 3.2, 0, s.ball.z + 2.4);
      const dx = s.ball.x - refG.current.position.x;
      const dz = s.ball.z - refG.current.position.z;
      refG.current.rotation.y = Math.atan2(dx, dz);
    }
    if (ball.current) {
      ball.current.position.copy(s.ball);
      s.spun += step * 14;
      ball.current.rotation.x = s.spun;
      ball.current.rotation.z = s.spun * 0.6;
    }
    if (lamp.current) lamp.current.position.set(s.ball.x, 5.2, s.ball.z);
    if (blob.current) {
      blob.current.position.set(s.ball.x, 0.04, s.ball.z);
      const sc = 1.15 + Math.max(0, s.ball.y - BALL_R) * 0.35;
      blob.current.scale.set(sc, sc, 1);
      (blob.current.material as THREE.MeshBasicMaterial).opacity = 0.9;
    }

    const b = s.ball;
    const mode = camRef.current;
    const flank = b.z > 10 ? -1 : 1;
    if (s.mode === 'celebrate') {
      const sign = Math.sign(b.x || 1);
      s.desired.set(b.x + sign * 5, 2.6, b.z + 3.5);
      s.lookD.set(b.x, 1.35, b.z);
    } else if (mode === 'high') {
      s.desired.set(b.x, 70, b.z + 0.4);
      s.lookD.set(b.x, 0, b.z);
    } else if (mode === 'end') {
      const sign = b.x >= 0 ? 1 : -1;
      s.desired.set(sign * (HALF_L + 7), 4.2, THREE.MathUtils.clamp(b.z * 0.25, -6, 6));
      s.lookD.set(b.x, 1.15, b.z);
    } else if (mode === 'low') {
      s.desired.set(b.x - 1.5, 2.1, b.z + flank * 6.5);
      s.lookD.set(b.x + 1, 1, b.z);
    } else {
      s.desired.set(b.x - 3.2, 3.3, b.z + flank * 5.4);
      s.lookD.set(b.x + 0.8, 1.05, b.z);
    }
    s.desired.x = THREE.MathUtils.clamp(s.desired.x, -60, 60);
    s.desired.z = THREE.MathUtils.clamp(s.desired.z, -48, 48);
    s.desired.y = Math.max(1.8, s.desired.y);
    const follow = 1 - Math.exp(-5.5 * dt * Math.min(speedRef.current, 3));
    s.camPos.lerp(s.desired, follow);
    s.look.lerp(s.lookD, follow);
    root.camera.position.copy(s.camPos);
    root.camera.lookAt(s.look);
    const persp = root.camera as THREE.PerspectiveCamera;
    const fov = mode === 'high' ? 48 : mode === 'main' ? 28 : 34;
    if (Math.abs(persp.fov - fov) > 0.15) {
      persp.fov += (fov - persp.fov) * (1 - Math.exp(-3 * dt));
      persp.updateProjectionMatrix();
    }

    const clip = list[s.clipI];
    const minute = s.mode === 'play' ? live.current.minute : (clip?.minute ?? live.current.minute);
    const text = live.current.complete && s.mode === 'play'
      ? 'Full time. The stadium holds the result.'
      : s.mode === 'celebrate'
        ? clip?.text ?? 'Goal.'
        : s.mode === 'clip'
          ? clip?.text ?? ''
          : 'The sides keep the ball moving.';
    const goal = s.mode === 'celebrate';
    const hudKey = `${minute}|${text}|${s.clipI}|${s.mode}`;
    if (hudKey !== s.lastHud) {
      s.lastHud = hudKey;
      hud.current(minute, text, goal);
    }
  });

  const usGk = gkShirt(usColor);
  const themGk = gkShirt(themColor);
  return (
    <>
      <color attach="background" args={['#102033']} />
      <fog attach="fog" args={['#102033', 90, 190]} />
      <hemisphereLight args={['#d5e4f5', '#1d4a2c', 0.7]} />
      <directionalLight
        position={[28, 42, 16]}
        intensity={2.35}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-24, 18, -20]} intensity={0.35} color="#9eb6d8" />
      <Pitch />
      <Goal sign={1} />
      <Goal sign={-1} />
      <Stadium />
      <Crowd pulse={pulse} />
      <group ref={usG}>
        {Array.from({ length: 11 }, (_, i) => (
          <Player key={i} shirt={i === 0 ? usGk : usColor} n={i + 1} skin={SKIN[i % SKIN.length]!} hair={HAIR[i % HAIR.length]!} />
        ))}
      </group>
      <group ref={themG}>
        {Array.from({ length: 11 }, (_, i) => (
          <Player key={i} shirt={i === 0 ? themGk : themColor} n={i + 1} skin={SKIN[(i + 3) % SKIN.length]!} hair={HAIR[(i + 2) % HAIR.length]!} />
        ))}
      </group>
      <group ref={refG}>
        <Player shirt="#1a1a1a" n={0} skin={SKIN[2]!} hair={HAIR[0]!} />
      </group>
      <pointLight ref={lamp} intensity={110} distance={18} decay={2} color="#fff6df" />
      <mesh ref={ball} castShadow>
        <sphereGeometry args={[BALL_R, 28, 20]} />
        <meshStandardMaterial map={ballMap ?? undefined} color="#ffffff" roughness={0.32} metalness={0.04} />
      </mesh>
      <mesh ref={blob} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.32, 0.48, 28]} />
        <meshBasicMaterial color="#d3ef85" transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function ensureAudio(bed: { audio: AudioBed | null; failed: boolean }) {
  if (bed.audio || bed.failed) {
    void bed.audio?.ctx.resume();
    return;
  }
  try {
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let n = 0x51f2a9c3;
    for (let i = 0; i < data.length; i++) {
      n = (Math.imul(1664525, n) + 1013904223) >>> 0;
      data[i] = n / 4294967296 * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.028;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    bed.audio = { ctx, gain, filter, base: 0.028 };
  } catch {
    bed.failed = true;
  }
}

export function Match3D({ state, speed }: { state: GameState; speed: number }) {
  const [cam, setCam] = useState<CamId>('main');
  const [hud, setHud] = useState({ minute: state.match?.minute ?? 0, text: 'Kick-off under the lights.', goal: false });
  const pulse = useRef(0);
  const bed = useRef<{ audio: AudioBed | null; failed: boolean }>({ audio: null, failed: false });
  const us = state.clubs.find((c) => c.id === state.clubId);
  const opp = state.clubs.find((c) => c.id === state.match?.opponentId);
  const onHud = (minute: number, text: string, goal: boolean) => {
    setHud((prev) => (prev.minute === minute && prev.text === text && prev.goal === goal ? prev : { minute, text, goal }));
  };
  return (
    <div className="pitch3d" onPointerDown={() => ensureAudio(bed.current)}>
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [-4, 4.2, 8], fov: 32, near: 0.1, far: 280 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <World state={state} speed={speed} cam={cam} onHud={onHud} pulse={pulse} bed={bed} />
      </Canvas>
      <div className="bc-bug">
        <i />
        <span className="bc-swatch" style={{ background: us?.color ?? '#86B5F2' }} />
        <b>
          {state.match?.us ?? 0}
          <span style={{ opacity: 0.55 }}> – </span>
          {state.match?.them ?? 0}
        </b>
        <span className="bc-swatch" style={{ background: opp?.color ?? '#F28384' }} />
        <small>
          {state.match?.complete ? 'FT' : `${state.match?.minute ?? 0}′`}
          <br />
          {us?.short ?? 'HOME'}
        </small>
      </div>
      <div className="cam-switch" role="group" aria-label="Camera">
        {CAMS.map((c) => (
          <button key={c.id} className={c.id === cam ? 'active' : ''} onClick={() => setCam(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <p className="bc-caption">
        {hud.minute}′ {hud.text}
      </p>
      {hud.goal && <div className="bc-goal">GOAL</div>}
    </div>
  );
}
