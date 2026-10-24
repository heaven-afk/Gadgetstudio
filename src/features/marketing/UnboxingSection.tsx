'use client';

import { useEffect, useRef, useState } from 'react';
import { CETWatchClock } from './CETWatchClock';
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
    start: 0,
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
    start: 5,
    time: '00:05',
  },
  {
    label: 'In your hands',
    title: (
      <>
        A first touch.
        <br />
        <em>A fresh start.</em>
      </>
    ),
    copy: 'Someone’s next favourite is waiting in your store.',
    start: 14,
    time: '00:14',
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
    start: 22,
    time: '00:22',
  },
];

export function UnboxingSection() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [manualPlay, setManualPlay] = useState(false);
  const [failed, setFailed] = useState(false);
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    update();
    updateVisibility();
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
        setVisible(entry.intersectionRatio >= 0.25);
      },
      { threshold: [0, 0.25] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    const film = video.current;
    if (!film) return;
    if (
      !near ||
      !visible ||
      !pageVisible ||
      paused ||
      (reduced && !manualPlay)
    ) {
      film.pause();
      return;
    }
    let cancelled = false;
    film.play().catch((error: DOMException) => {
      // A visibility change can abort a pending play without an autoplay rejection.
      if (!cancelled && error.name !== 'AbortError') setPaused(true);
    });
    return () => {
      cancelled = true;
    };
  }, [near, visible, pageVisible, paused, reduced, manualPlay]);

  function syncChapter() {
    const time = video.current?.currentTime ?? 0;
    let next = 0;
    chapters.forEach((item, index) => {
      if (time >= item.start) next = index;
    });
    setChapter(next);
  }
  function applySeek() {
    if (
      video.current &&
      pendingSeek.current !== null &&
      video.current.readyState >= 1
    ) {
      video.current.currentTime = pendingSeek.current;
      pendingSeek.current = null;
    }
  }
  function selectChapter(index: number) {
    setNear(true);
    setChapter(index);
    setPaused(true);
    video.current?.pause();
    pendingSeek.current = chapters[index].start;
    applySeek();
  }
  function togglePlayback() {
    const film = video.current;
    if (!film) return;
    if (playing) {
      film.pause();
      setPaused(true);
    } else {
      setNear(true);
      setManualPlay(true);
      setPaused(false);
      // Keep playback in this user gesture for mobile autoplay policies.
      if (film.currentSrc) film.play().catch(() => setPaused(true));
    }
  }
  const current = chapters[chapter];
  return (
    <section
      id="unboxing"
      ref={section}
      className="unboxing-film"
      aria-label="The upgrade experience: a real smartphone unboxing"
    >
      <header className="film-masthead">
        <span>HEAVEN / THE UPGRADE EXPERIENCE</span>
        <span>A FIRST IMPRESSION, IN MOTION.</span>
      </header>
      <div className="film-content">
        <div className="film-stage">
          <video
            ref={video}
            src={near && !failed ? '/media/unboxing-film.mp4' : undefined}
            poster="/media/unboxing-poster.jpg"
            width="1600"
            height="676"
            muted
            playsInline
            loop
            preload="none"
            aria-describedby="film-description"
            onTimeUpdate={syncChapter}
            onLoadedMetadata={applySeek}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => {
              setFailed(true);
              setPlaying(false);
            }}
          >
            <track
              kind="descriptions"
              src="/media/unboxing-descriptions.vtt"
              srcLang="en"
              label="Visual description"
            />
            Your browser cannot play this film.
          </video>
          <p id="film-description" className="film-description">
            Silent footage: a person lifts the lid from a smartphone box, takes
            out the phone, and explores their new device.
          </p>
        </div>
        <div className="film-editorial">
          <div className="film-chapter-index">
            <span>{String(chapter + 1).padStart(2, '0')}</span>
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
        <a
          className="film-credit"
          href="https://www.pexels.com/video/a-woman-unboxing-a-smartphone-7191331/"
          target="_blank"
          rel="noreferrer"
        >
          FILM BY PAVEL DANILYUK / PEXELS
        </a>
      </div>
      <footer className="film-controls">
        <div className="film-chapters" aria-label="Unboxing chapters">
          {chapters.map((item, index) => (
            <button
              key={item.time}
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
          disabled={failed}
          onClick={togglePlayback}
          aria-label={playing ? 'Pause film' : 'Play film'}
        >
          {failed ? 'Film unavailable' : playing ? 'Pause film' : 'Play film'}
        </button>
      </footer>
      {failed && (
        <p className="film-error" role="status">
          The film couldn’t load. You can still explore each chapter above.
        </p>
      )}
    </section>
  );
}
