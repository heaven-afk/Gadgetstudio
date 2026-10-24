'use client';

import { useEffect, useRef, useState } from 'react';
import { CETWatchClock } from './CETWatchClock';
import type { UnboxingPlayer } from './unboxing-scene';
import './unboxing.css';

const chapters = [
  {
    label: 'Anticipation',
    title: (
      <>
        That first
        <br />
        <em>unboxing feeling.</em>
      </>
    ),
    copy: 'That quiet moment before something new becomes yours.',
    number: '01',
    time: '00:00',
  },
  {
    label: 'The reveal',
    title: (
      <>
        The lid lifts.
        <br />
        <em>A new possibility.</em>
      </>
    ),
    copy: 'A little anticipation. A whole new world underneath.',
    number: '02',
    time: '00:05',
  },
  {
    label: 'Coming alive',
    title: (
      <>
        The screen
        <br />
        <em>comes alive.</em>
      </>
    ),
    copy: 'Someone’s next favourite is waiting in your store.',
    number: '03',
    time: '00:10',
  },
  {
    label: 'Your next chapter',
    title: (
      <>
        A new chapter.
        <br />
        <em>Right on time.</em>
      </>
    ),
    copy: 'A fresh start, at this very moment.',
    number: '04',
    time: '00:15',
  },
];

export function UnboxingSection() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<UnboxingPlayer | null>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener('change', update);
    if (!('IntersectionObserver' in window)) {
      setNear(true);
      setVisible(true);
      return () => preference.removeEventListener('change', update);
    }
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: '200px' },
    );
    const visibility = new IntersectionObserver(
      ([entry]) => setVisible(entry.intersectionRatio >= 0.25),
      { threshold: 0.25 },
    );
    preload.observe(element);
    visibility.observe(element);
    return () => {
      preload.disconnect();
      visibility.disconnect();
      preference.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (!near || !canvas.current) return;
    let disposed = false;
    import('./unboxing-scene')
      .then(({ createUnboxingPlayer }) => {
        if (disposed || !canvas.current) return;
        try {
          player.current = createUnboxingPlayer(canvas.current, (next) =>
            setChapter(next),
          );
          setReady(true);
        } catch {
          setReady(false);
        }
      })
      .catch(() => setReady(false));
    return () => {
      disposed = true;
      player.current?.dispose();
      player.current = null;
    };
  }, [near]);

  useEffect(() => {
    player.current?.configure({ active: visible, paused, reduced });
  }, [visible, paused, reduced, ready]);
  function selectChapter(index: number) {
    setChapter(index);
    setPaused(true);
    player.current?.seek(index);
  }
  const current = chapters[chapter];
  return (
    <section
      id="unboxing"
      ref={section}
      className="unboxing-film"
      data-ready={ready}
      data-reduced={reduced}
      aria-label="The upgrade experience: an animated 3D unboxing"
    >
      <header className="film-masthead">
        <span>HEAVEN / THE UPGRADE EXPERIENCE</span>
        <span>A FIRST IMPRESSION, IN MOTION.</span>
      </header>
      <div className="film-content">
        <div className="film-editorial">
          <div className="film-chapter-index">
            <span>{current.number}</span>
            <span>{current.label}</span>
          </div>
          <div className="film-copy" key={chapter}>
            <h2>{current.title}</h2>
            <p>{current.copy}</p>
            {chapter === 3 && (
              <div className="film-time">
                <span>CENTRAL EUROPEAN TIME · UTC+1</span>
                <CETWatchClock inline />
              </div>
            )}
          </div>
          <p className="film-signature">YOUR NEXT CHAPTER, UNBOXED.</p>
        </div>
        <div
          className="film-stage"
          role="img"
          aria-label="A three-dimensional titanium smartphone is unboxed, its display lights up, and a smartwatch and wireless earbuds join the scene."
        >
          <img
            className="film-fallback"
            src="/assets/hero.png"
            alt="A collection of premium devices"
          />
          <canvas ref={canvas} aria-hidden="true" />
          <span className="film-stage-label">
            DESIGNED TO BE SOMEONE’S NEXT FAVOURITE.
          </span>
        </div>
      </div>
      <footer className="film-controls">
        <div className="film-chapters" aria-label="Unboxing chapters">
          {chapters.map((item, index) => (
            <button
              key={item.number}
              type="button"
              aria-pressed={index === chapter}
              onClick={() => selectChapter(index)}
            >
              <span className="film-track" />
              <span>
                <small>{item.time}</small>
                {item.label}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="film-play"
          disabled={!ready}
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
        >
          {paused ? 'Play film' : 'Pause film'}
        </button>
      </footer>
      <noscript>
        The lid lifts. The screen comes alive. Someone’s next favourite is
        waiting in your store.
      </noscript>
    </section>
  );
}
