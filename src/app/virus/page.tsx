'use client';

import { useRef, useState } from 'react';
import './virus.css';

export default function VirusGame() {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const blastSoundRef = useRef<HTMLAudioElement>(null);

  const [killCount, setKillCount] = useState(0);
  const [resultText, setResultText] = useState('');
  const [prizePopup, setPrizePopup] = useState<{ text: string; emoji: string } | null>(null);
  const [running, setRunning] = useState(false);

  const virusCount = 20;
  const kitCount = 6;
  const killRadius = 80;
  const intervals: NodeJS.Timeout[] = [];

  const prizes = [
    { text: 'You won a T-shirt!', emoji: '👕' },
    { text: 'You won a treat!', emoji: '🍬' },
  ];

  const getCoords = (el: HTMLElement) => {
    const matrix = window.getComputedStyle(el).transform;
    if (matrix === 'none') return { x: 0, y: 0 };
    const values = matrix.match(/matrix.*\((.+)\)/)?.[1].split(', ') ?? [];
    return {
      x: parseFloat(values[4]),
      y: parseFloat(values[5]),
    };
  };

  const playBlastSound = () => {
    if (blastSoundRef.current) {
      blastSoundRef.current.currentTime = 0;
      blastSoundRef.current.play();
    }
  };

  const stopAllMovement = () => {
    intervals.forEach(clearInterval);
    intervals.length = 0;
  };

  const moveElement = (el: HTMLElement) => {
    const move = () => {
      if (!running || !gameAreaRef.current) return;
      const areaW = gameAreaRef.current.clientWidth - 50;
      const areaH = gameAreaRef.current.clientHeight - 50;
      const x = Math.random() * areaW;
      const y = Math.random() * areaH;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    move();
    const interval = setInterval(move, 800);
    intervals.push(interval);
  };

  const handleTestKitClick = (kit: HTMLElement) => {
    if (!running) return;
    const kitPos = getCoords(kit);
    const viruses = gameAreaRef.current?.querySelectorAll('.virus');
    if (!viruses) return;

    let localKills = 0;
    viruses.forEach(v => {
      const vPos = getCoords(v as HTMLElement);
      const dx = vPos.x - kitPos.x;
      const dy = vPos.y - kitPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < killRadius && (v as HTMLElement).style.display !== 'none') {
        (v as HTMLElement).style.display = 'none';
        localKills++;
        playBlastSound();
      }
    });

    kit.remove(); // remove test kit after use

    if (localKills > 0) {
      setKillCount(prev => {
        const newTotal = prev + localKills;
        if (newTotal >= 10 && running) {
          const prize = prizes[Math.floor(Math.random() * prizes.length)];
          setPrizePopup(prize);
          setRunning(false);
          stopAllMovement();
        }
        return newTotal;
      });
      setResultText('');
    } else {
      setResultText('❌ No virus nearby!');
    }
  };

  const startGame = () => {
    stopAllMovement();
    setKillCount(0);
    setResultText('');
    setPrizePopup(null);
    setRunning(true);

    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    gameArea.innerHTML = '';

    for (let i = 0; i < virusCount; i++) {
      const v = document.createElement('div');
      v.className = 'virus';
      v.textContent = '🦠';
      gameArea.appendChild(v);
      moveElement(v);
    }

    for (let i = 0; i < kitCount; i++) {
      const kit = document.createElement('div');
      kit.className = 'testkit';
      kit.textContent = '🧪';
      kit.onclick = () => handleTestKitClick(kit);
      gameArea.appendChild(kit);
      moveElement(kit);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center min-h-screen bg-white relative">
      <h1 className="text-2xl md:text-3xl font-bold text-[#03c4eb] flex items-center gap-2">
        <span>🧪</span> Virus Blaster
      </h1>
      <p className="text-sm md:text-base mt-2 max-w-md">
        Tap floating <strong>test kits</strong> to blast nearby viruses. Eliminate 10 to win a prize!
      </p>
      <button
        onClick={startGame}
        className="bg-[#03c4eb] hover:bg-[#02a4c0] text-white font-bold py-2 px-6 rounded-lg mt-4"
      >
        🚀 Start Mission
      </button>
      <div
        ref={gameAreaRef}
        className="relative w-full max-w-xs sm:max-w-sm md:max-w-md h-[500px] mt-5 border-[3px] border-[#03c4eb] rounded-xl overflow-hidden bg-[#1e1e1e]"
      >
        {prizePopup && (
          <div className="prize-popup">
            {prizePopup.text}<br />
            <span>{prizePopup.emoji}</span>
          </div>
        )}
      </div>
      <div className="text-[#03c4eb] font-bold text-sm md:text-base mt-4">
        Viruses Blasted: <span>{killCount}</span> / 10
      </div>
      <div className="text-[#222] text-base mt-2 min-h-[40px] font-semibold">
        {resultText}
      </div>
      <audio ref={blastSoundRef} src="/sounds/laser-gun.wav" preload="auto" />
    </div>
  );
}
