'use client';

import { useRef, useState, useEffect } from 'react';

export default function VirusGamePage() {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const blastSoundRef = useRef<HTMLAudioElement>(null);

  const [killCount, setKillCount] = useState(0);
  const [prizeGiven, setPrizeGiven] = useState(false);
  const [resultText, setResultText] = useState('');
  const [intervals, setIntervals] = useState<NodeJS.Timeout[]>([]);

  const virusCount = 20;
  const kitCount = 6;
  const killRadius = 80;
  const prizes = [
    { text: 'You won a T-shirt!', emoji: '👕' },
    { text: 'You won a treat!', emoji: '🍬' },
  ];

  useEffect(() => {
    return () => {
      intervals.forEach(clearInterval);
    };
  }, [intervals]);

  const getCoords = (el: HTMLElement) => {
    const matrix = window.getComputedStyle(el).transform;
    if (matrix === 'none') return { x: 0, y: 0 };
    const match = matrix.match(/matrix.*\((.+)\)/);
    if (!match) return { x: 0, y: 0 };
    const values = match[1].split(', ');
    return {
      x: parseFloat(values[4]),
      y: parseFloat(values[5])
    };
  };

  const playBlastSound = () => {
    if (blastSoundRef.current) {
      blastSoundRef.current.currentTime = 0;
      blastSoundRef.current.play();
    }
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

  const startGame = () => {
    setKillCount(0);
    setPrizeGiven(false);
    setResultText('');
    if (!gameAreaRef.current) return;

    const area = gameAreaRef.current;
    area.innerHTML = ''; // clear area

    const allIntervals: NodeJS.Timeout[] = [];

    for (let i = 0; i < virusCount; i++) {
      const v = document.createElement('div');
      v.className = 'virus';
      v.textContent = '🦠';
      area.appendChild(v);
      allIntervals.push(startMovement(v));
    }

    for (let i = 0; i < kitCount; i++) {
      const kit = document.createElement('div');
      kit.className = 'testkit';
      kit.textContent = '🧪';
      kit.onclick = () => useTestKit(kit);
      area.appendChild(kit);
      allIntervals.push(startMovement(kit));
    }

    setIntervals(allIntervals);
  };

  const useTestKit = (kit: HTMLElement) => {
    if (prizeGiven) return;
    const kitPos = getCoords(kit);
    let killed = 0;

    gameAreaRef.current?.querySelectorAll('.virus').forEach(v => {
      const virus = v as HTMLElement;
      if (virus.style.display === 'none') return;
      const vPos = getCoords(virus);
      const dx = vPos.x - kitPos.x;
      const dy = vPos.y - kitPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < killRadius) {
        virus.style.display = 'none';
        killed++;
      }
    });

    if (killed > 0) {
      setKillCount(prev => {
        const newCount = prev + killed;
        if (newCount >= 10 && !prizeGiven) {
          const prize = prizes[Math.floor(Math.random() * prizes.length)];
          setPrizeGiven(true);
          setResultText(`${prize.text} ${prize.emoji}`);
          intervals.forEach(clearInterval);
        }
        return newCount;
      });
      setResultText('');
      playBlastSound();
    } else {
      setResultText('❌ No virus nearby!');
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
