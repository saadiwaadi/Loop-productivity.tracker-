import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../db/db';
import { useSettings } from '../../hooks/useDb';

const dayLines = [
  "Two hard things today. That's the whole plan.",
  "The timer's running — I'll keep watch.",
  "Nice streak on Deep work. Don't break it on my account.",
  "Water. You. Now. Go on.",
  "River View's trial balance hit zero. I saw it. Proud of you.",
  "Stretch those shoulders — you've been hunched a while.",
  "You added a spark to the Ideas pile. Good. Loud head, quiet page.",
  "Pet me and I'll pretend I made you more productive."
];

const eveLines = [
  "Getting late. One more small thing, then we rest?",
  "Dim the screen, the dog approves.",
  "You did enough today. Truly.",
  "Golden hour on the ambient blobs, look at that."
];

function isSleepyTime() {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

export default function Dog() {
  const settings = useSettings();
  const [isSleepy, setIsSleepy] = useState(isSleepyTime);
  const [bubbleText, setBubbleText] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [isHop, setIsHop] = useState(false);
  const [isTutorial, setIsTutorial] = useState(false);

  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (txt: string, timeout = 5200, isTut = false) => {
    setBubbleText(txt);
    setIsTutorial(isTut);
    setShowBubble(true);
    
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    if (!isTut && timeout > 0) {
      bubbleTimer.current = setTimeout(() => {
        setShowBubble(false);
      }, timeout);
    }
  };

  const hop = () => {
    setIsHop(true);
    setTimeout(() => setIsHop(false), 500);
  };

  const handlePet = () => {
    hop();
    if (isSleepy) {
      say("mmf… oh, hi…");
    } else {
      const pool = new Date().getHours() >= 18 ? eveLines : dayLines;
      say(pool[Math.floor(Math.random() * pool.length)]);
    }
  };

  const dismissBubble = () => {
    setShowBubble(false);
  };

  const completeTutorial = () => {
    db.settings.update(1, { tutorialSeen: true });
    setShowBubble(false);
  };

  // pet-biscuit global listener
  useEffect(() => {
    const handlePetEvent = () => {
      handlePet();
    };
    window.addEventListener('pet-biscuit', handlePetEvent);
    return () => window.removeEventListener('pet-biscuit', handlePetEvent);
  }, [isSleepy, settings?.tutorialSeen]);

  // 1. Initial greeting / tutorial checks
  useEffect(() => {
    if (!settings) return;

    const timer = setTimeout(() => {
      if (!settings.tutorialSeen) {
        // Shown exactly once, ever — completing it sets tutorialSeen so
        // this branch never fires again for this account.
        say(
          "Hi, I'm <b>Biscuit</b>. This is your calm page — projects, a stopwatch, habits, and a spot for stray ideas. Tap me anytime and I'll keep you company.",
          0,
          true
        );
      } else if (isSleepy) {
        say("Shh… I'm napping. It's late — you should too.");
      } else {
        // After the first-ever intro, greet with a random line from the
        // same pool used for petting instead of repeating one fixed
        // greeting every time the app opens.
        const pool = new Date().getHours() >= 18 ? eveLines : dayLines;
        say(pool[Math.floor(Math.random() * pool.length)]);
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, [settings?.tutorialSeen]);

  // 2. Sleep schedule check and idle chatter
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const sleepy = isSleepyTime();
      setIsSleepy(sleepy);
      if (sleepy && !isSleepy) {
        say("Time for a nap…");
      }
    }, 30000);

    const chatterInterval = setInterval(() => {
      // Occasional random comment (30s interval, 50% chance if no bubble showing and tutorial complete)
      if (settings?.tutorialSeen && !isSleepyTime() && !showBubble && Math.random() > 0.5) {
        const pool = new Date().getHours() >= 18 ? eveLines : dayLines;
        say(pool[Math.floor(Math.random() * pool.length)]);
      }
    }, 30000);

    return () => {
      clearInterval(checkInterval);
      clearInterval(chatterInterval);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, [settings?.tutorialSeen, showBubble, isSleepy]);

  if (settings && settings.dogEnabled === false) {
    return null;
  }

  return (
    <>
      <motion.div
        id="dog"
        className={isSleepy ? 'asleep' : ''}
        onClick={handlePet}
        role="button"
        aria-label="Biscuit the dog — tap to pet"
        style={{ transformOrigin: 'bottom center' }}
        animate={isHop ? {
          y: [0, -25, 5, -2, 0],
          scaleY: [1, 0.85, 1.15, 0.95, 1],
          scaleX: [1, 1.15, 0.85, 1.05, 1]
        } : {
          y: 0,
          scaleY: 1,
          scaleX: 1
        }}
        transition={isHop ? {
          duration: 0.5,
          ease: "easeInOut"
        } : undefined}
      >
        <svg viewBox="0 0 120 120">
          {/* Sleep indicator (floating Z's) */}
          {isSleepy && (
            <g fontFamily="var(--font-display)" fontWeight="700" fill="var(--ink-faint)">
              <motion.text
                x="82" y="34" fontSize="13"
                animate={{ opacity: [0, 1, 0], y: [0, -10, -20], x: [82, 85, 82] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0, ease: "easeInOut" }}
              >z</motion.text>
              <motion.text
                x="92" y="24" fontSize="16"
                animate={{ opacity: [0, 1, 0], y: [0, -12, -24], x: [92, 96, 92] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.8, ease: "easeInOut" }}
              >z</motion.text>
              <motion.text
                x="104" y="12" fontSize="20"
                animate={{ opacity: [0, 1, 0], y: [0, -15, -30], x: [104, 110, 104] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1.6, ease: "easeInOut" }}
              >Z</motion.text>
            </g>
          )}

          {/* Shadow */}
          <motion.ellipse
            cx="60"
            cy="108"
            rx="34"
            ry="7"
            fill="rgba(0,0,0,.10)"
            animate={isSleepy ? { scaleX: [1, 1.02, 1] } : { scaleX: [1, 0.98, 1] }}
            transition={{ duration: isSleepy ? 4.0 : 3.4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "60px 108px" }}
          />

          {/* Dog body */}
          <motion.g
            className="dog-breathe"
            animate={{
              scaleY: isSleepy ? [1, 1.05, 1] : [1, 1.03, 1],
              scaleX: isSleepy ? 1 : [1, 0.99, 1]
            }}
            transition={{
              duration: isSleepy ? 4.0 : 3.4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ transformOrigin: "50% 80%" }}
          >
            {/* Tail */}
            <motion.path
              className="dog-tail"
              d="M88 70 q18 -6 20 -20 q-14 4 -22 14 z"
              fill="#E8A85C"
              animate={isSleepy ? { rotate: 0 } : { rotate: [0, -22, 0] }}
              transition={isSleepy ? undefined : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "88% 62%" }}
            />

            {/* Rear / Body */}
            <ellipse cx="60" cy="78" rx="34" ry="30" fill="#F2B96A" />
            <ellipse cx="60" cy="86" rx="22" ry="19" fill="#FBE3C0" />

            {/* Left & Right Ears */}
            <motion.path
              className="dog-ear-l"
              d="M30 44 q-10 -20 4 -30 q14 6 12 30 z"
              fill="#E8A85C"
              animate={isSleepy ? { rotate: 0 } : { rotate: [0, -5, 0] }}
              transition={isSleepy ? undefined : { duration: 4.0, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "34% 30%" }}
            />
            <motion.path
              className="dog-ear-r"
              d="M90 44 q10 -20 -4 -30 q-14 6 -12 30 z"
              fill="#E8A85C"
              animate={isSleepy ? { rotate: 0 } : { rotate: [0, 5, 0] }}
              transition={isSleepy ? undefined : { duration: 4.0, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "66% 30%" }}
            />

            {/* Head */}
            <circle cx="60" cy="58" r="30" fill="#F2B96A" />
            <path d="M60 34 q-24 2 -28 26 q14 -14 28 -14 q14 0 28 14 q-4 -24 -28 -26z" fill="#FBE3C0" />
            
            {/* Eyes Open with Blink Loop */}
            {!isSleepy && (
              <motion.g
                animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", times: [0, 0.92, 0.96, 0.98, 1] }}
                style={{ transformOrigin: "60px 56px" }}
              >
                <ellipse cx="48" cy="56" rx="4.4" ry="5.2" fill="#3A2A1A" />
                <ellipse cx="72" cy="56" rx="4.4" ry="5.2" fill="#3A2A1A" />
                <circle cx="49.4" cy="54.2" r="1.4" fill="#fff" />
                <circle cx="73.4" cy="54.2" r="1.4" fill="#fff" />
              </motion.g>
            )}
            
            {/* Eyes closed (sleepy state) */}
            {isSleepy && (
              <path
                id="dogEyesClosed"
                d="M43 56 q5 4 10 0 M67 56 q5 4 10 0"
                stroke="#3A2A1A"
                strokeWidth="2.4"
                fill="none"
                strokeLinecap="round"
              />
            )}
            
            {/* Nose and Mouth */}
            <ellipse cx="60" cy="68" rx="5.5" ry="4.2" fill="#3A2A1A" />
            <path d="M60 72 v5 M60 77 q-6 4 -11 1 M60 77 q6 4 11 1" stroke="#3A2A1A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <circle cx="36" cy="66" r="5" fill="#FF9E9E" opacity=".55" />
            <circle cx="84" cy="66" r="5" fill="#FF9E9E" opacity=".55" />
          </motion.g>
        </svg>
      </motion.div>

      {/* Speech Bubble */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            className={`bubble show ${isTutorial ? 'tut' : ''}`}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {!isTutorial && <span className="x" onClick={dismissBubble}>×</span>}
            <div className="nm">Biscuit</div>
            <div dangerouslySetInnerHTML={{ __html: bubbleText }} />
            {isTutorial && (
              <button
                onClick={completeTutorial}
                className="cta"
              >
                Got it
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
