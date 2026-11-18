import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DOCUMENTARY_CHAPTERS,
  DOCUMENTARY_DURATION,
  DocumentaryChapter,
  getChapterAtTime,
  interpolateAtmosphere,
} from './documentary/scriptData';
import { ArchesSceneController } from './scene/ArchesSceneController';
import { DocumentaryAudioEngine } from './audio/documentaryAudio';
import { DocumentaryHUD } from './components/DocumentaryHUD';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ArchesSceneController | null>(null);
  const audioRef = useRef<DocumentaryAudioEngine | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoCamera, setAutoCamera] = useState<boolean>(true);
  const [ambientEnabled, setAmbientEnabled] = useState<boolean>(false);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);

  const currentChapter = useMemo(() => getChapterAtTime(currentTime), [currentTime]);
  const isComplete = currentTime >= DOCUMENTARY_DURATION - 0.05 && !isPlaying;

  // Keep latest state in refs for stable WebGL callbacks without tearing down canvas
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const audio = new DocumentaryAudioEngine();
    audioRef.current = audio;

    const controller = new ArchesSceneController(mount, {
      onTimeUpdate: (timeSec, playing) => {
        setCurrentTime(timeSec);
        setIsPlaying(playing);

        const ch = getChapterAtTime(timeSec);
        const atmo = interpolateAtmosphere(timeSec);
        audio.updateAtmosphereAudio(atmo.starVisibility);
        audio.speakChapter(ch.id, ch.narration, playing);
      },
      onUserOrbitStart: () => {
        setAutoCamera(false);
      },
      onPlaybackComplete: () => {
        setIsPlaying(false);
        audio.stopSpeech();
      },
      onContextLost: (lost) => {
        setContextLost(lost);
      },
    });
    sceneRef.current = controller;

    // Support ?autostart=1 for automated playback verification
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      controller.setPlaying(true);
      setIsPlaying(true);
    }

    return () => {
      controller.dispose();
      audio.dispose();
      sceneRef.current = null;
      audioRef.current = null;
    };
  }, []);

  // Expose semantic state attributes on body for browser snapshot/DOM verification
  useEffect(() => {
    document.body.dataset.state = isPlaying ? 'playing' : isComplete ? 'complete' : 'paused';
    document.body.dataset.chapter = currentChapter.id;
  }, [isPlaying, isComplete, currentChapter.id]);

  const handleTogglePlay = useCallback(() => {
    const ctrl = sceneRef.current;
    const audio = audioRef.current;
    if (!ctrl) return;

    const next = !isPlayingRef.current;
    ctrl.setPlaying(next);
    setIsPlaying(next);
    setAutoCamera(true);

    if (next) {
      const ch = getChapterAtTime(ctrl.getCurrentTime());
      audio?.resetChapterSpeech();
      audio?.speakChapter(ch.id, ch.narration, true);
    } else {
      audio?.stopSpeech();
    }
  }, []);

  const handleReplay = useCallback(() => {
    const ctrl = sceneRef.current;
    const audio = audioRef.current;
    if (!ctrl) return;

    ctrl.seekTo(0, true);
    ctrl.setPlaying(true);
    setCurrentTime(0);
    setIsPlaying(true);
    setAutoCamera(true);
    audio?.resetChapterSpeech();
    audio?.speakChapter(DOCUMENTARY_CHAPTERS[0].id, DOCUMENTARY_CHAPTERS[0].narration, true);
  }, []);

  const handleSeek = useCallback((timeSec: number) => {
    const ctrl = sceneRef.current;
    const audio = audioRef.current;
    if (!ctrl) return;

    ctrl.seekTo(timeSec, false);
    setCurrentTime(timeSec);
    setAutoCamera(true);
    const ch = getChapterAtTime(timeSec);
    audio?.resetChapterSpeech();
    if (isPlayingRef.current) {
      audio?.speakChapter(ch.id, ch.narration, true);
    }
  }, []);

  const handleSelectChapter = useCallback((chapter: DocumentaryChapter) => {
    const ctrl = sceneRef.current;
    const audio = audioRef.current;
    if (!ctrl) return;

    const targetTime = Math.min(DOCUMENTARY_DURATION, chapter.startTime + 0.25);
    ctrl.seekTo(targetTime, true);
    setCurrentTime(targetTime);
    setAutoCamera(true);
    audio?.resetChapterSpeech();
    if (isPlayingRef.current) {
      audio?.speakChapter(chapter.id, chapter.narration, true);
    }
  }, []);

  const handleResumeAutoCamera = useCallback(() => {
    sceneRef.current?.resumeAutoCamera();
    setAutoCamera(true);
  }, []);

  const handleToggleAmbient = useCallback(() => {
    setAmbientEnabled((prev) => {
      const next = !prev;
      audioRef.current?.setAmbientEnabled(next);
      return next;
    });
  }, []);

  const handleToggleVoiceover = useCallback(() => {
    setVoiceoverEnabled((prev) => {
      const next = !prev;
      audioRef.current?.setVoiceoverEnabled(next);
      return next;
    });
  }, []);

  const handleToggleDock = useCallback(() => {
    setDockCollapsed((prev) => !prev);
  }, []);

  // Keyboard shortcuts: Space (play/pause), ArrowLeft/Right (prev/next chapter), H (hide controls)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'h' || e.key === 'H') {
        handleToggleDock();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const idx = DOCUMENTARY_CHAPTERS.findIndex((c) => c.id === currentChapter.id);
        const nextCh = DOCUMENTARY_CHAPTERS[Math.min(DOCUMENTARY_CHAPTERS.length - 1, idx + 1)];
        handleSelectChapter(nextCh);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const idx = DOCUMENTARY_CHAPTERS.findIndex((c) => c.id === currentChapter.id);
        const prevCh = DOCUMENTARY_CHAPTERS[Math.max(0, idx - 1)];
        handleSelectChapter(prevCh);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentChapter.id, handleSelectChapter, handleToggleDock, handleTogglePlay]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#120d0b]">
      {/* Isolated WebGL canvas mount outside React HUD re-renders */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 h-full w-full"
        aria-label="Interactive 3D scene of Arches National Park"
      />

      {/* Semantic HTML HUD overlay */}
      <DocumentaryHUD
        currentTime={currentTime}
        isPlaying={isPlaying}
        isComplete={isComplete}
        currentChapter={currentChapter}
        autoCamera={autoCamera}
        ambientEnabled={ambientEnabled}
        voiceoverEnabled={voiceoverEnabled}
        dockCollapsed={dockCollapsed}
        contextLost={contextLost}
        onTogglePlay={handleTogglePlay}
        onReplay={handleReplay}
        onSeek={handleSeek}
        onSelectChapter={handleSelectChapter}
        onResumeAutoCamera={handleResumeAutoCamera}
        onToggleAmbient={handleToggleAmbient}
        onToggleVoiceover={handleToggleVoiceover}
        onToggleDock={handleToggleDock}
      />
    </main>
  );
}
