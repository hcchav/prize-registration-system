'use client';

import { useRef, useState, useEffect } from 'react';

export default function VirusGame() {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const blastSoundRef = useRef<HTMLAudioElement>(null);
  const virusElementsRef = useRef<HTMLDivElement[]>([]);

  const [killCount, setKillCount] = useState(0);
  const [resultText, setResultText] = useState('');
  const [prizeGiven, setPrizeGiven] = useState(false);
  const [intervals, setIntervals] = useState<NodeJS.Timeout[]>([]);
  const [prizePopup, setPrizePopup] = useState<{ text: string; emoji: string } | null>(null);

  const virusCount = 20;
  const kitCount = 6;
  const killRadius = 80;
  const prizes = [
    { text: 'You won a T-shirt!', emoji: '👕' },
    { text: 'You won a treat!', emoji: '🍬' },
  ];

  const startGame = () => {
    setKillCount(0);
    setResultText('');
    setPrizeGiven(false);
    setPrizePopup(null);
    virusElementsRef.current = [];
    const newIntervals: NodeJS.Timeout[] = [];

    if (!gameAreaRef.current) return;
    const gameArea = gameAreaRef.current;
    gameArea.innerHTML = '';

    for (let i = 0; i < virusCount; i++) {
      const v = document.createElement('div');
      v.className = 'virus';
      v.textContent = '🦠';
      gameArea.appendChild(v);
      virusElementsRef.current.push(v);
      newIntervals.push(startMovement(v));
    }

    for (let i = 0; i < kitCount; i++) {
      const kit = document.createElement('div');
      kit.className = 'testkit';
      kit.textContent = '🧪';
      kit.onclick = () => handleTestKitUse(kit);
      gameArea.appendChild(kit);
      newIntervals.push(startMovement(kit));
    }

    setIntervals(newIntervals);
  };

  const startMovement = (el: HTMLElement) => {
    const move = () => {
      if (prizeGiven || !gameAreaRef.current) return;
      const areaW = gameAreaRef.current.clientWidth - 50;
      const areaH = gameAreaRef.current.clientHeight - 50;
      const x = Math.random() * areaW;
      const y = Math.random() * areaH;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    move();
    return setInterval(move, 800);
  };

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

  const handleTestKitUse = (kit: HTMLElement) => {
    if (prizeGiven) return;
    const kitPos = getCoords(kit);
    let killed = false;

    virusElementsRef.current.forEach(v => {
      if (v.style.display === 'none') return;
      const vPos = getCoords(v);
      const dx = vPos.x - kitPos.x;
      const dy = vPos.y - kitPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < killRadius) {
        v.style.display = 'none';
        killed = true;
        playBlastSound();
        setKillCount(prev => {
          const updated = prev + 1;
          if (updated >= 10 && !prizeGiven) {
            const prize = prizes[Math.floor(Math.random() * prizes.length)];
            setPrizeGiven(true);
            setPrizePopup(prize);
            setResultText('');
            intervals.forEach(clearInterval);
          }
          return updated;
        });
      }
    });

    if (!killed) setResultText('❌ No virus nearby!');
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .virus, .testkit {
        position: absolute;
        width: 50px;
        height: 50px;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        font-size: 1.5rem;
        cursor: pointer;
        transition: transform 0.8s ease-in-out;
      }
      .virus {
        background-color: #ff4c4c;
        color: white;
        border: 2px solid white;
      }
      .testkit {
        background-color: #03c4eb;
        color: white;
        border: 2px solid white;
      }
      .prize-popup {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #00b86b;
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        box-shadow: 0 0 20px #00b86b80;
        font-size: 1.3em;
        font-weight: bold;
        z-index: 100;
        line-height: 1.6;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style); // 👈 wrapped in a function now
    };
  }, []);

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
        🔁 Restart Game
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
