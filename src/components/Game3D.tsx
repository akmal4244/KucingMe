import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere, Capsule, Cone, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { SpeechService, SpeechCommand } from '../lib/speech';
import { playMeow, playEatSound } from '../lib/sounds';
import { LocateFixed, Mic } from 'lucide-react';

const BOARD_SIZE = 8;
const TILE_SIZE = 2;
const MAX_POS = (BOARD_SIZE * TILE_SIZE) / 2 - TILE_SIZE / 2; // 7

// --- Components ---

function CameraTracker({ needleRef }: { needleRef: React.RefObject<HTMLDivElement> }) {
  useFrame(({ camera }) => {
    if (needleRef.current) {
      // Angle from camera to origin
      const angle = Math.atan2(camera.position.x, camera.position.z);
      needleRef.current.style.transform = `rotate(${angle}rad)`;
    }
  });
  return null;
}

function useMicVolume() {
  const [volume, setVolume] = useState(0);
  useEffect(() => {
    let audioCtx: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let source: MediaStreamAudioSourceNode;
    let stream: MediaStream;
    let animationId: number;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(s => {
        stream = s;
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          setVolume(sum / dataArray.length);
          animationId = requestAnimationFrame(update);
        };
        update();
      })
      .catch(console.error);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioCtx) audioCtx.close();
    };
  }, []);
  return volume;
}

function MicIndicator() {
  const volume = useMicVolume();
  const scale = 1 + Math.min((volume / 64), 1) * 0.5;
  const isActive = volume > 2;
  
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 relative shadow-inner shrink-0">
      <div 
         className={`absolute w-full h-full rounded-full ${isActive ? 'bg-amber-400' : 'bg-transparent'}`}
         style={{ transform: `scale(${scale})`, opacity: isActive ? 0.5 : 0, transition: 'transform 0.05s ease-out' }}
      ></div>
      <Mic size={16} className={isActive ? "text-amber-700 z-10" : "text-amber-400 z-10"} />
    </div>
  );
}

function Checkerboard() {
  const tiles = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      const isDark = (i + j) % 2 === 0;
      const color = isDark ? '#8b4513' : '#f5d0a9'; // SaddleBrown and light wood
      const x = i * TILE_SIZE - MAX_POS;
      const z = j * TILE_SIZE - MAX_POS;
      tiles.push(
        <Box key={`${i}-${j}`} args={[TILE_SIZE, 0.2, TILE_SIZE]} position={[x, -0.1, z]} receiveShadow>
          <meshStandardMaterial color={color} />
        </Box>
      );
    }
  }
  return (
    <group>
      {/* Board Border */}
      <Box args={[BOARD_SIZE * TILE_SIZE + 0.8, 0.3, BOARD_SIZE * TILE_SIZE + 0.8]} position={[0, -0.2, 0]} receiveShadow>
        <meshStandardMaterial color="#3e1f06" />
      </Box>
      {tiles}
    </group>
  );
}

