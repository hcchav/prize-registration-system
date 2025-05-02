'use client';

import { useRef, useState } from 'react';

export default function VirusGame() {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const blastSoundRef = useRef<HTMLAudioElement>(null);

  const [killCount, setKillCount] = useState(0);
  const [resultText, setResultText] = useState('');
  const [prizeGiven, setPrizeGiven] = useState(false);
  const [intervals, setIntervals] = useState<NodeJS.Timeout[]>([]);

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
    const newIntervals: NodeJS.Timeout[] = [];

    if (!gameAreaRef.current) return;
    const gameArea = gameAreaRef.current;
    gameArea.innerHTML = '';

    const virusElements: HTMLDivElement[] = [];

    for (let i = 0; i < virusCount; i++) {
      const v = document.createElement('div');
      v.className = 'virus';
      v.textContent = '🦠';
      gameArea.appendChild(v);
      virusElements.push(v);
      newIntervals.push(startMovement(v));
    }

    for (let i = 0; i < kitCount; i++) {
      const kit = document.createElement('div');
      kit.className = 'testkit';
      kit.textContent = '🧪';
      kit.onclick = () => activateTestKit(kit, virusElements);
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
    return setInterval(move, 2000);
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

  const activateTestKit = (kit: HTMLElement, virusElements: HTMLDivElement[]) => {

    if (prizeGiven) return;
    const kitPos = getCoords(kit);
    let newCount = killCount;
    let killed = false;

    virusElements.forEach(v => {
      if (v.style.display === 'none') return;
      const vPos = getCoords(v);
      const dx = vPos.x - kitPos.x;
      const dy = vPos.y - kitPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < killRadius) {
        v.style.display = 'none';
        newCount++;
        killed = true;
        playBlastSound();
      }
    });

    setKillCount(newCount);
    if (killed) {
      setResultText('');
    } else {
      setResultText('❌ No virus nearby!');
    }

    if (newCount >= 10 && !prizeGiven) {
      const prize = prizes[Math.floor(Math.random() * prizes.length)];
      setPrizeGiven(true);
      setResultText(`${prize.text} ${prize.emoji}`);
      intervals.forEach(clearInterval);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Segoe UI' }}>
      <h1 style={{ color: '#03c4eb' }}>🧪 Virus Blaster</h1>
      <p>Tap floating <strong>test kits</strong> to blast nearby viruses. Eliminate 10 to win a prize!</p>
      <button onClick={startGame} className="start-btn">🚀 Start Mission</button>
      <div ref={gameAreaRef} className="game-area" style={{ marginTop: 20 }} />
      <p style={{ color: '#03c4eb' }}>Viruses Blasted: {killCount} / 10</p>
      <p style={{ fontSize: '1.2em', minHeight: '40px' }}>{resultText}</p>
      <audio ref={blastSoundRef} src="/sounds/laser-gun.wav" preload="auto" />
    </div>
  );
}
