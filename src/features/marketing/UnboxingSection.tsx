'use client';

import { useEffect, useRef, useState } from 'react';
import { PhoneDevice } from './PhoneDevice';
import { CETWatchClock } from './CETWatchClock';
import './unboxing.css';

export function UnboxingSection() {
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      id="unboxing"
      ref={section}
      className="unboxing-section"
      data-visible={visible}
      data-paused={paused}
      aria-labelledby="unboxing-title"
    >
      <div className="unboxing-topline">
        <span>A LITTLE ANTICIPATION. A WHOLE NEW POSSIBILITY.</span>
        <span>THE UPGRADE EXPERIENCE / 01</span>
      </div>
      <div className="unboxing-heading">
        <h2 id="unboxing-title">
          That first
          <br />
          <em>unboxing feeling.</em>
        </h2>
        <p>
          The lid lifts. The screen comes alive.
          <br />
          Someone’s next favourite is waiting in your store.
        </p>
      </div>
      <div
        className="unboxing-stage"
        role="img"
        aria-label="Animated illustration of a smartphone rising from its box, with wireless earbuds and a watch floating beside it."
      >
        <div className="unboxing-halo" />
        <div className="unboxing-floor" />
        <div className="unboxing-orbit orbit-earbuds">
          <div className="earbuds-case">
            <i />
            <i />
            <span />
          </div>
          <span className="orbit-caption">A little more connection.</span>
        </div>
        <div className="unboxing-orbit orbit-watch">
          <div className="scene-watch">
            <div>
              <CETWatchClock />
            </div>
          </div>
          <span className="orbit-caption">A fresh everyday.</span>
        </div>
        <div className="unboxing-box">
          <div className="box-interior" />
          <span>heaven.</span>
        </div>
        <div className="unboxing-phone">
          <PhoneDevice />
        </div>
        <div className="unboxing-lid">
          <div className="lid-phone-outline" />
          <span>Good things inside.</span>
        </div>
        <div className="scene-caption">YOUR NEXT CHAPTER, UNBOXED.</div>
      </div>
      <div className="unboxing-bottomline">
        <span>GOOD TECH. GREAT FIRST IMPRESSIONS.</span>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
        >
          {paused ? 'Play motion' : 'Pause motion'}
        </button>
        <span>IMAGINE THIS IN YOUR COLLECTION.</span>
      </div>
    </section>
  );
}
