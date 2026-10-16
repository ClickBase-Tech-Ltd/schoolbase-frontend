"use client";

import { type ReactNode, type ComponentType, type ChangeEvent, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Sidebar from "@/components/sidebar";
import { usePathname } from "next/navigation";
import { Menu, X, Music, Play, Pause, ChevronDown, ChevronLeft, ChevronRight, Volume2, Loader2, Equal, Delete, RefreshCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  playCloseTone,
  playOpenTone,
} from "@/lib/sounds";
import { applyTheme, detectSystemTheme, resolveStoredTheme, ThemeMode } from "@/lib/theme";
import TeacherClassAlert from "@/components/teacher-class-alert";
import BellScheduler from "@/components/bell-scheduler";
import SupportChatWidget from "@/components/support-chat-widget";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }> | string;
  section?: string;
  badge?: string;
  children?: NavItem[];
};

function subscribeThemeMode(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("schoolbase-theme-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("schoolbase-theme-change", onChange);
  };
}

function subscribeSystemTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getServerThemeSnapshot(): ThemeMode {
  return "light";
}

function getServerSystemThemeSnapshot(): "light" {
  return "light";
}

export default function SharedLayout({
  children,
  navItems,
  school,
  session,
  setupProgress,
  logoHref = "/",
  logoutRedirectUrl = "/login",
}: {
  children: ReactNode;
  navItems: NavItem[];
  school?: { name?: string | null; city?: string | null; country?: string | null } | null;
  session?: { name?: string; role?: string } | null;
  setupProgress?: number | null;
  logoHref?: string;
  logoutRedirectUrl?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [noteModalPosition, setNoteModalPosition] = useState({ top: 120, left: 80 });
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [pendingAutoPlay, setPendingAutoPlay] = useState(false);
  const [audioQueue, setAudioQueue] = useState<Array<{ name: string; src: string }>>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(0.75);
  const [noteModalWidth, setNoteModalWidth] = useState(560);
  const [noteModalHeight, setNoteModalHeight] = useState(420);
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [isVolumePopoverOpen, setIsVolumePopoverOpen] = useState(false);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isAudioBuffering, setIsAudioBuffering] = useState(false);
  const themeMode = useSyncExternalStore(subscribeThemeMode, resolveStoredTheme, getServerThemeSnapshot);
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, detectSystemTheme, getServerSystemThemeSnapshot);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [toolPanelPosition, setToolPanelPosition] = useState({ x: 680, y: 120 });
  const [audioPanelPosition, setAudioPanelPosition] = useState({ x: 24, y: 200 });
  const [isDraggingToolPanel, setIsDraggingToolPanel] = useState(false);
  const [isDraggingAudioPanel, setIsDraggingAudioPanel] = useState(false);
  const [activeTool, setActiveTool] = useState<"notes" | "calculator" | "reminders" | "timer">("notes");
  const [isToolPanelOpen, setIsToolPanelOpen] = useState(false);
  const [calculatorExpression, setCalculatorExpression] = useState("12+34");
  const [calculatorResult, setCalculatorResult] = useState("0");
  const [calculatorHistory, setCalculatorHistory] = useState<string[]>([]);
  const [reminderInput, setReminderInput] = useState("");
  const [reminders, setReminders] = useState<string[]>([]);
  const [timerInput, setTimerInput] = useState("05:00");
  const [timerRemaining, setTimerRemaining] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resizeStartRef = useRef<{ startX?: number; width?: number; startLeft?: number; startY?: number; startTop?: number; height?: number; side: "right" | "left" | "bottom" | "top" }>({ startX: 0, width: 720, startLeft: 0, startY: 0, startTop: 0, height: 480, side: "right" });
  const volumeButtonRef = useRef<HTMLButtonElement | null>(null);
  const volumePopoverRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const toolPanelDragOffsetRef = useRef({ x: 0, y: 0 });
  const audioPanelDragOffsetRef = useRef({ x: 0, y: 0 });
  const audioTouchMovedRef = useRef(false);

  function openMobileSidebar() {
    setMobileMenuOpen(true);
    playOpenTone();
  }

  function closeMobileSidebar() {
    setMobileMenuOpen(false);
    playCloseTone();
  }

  const DEFAULT_JINGLES = [
    { name: "SchoolBase Jingle 1", src: "/audio-jingles/SchoolBase%20_%20Simple%20On%20Your%20Screen.mp3" },
    { name: "SchoolBase Jingle 2", src: "/audio-jingles/SchoolBase%20_%20Simple%20On%20Your%20Screen%202.mp3" },
  ];

  const pathname = usePathname();
  const hideSidebar = pathname?.startsWith("/login");

  const [adminSessionNotes, setAdminSessionNotes] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.sessionStorage.getItem("schoolbase-admin-session-notes") || "";
  });
  const [playerCollapsed, setPlayerCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("admin-notes-player-collapsed") === "true";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode === "system" ? systemTheme : themeMode;
  }, [themeMode, systemTheme]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlHeight = document.documentElement.style.height;
    const previousBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.height = previousHtmlHeight;
      document.body.style.height = previousBodyHeight;
    };
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("schoolbase-admin-session-notes", adminSessionNotes);
  }, [adminSessionNotes]);

  useEffect(() => {
    window.localStorage.setItem("admin-notes-player-collapsed", playerCollapsed ? "true" : "false");
  }, [playerCollapsed]);

  useEffect(() => {
    if (!isDraggingNotes) return;

    const handleMouseMove = (event: MouseEvent) => {
      setNoteModalPosition({
        top: Math.max(16, event.clientY - dragOffsetRef.current.y),
        left: Math.max(16, event.clientX - dragOffsetRef.current.x),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingNotes(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingNotes]);

  useEffect(() => {
    if (!isResizingNotes) return;

    const handleResizeMove = (event: MouseEvent) => {
      const initial = resizeStartRef.current;
      const startX = initial.startX ?? 0;
      const startY = initial.startY ?? 0;
      const startLeft = initial.startLeft ?? noteModalPosition.left;
      const startTop = initial.startTop ?? noteModalPosition.top;
      const width = initial.width ?? noteModalWidth;
      const height = initial.height ?? noteModalHeight;
      const side = initial.side || "right";
      const minWidth = 480;
      const maxWidth = 1024;

      if (side === "right") {
        const deltaX = event.clientX - startX;
        const newWidth = Math.min(Math.max(width + deltaX, minWidth), maxWidth);
        setNoteModalWidth(newWidth);
      } else if (side === "left") {
        const deltaX = event.clientX - startX;
        let proposedLeft = Math.max(16, startLeft + deltaX);
        let newWidth = width - (proposedLeft - startLeft);
        if (newWidth < minWidth) {
          newWidth = minWidth;
          proposedLeft = startLeft + (width - minWidth);
        } else if (newWidth > maxWidth) {
          newWidth = maxWidth;
          proposedLeft = startLeft + (width - maxWidth);
        }
        setNoteModalWidth(newWidth);
        setNoteModalPosition((current) => ({ ...current, left: Math.max(16, proposedLeft) }));
      } else if (side === "bottom") {
        const deltaY = event.clientY - startY;
        const minH = 240;
        const maxH = 1200;
        const newHeight = Math.min(Math.max(height + deltaY, minH), maxH);
        setNoteModalHeight(newHeight);
      } else if (side === "top") {
        const deltaY = event.clientY - startY;
        let proposedTop = Math.max(16, startTop + deltaY);
        let newHeight = height - (proposedTop - startTop);
        const minH = 240;
        const maxH = 1200;
        if (newHeight < minH) {
          newHeight = minH;
          proposedTop = startTop + (height - minH);
        } else if (newHeight > maxH) {
          newHeight = maxH;
          proposedTop = startTop + (height - maxH);
        }
        setNoteModalHeight(newHeight);
        setNoteModalPosition((current) => ({ ...current, top: Math.max(16, proposedTop) }));
      }
    };

    const handleResizeUp = () => {
      setIsResizingNotes(false);
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeUp);

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeUp);
    };
  }, [isResizingNotes, noteModalHeight, noteModalPosition.left, noteModalPosition.top, noteModalWidth]);

  useEffect(() => {
    if (!isVolumePopoverOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        volumeButtonRef.current?.contains(event.target as Node) ||
        volumePopoverRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setIsVolumePopoverOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVolumePopoverOpen]);

  const ensureToolPanelInViewport = () => {
    const panelWidth = activeTool === "reminders" ? 440 : 320;
    setToolPanelPosition((position) => clampToViewport(position, panelWidth, 520));
  };

  const ensureAudioPanelInViewport = () => {
    setAudioPanelPosition((position) => clampPanelToViewport(position, 440, 520));
  };

  useEffect(() => {
    const handleResize = () => {
      if (isToolPanelOpen) {
        const panelWidth = activeTool === "reminders" ? 440 : 320;
        setToolPanelPosition((current) => clampToViewport(current, panelWidth, 520));
      }
      if (isAudioPlayerOpen) {
        setAudioPanelPosition((current) => clampPanelToViewport(current, 440, 520));
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTool, isAudioPlayerOpen, isToolPanelOpen]);

  useEffect(() => {
    if (!isDraggingToolPanel && !isDraggingAudioPanel) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (isDraggingToolPanel) {
        setToolPanelPosition({
          x: Math.max(12, Math.min(window.innerWidth - 340, event.clientX - toolPanelDragOffsetRef.current.x)),
          y: Math.max(12, Math.min(window.innerHeight - 240, event.clientY - toolPanelDragOffsetRef.current.y)),
        });
      }
      if (isDraggingAudioPanel) {
        setAudioPanelPosition({
          x: Math.max(12, Math.min(window.innerWidth - 460, event.clientX - audioPanelDragOffsetRef.current.x)),
          y: Math.max(12, Math.min(window.innerHeight - 320, event.clientY - audioPanelDragOffsetRef.current.y)),
        });
      }
    };

    const handleTouchMovePanel = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (isDraggingToolPanel) {
        setToolPanelPosition({
          x: Math.max(12, Math.min(window.innerWidth - 340, touch.clientX - toolPanelDragOffsetRef.current.x)),
          y: Math.max(12, Math.min(window.innerHeight - 240, touch.clientY - toolPanelDragOffsetRef.current.y)),
        });
      }
      if (isDraggingAudioPanel) {
        audioTouchMovedRef.current = true;
        setAudioPanelPosition({
          x: Math.max(12, Math.min(window.innerWidth - 460, touch.clientX - audioPanelDragOffsetRef.current.x)),
          y: Math.max(12, Math.min(window.innerHeight - 320, touch.clientY - audioPanelDragOffsetRef.current.y)),
        });
      }
      event.preventDefault();
    };

    const handleMouseUp = () => {
      setIsDraggingToolPanel(false);
      setIsDraggingAudioPanel(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMovePanel, { passive: false });
    window.addEventListener("touchend", handleMouseUp);
    window.addEventListener("touchcancel", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMovePanel);
      window.removeEventListener("touchend", handleMouseUp);
      window.removeEventListener("touchcancel", handleMouseUp);
    };
  }, [isDraggingToolPanel, isDraggingAudioPanel]);

  const sanitizeCalculatorInput = (expression: string) => {
    return expression.replace(/[^0-9+\-*/().% ]/g, "");
  };

  const calculateExpression = (expression: string) => {
    const sanitized = sanitizeCalculatorInput(expression);
    try {
      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === "number" && Number.isFinite(result)) {
        return String(result);
      }
    } catch {
      // ignore invalid expressions
    }
    return "Error";
  };

  const clampToViewport = (position: { x: number; y: number }, panelWidth: number, panelHeight: number) => {
    if (typeof window === "undefined") return position;
    const minX = 16;
    const minY = 16;
    const maxX = Math.max(minX, window.innerWidth - panelWidth - 16);
    const maxY = Math.max(minY, window.innerHeight - panelHeight - 16);
    return {
      x: Math.min(Math.max(position.x, minX), maxX),
      y: Math.min(Math.max(position.y, minY), maxY),
    };
  };

  const openTool = (tool: "notes" | "calculator" | "reminders" | "timer") => {
    setActiveTool(tool);
    playCloseTone();
    setIsToolsOpen(false);
    if (tool === "notes") {
      openNotesModal();
    } else {
      const panelWidth = tool === "reminders" ? 440 : 320;
      const panelHeight = 520;
      setToolPanelPosition((current) => clampToViewport(current, panelWidth, panelHeight));
      ensureToolPanelInViewport();
      setIsToolPanelOpen(true);
    }
  };

  const toggleToolsOpen = () => {
    setIsToolsOpen((current) => {
      const next = !current;
      if (next) {
        playOpenTone();
      } else {
        playCloseTone();
      }
      return next;
    });
  };

  const handleCalculatorEvaluate = () => {
    const result = calculateExpression(calculatorExpression);
    setCalculatorResult(result);
    setCalculatorHistory((current) => [`${calculatorExpression} = ${result}`, ...current].slice(0, 6));
    setIsToolPanelOpen(true);
    playCloseTone();
    setIsToolsOpen(false);
  };

  const appendCalculatorExpression = (value: string) => {
    setCalculatorExpression((current) => current + value);
  };

  const clearCalculator = () => {
    setCalculatorExpression("");
    setCalculatorResult("0");
  };

  const backspaceCalculator = () => {
    setCalculatorExpression((current) => current.slice(0, -1));
  };

  const addReminder = () => {
    const trimmed = reminderInput.trim();
    if (!trimmed) return;
    setReminders((current) => [trimmed, ...current]);
    setReminderInput("");
    setActiveTool("reminders");
    setIsToolPanelOpen(true);
    setIsToolsOpen(false);
  };

  const parseTimerInput = (value: string) => {
    const parts = value.split(":").map((part) => Number(part.trim()));
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 1 && Number.isFinite(parts[0])) {
      return parts[0];
    }
    return 0;
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const startTimer = () => {
    const seconds = parseTimerInput(timerInput);
    if (seconds <= 0) return;
    setTimerRemaining(seconds);
    setTimerRunning(true);
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = window.setInterval(() => {
      setTimerRemaining((current) => {
        if (current <= 1) {
          if (timerIntervalRef.current) {
            window.clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerRunning(false);
  };

  const resetTimer = () => {
    pauseTimer();
    setTimerRemaining(parseTimerInput(timerInput));
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const handleNotesMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    setIsDraggingNotes(true);
    dragOffsetRef.current = {
      x: event.clientX - noteModalPosition.left,
      y: event.clientY - noteModalPosition.top,
    };
  };

  const handleToolPanelMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    setIsDraggingToolPanel(true);
    toolPanelDragOffsetRef.current = {
      x: event.clientX - toolPanelPosition.x,
      y: event.clientY - toolPanelPosition.y,
    };
  };

  const handleAudioPanelTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    audioTouchMovedRef.current = false;
    setIsDraggingAudioPanel(true);
    audioPanelDragOffsetRef.current = {
      x: touch.clientX - audioPanelPosition.x,
      y: touch.clientY - audioPanelPosition.y,
    };
  };

  const handleAudioPanelMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    setIsDraggingAudioPanel(true);
    audioPanelDragOffsetRef.current = {
      x: event.clientX - audioPanelPosition.x,
      y: event.clientY - audioPanelPosition.y,
    };
  };

  const openNotesModal = () => {
    playOpenTone();
    // Ensure modal is visible on small viewports by clamping position
    const modalW = Math.min(noteModalWidth, (typeof window !== 'undefined' ? window.innerWidth - 32 : noteModalWidth));
    const modalH = Math.min(noteModalHeight, (typeof window !== 'undefined' ? window.innerHeight - 32 : noteModalHeight));
    const maxLeft = (typeof window !== 'undefined') ? Math.max(16, window.innerWidth - modalW - 16) : noteModalPosition.left;
    const maxTop = (typeof window !== 'undefined') ? Math.max(16, window.innerHeight - modalH - 16) : noteModalPosition.top;
    setNoteModalPosition(() => ({
      top: Math.min(noteModalPosition.top, maxTop),
      left: Math.min(noteModalPosition.left, maxLeft),
    }));
    setIsNotesOpen(true);
  };

  const clampPanelToViewport = (position: { x: number; y: number }, panelWidth: number, panelHeight: number) => {
    if (typeof window === "undefined") return position;
    const minX = 16;
    const minY = 16;
    const maxX = Math.max(minX, window.innerWidth - panelWidth - 16);
    const maxY = Math.max(minY, window.innerHeight - panelHeight - 16);
    return {
      x: Math.min(Math.max(position.x, minX), maxX),
      y: Math.min(Math.max(position.y, minY), maxY),
    };
  };

  const closeNotesModal = () => {
    playCloseTone();
    setIsNotesOpen(false);
  };

  const toggleAudioPlayer = () => {
    ensureAudioPanelInViewport();
    setIsAudioPlayerOpen((current) => {
      const next = !current;
      if (next) {
        playOpenTone();
      } else {
        playCloseTone();
      }
      return next;
    });
  };

  const clearNotes = () => {
    setAdminSessionNotes("");
  };

  const handleAudioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const items = files.map((file) => ({ name: file.name, src: URL.createObjectURL(file) }));

    setAudioQueue((q) => {
      const next = [...q, ...items];
      // If nothing is currently playing, start the first of the newly added items
      if (currentAudioIndex === null && next.length > 0) {
        const idx = q.length; // index of first newly added
        setCurrentAudioIndex(idx);
        setAudioFileUrl(next[idx].src);
        setAudioFileName(next[idx].name);
        setPendingAutoPlay(true);
        setIsAudioPlaying(true);
        setAudioProgress(0);
      }
      return next;
    });
  };

  const playDefaultJingle = (index: number) => {
    const jingle = DEFAULT_JINGLES[index];
    if (!jingle) return;
    // replace queue with single jingle and play immediately
    setAudioQueue([{ name: jingle.name, src: jingle.src }]);
    setCurrentAudioIndex(0);
    setAudioFileUrl(jingle.src);
    setAudioFileName(jingle.name);
    setPendingAutoPlay(true);
    setIsAudioPlaying(true);
    setAudioProgress(0);
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;

    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
      setIsAudioBuffering(false);
    } else {
      setIsAudioBuffering(true);
      audioRef.current.play().catch(() => {
        setIsAudioPlaying(false);
        setIsAudioBuffering(false);
      });
      setIsAudioPlaying(true);
    }
  };

  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsAudioPlaying(false);
    setIsAudioBuffering(false);
    setAudioProgress(0);
  };

  const playTrackAtIndex = (index: number) => {
    if (index < 0 || index >= audioQueue.length) return;
    const item = audioQueue[index];
    if (!item) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setCurrentAudioIndex(index);
    setAudioFileUrl(item.src);
    setAudioFileName(item.name);
    setPendingAutoPlay(true);
    setIsAudioPlaying(true);
    setAudioProgress(0);
  };

  const playPreviousTrack = () => {
    if (audioQueue.length === 0 || currentAudioIndex === null) return;
    const prevIndex = currentAudioIndex - 1;
    if (prevIndex >= 0) {
      playTrackAtIndex(prevIndex);
    }
  };

  const playNextTrack = () => {
    if (audioQueue.length === 0 || currentAudioIndex === null) return;
    const nextIndex = currentAudioIndex + 1;
    if (nextIndex < audioQueue.length) {
      playTrackAtIndex(nextIndex);
    }
  };

  const seekAudioBySeconds = (seconds: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = nextTime;
    setAudioProgress(nextTime / (audioRef.current.duration || 1));
  };

  const actualTheme = themeMode === "system" ? systemTheme : themeMode;

  const handleThemeChange = (nextTheme: ThemeMode) => {
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("schoolbase-theme-change"));
  };

  const toggleThemeMode = () => {
    const nextTheme = actualTheme === "dark" ? "light" : "dark";
    handleThemeChange(nextTheme);
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 1;
    setAudioProgress(current / duration);
  };

  const handleAudioVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const volume = Number(event.target.value);
    setPlayerVolume(volume);
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  };

  useEffect(() => {
    const element = audioRef.current;
    if (!element) return;

    const handleEnded = () => {
      // play next track in queue if available
      if (audioQueue.length > 0 && currentAudioIndex != null && currentAudioIndex + 1 < audioQueue.length) {
        const nextIndex = currentAudioIndex + 1;
        const nextItem = audioQueue[nextIndex];
        setCurrentAudioIndex(nextIndex);
        setAudioFileUrl(nextItem.src);
        setAudioFileName(nextItem.name);
        setPendingAutoPlay(true);
        setIsAudioPlaying(true);
        setAudioProgress(0);
        return;
      }
      setIsAudioPlaying(false);
      setIsAudioBuffering(false);
      setCurrentAudioIndex(null);
    };
    const handleWaiting = () => setIsAudioBuffering(true);
    const handleCanPlay = () => setIsAudioBuffering(false);
    const handlePlaying = () => setIsAudioBuffering(false);

    element.addEventListener("ended", handleEnded);
    element.addEventListener("waiting", handleWaiting);
    element.addEventListener("canplay", handleCanPlay);
    element.addEventListener("playing", handlePlaying);

    return () => {
      element.removeEventListener("ended", handleEnded);
      element.removeEventListener("waiting", handleWaiting);
      element.removeEventListener("canplay", handleCanPlay);
      element.removeEventListener("playing", handlePlaying);
    };
  }, [audioFileUrl, audioQueue, currentAudioIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playerVolume;
    }
  }, [playerVolume]);

  useEffect(() => {
    if (!audioRef.current || !pendingAutoPlay) return;

    audioRef.current.play().catch(() => {
      setIsAudioPlaying(false);
    });
    setPendingAutoPlay(false);
  }, [audioFileUrl, pendingAutoPlay]);

  if (hideSidebar) {
    return (
      <div className="min-h-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 md:p-8 print:overflow-visible print:p-0">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {logoHref === "/teacher" ? <TeacherClassAlert /> : null}
      {logoHref === "/admin" ? <BellScheduler /> : null}
      {/* Desktop Sidebar */}
      <Sidebar
        navItems={navItems}
        school={school}
        session={session}
        setupProgress={setupProgress}
        actualTheme={actualTheme}
        onThemeToggle={toggleThemeMode}
        toolsOpen={isToolsOpen}
        onToolsToggle={toggleToolsOpen}
        onToolSelect={(tool) => { openTool(tool); closeMobileSidebar(); }}
        onAudioOpen={() => { toggleAudioPlayer(); setIsToolsOpen(false); closeMobileSidebar(); }}
        logoHref={logoHref}
        logoutRedirectUrl={logoutRedirectUrl}
      />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden print:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile Sidebar */}
      <div
          className={`fixed bottom-0 left-0 top-0 z-40 w-64 transform bg-surface shadow-2xl md:hidden print:hidden transition-transform duration-300 ease-in-out overflow-hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          navItems={navItems}
          school={school}
          session={session}
          setupProgress={setupProgress}
          actualTheme={actualTheme}
          onThemeToggle={toggleThemeMode}
          toolsOpen={isToolsOpen}
          onToolsToggle={toggleToolsOpen}
          onToolSelect={(tool) => { openTool(tool); closeMobileSidebar(); }}
          onAudioOpen={() => { toggleAudioPlayer(); setIsToolsOpen(false); closeMobileSidebar(); }}
          logoHref={logoHref}
          logoutRedirectUrl={logoutRedirectUrl}
          isMobile
          onClose={closeMobileSidebar}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <div className="border-b border-border bg-surface px-4 py-3 md:hidden flex items-center gap-3 print:hidden">
          <Button
            variant="ghost"
            onClick={mobileMenuOpen ? closeMobileSidebar : openMobileSidebar}
            className="md:hidden p-1 h-auto w-auto"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">{logoHref === "/teacher" ? "Teacher workspace" : logoHref === "/parent" ? "Parent portal" : logoHref === "/accounting" ? "Finance workspace" : "School admin"}</p>
            <h1 className="truncate text-sm font-semibold text-foreground">{school?.name || "SchoolBase"}</h1>
          </div>
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background p-4 sm:p-6 md:p-8 print:overflow-visible print:p-0">{children}</main>
        {logoHref !== "/schoolbase-admin" && session?.role === "SCHOOL_ADMIN" ? <SupportChatWidget /> : null}

        <div className="fixed z-50 flex flex-col items-end gap-2" style={{ left: audioPanelPosition.x, top: audioPanelPosition.y }}>
          {isAudioPlayerOpen ? (
            <div
                  className={`w-[360px] max-w-[calc(100vw-32px)] border p-3 shadow-2xl transition ${themeMode === "dark" ? "border-slate-700 bg-slate-900 text-slate-100" : "border-border bg-surface text-foreground"}`}
                >
                <div className={`flex cursor-grab items-start justify-between gap-3 border-b px-4 py-3 ${themeMode === "dark" ? "border-slate-700 bg-slate-800" : "border-border bg-[#f6faff]"}`} onMouseDown={handleAudioPanelMouseDown} onTouchStart={handleAudioPanelTouchStart}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${themeMode === "dark" ? "bg-slate-800 text-slate-100" : "bg-muted text-brand"}`}>
                    {isAudioPlaying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Music className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold text-foreground`}>Music player</p>
                    <p className={`text-xs text-muted`}>{audioFileName || "SchoolBase jingle"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setPlayerCollapsed(true); setIsAudioPlayerOpen(false); }}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${themeMode === "dark" ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-slate-200 bg-background text-foreground hover:bg-surface"}`}
                    title="Minimize player"
                    aria-label="Minimize player"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

                <div className={`mt-3 rounded-lg border p-3 ${themeMode === "dark" ? "border-slate-800 bg-slate-800/70" : "border-border bg-background"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-xs uppercase tracking-[0.25em] ${themeMode === "dark" ? "text-slate-400" : "text-slate-400"}`}>Now playing</p>
                    <p className={`text-sm font-semibold ${themeMode === "dark" ? "text-slate-100" : "text-slate-900"}`}>{audioFileName || "SchoolBase jingle"}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${themeMode === "dark" ? "border-slate-700 bg-slate-900" : "border-border bg-surface"}`}>
                    {isAudioPlaying ? <Loader2 className="h-5 w-5 animate-spin text-brand" /> : <Music className="h-5 w-5 text-brand" />}
                  </div>
                </div>

                <div className={`mt-4 flex items-center justify-center gap-3 rounded-lg border p-4 ${themeMode === "dark" ? "border-slate-700 bg-slate-900/80" : "border-border bg-background"}`}>
                  <button
                    type="button"
                    onClick={playPreviousTrack}
                    disabled={currentAudioIndex === null || currentAudioIndex <= 0}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${currentAudioIndex === null || currentAudioIndex <= 0 ? "border-slate-700 bg-slate-800 text-slate-500" : "border-border bg-background text-foreground hover:bg-surface"}`}
                    title="Previous track"
                    aria-label="Previous track"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 ${themeMode === "dark" ? "border-slate-700" : "border-border"}`}>
                    <div className={`absolute inset-0 rounded-full border-4 border-t-brand ${isAudioPlaying ? "animate-spin" : ""}`} />
                    <button
                      type="button"
                      onClick={toggleAudioPlayback}
                      className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow transition hover:bg-brand/90"
                      title={isAudioPlaying ? "Pause music" : "Play music"}
                      aria-label={isAudioPlaying ? "Pause music" : "Play music"}
                    >
                      {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={playNextTrack}
                    disabled={currentAudioIndex === null || currentAudioIndex + 1 >= audioQueue.length}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${currentAudioIndex === null || currentAudioIndex + 1 >= audioQueue.length ? "border-slate-700 bg-slate-800 text-slate-500" : "border-border bg-background text-foreground hover:bg-surface"}`}
                    title="Next track"
                    aria-label="Next track"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className={`mt-4 rounded-[20px] border p-3 shadow-sm ${themeMode === "dark" ? "border-slate-700 bg-slate-800/80" : "border-slate-200 bg-white"}`}>
                <div className={`flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.25em] ${themeMode === "dark" ? "text-slate-400" : "text-slate-400"}`}>
                  <span>Progress</span>
                  <span>{Math.round(audioProgress * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={audioProgress}
                  onChange={(event) => {
                    const nextProgress = Number(event.target.value);
                    setAudioProgress(nextProgress);
                    if (audioRef.current) {
                      const nextTime = (audioRef.current.duration || 1) * nextProgress;
                      audioRef.current.currentTime = nextTime;
                    }
                  }}
                  className="mt-2 h-2 w-full cursor-pointer accent-[#0A66C2]"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => seekAudioBySeconds(-10)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${themeMode === "dark" ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                  >
                    -10s
                  </button>
                  <button
                    type="button"
                    onClick={stopAudioPlayback}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${themeMode === "dark" ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => seekAudioBySeconds(10)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${themeMode === "dark" ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-700" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                  >
                    +10s
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {DEFAULT_JINGLES.map((jingle, index) => (
                  <button
                    key={jingle.name}
                    type="button"
                    onClick={() => playDefaultJingle(index)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition ${themeMode === "dark" ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-[#0A66C2] hover:text-[#0A66C2]" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0A66C2] hover:text-[#0A66C2]"}`}
                    title={`Play ${jingle.name}`}
                    aria-label={`Play ${jingle.name}`}
                  >
                    {jingle.name}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  ref={volumeButtonRef}
                  onClick={() => setIsVolumePopoverOpen((open) => !open)}
                  className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${themeMode === "dark" ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-[#0A66C2] hover:text-[#0A66C2]" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0A66C2] hover:text-[#0A66C2]"}`}
                  title="Volume"
                  aria-label="Volume"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                {isVolumePopoverOpen ? (
                  <div
                    ref={volumePopoverRef}
                    className={`absolute bottom-24 right-4 z-50 w-52 rounded-2xl border p-4 shadow-lg ${themeMode === "dark" ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}
                  >
                    <div className={`flex items-center justify-between gap-3 text-sm font-semibold ${themeMode === "dark" ? "text-slate-100" : "text-slate-900"}`}>
                      <span>Volume</span>
                      <span>{Math.round(playerVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={playerVolume}
                      onChange={handleAudioVolumeChange}
                      className="mt-3 h-2 w-full cursor-pointer accent-[#0A66C2]"
                    />
                  </div>
                ) : null}
                <label className={`flex flex-1 cursor-pointer items-center justify-center rounded-full border px-3 py-2 text-sm font-medium transition ${themeMode === "dark" ? "border-slate-700 bg-slate-800 text-slate-100 hover:border-[#0A66C2] hover:text-[#0A66C2]" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0A66C2] hover:text-[#0A66C2]"}`}>
                  <span>Choose track</span>
                  <input type="file" accept="audio/*" multiple className="hidden" onChange={handleAudioFileChange} />
                </label>
              </div>
            </div>
          ) : null}
        </div>

          {/* Mini player when collapsed */}
          {(playerCollapsed && (audioFileUrl || audioQueue.length > 0)) ? (
            <div
              className="fixed z-50 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm flex cursor-grab items-center gap-2"
              style={{ left: audioPanelPosition.x, top: audioPanelPosition.y }}
              onMouseDown={handleAudioPanelMouseDown}
              onTouchStart={handleAudioPanelTouchStart}
            >
              <button
                type="button"
                onClick={toggleAudioPlayback}
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"
                title={isAudioBuffering ? "Loading..." : isAudioPlaying ? "Pause music" : "Play music"}
                aria-label={isAudioBuffering ? "Loading audio" : isAudioPlaying ? "Pause music" : "Play music"}
              >
                {isAudioPlaying && !isAudioBuffering ? (
                  <span className="absolute inset-0 rounded-full border-2 border-white/70 border-t-white animate-spin" />
                ) : null}
                {isAudioBuffering ? (
                  <Loader2 className="relative h-4 w-4 text-white animate-spin" />
                ) : isAudioPlaying ? (
                  <Pause className="relative h-4 w-4" />
                ) : (
                  <Play className="relative h-4 w-4" />
                )}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate" style={{ maxWidth: 160 }}>{audioFileName || "Playing"}</p>
                <p className="text-xs text-muted">{audioQueue.length > 0 && currentAudioIndex != null ? `${currentAudioIndex + 1}/${audioQueue.length}` : ""}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setPlayerCollapsed(false); setIsAudioPlayerOpen(true); }} className="text-xs text-muted">Open</button>
                <button onClick={() => { setPlayerCollapsed(false); setIsAudioPlayerOpen(false); setIsAudioPlaying(false); }} className="text-xs text-muted">Close</button>
              </div>
            </div>
          ) : null}

        {isNotesOpen ? (
          <div className="fixed inset-0 z-50 pointer-events-none">
            <div
              className="absolute z-50 border border-border bg-surface shadow-2xl pointer-events-auto flex flex-col"
              style={{
                  animation: `notes_modal_enter 320ms cubic-bezier(.2,.9,.2,1)`,
                  top: noteModalPosition.top,
                  left: noteModalPosition.left,
                  position: "fixed",
                  width: noteModalWidth,
                  height: noteModalHeight,
                  maxWidth: "calc(100vw - 32px)",
                  maxHeight: "calc(100vh - 32px)",
                }}
            >
              <style>{`
                @keyframes notes_modal_enter { from { transform: translateX(36px) scale(.98); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>
              <div
                className={`relative flex cursor-grab items-center justify-between gap-3 border-b px-5 py-4 ${themeMode === "dark" ? "border-slate-700 bg-slate-800" : "border-border bg-[#f6faff]"}`}
                onMouseDown={handleNotesMouseDown}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Workspace tool</p>
                  <p className="mt-1 text-base font-semibold tracking-tight text-foreground">Notes</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeNotesModal}
                    className="flex h-9 w-9 items-center justify-center border border-border text-muted hover:bg-background hover:text-foreground transition-colors"
                    title="Close notes"
                    aria-label="Close notes"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="relative flex-1 flex flex-col space-y-4 bg-background/40 px-5 py-5 overflow-auto">
                {/* audio element moved out of modal so playback persists when modal closes */}
                <textarea
                  value={adminSessionNotes}
                  onChange={(event) => setAdminSessionNotes(event.target.value)}
                  rows={10}
                  placeholder="Write your current tasks, reminders, or follow-up notes here..."
                  className="w-full border border-border bg-surface px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 flex-1 min-h-0"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                  <span>{adminSessionNotes.length} character{adminSessionNotes.length === 1 ? "" : "s"}</span>
                  <button
                    type="button"
                    onClick={clearNotes}
                    className="border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:border-brand hover:text-brand transition"
                  >
                    Clear notes
                  </button>
                </div>
                <div
                  className="absolute left-0 top-14 bottom-14 w-3 -ml-1 cursor-ew-resize z-50"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setIsResizingNotes(true);
                    resizeStartRef.current = {
                      startX: event.clientX,
                      width: noteModalWidth,
                      startLeft: noteModalPosition.left,
                      startY: noteModalPosition.top,
                      startTop: noteModalPosition.top,
                      height: noteModalHeight,
                      side: "left",
                    };
                  }}
                  title="Resize notes modal (left)"
                  aria-label="Resize notes modal (left)"
                />
                <div
                  className="absolute right-0 top-14 bottom-14 w-3 -mr-1 cursor-ew-resize z-50"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setIsResizingNotes(true);
                    resizeStartRef.current = {
                      startX: event.clientX,
                      width: noteModalWidth,
                      startLeft: noteModalPosition.left,
                      startY: noteModalPosition.top,
                      startTop: noteModalPosition.top,
                      height: noteModalHeight,
                      side: "right",
                    };
                  }}
                  title="Resize notes modal (right)"
                  aria-label="Resize notes modal (right)"
                />
                <div
                  className="absolute left-14 right-14 top-0 h-3 -mt-1 cursor-row-resize z-50"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setIsResizingNotes(true);
                    resizeStartRef.current = {
                      startX: noteModalPosition.left,
                      width: noteModalWidth,
                      startY: event.clientY,
                      height: noteModalHeight,
                      startTop: noteModalPosition.top,
                      startLeft: noteModalPosition.left,
                      side: "top",
                    };
                  }}
                  title="Resize notes modal (top)"
                  aria-label="Resize notes modal (top)"
                />
                <div
                  className="absolute left-14 right-14 bottom-0 h-3 -mb-1 cursor-row-resize z-50"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setIsResizingNotes(true);
                    resizeStartRef.current = {
                      startX: noteModalPosition.left,
                      width: noteModalWidth,
                      startY: event.clientY,
                      height: noteModalHeight,
                      startTop: noteModalPosition.top,
                      startLeft: noteModalPosition.left,
                      side: "bottom",
                    };
                  }}
                  title="Resize notes modal (bottom)"
                  aria-label="Resize notes modal (bottom)"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isToolPanelOpen && activeTool !== "notes" ? (
        <div className={`fixed z-50 ${activeTool === "reminders" ? "w-[440px]" : "w-[340px]"} max-w-[calc(100vw-32px)] border shadow-2xl ${themeMode === "dark" ? "border-slate-700 bg-slate-900 text-slate-100" : "border-border bg-surface text-foreground"}`} style={{ left: toolPanelPosition.x, top: toolPanelPosition.y }}>
          <div
            className={`flex cursor-grab items-center justify-between gap-3 border-b px-5 py-4 ${themeMode === "dark" ? "border-slate-700 bg-slate-800" : "border-border bg-[#f6faff]"}`}
            onMouseDown={handleToolPanelMouseDown}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Workspace tool</p>
              <p className={`mt-1 text-base font-semibold tracking-tight ${themeMode === "dark" ? "text-slate-100" : "text-foreground"}`}>
                {activeTool === "calculator"
                  ? "Calculator"
                  : activeTool === "reminders"
                  ? "Reminders"
                  : "Timer"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsToolPanelOpen(false)}
              className={`border px-3 py-2 text-xs font-semibold transition ${themeMode === "dark" ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-border bg-surface text-foreground hover:border-brand hover:text-brand"}`}
            >
              Close
            </button>
          </div>
          <div className="space-y-4 bg-background/40 p-4">
            {activeTool === "calculator" ? (
              <>
                <div>
                  <div className="mb-3">
                    <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Expression
                    </label>
                    <input
                      type="text"
                      value={calculatorExpression}
                      onChange={(event) => setCalculatorExpression(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleCalculatorEvaluate();
                        }
                      }}
                      className={themeMode === "dark" ? "w-full border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-medium text-slate-100 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20" : "w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"}
                      placeholder="e.g. 12 + 24 / 3"
                    />
                  </div>

                  <div className="mb-3 grid grid-cols-4 gap-1.5">
                    {[
                      { label: "7", value: "7" },
                      { label: "8", value: "8" },
                      { label: "9", value: "9" },
                      { label: "/", value: "/" },
                      { label: "4", value: "4" },
                      { label: "5", value: "5" },
                      { label: "6", value: "6" },
                      { label: "*", value: "*" },
                      { label: "1", value: "1" },
                      { label: "2", value: "2" },
                      { label: "3", value: "3" },
                      { label: "-", value: "-" },
                      { label: "0", value: "0" },
                      { label: ".", value: "." },
                      { label: "%", value: "%" },
                      { label: "+", value: "+" },
                    ].map((button) => (
                      <button
                        key={button.label}
                        type="button"
                        onClick={() => appendCalculatorExpression(button.value)}
                        className={themeMode === "dark" ? "border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800" : "border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"}
                      >
                        {button.label}
                      </button>
                    ))}
                  </div>

                  <div className={themeMode === "dark" ? "mb-3 border border-slate-700 bg-slate-950 p-3" : "mb-3 border border-slate-200 bg-slate-50 p-3"}>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Result</div>
                    <div className={themeMode === "dark" ? "mt-2 text-3xl font-semibold text-white" : "mt-2 text-3xl font-semibold text-slate-900"}>{calculatorResult}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCalculatorEvaluate}
                      title="Evaluate expression"
                      aria-label="Evaluate expression"
                      className={themeMode === "dark" ? "inline-flex h-9 w-9 items-center justify-center text-white transition hover:text-white hover:bg-brand/90" : "inline-flex h-9 w-9 items-center justify-center text-brand transition hover:text-white hover:bg-brand/90"}
                    >
                      <Equal className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={backspaceCalculator}
                      title="Backspace"
                      aria-label="Backspace"
                      className={themeMode === "dark" ? "inline-flex h-9 w-9 items-center justify-center text-slate-100 transition hover:text-white hover:bg-slate-800/80" : "inline-flex h-9 w-9 items-center justify-center text-slate-900 transition hover:text-white hover:bg-slate-200"}
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={clearCalculator}
                      title="Clear expression"
                      aria-label="Clear expression"
                      className={themeMode === "dark" ? "inline-flex h-9 w-9 items-center justify-center text-slate-100 transition hover:text-white hover:bg-slate-800/80" : "inline-flex h-9 w-9 items-center justify-center text-slate-900 transition hover:text-white hover:bg-slate-200"}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {calculatorHistory.length > 0 ? (
                  <div className={themeMode === "dark" ? "border-t border-slate-700 pt-3" : "border-t border-slate-200 pt-3"}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Recent calculations</div>
                    <div className={themeMode === "dark" ? "space-y-2 text-sm text-slate-200" : "space-y-2 text-sm text-slate-800"}>
                      {calculatorHistory.map((entry, index) => (
                        <div key={`${entry}-${index}`} className={themeMode === "dark" ? "border-b border-slate-800 py-2" : "border-b border-slate-100 py-2"}>
                          {entry}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : activeTool === "reminders" ? (
              <>
                <div className={`border-t p-1 transition ${themeMode === "dark" ? "border-slate-700 text-slate-100" : "border-border text-foreground"}`}>
                  <div className={`flex items-center justify-between gap-3 border-b pb-4 ${themeMode === "dark" ? "border-slate-800" : "border-border"}`}>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Reminders</p>
                      <p className="mt-1 text-sm font-semibold">Keep follow-up tasks in view.</p>
                    </div>
                    <span className={`border-l-2 border-brand px-3 py-1 text-xs font-semibold ${themeMode === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                      {reminders.length} {reminders.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={reminderInput}
                      onChange={(event) => setReminderInput(event.target.value)}
                      className={`w-full min-w-0 border px-4 py-3 text-sm outline-none transition ${themeMode === "dark" ? "border-slate-700 bg-slate-950 text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/20" : "border-border bg-background text-foreground focus:border-brand focus:ring-2 focus:ring-brand/10"}`}
                      placeholder="Add a follow-up reminder"
                    />
                    <button
                      type="button"
                      onClick={addReminder}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover"
                      title="Add reminder"
                      aria-label="Add reminder"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>

                  <div className="mt-4 space-y-3 max-h-64 overflow-auto">
                    {reminders.length > 0 ? (
                      reminders.map((reminder, index) => (
                        <div key={`${reminder}-${index}`} className={`border-l-2 px-3 py-2.5 text-sm transition ${themeMode === "dark" ? "border-brand/70 bg-slate-900/60 text-slate-100" : "border-brand bg-background text-foreground"}`}>
                          {reminder}
                        </div>
                      ))
                    ) : (
                      <div className={`border border-dashed px-3 py-4 text-sm ${themeMode === "dark" ? "border-slate-700 text-slate-400" : "border-border text-muted"}`}>
                        No reminders yet. Add one to keep it handy.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className={`block text-xs font-semibold uppercase tracking-[0.2em] ${themeMode === "dark" ? "text-slate-400" : "text-muted"}`}>
                  Countdown
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={timerInput}
                    onChange={(event) => setTimerInput(event.target.value)}
                    className={`flex-1 border px-4 py-3 text-sm outline-none transition ${themeMode === "dark" ? "border-slate-700 bg-slate-950 text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/20" : "border-border bg-surface text-foreground focus:border-brand focus:ring-2 focus:ring-brand/10"}`}
                    placeholder="MM:SS"
                  />
                  <button
                    type="button"
                    onClick={resetTimer}
                    className={`inline-flex items-center justify-center border px-4 py-2 text-sm font-semibold transition ${themeMode === "dark" ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-border bg-surface text-foreground hover:border-brand hover:text-brand"}`}
                  >
                    Reset
                  </button>
                </div>
                  <div className={`flex items-center justify-between border px-4 py-3 text-sm font-semibold ${themeMode === "dark" ? "border-slate-700 bg-slate-950 text-slate-100" : "border-border bg-background text-foreground"}`}>
                  <span>Time left</span>
                  <span>{formatTimer(timerRemaining)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={timerRunning ? pauseTimer : startTimer}
                    className="inline-flex flex-1 items-center justify-center bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
                  >
                    {timerRunning ? "Pause" : "Start"}
                  </button>
                  <button
                    type="button"
                    onClick={resetTimer}
                    className={`inline-flex items-center justify-center border px-4 py-2 text-sm font-semibold transition ${themeMode === "dark" ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-border bg-surface text-foreground hover:border-brand hover:text-brand"}`}
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <audio
        ref={audioRef}
        src={audioFileUrl ?? undefined}
        className="hidden"
        preload="metadata"
        onTimeUpdate={handleAudioTimeUpdate}
        onEnded={() => setIsAudioPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            audioRef.current.volume = playerVolume;
            setAudioProgress(0);
          }
        }}
      />
    </div>
  );
}