function Cat({ position, foodPos, spinTrigger, color = "#f59e0b", isBot = false, onReached }: { position: [number, number, number], foodPos: [number, number, number], spinTrigger: number, color?: string, isBot?: boolean, onReached?: () => void }) {
  const catRoot = useRef<THREE.Group>(null);
  const spinGroup = useRef<THREE.Group>(null);
  const catBody = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const legsRef = useRef<THREE.Group>(null);
  
  const targetPos = useRef(new THREE.Vector3(...position));
  const reached = useRef(true);
  const spinTarget = useRef(0);

  useEffect(() => {
    targetPos.current.set(...position);
    reached.current = false;
  }, [position]);

  useEffect(() => {
    if (spinTrigger > 0) spinTarget.current += Math.PI * 2;
  }, [spinTrigger]);

  useFrame((state, delta) => {
    if (!catRoot.current || !catBody.current || !spinGroup.current) return;
    
    const currentPos = catRoot.current.position;
    const distanceToTarget = currentPos.distanceTo(targetPos.current);
    const isMoving = distanceToTarget > 0.05;
    
    // Position Update
    if (isMoving) {
      currentPos.lerp(targetPos.current, 5 * delta);
    } else {
      currentPos.copy(targetPos.current);
      if (!reached.current) {
        reached.current = true;
        if (onReached) onReached();
      }
    }

    // Facing direction (Look at target when moving, look at food when idle)
    const lookTarget = isMoving ? targetPos.current.clone() : new THREE.Vector3(...foodPos);
    lookTarget.y = currentPos.y;
    
    if (lookTarget.distanceTo(currentPos) > 0.1) {
      const currentQuat = catRoot.current.quaternion.clone();
      catRoot.current.lookAt(lookTarget);
      const targetQuat = catRoot.current.quaternion.clone();
      catRoot.current.quaternion.copy(currentQuat).slerp(targetQuat, 10 * delta);
    }

    // Hop and Walk Animation
    if (isMoving) {
      const progress = 1 - (distanceToTarget / TILE_SIZE);
      catBody.current.position.y = Math.sin(progress * Math.PI * 4) * 0.4 + 0.4;
      
      const swing = Math.sin(progress * Math.PI * 8) * 0.5;
      if (legsRef.current) {
        legsRef.current.children[0].rotation.x = swing;
        legsRef.current.children[1].rotation.x = -swing;
        legsRef.current.children[2].rotation.x = -swing;
        legsRef.current.children[3].rotation.x = swing;
      }
    } else {
      catBody.current.position.y = THREE.MathUtils.lerp(catBody.current.position.y, 0.4, 10 * delta);
      if (legsRef.current) {
        legsRef.current.children.forEach(leg => {
           leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, 10 * delta);
        });
      }
    }

    // Spin Animation
    if (spinGroup.current.rotation.y < spinTarget.current) {
       spinGroup.current.rotation.y += 15 * delta;
    } else {
       spinGroup.current.rotation.y = spinTarget.current;
    }

    // Tail wag
    if (tailRef.current) {
       tailRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.2;
    }
  });

  return (
    <group ref={catRoot} position={position} onClick={(e) => { e.stopPropagation(); playMeow(); }}>
      <group ref={spinGroup}>
        <group ref={catBody} position={[0, 0.4, 0]}>
          {/* Main Body */}
          <Capsule args={[0.25, 0.6, 16, 16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
             <meshStandardMaterial color={color} roughness={0.8} />
          </Capsule>
          
          {/* Head */}
          <group position={[0, 0.2, 0.4]}>
            <Sphere args={[0.3, 32, 32]} castShadow>
               <meshStandardMaterial color={color} roughness={0.8} />
            </Sphere>
            {/* Ears */}
            <Cone args={[0.08, 0.2, 16]} position={[-0.15, 0.25, 0]} rotation={[0, 0, 0.2]} castShadow>
               <meshStandardMaterial color="#b45309" />
            </Cone>
            <Cone args={[0.08, 0.2, 16]} position={[0.15, 0.25, 0]} rotation={[0, 0, -0.2]} castShadow>
               <meshStandardMaterial color="#b45309" />
            </Cone>
            {/* Eyes */}
            <Sphere args={[0.03, 16, 16]} position={[-0.1, 0.05, 0.27]} castShadow>
               <meshStandardMaterial color="#000" />
            </Sphere>
            <Sphere args={[0.03, 16, 16]} position={[0.1, 0.05, 0.27]} castShadow>
               <meshStandardMaterial color="#000" />
            </Sphere>
            {/* Nose */}
            <Sphere args={[0.02, 16, 16]} position={[0, -0.05, 0.29]} castShadow>
               <meshStandardMaterial color="#ec4899" />
            </Sphere>
          </group>

          {/* Tail */}
          <group position={[0, 0.1, -0.4]} ref={tailRef}>
             <Capsule args={[0.04, 0.4, 8, 8]} position={[0, 0.2, -0.1]} rotation={[-Math.PI / 4, 0, 0]} castShadow>
                <meshStandardMaterial color="#b45309" />
             </Capsule>
          </group>

          {/* Legs */}
          <group ref={legsRef}>
             {/* Front Left */}
             <group position={[-0.15, -0.2, 0.2]}>
                <Capsule args={[0.06, 0.3, 8, 8]} position={[0, -0.15, 0]} castShadow>
                   <meshStandardMaterial color="#fbbf24" />
                </Capsule>
             </group>
             {/* Front Right */}
             <group position={[0.15, -0.2, 0.2]}>
                <Capsule args={[0.06, 0.3, 8, 8]} position={[0, -0.15, 0]} castShadow>
                   <meshStandardMaterial color="#fbbf24" />
                </Capsule>
             </group>
             {/* Back Left */}
             <group position={[-0.15, -0.2, -0.2]}>
                <Capsule args={[0.06, 0.3, 8, 8]} position={[0, -0.15, 0]} castShadow>
                   <meshStandardMaterial color="#fbbf24" />
                </Capsule>
             </group>
             {/* Back Right */}
             <group position={[0.15, -0.2, -0.2]}>
                <Capsule args={[0.06, 0.3, 8, 8]} position={[0, -0.15, 0]} castShadow>
                   <meshStandardMaterial color="#fbbf24" />
                </Capsule>
             </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function FoodBowl({ position, eatTrigger }: { position: [number, number, number], eatTrigger: number }) {
  const [showStars, setShowStars] = useState(false);

  useEffect(() => {
    if (eatTrigger > 0) {
      setShowStars(true);
      const timer = setTimeout(() => setShowStars(false), 800);
      return () => clearTimeout(timer);
    }
  }, [eatTrigger]);

  return (
    <group position={position}>
      <Cylinder args={[0.6, 0.5, 0.3, 16]} position={[0, 0.15, 0]} castShadow>
        <meshStandardMaterial color="#ef4444" />
      </Cylinder>
      <Cylinder args={[0.5, 0.5, 0.05, 16]} position={[0, 0.3, 0]} castShadow>
        <meshStandardMaterial color="#fcd34d" />
      </Cylinder>
      {showStars && (
        <Sparkles count={30} scale={[2, 2, 2]} size={4} speed={2} color="#fef08a" position={[0, 1, 0]} />
      )}
    </group>
  );
}

// --- Main Game Component ---

import { GameMode, Weather } from '../App';
import { UserData } from '../lib/store';
import { playBark, playGameOverSound } from '../lib/sounds';

export default function Game3D({ 
  mode = 'FREE_ROAM',
  botMode = false, 
  weather = 'day',
  userData,
  setUserData,
  onHome 
}: { 
  mode?: GameMode;
  botMode?: boolean;
  weather?: Weather;
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  onHome?: () => void;
}) {
  const [currentPos, setCurrentPos] = useState<[number, number, number]>([-MAX_POS, 0, MAX_POS]);
  const [botPos, setBotPos] = useState<[number, number, number]>([MAX_POS, 0, MAX_POS]);
  const [foodPos, setFoodPos] = useState<[number, number, number]>([MAX_POS, 0, -MAX_POS]);
  const [targetQueue, setTargetQueue] = useState<[number, number, number][]>([]);
  const [isCatMoving, setIsCatMoving] = useState(false);
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [botSpinTrigger, setBotSpinTrigger] = useState(0);
  const [eatTrigger, setEatTrigger] = useState(0);
  
  const [score, setScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [lastCommand, setLastCommand] = useState<string>("Sila bercakap...");
  const [error, setError] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState((mode === 'TIME_ATTACK' || mode === 'FREE_ROAM') ? 60 : 0);
  const timeLeftRef = useRef((mode === 'TIME_ATTACK' || mode === 'FREE_ROAM') ? 60 : 0);
  const [gameOver, setGameOver] = useState(false);

  const gridPosRef = useRef<[number, number, number]>([-MAX_POS, 0, MAX_POS]);
  const botGridPosRef = useRef<[number, number, number]>([MAX_POS, 0, MAX_POS]);

  const controlsRef = useRef<any>(null);
  const compassNeedleRef = useRef<HTMLDivElement>(null);

  const isSurvival = mode === 'SURVIVAL';
  const hasBot = botMode || isSurvival;

  const spawnNewFood = () => {
    const i = Math.floor(Math.random() * BOARD_SIZE);
    const j = Math.floor(Math.random() * BOARD_SIZE);
    const newX = i * TILE_SIZE - MAX_POS;
    const newZ = j * TILE_SIZE - MAX_POS;
    setFoodPos([newX, 0, newZ]);
  };

  // Timer logic
  useEffect(() => {
    if (gameOver) return;
    
    const timer = setInterval(() => {
      if (mode === 'TIME_ATTACK' || mode === 'FREE_ROAM') {
        setTimeLeft(t => {
          const newT = t - 1;
          timeLeftRef.current = newT;
          return newT <= 0 ? 0 : newT;
        });
      } else if (mode === 'SURVIVAL') {
        setTimeLeft(t => {
          const newT = t + 1;
          timeLeftRef.current = newT;
          return newT;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, gameOver]);

  useEffect(() => {
    if ((mode === 'TIME_ATTACK' || mode === 'FREE_ROAM') && timeLeft === 0 && !gameOver) {
      handleGameOver(score);
    }
  }, [timeLeft, gameOver, mode, score]);

  const handleGameOver = (finalScore: number) => {
    setGameOver(true);
    playGameOverSound();
    
    setUserData(prev => {
      const newCoins = prev.coins + finalScore;
      const newHighscores = { ...prev.highscores };
      
      if ((mode === 'TIME_ATTACK' || mode === 'FREE_ROAM') && finalScore > newHighscores.timeAttack) {
        newHighscores.timeAttack = finalScore;
      } else if (mode === 'SURVIVAL' && timeLeftRef.current > newHighscores.survival) {
        newHighscores.survival = timeLeftRef.current;
      }
      
      return { ...prev, coins: newCoins, highscores: newHighscores };
    });
  };

  // Bot logic
  useEffect(() => {
    if (!hasBot || gameOver) return;
    const interval = setInterval(() => {
      let [bx, by, bz] = botGridPosRef.current;
      
      // In survival, dog chases player. Otherwise, chases food.
      const [tx, ty, tz] = isSurvival ? gridPosRef.current : foodPos;
      
      let dx = 0;
      let dz = 0;
      
      if (Math.abs(tx - bx) > Math.abs(tz - bz)) {
        dx = tx > bx ? TILE_SIZE : -TILE_SIZE;
      } else if (tz !== bz) {
        dz = tz > bz ? TILE_SIZE : -TILE_SIZE;
      } else {
        return; // reached
      }
      
      const newX = Math.max(-MAX_POS, Math.min(MAX_POS, bx + dx));
      const newZ = Math.max(-MAX_POS, Math.min(MAX_POS, bz + dz));
      botGridPosRef.current = [newX, 0, newZ];
      setBotPos([newX, 0, newZ]);

      if (isSurvival) playBark();

      // Check survival game over
      if (isSurvival && newX === gridPosRef.current[0] && newZ === gridPosRef.current[2]) {
        handleGameOver(timeLeftRef.current);
      }

    }, isSurvival ? 2000 : 2500); 
    
    return () => clearInterval(interval);
  }, [hasBot, foodPos, isSurvival, gameOver]);

  // Check collision for player in survival (if player walks into dog)
  useEffect(() => {
    if (isSurvival && !gameOver) {
      if (currentPos[0] === botPos[0] && currentPos[2] === botPos[2]) {
         handleGameOver(timeLeftRef.current);
      }
    }
  }, [currentPos, botPos, isSurvival, gameOver]);

  useEffect(() => {
    if (gameOver) return;
    
    const speech = new SpeechService();
    
    speech.onText = (text) => {
      setLastCommand(`Mendengar: "${text}"`);
    };

    speech.onCommand = (cmd: SpeechCommand) => {
      if (cmd.action === 'pusing') {
        playMeow();
        setLastCommand(`Arahan: Kucing Berpusing!`);
        setSpinTrigger(s => s + 1);
        return;
      }

      if (cmd.action === 'lompat') {
        playMeow();
        setLastCommand(`Arahan: Kucing Melompat!`);
        setTargetQueue(prev => [...prev, [gridPosRef.current[0], 2, gridPosRef.current[2]], [gridPosRef.current[0], 0, gridPosRef.current[2]]]);
        return;
      }

      const modifierText = cmd.modifier === 'lari' ? ' (Laju!)' : '';
      setLastCommand(`Arahan: ${cmd.steps} ke ${cmd.direction}${modifierText}`);
      
      let [x, y, z] = gridPosRef.current;
      const newQueue: [number, number, number][] = [];
      
      const actualSteps = cmd.modifier === 'lari' ? cmd.steps! * 2 : cmd.steps!;
      
      for (let i = 0; i < actualSteps; i++) {
        let nextX = x;
        let nextZ = z;

        if (cmd.direction === 'depan') nextZ -= TILE_SIZE;
        if (cmd.direction === 'belakang') nextZ += TILE_SIZE;
        if (cmd.direction === 'kiri') nextX -= TILE_SIZE;
        if (cmd.direction === 'kanan') nextX += TILE_SIZE;
        
        const clampedX = Math.max(-MAX_POS, Math.min(MAX_POS, nextX));
        const clampedZ = Math.max(-MAX_POS, Math.min(MAX_POS, nextZ));
        
        if (clampedX !== nextX || clampedZ !== nextZ) {
          // Stop adding steps
          break; 
        }
        
        x = clampedX;
        z = clampedZ;
        newQueue.push([x, y, z]);
      }
      
      if (newQueue.length > 0) {
        gridPosRef.current = newQueue[newQueue.length - 1];
        setTargetQueue(prev => [...prev, ...newQueue]);
      }
    };

    try {
      speech.start();
    } catch (e: any) {
      setError(e.message || "Gagal memulakan mikrofon");
    }

    return () => {
      speech.stop();
    };
  }, [gameOver]);

  // Process movement queue
  useEffect(() => {
    if (!isCatMoving && targetQueue.length > 0) {
      const nextPos = targetQueue[0];
      setTargetQueue(q => q.slice(1));
      setCurrentPos(nextPos);
      setIsCatMoving(true);
    }
  }, [targetQueue, isCatMoving]);

  const handleCatReached = () => {
    setIsCatMoving(false);
    
    // Check collision with food exactly on grid
    const [cx, , cz] = currentPos;
    const [fx, , fz] = foodPos;
    
    if (Math.abs(cx - fx) < 0.1 && Math.abs(cz - fz) < 0.1) {
      setScore(s => s + 10);
      playEatSound();
      setEatTrigger(e => e + 1);
      spawnNewFood();
    }
  };

  const handleBotReached = () => {
    // Check collision with food exactly on grid
    const [bx, , bz] = botPos;
    const [fx, , fz] = foodPos;
    
    if (Math.abs(bx - fx) < 0.1 && Math.abs(bz - fz) < 0.1) {
      setBotScore(s => s + 10);
      playEatSound();
      setEatTrigger(e => e + 1);
      spawnNewFood();
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-amber-50 rounded-3xl overflow-hidden shadow-inner">
      {/* Sidebar UI */}
      <div className="w-full md:w-80 bg-white/90 backdrop-blur-md border-b md:border-b-0 md:border-r border-amber-200 p-4 md:p-6 flex flex-col z-10 shadow-xl shrink-0 overflow-y-auto relative">
        <div className="absolute top-4 right-4 bg-amber-100 text-amber-800 font-black px-4 py-2 rounded-full border-2 border-amber-200 shadow-sm flex items-center gap-2">
          <span className="text-xl">⏱️</span> {timeLeft}s
        </div>

        <div className="flex items-center gap-3 mb-2 md:mb-4">
          <div className="text-4xl drop-shadow-sm">🐈</div>
          <div>
            <h2 className="text-2xl font-black text-amber-600 leading-none">Mata: {score}</h2>
            <p className="text-[10px] md:text-xs font-bold text-amber-400 uppercase tracking-widest mt-1">Anda</p>
          </div>
        </div>

        {hasBot && !isSurvival && (
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="text-4xl drop-shadow-sm grayscale">🐈</div>
            <div>
              <h2 className="text-2xl font-black text-slate-600 leading-none">Mata: {botScore}</h2>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lawan (Bot)</p>
            </div>
          </div>
        )}

        {isSurvival && (
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="text-4xl drop-shadow-sm">🐕</div>
            <div>
              <h2 className="text-2xl font-black text-red-600 leading-none">Mengejar!</h2>
              <p className="text-[10px] md:text-xs font-bold text-red-400 uppercase tracking-widest mt-1">Lari!!!</p>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-4 mt-8">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${gameOver ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                Status Suara
              </h3>
              <MicIndicator />
            </div>
            <div className="text-sm font-medium text-amber-800 bg-white px-3 py-2 rounded-lg border border-amber-100 min-h-[2.5rem] flex items-center break-words">
              {lastCommand}
            </div>
            {error && (
              <div className="text-xs text-red-500 mt-2 font-bold bg-red-50 p-2 rounded-lg">{error}</div>
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm mt-auto">
            <h3 className="text-sm font-bold text-amber-900 mb-3">Panduan Suara:</h3>
            <p className="text-[10px] md:text-xs text-slate-500 mb-3 leading-relaxed">Sebut arah dan bilangan langkah.</p>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-bold bg-amber-50 px-3 py-2 rounded-lg text-amber-700 border border-amber-100">
                "3 ke depan lari"
              </div>
              <div className="text-xs font-bold bg-amber-50 px-3 py-2 rounded-lg text-amber-700 border border-amber-100">
                "2 ke kiri" / "kanan"
              </div>
              <div className="text-xs font-bold bg-amber-50 px-3 py-2 rounded-lg text-amber-700 border border-amber-100">
                "kucing lompat"
              </div>
            </div>
          </div>
          {onHome && (
            <button
              onClick={onHome}
              className="mt-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold py-3 px-4 rounded-xl shadow-sm border border-amber-200 transition-colors w-full flex items-center justify-center gap-2"
            >
              Kembali ke Menu
            </button>
          )}
        </div>
      </div>

      {/* 3D Canvas Area */}
      <div className="flex-1 relative cursor-move min-h-[300px]">
        {gameOver && (
          <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl scale-in-center">
              <h2 className="text-4xl font-black text-amber-800 mb-2">Tamat!</h2>
              {(mode === 'TIME_ATTACK' || mode === 'FREE_ROAM') ? (
                <div className="mb-6">
                  <p className="text-lg text-amber-700 font-bold mb-2">Masa Tamat. Anda kumpul {score} mata!</p>
                  {hasBot && (
                    <>
                       <p className="text-lg text-slate-600 font-bold">Lawan (Bot) kumpul {botScore} mata!</p>
                       <div className={`text-2xl font-black mt-3 ${score > botScore ? 'text-green-600' : score < botScore ? 'text-red-600' : 'text-blue-600'}`}>
                          {score > botScore ? '🎉 Anda Menang!' : score < botScore ? '😢 Bot Menang!' : '🤝 Seri!'}
                       </div>
                    </>
                  )}
                </div>
              ) : mode === 'SURVIVAL' ? (
                <p className="text-lg text-red-600 font-bold mb-6">Ditangkap! Bertahan {timeLeftRef.current} saat.</p>
              ) : null}
              
              <button 
                onClick={onHome}
                className="bg-amber-500 text-white w-full py-4 rounded-2xl font-black text-xl shadow-md hover:bg-amber-400"
              >
                Kembali ke Menu
              </button>
            </div>
          </div>
        )}

        <Canvas shadows camera={{ position: [0, 16, 22], fov: 45 }} dpr={[1, 2]}>
          <color attach="background" args={[weather === 'night' ? '#0f172a' : weather === 'rain' ? '#94a3b8' : '#fffbeb']} />
          <CameraTracker needleRef={compassNeedleRef} />
          <ambientLight intensity={weather === 'night' ? 0.2 : weather === 'rain' ? 0.4 : 0.6} />
          <directionalLight 
             position={[10, 15, 10]} 
             castShadow 
             intensity={weather === 'night' ? 0.5 : weather === 'rain' ? 0.8 : 1.5} 
             shadow-mapSize={[2048, 2048]} 
          />
          
          <Checkerboard />
          {weather === 'rain' && (
             <Sparkles count={500} scale={[25, 20, 25]} size={2} speed={0.4} color="#60a5fa" opacity={0.5} position={[0, 10, 0]} />
          )}

          <Cat position={currentPos} foodPos={foodPos} spinTrigger={spinTrigger} color={userData.equippedColor} onReached={handleCatReached} />
          {hasBot && (
            <Cat position={botPos} foodPos={isSurvival ? currentPos : foodPos} spinTrigger={botSpinTrigger} color={isSurvival ? '#451a03' : '#94a3b8'} isBot={true} onReached={handleBotReached} />
          )}
          <FoodBowl position={foodPos} eatTrigger={eatTrigger} />
          
          <OrbitControls ref={controlsRef} makeDefault enablePan={false} maxPolarAngle={Math.PI / 2.5} minDistance={8} maxDistance={30} />
        </Canvas>
        
        {/* Compass Overlay */}
        <div className="absolute top-4 right-4 w-16 h-16 bg-white/80 backdrop-blur-md border-2 border-amber-200 rounded-full shadow-lg flex items-center justify-center z-10 pointer-events-none">
          <div className="absolute text-[10px] font-black text-amber-800 top-0.5">U</div>
          <div className="absolute text-[10px] font-black text-amber-800 bottom-0.5">S</div>
          <div className="absolute text-[10px] font-black text-amber-800 left-1">B</div>
          <div className="absolute text-[10px] font-black text-amber-800 right-1">T</div>
          <div ref={compassNeedleRef} className="w-full h-full relative transition-transform duration-75">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full w-1.5 h-[1.3rem] bg-red-500 rounded-t-full origin-bottom"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-1.5 h-[1.3rem] bg-slate-300 rounded-b-full origin-top"></div>
          </div>
        </div>

        {/* Recenter Button */}
        <button
          onClick={() => {
            if (controlsRef.current) {
              controlsRef.current.reset();
            }
          }}
          className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg border border-amber-200 z-10 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer flex items-center justify-center"
          title="Fokus Semula (Recenter)"
        >
          <LocateFixed size={24} />
        </button>

        {/* Subtle overlay hint */}
        <div className="absolute bottom-4 left-4 text-xs font-bold text-amber-900/40 pointer-events-none bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm hidden md:block border border-white/40">
          Seret untuk putar kamera
        </div>
      </div>
    </div>
  );
}
