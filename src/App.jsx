import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { questions } from './data/questions';
import fallbackImage from './assets/jazz_album.png';
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

const QUIZ_STATE_KEY = 'qakahuut.quizState.v1';
const QUIZ_BEST_SCORE_KEY = 'qakahuut.bestScore.v1';

const getStoredQuizState = () => {
  try {
    const raw = localStorage.getItem(QUIZ_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!['START', 'PLAYING', 'RESULT'].includes(parsed.gameState)) return null;
    if (!Number.isInteger(parsed.currentIdx) || parsed.currentIdx < 0 || parsed.currentIdx >= questions.length) return null;
    if (!Number.isInteger(parsed.score) || parsed.score < 0 || parsed.score > questions.length) return null;
    return parsed;
  } catch {
    return null;
  }
};

const App = () => {
  const storedState = getStoredQuizState();
  const [gameState, setGameState] = useState(storedState?.gameState || 'START'); // START, PLAYING, RESULT
  const [currentIdx, setCurrentIdx] = useState(storedState?.currentIdx || 0);
  const [score, setScore] = useState(storedState?.score || 0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerStatus, setAnswerStatus] = useState(null); // null, 'correct', 'wrong'
  const [isLoading, setIsLoading] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [hasSavedSession] = useState(!!storedState && (storedState.currentIdx > 0 || storedState.score > 0 || storedState.gameState !== 'START'));
  const [bestScore, setBestScore] = useState(() => {
    const raw = localStorage.getItem(QUIZ_BEST_SCORE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  });
  const bgMusicRef = useRef(null);
  const nextQuestionTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  
  const { playSFX } = useAudio();
  const currentQuestion = useMemo(() => questions[currentIdx], [currentIdx]);

  useEffect(() => {
    const music = new Audio('https://cdn.pixabay.com/download/audio/2022/10/25/audio_946f59a5f1.mp3?filename=jazz-frenchy-street-126246.mp3');
    music.loop = true;
    music.volume = 0.2;
    bgMusicRef.current = music;

    return () => {
      music.pause();
      music.currentTime = 0;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (nextQuestionTimeoutRef.current) clearTimeout(nextQuestionTimeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setHasImageError(false);
  }, [currentIdx]);

  useEffect(() => {
    try {
      localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify({ gameState, currentIdx, score }));
    } catch {
      // Ignore storage errors in private mode or restricted browsers.
    }
  }, [gameState, currentIdx, score]);

  useEffect(() => {
    if (gameState !== 'RESULT') return;
    if (score <= bestScore) return;

    setBestScore(score);
    try {
      localStorage.setItem(QUIZ_BEST_SCORE_KEY, String(score));
    } catch {
      // Ignore storage failures; app still works.
    }
  }, [gameState, score, bestScore]);

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

  const handleContinue = () => {
    playSFX('click');
    if (bgMusicRef.current && !isMusicPlaying) {
      bgMusicRef.current.play()
        .then(() => setIsMusicPlaying(true))
        .catch(() => setIsMusicPlaying(false));
    }
    setGameState('PLAYING');
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
    if (answerStatus || !currentQuestion) return;
    
    setSelectedAnswer(index);
    const isCorrect = index === currentQuestion.answer;
    setAnswerStatus(isCorrect ? 'correct' : 'wrong');
    playSFX(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) setScore(prev => prev + 1);

    // Smooth transition to next question
    nextQuestionTimeoutRef.current = setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setIsLoading(true);
        transitionTimeoutRef.current = setTimeout(() => {
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
        {hasSavedSession && (
          <button className="btn-music result-music" onClick={handleContinue}>
            CONTINUE LAST SESSION
          </button>
        )}
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

        {currentQuestion?.image && (
          <div className="art-container">
            <img 
              src={hasImageError ? fallbackImage : currentQuestion.image}
              alt="clue" 
              className={`art-image ${answerStatus ? 'paused' : ''}`}
              loading="lazy"
              onError={() => setHasImageError(true)}
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
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Best score (local): {bestScore}/{questions.length}
        </p>
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
