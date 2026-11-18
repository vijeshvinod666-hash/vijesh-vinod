import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  DOCUMENTARY_CHAPTERS,
  DOCUMENTARY_DURATION,
  DocumentaryChapter,
  formatTimecode,
} from '../documentary/scriptData';

interface DocumentaryHUDProps {
  currentTime: number;
  isPlaying: boolean;
  isComplete: boolean;
  currentChapter: DocumentaryChapter;
  autoCamera: boolean;
  ambientEnabled: boolean;
  voiceoverEnabled: boolean;
  dockCollapsed: boolean;
  contextLost: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  onSeek: (timeSec: number) => void;
  onSelectChapter: (chapter: DocumentaryChapter) => void;
  onResumeAutoCamera: () => void;
  onToggleAmbient: () => void;
  onToggleVoiceover: () => void;
  onToggleDock: () => void;
}

export const DocumentaryHUD: React.FC<DocumentaryHUDProps> = ({
  currentTime,
  isPlaying,
  isComplete,
  currentChapter,
  autoCamera,
  ambientEnabled,
  voiceoverEnabled,
  dockCollapsed,
  contextLost,
  onTogglePlay,
  onReplay,
  onSeek,
  onSelectChapter,
  onResumeAutoCamera,
  onToggleAmbient,
  onToggleVoiceover,
  onToggleDock,
}) => {
  const progressPct = Math.min(100, Math.max(0, (currentTime / DOCUMENTARY_DURATION) * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Top-left editorial documentary header + optional top-right Resume Camera action */}
      <header className="flex items-start justify-between gap-4 px-5 pt-4 sm:px-7 sm:pt-5">
        <div
          className="pointer-events-auto max-w-xl rounded-md border border-[#f5d5b8]/15 px-4 py-2.5"
          style={{ backgroundColor: 'rgba(18, 13, 11, 0.82)' }}
        >
          <h1
            className="text-xl font-semibold tracking-tight text-[#f9f1e8] sm:text-2xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Arches National Park — Nature&apos;s Masterpiece
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#d6c2b2]">
            <span className="font-medium text-[#f09b68] tabular-nums">
              0{currentChapter.index}. {currentChapter.title}
            </span>
            <span aria-hidden="true">·</span>
            <span>{currentChapter.subtitleLocation}</span>
            <span aria-hidden="true">·</span>
            <span>{currentChapter.timeOfDayLabel}</span>
          </div>
        </div>

        {!autoCamera && (
          <button
            type="button"
            onClick={onResumeAutoCamera}
            aria-label="Resume documentary camera"
            className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-[#f09b68]/45 px-3.5 py-2 text-xs font-medium text-[#f9f1e8] transition-colors hover:border-[#f09b68] hover:bg-[#2a1d17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f09b68] whitespace-nowrap"
            style={{ backgroundColor: 'rgba(22, 15, 12, 0.9)' }}
          >
            <Compass className="h-3.5 w-3.5 text-[#f09b68]" aria-hidden="true" />
            <span>Resume Auto-Camera</span>
          </button>
        )}
      </header>

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div
          role="alert"
          className="pointer-events-auto mx-auto max-w-md rounded-md border border-[#f09b68]/40 px-5 py-4 text-center"
          style={{ backgroundColor: 'rgba(18, 13, 11, 0.95)' }}
        >
          <p className="text-sm font-medium text-[#f9f1e8]">
            3D viewport paused while graphics context recovers.
          </p>
          <p className="mt-1 text-xs text-[#cbb8a8]">
            Arches National Park documentary chapters remain accessible below.
          </p>
        </div>
      )}

      {/* Lower Narration Subtitle + Collapsible Bottom Control Dock */}
      <div className="flex flex-col items-center px-3 pb-3 sm:px-6 sm:pb-4">
        {/* Narration Caption Band (clean, readable, non-intrusive) */}
        <section
          aria-label="Documentary narration"
          className={`mb-2.5 w-full max-w-3xl rounded-md border border-[#f5d5b8]/12 px-4 py-2.5 text-center transition-opacity duration-200 ${
            dockCollapsed ? 'opacity-90' : 'opacity-100'
          }`}
          style={{ backgroundColor: 'rgba(15, 10, 9, 0.84)' }}
        >
          <p
            data-testid="narration-text"
            className="text-sm leading-relaxed text-[#f7efe6] sm:text-base"
            style={{ textWrap: 'balance' }}
          >
            &ldquo;{currentChapter.narration}&rdquo;
          </p>
        </section>

        {/* Collapse / Expand Toggle Tab */}
        <div className="pointer-events-auto flex justify-center">
          <button
            type="button"
            onClick={onToggleDock}
            aria-expanded={!dockCollapsed}
            aria-label={dockCollapsed ? 'Show documentary controls' : 'Hide documentary controls'}
            className="flex items-center gap-1.5 rounded-t-md border border-b-0 border-[#f5d5b8]/18 px-3.5 py-1 text-[11px] font-medium text-[#d8c4b4] transition-colors hover:text-[#f9f1e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f09b68] whitespace-nowrap"
            style={{ backgroundColor: 'rgba(20, 14, 12, 0.92)' }}
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 text-[#f09b68]" aria-hidden="true" />
                <span>Show Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-[#f09b68]" aria-hidden="true" />
                <span>Hide Controls</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Unified Bottom Control Dock (no backdrop-filter over WebGL) */}
        {!dockCollapsed && (
          <nav
            aria-label="Documentary playback and chapters"
            className="pointer-events-auto w-full max-w-[920px] rounded-md border border-[#f5d5b8]/18 px-3.5 py-2.5 sm:px-4"
            style={{ backgroundColor: 'rgba(20, 14, 12, 0.94)' }}
          >
            {/* Row 1: Play/Pause, 60s Scrubber, Timecode & Audio Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={isComplete ? onReplay : onTogglePlay}
                aria-label={
                  isComplete ? 'Replay documentary' : isPlaying ? 'Pause documentary' : 'Play documentary'
                }
                className="flex h-9 shrink-0 items-center gap-1.5 rounded bg-[#d96b38] px-3.5 text-xs font-semibold text-[#120d0b] transition-colors hover:bg-[#e87c49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5b988] whitespace-nowrap"
              >
                {isComplete ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Replay</span>
                  </>
                ) : isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Play</span>
                  </>
                )}
              </button>

              {/* Timecode */}
              <span
                data-testid="timecode-display"
                className="shrink-0 text-xs font-medium text-[#e7d6c7] tabular-nums"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {formatTimecode(currentTime)} / 1:00
              </span>

              {/* 60-Second Timeline Scrubber with Chapter Ticks */}
              <div className="relative flex flex-1 items-center">
                <input
                  type="range"
                  min={0}
                  max={DOCUMENTARY_DURATION}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  aria-label="Documentary timeline"
                  className="doc-scrubber relative z-10 w-full"
                  style={{
                    background: `linear-gradient(to right, #d96b38 0%, #f5b988 ${progressPct}%, rgba(255,255,255,0.16) ${progressPct}%, rgba(255,255,255,0.16) 100%)`,
                    height: '4px',
                    borderRadius: '2px',
                  }}
                />
                {/* Chapter markers */}
                <div className="pointer-events-none absolute inset-x-0 flex h-2 items-center">
                  {DOCUMENTARY_CHAPTERS.slice(1).map((ch) => (
                    <span
                      key={ch.id}
                      aria-hidden="true"
                      className="absolute h-2 w-px bg-[#f7efe6]/35"
                      style={{ left: `${(ch.startTime / DOCUMENTARY_DURATION) * 100}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Audio & Voiceover Toggles */}
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={onToggleAmbient}
                  aria-pressed={ambientEnabled}
                  aria-label={ambientEnabled ? 'Mute desert soundscape' : 'Enable desert soundscape'}
                  title={ambientEnabled ? 'Mute desert soundscape' : 'Enable desert soundscape'}
                  className={`flex h-9 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    ambientEnabled
                      ? 'border-[#f09b68]/60 bg-[#2d1e17] text-[#f9f1e8]'
                      : 'border-[#f5d5b8]/15 bg-transparent text-[#bda999] hover:text-[#f9f1e8]'
                  }`}
                >
                  {ambientEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-[#f09b68]" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="hidden md:inline">Sound</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleVoiceover}
                  aria-pressed={voiceoverEnabled}
                  aria-label={voiceoverEnabled ? 'Disable narration voice' : 'Enable narration voice'}
                  title={voiceoverEnabled ? 'Disable narration voice' : 'Enable narration voice'}
                  className={`flex h-9 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    voiceoverEnabled
                      ? 'border-[#f09b68]/60 bg-[#2d1e17] text-[#f9f1e8]'
                      : 'border-[#f5d5b8]/15 bg-transparent text-[#bda999] hover:text-[#f9f1e8]'
                  }`}
                >
                  {voiceoverEnabled ? (
                    <Mic className="h-3.5 w-3.5 text-[#f09b68]" aria-hidden="true" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="hidden md:inline">Voice</span>
                </button>
              </div>
            </div>

            {/* Row 2: 6-Chapter Single-Line Navigation Tabs */}
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {DOCUMENTARY_CHAPTERS.map((ch) => {
                const active = ch.id === currentChapter.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onSelectChapter(ch)}
                    aria-current={active ? 'step' : undefined}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f09b68] ${
                      active
                        ? 'bg-[#d96b38]/22 text-[#f7c59f] border border-[#d96b38]/60'
                        : 'border border-transparent text-[#b8a596] hover:bg-[#ffffff]/6 hover:text-[#f7efe6]'
                    }`}
                  >
                    <span className="tabular-nums opacity-75">0{ch.index}</span>
                    <span>{ch.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};
