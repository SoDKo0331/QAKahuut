import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { questions } from './data/questions';
import './index.css';

// --- Custom Hooks ---

const useAudio = () => {
  const audioRef = useRef(new Audio());

  const playSound = (url) => {
    try {
      const sound = new Audio(url);
      sound.volume = 0.3; // Softer volume for jazz
      sound.play().catch(e => console.log("Audio play blocked", e));
    } catch (e) {
      console.warn("Audio not supported or URL invalid", e);
    }
  };

  const playSFX = useCallback((type) => {
    // using soft, jazzy/chime sounds where possible
    const urls = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Note: Ideally a soft piano chord
      wrong: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Note: Ideally a muted trumpet 'wah'
      click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' // Soft click
    };
    if (urls[type]) playSound(urls[type]);
  }, []);

  return { playSFX };
};

// --- Sub-Components (Memoized for Performance) ---

const ProgressBar = React.memo(({ current, total }) => {
  const percentage = ((current + 1) / total) * 100;
  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
    </div>
  );
});

const AnswerButton = React.memo(({ option, index, status, onClick, disabled }) => {
  let className = "answer-btn";
  if (status === 'correct') className += " correct";
  if (status === 'wrong') className += " wrong";

  return (
    <button 
      className={className} 
      onClick={() => onClick(index)} 
      disabled={disabled}
    >
      <span>{option}</span>
      {status === 'correct' && <span style={{ fontFamily: 'sans-serif' }}>✓</span>}
      {status === 'wrong' && <span style={{ fontFamily: 'sans-serif' }}>✗</span>}
    </button>
  );
});

// --- Main Application ---

const App = () => {
  const [gameState, setGameState] = useState('START'); // START, PLAYING, RESULT
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerStatus, setAnswerStatus] = useState(null); // null, 'correct', 'wrong'
  const [isLoading, setIsLoading] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const bgMusicRef = useRef(null);
  
  const { playSFX } = useAudio();
  const currentQuestion = useMemo(() => questions[currentIdx], [currentIdx]);

  useEffect(() => {
    const music = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-study-112191.mp3');
    music.loop = true;
    music.volume = 0.2;
    bgMusicRef.current = music;

    return () => {
      music.pause();
      music.currentTime = 0;
    };
  }, []);

  // Pre-load logic for next image
  useEffect(() => {
    if (currentIdx < questions.length - 1) {
      const nextImg = new Image();
      nextImg.src = questions[currentIdx + 1].image || '';
    }
  }, [currentIdx]);

  const handleStart = () => {
    playSFX('click');
    if (bgMusicRef.current && !isMusicPlaying) {
      bgMusicRef.current.play()
        .then(() => setIsMusicPlaying(true))
        .catch(() => setIsMusicPlaying(false));
    }
    setGameState('PLAYING');
    setCurrentIdx(0);
    setScore(0);
    setSelectedAnswer(null);
    setAnswerStatus(null);
  };

  const toggleMusic = () => {
    if (!bgMusicRef.current) return;

    if (isMusicPlaying) {
      bgMusicRef.current.pause();
      setIsMusicPlaying(false);
      return;
    }

    bgMusicRef.current.play()
      .then(() => setIsMusicPlaying(true))
      .catch(() => setIsMusicPlaying(false));
  };

  const handleAnswer = (index) => {
    if (answerStatus) return;
    
    setSelectedAnswer(index);
    const isCorrect = index === currentQuestion.answer;
    setAnswerStatus(isCorrect ? 'correct' : 'wrong');
    playSFX(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) setScore(prev => prev + 1);

    // Smooth transition to next question
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setIsLoading(true);
        setTimeout(() => {
          setCurrentIdx(prev => prev + 1);
          setAnswerStatus(null);
          setSelectedAnswer(null);
          setIsLoading(false);
        }, 500); // 500ms fade for that smoky jazz club feel
      } else {
        setGameState('RESULT');
      }
    }, 2500); // Time to read the fact/feedback
  };

  const renderStart = () => (
    <div className="premium-app">
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <div className="badge">The Blue Note</div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', lineHeight: 1.2, color: 'var(--accent-gold)' }}>
          Midnight<br/>Sessions
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.1rem', padding: '0 20px', lineHeight: 1.6 }}>
        DOUBLE BASS<br/>QUIZ
        </p>
        <button className="btn-premium" onClick={handleStart}>START</button>
      </div>
    </div>
  );

  const renderQuiz = () => (
    <div className="premium-app">
      <ProgressBar current={currentIdx} total={questions.length} />
      
      <div className={`glass-card ${isLoading ? 'question-exit' : 'question-enter'}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
          <div className="badge" style={{ marginBottom: 0 }}>Set {currentIdx + 1}</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ color: 'var(--accent-gold)', fontSize: '0.9rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Score: {score}</div>
            <button className="btn-music" onClick={toggleMusic}>
              {isMusicPlaying ? 'Pause Music' : 'Play Music'}
            </button>
          </div>
        </div>

        {currentQuestion.image && (
          <div className="art-container">
            <img 
              src={currentQuestion.image} 
              alt="clue" 
              className={`art-image ${answerStatus ? 'paused' : ''}`}
              loading="lazy"
            />
          </div>
        )}

        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', lineHeight: 1.4, textAlign: 'center' }}>
          {currentQuestion.question}
        </h2>

        <div className="answer-grid">
          {currentQuestion.options.map((opt, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrectAnswer = i === currentQuestion.answer;
            let status = null;

            if (answerStatus === 'correct' && isSelected) status = 'correct';
            if (answerStatus === 'wrong' && isSelected) status = 'wrong';
            if (answerStatus && isCorrectAnswer) status = 'correct';

            return (
              <AnswerButton 
                key={`${currentIdx}-${i}`}
                option={opt}
                index={i}
                status={status}
                onClick={handleAnswer}
                disabled={!!answerStatus}
              />
            );
          })}
        </div>

        {answerStatus && (
          <div className="fact-box">
             <div className={`feedback-badge ${answerStatus}`}>
               {answerStatus === 'correct'
                 ? 'Зөв хариулт! Сайхан байна.'
                 : `Буруу хариулт. Зөв нь: ${currentQuestion.options[currentQuestion.answer]}`}
             </div>
             <p style={{ fontSize: '1rem', lineHeight: 1.6 }}>
               {currentQuestion.fact}
             </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="premium-app">
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <div className="badge">Show's Over</div>
        <h1 style={{ fontSize: '2.5rem', margin: '1rem 0', color: 'var(--accent-gold)' }}>Final Applause</h1>
        <div style={{ 
          fontSize: '4.5rem', 
          fontFamily: 'Noto Serif',
          color: 'var(--text-primary)',
          margin: '1.5rem 0',
          textShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
        }}>
          {score} <span style={{fontSize: '2rem', color: 'var(--text-secondary)'}}>/ {questions.length}</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
          {score === questions.length ? "A flawless performance. You lead the band tonight." : "A solid groove. Stick around for the next set."}
        </p>
        <button className="btn-premium" onClick={handleStart}>Encore</button>
        <button className="btn-music result-music" onClick={toggleMusic}>
          {isMusicPlaying ? 'Pause Music' : 'Play Music'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {gameState === 'START' && renderStart()}
      {gameState === 'PLAYING' && renderQuiz()}
      {gameState === 'RESULT' && renderResult()}
    </>
  );
};

export default App;
