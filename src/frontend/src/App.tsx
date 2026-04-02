import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Music,
  Power,
  Radio,
  Tv,
  Usb,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type Channel = "FL" | "FR" | "SL" | "SR" | "CENTER" | "SUB";
type SurroundMode = "STEREO" | "MOVIE" | "MUSIC" | "GAME";
type SpeakerMode = "2.1" | "5.1";
type UsbBoard = "MP3" | "RealPlay" | "Wire";
type ControlMode =
  | "MASTER"
  | "FRONT"
  | "SURR"
  | "CENTER"
  | "SUB"
  | "GAIN"
  | "BASS"
  | "TREBLE";
type InputSource =
  | "DVD"
  | "USB"
  | "AUX1"
  | "AUX2"
  | "AUX3"
  | "FT:AUX"
  | "FT:OPT"
  | "FT:COAX"
  | "FT:HDMI";

interface AppState {
  masterVolume: number;
  channelTrims: Record<Channel, number>;
  inputSource: InputSource;
  bass: number;
  treble: number;
  gain: number;
  mute: boolean;
  standby: boolean;
  surroundMode: SurroundMode;
  speakerMode: SpeakerMode;
  usbBoard: UsbBoard;
  currentMode: ControlMode;
}

const STORAGE_KEY = "ultra-digital-51-state";

const DEFAULT_STATE: AppState = {
  masterVolume: 40,
  channelTrims: { FL: 0, FR: 0, SL: 0, SR: 0, CENTER: 0, SUB: 0 },
  inputSource: "DVD",
  bass: 0,
  treble: 0,
  gain: 40,
  mute: false,
  standby: false,
  surroundMode: "MOVIE",
  speakerMode: "5.1",
  usbBoard: "MP3",
  currentMode: "MASTER",
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_STATE;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const finalLevel = (master: number, trim: number) =>
  clamp(master + trim, 0, 79);

// ── Knob Component ────────────────────────────────────────────────────────────
interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  color?: "amber" | "cyan";
  size?: "lg" | "sm";
}

function Knob({
  value,
  min,
  max,
  onChange,
  label,
  color = "amber",
  size = "sm",
}: KnobProps) {
  const range = max - min;
  const pct = (value - min) / range;
  const startAngle = -135;
  const endAngle = 135;
  const angle = startAngle + pct * (endAngle - startAngle);

  // lg: bigger to accommodate tick marks
  const svgSize = size === "lg" ? 128 : 100;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const r = size === "lg" ? 44 : 32;

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const arcPath = (start: number, end: number, radius: number) => {
    const x1 = cx + radius * Math.cos(toRad(start));
    const y1 = cy + radius * Math.sin(toRad(start));
    const x2 = cx + radius * Math.cos(toRad(end));
    const y2 = cy + radius * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const indicatorX = cx + (r - 8) * Math.cos(toRad(angle));
  const indicatorY = cy + (r - 8) * Math.sin(toRad(angle));

  const amberColor = "#e8a030";
  const cyanColor = "#35c7d6";
  const trackColor = "rgba(0,0,0,0.5)";
  const fillColor = color === "amber" ? amberColor : cyanColor;
  const fillOklch =
    color === "amber" ? "oklch(0.75 0.15 65)" : "oklch(0.80 0.12 195)";

  // Tick marks — 11 ticks spread across the 270° arc
  const numTicks = 11;
  const ticks = Array.from({ length: numTicks }, (_, i) => {
    const tickAngle =
      startAngle + (i / (numTicks - 1)) * (endAngle - startAngle);
    const rad = toRad(tickAngle);
    const isMajor =
      i === 0 || i === numTicks - 1 || i === Math.floor(numTicks / 2);
    const outerR = r + (size === "lg" ? 14 : 12);
    const innerR =
      r + (isMajor ? (size === "lg" ? 7 : 6) : size === "lg" ? 10 : 9);
    const isLit = i / (numTicks - 1) <= pct;
    const tickKey = Math.round(tickAngle * 100);
    return {
      x1: cx + innerR * Math.cos(rad),
      y1: cy + innerR * Math.sin(rad),
      x2: cx + outerR * Math.cos(rad),
      y2: cy + outerR * Math.sin(rad),
      isMajor,
      isLit,
      tickKey,
    };
  });

  const dragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(value);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startY.current = e.clientY;
      startValue.current = value;
      e.preventDefault();
    },
    [value],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - e.clientY) / 150;
      const newVal = clamp(startValue.current + delta * range, min, max);
      onChange(Math.round(newVal));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [min, max, range, onChange]);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="relative cursor-ns-resize" onMouseDown={onMouseDown}>
        <svg
          role="img"
          aria-label={`${label} knob`}
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
        >
          {/* Tick marks */}
          {ticks.map((tick) => (
            <line
              key={tick.tickKey}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={
                tick.isLit
                  ? fillColor
                  : tick.isMajor
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.10)"
              }
              strokeWidth={tick.isMajor ? 2 : 1.2}
              strokeLinecap="round"
              style={
                tick.isLit
                  ? { filter: `drop-shadow(0 0 2px ${fillColor})` }
                  : undefined
              }
            />
          ))}

          {/* Arc track */}
          <path
            d={arcPath(startAngle, endAngle, r)}
            fill="none"
            stroke={trackColor}
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Arc fill */}
          {pct > 0 && (
            <path
              d={arcPath(startAngle, angle, r)}
              fill="none"
              stroke={fillColor}
              strokeWidth="5"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${fillColor})` }}
            />
          )}

          {/* Knob body — metallic radial gradient */}
          <defs>
            <radialGradient id={`kg-${label}`} cx="38%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#565e68" />
              <stop offset="45%" stopColor="#363d45" />
              <stop offset="100%" stopColor="#1c2028" />
            </radialGradient>
            <radialGradient id={`kg-shine-${label}`} cx="38%" cy="28%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r - 2}
            fill="none"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="2"
          />
          {/* Body */}
          <circle
            cx={cx}
            cy={cy}
            r={r - 4}
            fill={`url(#kg-${label})`}
            stroke="rgba(80,90,100,0.8)"
            strokeWidth="1"
          />
          {/* Shine overlay */}
          <circle cx={cx} cy={cy} r={r - 4} fill={`url(#kg-shine-${label})`} />
          {/* Center accent ring */}
          <circle
            cx={cx}
            cy={cy}
            r={size === "lg" ? 10 : 7}
            fill="#1a1f25"
            stroke={fillOklch}
            strokeWidth="1"
          />
          {/* Indicator line */}
          <line
            x1={cx}
            y1={cy}
            x2={indicatorX}
            y2={indicatorY}
            stroke={fillColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 3px ${fillColor})` }}
          />
          {/* Indicator tip dot */}
          <circle
            cx={indicatorX}
            cy={indicatorY}
            r={3}
            fill={fillColor}
            style={{ filter: `drop-shadow(0 0 4px ${fillColor})` }}
          />
        </svg>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="w-5 h-5 rounded text-xs panel-inset flex items-center justify-center hover:text-amber-300 transition-colors"
          style={{ color: "oklch(0.60 0.01 240)" }}
          onClick={() => onChange(clamp(value - 1, min, max))}
        >
          −
        </button>
        <span
          className="font-lcd text-xs min-w-[2.5ch] text-center"
          style={{ color: fillOklch }}
        >
          {value > 0 && min < 0 ? `+${value}` : value}
        </span>
        <button
          type="button"
          className="w-5 h-5 rounded text-xs panel-inset flex items-center justify-center hover:text-amber-300 transition-colors"
          style={{ color: "oklch(0.60 0.01 240)" }}
          onClick={() => onChange(clamp(value + 1, min, max))}
        >
          +
        </button>
      </div>
      <span
        className="text-[10px] font-brand tracking-widest"
        style={{ color: "oklch(0.50 0.01 240)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Channel Fader ─────────────────────────────────────────────────────────────
interface FaderProps {
  channel: Channel;
  trim: number;
  master: number;
  onTrimChange: (v: number) => void;
}

function ChannelFader({ channel, trim, master, onTrimChange }: FaderProps) {
  const level = finalLevel(master, trim);
  const levelPct = level / 79;
  const trackH = 130;
  const handleH = 16;

  // Trim position: trim=+15 → top, trim=-15 → bottom
  const trimPct = (trim - -15) / 30; // 0 (bottom) → 1 (top)
  const handleTop = (1 - trimPct) * (trackH - handleH);

  const trimLabel = trim === 0 ? "0dB" : trim > 0 ? `+${trim}dB` : `${trim}dB`;
  const trimColor =
    trim > 0
      ? "oklch(0.75 0.15 65)"
      : trim < 0
        ? "oklch(0.65 0.15 25)"
        : "oklch(0.55 0.01 240)";

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="text-[10px] font-brand tracking-widest"
        style={{ color: "oklch(0.80 0.12 195)" }}
      >
        {channel}
      </span>

      {/* Fader track + handle */}
      <div
        className="relative flex flex-col items-center"
        style={{ height: trackH + handleH, width: 28 }}
      >
        {/* Track */}
        <div
          className="fader-track absolute"
          style={{
            height: trackH,
            width: 10,
            top: handleH / 2,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {/* Fill (from bottom up to level) */}
          <div
            className="fader-fill absolute bottom-0 left-0 right-0 rounded"
            style={{ height: `${levelPct * 100}%` }}
          />
          {/* Tick lines on track */}
          {[0.25, 0.5, 0.75].map((p) => (
            <div
              key={p}
              className="absolute left-0 right-0"
              style={{
                top: `${(1 - p) * 100}%`,
                height: 1,
                background: "rgba(255,255,255,0.06)",
              }}
            />
          ))}
        </div>

        {/* Chunky ridged handle */}
        <div
          className="fader-handle absolute"
          style={{
            top: handleTop,
            left: "50%",
            transform: "translateX(-50%)",
            width: 28,
            height: handleH,
          }}
        />

        {/* Invisible range input for interaction */}
        <input
          type="range"
          min={-15}
          max={15}
          value={trim}
          onChange={(e) => onTrimChange(Number(e.target.value))}
          className="absolute opacity-0 cursor-pointer"
          style={{
            writingMode: "vertical-lr" as const,
            direction: "rtl" as const,
            height: trackH + handleH,
            width: 28,
            left: 0,
            top: 0,
          }}
        />
      </div>

      {/* Trim pill badge */}
      <div
        className="font-lcd text-[10px] px-2 py-0.5 rounded-full"
        style={{
          color: trimColor,
          background: "rgba(0,0,0,0.4)",
          border: `1px solid ${trimColor}`,
          boxShadow:
            trim !== 0
              ? `0 0 6px ${trimColor.replace("oklch", "oklch")} / 0.4)`
              : undefined,
          minWidth: "3.5ch",
          textAlign: "center",
        }}
      >
        {trimLabel}
      </div>

      {/* Final level readout */}
      <div
        className="font-lcd text-xs"
        style={{ color: "oklch(0.80 0.12 195)" }}
      >
        {String(level).padStart(2, "0")}
      </div>
    </div>
  );
}

// ── LCD Display ───────────────────────────────────────────────────────────────
function LcdDisplay({
  mode,
  volume,
  mute,
  standby,
}: { mode: ControlMode; volume: number; mute: boolean; standby: boolean }) {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(t);
  }, []);

  const modeLabels: Record<ControlMode, string> = {
    MASTER: "MASTER VOL",
    FRONT: "FRONT TRIM",
    SURR: "SURR TRIM ",
    CENTER: "CENTR TRIM",
    SUB: "SUB  TRIM ",
    GAIN: "INPUT GAIN",
    BASS: "BASS  EQ  ",
    TREBLE: "TREBLE EQ ",
  };

  return (
    <div
      className="panel-inset rounded-lg p-4 w-full"
      style={{
        background: "oklch(var(--lcd-bg))",
        minHeight: 90,
        /* Extra bloom around the LCD panel */
        boxShadow:
          "inset 0 3px 12px rgba(0,0,0,0.95), inset 0 1px 3px rgba(0,0,0,0.8), inset 2px 0 6px rgba(0,0,0,0.4), inset -2px 0 6px rgba(0,0,0,0.4), 0 0 24px rgba(53,199,214,0.08), 0 0 1px rgba(53,199,214,0.15)",
      }}
    >
      <div className="flex items-center justify-between h-full">
        {/* Left: mode label */}
        <div className="flex flex-col gap-1">
          <div
            className="font-lcd text-[9px] tracking-widest"
            style={{ color: "oklch(0.38 0.06 65)" }}
          >
            MODE
          </div>
          <div
            className="font-lcd text-sm tracking-wider"
            style={{
              color: "oklch(var(--lcd-amber))",
              textShadow:
                "0 0 8px oklch(0.75 0.15 65 / 0.7), 0 0 16px oklch(0.75 0.15 65 / 0.3)",
            }}
          >
            {modeLabels[mode]}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {mute && (
              <span
                className="font-lcd text-[9px] px-1.5 py-0.5 rounded"
                style={{
                  color: "oklch(0.75 0.18 25)",
                  background: "oklch(0.20 0.06 25 / 0.35)",
                  border: "1px solid oklch(0.55 0.15 25 / 0.6)",
                  textShadow: "0 0 6px oklch(0.70 0.18 25 / 0.8)",
                }}
              >
                ✕ MUTE
              </span>
            )}
            {standby && blink && (
              <span
                className="font-lcd text-[9px] px-1.5 py-0.5 rounded"
                style={{
                  color: "oklch(0.55 0.01 240)",
                  background: "oklch(0.18 0.01 240 / 0.5)",
                  border: "1px solid oklch(0.32 0.01 240 / 0.5)",
                }}
              >
                STBY
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 60,
            background:
              "linear-gradient(to bottom, transparent, oklch(0.28 0.04 160), transparent)",
          }}
        />

        {/* Right: big volume digits */}
        <div className="flex flex-col items-center">
          <div
            className="font-lcd text-[9px] tracking-widest mb-1"
            style={{ color: "oklch(0.35 0.07 195)" }}
          >
            VOL
          </div>
          <div
            className="font-lcd leading-none"
            style={{
              fontSize: 52,
              fontWeight: 400,
              color: mute ? "oklch(0.30 0.01 240)" : "oklch(var(--lcd-cyan))",
              textShadow: mute
                ? "none"
                : "0 0 14px oklch(0.82 0.13 195 / 0.8), 0 0 30px oklch(0.80 0.12 195 / 0.4), 0 0 50px oklch(0.80 0.12 195 / 0.15)",
              transition: "color 0.2s, text-shadow 0.2s",
              letterSpacing: "0.05em",
            }}
          >
            {String(volume).padStart(2, "0")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Input Selector Button ─────────────────────────────────────────────────────
const INPUT_SOURCES: InputSource[] = [
  "DVD",
  "USB",
  "AUX1",
  "AUX2",
  "AUX3",
  "FT:AUX",
  "FT:OPT",
  "FT:COAX",
  "FT:HDMI",
];

function inputIcon(src: InputSource) {
  if (src === "DVD") return <Tv size={10} />;
  if (src === "USB") return <Usb size={10} />;
  if (src.startsWith("FT:")) return <Radio size={10} />;
  return <Music size={10} />;
}

// ── Arduino Code Panel ──────────────────────────────────────────────────────
const ARDUINO_CODE = `/*
 * Ultra Digital 5.1 Home Theater Remote Kit
 * Target: Arduino UNO (ATmega328P)
 * Audio Processor: FR6311
 * Display: HD44780 16x2 (parallel, 4-bit mode)
 * IR: IRremote v2.0, NEC 32-bit protocol
 * Encoder: Rotary encoder on INT0/INT1
 * Input Selector: FT003 module
 *
 * Channel Layout: FL, FR, SL, SR, CENTER, SUB
 * Master Volume: 0-79
 * Channel Trim:  -15 to +15
 */

#include <IRremote.h>
#include <LiquidCrystal.h>
#include <EEPROM.h>

// ── Pin Definitions ──────────────────────────────────────────────────────────
#define IR_RECV_PIN     2
#define ENC_A           3
#define ENC_B           4
#define LCD_RS          8
#define LCD_EN          9
#define LCD_D4          10
#define LCD_D5          11
#define LCD_D6          12
#define LCD_D7          13
#define MUTE_LED        5
#define STANDBY_LED     6
#define FR6311_CLK      A0
#define FR6311_DATA     A1
#define FR6311_CS       A2
#define FT003_S0        A3
#define FT003_S1        A4
#define FT003_S2        A5

// ── IR Remote Hex Map ────────────────────────────────────────────────────────
#define IR_VOL_UP       0x20DF40BF
#define IR_VOL_DOWN     0x20DFC03F
#define IR_MUTE         0x20DF906F
#define IR_STANDBY      0x20DF10EF
#define IR_DVD          0x20DF00FF
#define IR_USB          0x20DF807F
#define IR_AUX1         0x20DF8877
#define IR_AUX2         0x20DF48B7
#define IR_AUX3         0x20DFC837
#define IR_FT_AUX       0x20DF28D7
#define IR_FT_OPT       0x20DFA857
#define IR_FT_COAX      0x20DF6897
#define IR_FT_HDMI      0x20DFE817
#define IR_MODE_STEREO  0x20DF18E7
#define IR_MODE_MOVIE   0x20DF9867
#define IR_MODE_MUSIC   0x20DF58A7
#define IR_MODE_GAME    0x20DFD827
#define IR_CH_NEXT      0x20DF30CF
#define IR_TRIM_UP      0x20DFB04F
#define IR_TRIM_DOWN    0x20DF708F

// ── EEPROM Addresses ─────────────────────────────────────────────────────────
#define EEPROM_MASTER   0
#define EEPROM_FL       1
#define EEPROM_FR       2
#define EEPROM_SL       3
#define EEPROM_SR       4
#define EEPROM_CENTER   5
#define EEPROM_SUB      6
#define EEPROM_BASS     7
#define EEPROM_TREBLE   8
#define EEPROM_GAIN     9
#define EEPROM_INPUT    10
#define EEPROM_SURR     11

// ── Channel Enum ─────────────────────────────────────────────────────────────
enum Channel { CH_FL=0, CH_FR, CH_SL, CH_SR, CH_CENTER, CH_SUB, CH_COUNT };
const char* CH_NAMES[] = { "FL", "FR", "SL", "SR", "CTR", "SUB" };

enum SurroundMode { MODE_STEREO=0, MODE_MOVIE, MODE_MUSIC, MODE_GAME };
const char* MODE_NAMES[] = { "STEREO", "MOVIE ", "MUSIC ", "GAME  " };

enum InputSource { SRC_DVD=0, SRC_USB, SRC_AUX1, SRC_AUX2, SRC_AUX3,
                   SRC_FT_AUX, SRC_FT_OPT, SRC_FT_COAX, SRC_FT_HDMI, SRC_COUNT };
const char* SRC_NAMES[] = { "DVD","USB","AUX1","AUX2","AUX3",
                              "FT:AUX","FT:OPT","FT:COAX","FT:HDMI" };

// ── State ────────────────────────────────────────────────────────────────────
uint8_t       masterVol   = 40;
int8_t        chTrim[CH_COUNT] = {0};
uint8_t       bass        = 7;   // FR6311: 0-14, 7=flat
uint8_t       treble      = 7;
uint8_t       gain        = 40;
bool          muted       = false;
bool          standby     = false;
SurroundMode  surroundMode = MODE_MOVIE;
InputSource   inputSrc    = SRC_DVD;
Channel       activeChannel = CH_FL;

// ── Hardware ─────────────────────────────────────────────────────────────────
IRrecv        irRecv(IR_RECV_PIN);
decode_results irData;
LiquidCrystal lcd(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);

volatile int8_t encoderDelta = 0;
uint8_t encA_last = 0;

// ── FR6311 SPI ───────────────────────────────────────────────────────────────
void fr6311Write(uint8_t reg, uint8_t val) {
  digitalWrite(FR6311_CS, LOW);
  shiftOut(FR6311_DATA, FR6311_CLK, MSBFIRST, reg);
  shiftOut(FR6311_DATA, FR6311_CLK, MSBFIRST, val);
  digitalWrite(FR6311_CS, HIGH);
}

void applyAllLevels() {
  uint8_t applyVol = muted ? 0 : masterVol;
  fr6311Write(0x00, applyVol);                       // master
  for (uint8_t i = 0; i < CH_COUNT; i++) {
    int16_t lv = constrain((int16_t)masterVol + chTrim[i], 0, 79);
    fr6311Write(0x01 + i, muted ? 0 : (uint8_t)lv);
  }
  fr6311Write(0x07, bass);
  fr6311Write(0x08, treble);
  fr6311Write(0x09, gain);
}

// ── FT003 Input Selector ─────────────────────────────────────────────────────
void applyInput() {
  uint8_t ftSrc = 0;
  switch (inputSrc) {
    case SRC_FT_AUX:  ftSrc = 0; break;
    case SRC_FT_OPT:  ftSrc = 1; break;
    case SRC_FT_COAX: ftSrc = 2; break;
    case SRC_FT_HDMI: ftSrc = 3; break;
    default:          ftSrc = 0; break;
  }
  digitalWrite(FT003_S0, ftSrc & 0x01);
  digitalWrite(FT003_S1, (ftSrc >> 1) & 0x01);
  digitalWrite(FT003_S2, (ftSrc >> 2) & 0x01);
}

// ── LCD Update ───────────────────────────────────────────────────────────────
void updateLCD() {
  lcd.clear();
  if (standby) {
    lcd.setCursor(4, 0); lcd.print(F("STANDBY"));
    return;
  }
  lcd.setCursor(0, 0);
  lcd.print(SRC_NAMES[inputSrc]);
  lcd.setCursor(9, 0);
  lcd.print(MODE_NAMES[surroundMode]);

  lcd.setCursor(0, 1);
  if (muted) {
    lcd.print(F("   ** MUTED **  "));
  } else {
    lcd.print(CH_NAMES[activeChannel]);
    lcd.print(F(" TRIM:"));
    int8_t t = chTrim[activeChannel];
    if (t >= 0) lcd.print('+');
    lcd.print(t);
    lcd.setCursor(11, 1);
    lcd.print(F("V:"));
    if (masterVol < 10) lcd.print('0');
    lcd.print(masterVol);
  }
}

// ── EEPROM Persistence ───────────────────────────────────────────────────────
void saveState() {
  EEPROM.write(EEPROM_MASTER, masterVol);
  for (uint8_t i = 0; i < CH_COUNT; i++)
    EEPROM.write(EEPROM_FL + i, (uint8_t)(chTrim[i] + 15));
  EEPROM.write(EEPROM_BASS,   bass);
  EEPROM.write(EEPROM_TREBLE, treble);
  EEPROM.write(EEPROM_GAIN,   gain);
  EEPROM.write(EEPROM_INPUT,  (uint8_t)inputSrc);
  EEPROM.write(EEPROM_SURR,   (uint8_t)surroundMode);
}

void loadState() {
  masterVol    = constrain(EEPROM.read(EEPROM_MASTER), 0, 79);
  for (uint8_t i = 0; i < CH_COUNT; i++)
    chTrim[i]  = (int8_t)EEPROM.read(EEPROM_FL + i) - 15;
  bass         = constrain(EEPROM.read(EEPROM_BASS),   0, 14);
  treble       = constrain(EEPROM.read(EEPROM_TREBLE), 0, 14);
  gain         = constrain(EEPROM.read(EEPROM_GAIN),   0, 79);
  inputSrc     = (InputSource)constrain(EEPROM.read(EEPROM_INPUT), 0, SRC_COUNT-1);
  surroundMode = (SurroundMode)constrain(EEPROM.read(EEPROM_SURR), 0, 3);
}

// ── Encoder ISR ──────────────────────────────────────────────────────────────
void encoderISR() {
  uint8_t a = digitalRead(ENC_A);
  uint8_t b = digitalRead(ENC_B);
  if (a != encA_last) {
    encoderDelta += (a == b) ? 1 : -1;
    encA_last = a;
  }
}

// ── IR Handler ───────────────────────────────────────────────────────────────
void handleIR(uint32_t code) {
  switch (code) {
    case IR_VOL_UP:
      if (!standby) masterVol = constrain(masterVol + 1, 0, 79);
      break;
    case IR_VOL_DOWN:
      if (!standby) masterVol = constrain(masterVol - 1, 0, 79);
      break;
    case IR_MUTE:
      muted = !muted;
      digitalWrite(MUTE_LED, muted ? HIGH : LOW);
      break;
    case IR_STANDBY:
      standby = !standby;
      digitalWrite(STANDBY_LED, standby ? HIGH : LOW);
      if (standby) fr6311Write(0x00, 0);
      break;
    case IR_DVD:      inputSrc = SRC_DVD;     applyInput(); break;
    case IR_USB:      inputSrc = SRC_USB;     applyInput(); break;
    case IR_AUX1:     inputSrc = SRC_AUX1;    applyInput(); break;
    case IR_AUX2:     inputSrc = SRC_AUX2;    applyInput(); break;
    case IR_AUX3:     inputSrc = SRC_AUX3;    applyInput(); break;
    case IR_FT_AUX:   inputSrc = SRC_FT_AUX;  applyInput(); break;
    case IR_FT_OPT:   inputSrc = SRC_FT_OPT;  applyInput(); break;
    case IR_FT_COAX:  inputSrc = SRC_FT_COAX; applyInput(); break;
    case IR_FT_HDMI:  inputSrc = SRC_FT_HDMI; applyInput(); break;
    case IR_MODE_STEREO: surroundMode = MODE_STEREO; break;
    case IR_MODE_MOVIE:  surroundMode = MODE_MOVIE;  break;
    case IR_MODE_MUSIC:  surroundMode = MODE_MUSIC;  break;
    case IR_MODE_GAME:   surroundMode = MODE_GAME;   break;
    case IR_CH_NEXT:
      activeChannel = (Channel)((activeChannel + 1) % CH_COUNT);
      break;
    case IR_TRIM_UP:
      chTrim[activeChannel] = constrain(chTrim[activeChannel] + 1, -15, 15);
      break;
    case IR_TRIM_DOWN:
      chTrim[activeChannel] = constrain(chTrim[activeChannel] - 1, -15, 15);
      break;
  }
  applyAllLevels();
  updateLCD();
  saveState();
}

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_A), encoderISR, CHANGE);
  encA_last = digitalRead(ENC_A);

  pinMode(MUTE_LED,    OUTPUT);
  pinMode(STANDBY_LED, OUTPUT);

  pinMode(FR6311_CLK,  OUTPUT);
  pinMode(FR6311_DATA, OUTPUT);
  pinMode(FR6311_CS,   OUTPUT);
  digitalWrite(FR6311_CS, HIGH);

  pinMode(FT003_S0, OUTPUT);
  pinMode(FT003_S1, OUTPUT);
  pinMode(FT003_S2, OUTPUT);

  lcd.begin(16, 2);
  lcd.print(F("Ultra Digital 5.1"));
  delay(1200);

  loadState();
  applyAllLevels();
  applyInput();
  updateLCD();

  irRecv.enableIRIn();
}

// ── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  if (irRecv.decode(&irData)) {
    if (irData.decode_type == NEC) {
      handleIR(irData.value);
    }
    irRecv.resume();
  }

  if (encoderDelta != 0) {
    noInterrupts();
    int8_t delta = encoderDelta;
    encoderDelta = 0;
    interrupts();

    if (!standby) {
      masterVol = constrain((int16_t)masterVol + delta, 0, 79);
      applyAllLevels();
      updateLCD();
      saveState();
    }
  }
}`;

function ArduinoCodePanel() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ARDUINO_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto" data-ocid="arduino.panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2
            className="font-brand text-xl tracking-widest"
            style={{
              color: "oklch(0.82 0.12 85)",
              textShadow: "0 0 8px oklch(0.82 0.12 85 / 0.4)",
            }}
          >
            ARDUINO FIRMWARE
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: "oklch(0.6 0.05 220)" }}
          >
            Ultra Digital 5.1 · ATmega328P · Copy and paste into Arduino IDE
          </p>
        </div>
        <button
          type="button"
          data-ocid="arduino.copy_button"
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-mono font-semibold transition-all duration-150 select-none"
          style={{
            background: copied
              ? "oklch(0.38 0.12 145 / 0.9)"
              : "oklch(0.28 0.08 85 / 0.9)",
            color: copied ? "oklch(0.85 0.18 145)" : "oklch(0.82 0.12 85)",
            border: copied
              ? "1px solid oklch(0.55 0.18 145 / 0.7)"
              : "1px solid oklch(0.55 0.12 85 / 0.7)",
            boxShadow: copied
              ? "0 0 12px oklch(0.55 0.18 145 / 0.35)"
              : "0 0 8px oklch(0.55 0.12 85 / 0.25)",
          }}
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy All
            </>
          )}
        </button>
      </div>

      {/* Code block */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "oklch(0.10 0.02 220)",
          border: "1px solid oklch(0.22 0.04 220)",
          boxShadow:
            "inset 0 2px 16px oklch(0.05 0.01 220 / 0.8), 0 4px 24px oklch(0.05 0.01 220 / 0.5)",
        }}
      >
        {/* Terminal title bar */}
        <div
          className="flex items-center gap-2 px-4 py-2 border-b"
          style={{
            background: "oklch(0.13 0.02 220)",
            borderColor: "oklch(0.22 0.04 220)",
          }}
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: "oklch(0.55 0.18 25)" }}
          />
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: "oklch(0.65 0.15 85)" }}
          />
          <span
            className="w-3 h-3 rounded-full"
            style={{ background: "oklch(0.55 0.18 145)" }}
          />
          <span
            className="ml-3 text-xs font-mono"
            style={{ color: "oklch(0.5 0.04 220)" }}
          >
            ultra_digital_51.ino
          </span>
        </div>

        {/* Scrollable code */}
        <pre
          className="overflow-auto p-5 text-xs leading-relaxed font-mono"
          style={{
            maxHeight: "60vh",
            color: "oklch(0.78 0.10 85)",
            tabSize: 2,
          }}
        >
          <code>{ARDUINO_CODE}</code>
        </pre>
      </div>
    </div>
  );
}

// ── Preview Panel ────────────────────────────────────────────────────────────
interface PreviewPanelProps {
  state: AppState;
}

function PreviewPanel({ state }: PreviewPanelProps) {
  const {
    masterVolume,
    channelTrims,
    inputSource,
    bass,
    treble,
    gain,
    mute,
    standby,
    surroundMode,
    speakerMode,
    usbBoard,
  } = state;
  const channels: Channel[] = ["FL", "FR", "SL", "SR", "CENTER", "SUB"];

  const eqBar = (value: number, min: number, max: number) => {
    const pct = ((value - min) / (max - min)) * 100;
    return pct;
  };

  return (
    <div
      className="w-full max-w-5xl flex flex-col gap-5"
      data-ocid="preview.panel"
    >
      {/* Title */}
      <h1
        className="font-brand text-3xl tracking-[0.35em] mb-2 select-none"
        style={{
          color: "rgba(20,24,30,0.85)",
          textShadow:
            "0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.5), 0 -1px 0 rgba(0,0,0,0.3)",
        }}
      >
        SYSTEM PREVIEW
      </h1>

      {/* Preview shell — same console aesthetic */}
      <div
        style={{
          padding: "3px",
          background:
            "linear-gradient(145deg, #4a525c 0%, #363c44 40%, #282d34 60%, #3a4048 100%)",
          borderRadius: 14,
        }}
      >
        <div
          className="rounded-xl p-5 flex flex-col gap-5"
          style={{
            background:
              "linear-gradient(180deg, #2e3440 0%, #262c34 60%, #22272e 100%)",
            borderRadius: 12,
          }}
        >
          {/* ── Row 1: System Status + Master Volume ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Status Card */}
            <div
              className="panel-inset rounded-lg p-4 flex flex-col gap-3"
              data-ocid="preview.card"
            >
              <h2
                className="font-brand text-[10px] tracking-[0.3em]"
                style={{ color: "oklch(0.50 0.01 240)" }}
              >
                SYSTEM STATUS
              </h2>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  { label: "INPUT", value: inputSource },
                  { label: "SPEAKERS", value: speakerMode },
                  { label: "SURROUND", value: surroundMode },
                  { label: "USB BOARD", value: usbBoard },
                  {
                    label: "MUTE",
                    value: mute ? "ON" : "OFF",
                    accent: mute
                      ? "oklch(0.55 0.18 25)"
                      : "oklch(0.60 0.12 145)",
                  },
                  {
                    label: "STANDBY",
                    value: standby ? "ON" : "OFF",
                    accent: standby
                      ? "oklch(0.55 0.18 25)"
                      : "oklch(0.60 0.12 145)",
                  },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span
                      className="font-brand text-[9px] tracking-[0.25em]"
                      style={{ color: "oklch(0.40 0.01 240)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="font-brand text-sm tracking-widest"
                      style={{
                        color: accent ?? "oklch(0.80 0.12 195)",
                        textShadow: accent
                          ? `0 0 8px ${accent}`
                          : "0 0 8px oklch(0.80 0.12 195 / 0.4)",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Master Volume Display */}
            <div
              className="panel-inset rounded-lg p-4 flex flex-col items-center justify-center gap-3"
              data-ocid="preview.card"
            >
              <h2
                className="font-brand text-[10px] tracking-[0.3em] self-start"
                style={{ color: "oklch(0.50 0.01 240)" }}
              >
                MASTER VOLUME
              </h2>
              <div
                className="font-lcd text-7xl leading-none tracking-wider"
                style={{
                  color: "oklch(0.82 0.14 195)",
                  textShadow:
                    "0 0 20px oklch(0.82 0.14 195 / 0.7), 0 0 40px oklch(0.82 0.14 195 / 0.3)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(masterVolume).padStart(2, "0")}
              </div>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{
                  height: 6,
                  background: "oklch(0.18 0.01 240)",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(masterVolume / 79) * 100}%`,
                    background:
                      "linear-gradient(to right, oklch(0.55 0.14 195), oklch(0.82 0.14 195))",
                    boxShadow: "0 0 6px oklch(0.82 0.14 195 / 0.5)",
                  }}
                />
              </div>
              <span
                className="font-brand text-[9px] tracking-widest"
                style={{ color: "oklch(0.40 0.01 240)" }}
              >
                RANGE 0–79
              </span>
            </div>
          </div>

          {/* ── Row 2: Channel Levels ── */}
          <div
            className="panel-inset rounded-lg p-4 flex flex-col gap-3"
            data-ocid="preview.card"
          >
            <h2
              className="font-brand text-[10px] tracking-[0.3em]"
              style={{ color: "oklch(0.50 0.01 240)" }}
            >
              CHANNEL LEVELS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {channels.map((ch, idx) => {
                const trim = channelTrims[ch];
                const level = finalLevel(masterVolume, trim);
                const pct = (level / 79) * 100;
                return (
                  <div
                    key={ch}
                    className="flex flex-col gap-1"
                    data-ocid={`preview.item.${idx + 1}`}
                  >
                    <div className="flex justify-between items-baseline">
                      <span
                        className="font-brand text-xs tracking-widest"
                        style={{ color: "oklch(0.75 0.15 65)" }}
                      >
                        {ch}
                      </span>
                      <span
                        className="font-lcd text-xs"
                        style={{ color: "oklch(0.60 0.01 240)" }}
                      >
                        TRIM {trim >= 0 ? "+" : ""}
                        {trim} &nbsp;→&nbsp; LVL {level}
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{
                        height: 5,
                        background: "oklch(0.18 0.01 240)",
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct > 80
                              ? "linear-gradient(to right, oklch(0.55 0.15 65), oklch(0.75 0.18 25))"
                              : "linear-gradient(to right, oklch(0.45 0.12 65), oklch(0.75 0.15 65))",
                          boxShadow: "0 0 4px oklch(0.75 0.15 65 / 0.4)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Row 3: EQ Summary ── */}
          <div
            className="panel-inset rounded-lg p-4 flex flex-col gap-3"
            data-ocid="preview.card"
          >
            <h2
              className="font-brand text-[10px] tracking-[0.3em]"
              style={{ color: "oklch(0.50 0.01 240)" }}
            >
              EQ SUMMARY
            </h2>
            <div className="flex flex-col gap-3">
              {[
                { label: "BASS", value: bass, min: -10, max: 10 },
                { label: "TREBLE", value: treble, min: -10, max: 10 },
                { label: "GAIN", value: gain, min: 0, max: 79 },
              ].map(({ label, value, min, max }) => (
                <div key={label} className="flex items-center gap-3">
                  <span
                    className="font-brand text-xs tracking-widest w-14 shrink-0"
                    style={{ color: "oklch(0.75 0.15 65)" }}
                  >
                    {label}
                  </span>
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{
                      height: 5,
                      background: "oklch(0.18 0.01 240)",
                      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${eqBar(value, min, max)}%`,
                        background:
                          "linear-gradient(to right, oklch(0.45 0.12 195), oklch(0.82 0.14 195))",
                        boxShadow: "0 0 4px oklch(0.82 0.14 195 / 0.4)",
                      }}
                    />
                  </div>
                  <span
                    className="font-lcd text-xs w-8 text-right shrink-0"
                    style={{ color: "oklch(0.80 0.12 195)" }}
                  >
                    {value >= 0 && label !== "GAIN" ? "+" : ""}
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Read Only Banner ── */}
          <div
            className="flex items-center justify-center py-2 rounded-lg"
            style={{
              background: "oklch(0.14 0.01 240)",
              border: "1px solid oklch(0.25 0.01 240)",
            }}
            data-ocid="preview.panel"
          >
            <span
              className="font-brand text-[10px] tracking-[0.4em]"
              style={{
                color: "oklch(0.40 0.01 240)",
                textShadow: "0 0 8px oklch(0.50 0.01 240 / 0.3)",
              }}
            >
              ◈ PREVIEW — READ ONLY — SETTINGS ARE LIVE ◈
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
const CHANNELS: Channel[] = ["FL", "FR", "SL", "SR", "CENTER", "SUB"];
const MODES: ControlMode[] = [
  "MASTER",
  "FRONT",
  "SURR",
  "CENTER",
  "SUB",
  "GAIN",
  "BASS",
  "TREBLE",
];
const SURROUND_MODES: SurroundMode[] = ["STEREO", "MOVIE", "MUSIC", "GAME"];
const NAV_TABS = [
  "Dashboard",
  "Devices",
  "Presets",
  "Settings",
  "Support",
  "Arduino Code",
  "Preview",
];

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [activeTab, setActiveTab] = useState("Dashboard");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const set = useCallback(
    <K extends keyof AppState>(key: K, value: AppState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setTrim = useCallback((ch: Channel, v: number) => {
    setState((prev) => ({
      ...prev,
      channelTrims: { ...prev.channelTrims, [ch]: clamp(v, -15, 15) },
    }));
  }, []);

  const {
    masterVolume,
    channelTrims,
    inputSource,
    bass,
    treble,
    gain,
    mute,
    standby,
    surroundMode,
    speakerMode,
    usbBoard,
    currentMode,
  } = state;

  return (
    <div className="min-h-screen flex flex-col" data-ocid="app.page">
      {/* ── Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14"
        style={{
          background: "linear-gradient(180deg, #191e24 0%, #141820 100%)",
          borderBottom: "1px solid rgba(80,90,110,0.4)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="standby.toggle"
            onClick={() => set("standby", !standby)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all amber-pulse",
              standby
                ? "border-[oklch(0.40_0.06_65)] opacity-40"
                : "border-[oklch(0.75_0.15_65)]",
            )}
            style={{
              background: standby
                ? "oklch(0.15 0.01 240)"
                : "radial-gradient(circle, oklch(0.25 0.08 65), oklch(0.14 0.03 65))",
            }}
          >
            <Power
              size={16}
              style={{
                color: standby ? "oklch(0.35 0.05 65)" : "oklch(0.85 0.15 65)",
              }}
            />
          </button>
          <span
            className="font-brand text-base tracking-[0.2em]"
            style={{
              color: "oklch(0.85 0.12 65)",
              textShadow: "0 0 12px oklch(0.75 0.15 65 / 0.5)",
            }}
          >
            ULTRA DIGITAL 5.1
          </span>
        </div>

        {/* Nav */}
        <nav
          className="hidden md:flex items-center gap-1"
          data-ocid="nav.panel"
        >
          {NAV_TABS.map((tab) => (
            <button
              type="button"
              key={tab}
              data-ocid="nav.tab"
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 text-sm font-brand tracking-wider transition-colors relative"
              style={{
                color:
                  activeTab === tab
                    ? "oklch(0.82 0.14 65)"
                    : "oklch(0.50 0.01 240)",
              }}
            >
              {tab}
              {activeTab === tab && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, transparent, oklch(0.75 0.15 65), transparent)",
                    boxShadow: "0 0 8px oklch(0.75 0.15 65)",
                  }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          <Badge
            className="font-brand text-[10px] tracking-widest border"
            style={{
              background: "oklch(0.18 0.01 240)",
              borderColor: "oklch(0.30 0.01 240)",
              color: "oklch(0.80 0.12 195)",
            }}
          >
            {speakerMode}
          </Badge>
          <Badge
            className="font-brand text-[10px] tracking-widest border"
            style={{
              background: "oklch(0.18 0.01 240)",
              borderColor: "oklch(0.30 0.01 240)",
              color: "oklch(0.70 0.12 65)",
            }}
          >
            {inputSource}
          </Badge>
        </div>
      </header>

      {/* ── Main ── */}
      <main
        className="flex-1 flex flex-col items-center pt-20 pb-12 px-4"
        data-ocid="main.panel"
      >
        {activeTab === "Arduino Code" ? (
          <ArduinoCodePanel />
        ) : activeTab === "Preview" ? (
          <PreviewPanel state={state} />
        ) : (
          <>
            {/* Page title — embossed / drop-shadow */}
            <h1
              className="font-brand text-3xl tracking-[0.35em] mb-8 select-none"
              style={{
                color: "rgba(20,24,30,0.85)",
                textShadow:
                  "0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.5), 0 -1px 0 rgba(0,0,0,0.3)",
                letterSpacing: "0.35em",
              }}
            >
              SYSTEM CONTROL
            </h1>

            {/* Console card — skeuomorphic shell */}
            <div
              className="console-shell w-full max-w-5xl overflow-hidden"
              data-ocid="console.panel"
            >
              {/* Outer bevel rim */}
              <div
                style={{
                  padding: "3px",
                  background:
                    "linear-gradient(145deg, #4a525c 0%, #363c44 40%, #282d34 60%, #3a4048 100%)",
                  borderRadius: 14,
                }}
              >
                {/* Inner console surface */}
                <div
                  className="rounded-xl p-5 flex flex-col gap-5"
                  style={{
                    background:
                      "linear-gradient(180deg, #2e3440 0%, #262c34 60%, #22272e 100%)",
                    borderRadius: 12,
                  }}
                >
                  {/* ── LCD + Controls row ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-4 items-start">
                    {/* LCD */}
                    <LcdDisplay
                      mode={currentMode}
                      volume={masterVolume}
                      mute={mute}
                      standby={standby}
                    />

                    {/* Master volume knob */}
                    <div
                      className="panel-bevel rounded-xl p-4 flex flex-col items-center gap-2"
                      style={{
                        minWidth: 148,
                      }}
                    >
                      <span
                        className="font-brand text-[10px] tracking-widest"
                        style={{ color: "oklch(0.45 0.01 240)" }}
                      >
                        MASTER VOL
                      </span>
                      <Knob
                        value={masterVolume}
                        min={0}
                        max={79}
                        onChange={(v) => set("masterVolume", v)}
                        label="VOL"
                        color="cyan"
                        size="lg"
                      />
                      <input
                        type="range"
                        min={0}
                        max={79}
                        value={masterVolume}
                        onChange={(e) =>
                          set("masterVolume", Number(e.target.value))
                        }
                        className="amber-slider w-28"
                        data-ocid="master.input"
                      />
                    </div>

                    {/* Input selector */}
                    <div
                      className="panel-bevel rounded-xl p-3 flex flex-col gap-1.5"
                      data-ocid="input.panel"
                    >
                      <span
                        className="font-brand text-[10px] tracking-widest mb-1 text-center"
                        style={{ color: "oklch(0.45 0.01 240)" }}
                      >
                        INPUT SOURCE
                      </span>
                      {INPUT_SOURCES.map((src) => {
                        const isActive = inputSource === src;
                        return (
                          <button
                            type="button"
                            key={src}
                            data-ocid="input.select"
                            onClick={() => set("inputSource", src)}
                            className={cn(
                              "px-3 py-1 rounded text-xs font-brand tracking-widest flex items-center gap-2 transition-all",
                              isActive ? "btn-input-active" : "btn-input",
                            )}
                            style={{
                              color: isActive
                                ? "oklch(0.82 0.14 65)"
                                : "oklch(0.55 0.01 240)",
                            }}
                          >
                            {/* LED dot */}
                            <span
                              className={cn("led-dot", isActive && "active")}
                            />
                            {inputIcon(src)}
                            {src}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── EQ Knobs ── */}
                  <div className="panel-bevel rounded-xl p-4">
                    <div
                      className="font-brand text-[10px] tracking-widest mb-4"
                      style={{ color: "oklch(0.40 0.01 240)" }}
                    >
                      EQUALIZER &amp; GAIN
                    </div>
                    <div className="flex items-end justify-around flex-wrap gap-6">
                      <Knob
                        value={bass}
                        min={-15}
                        max={15}
                        onChange={(v) => set("bass", v)}
                        label="BASS"
                        color="amber"
                      />
                      <Knob
                        value={treble}
                        min={-15}
                        max={15}
                        onChange={(v) => set("treble", v)}
                        label="TREBLE"
                        color="amber"
                      />
                      <Knob
                        value={gain}
                        min={0}
                        max={79}
                        onChange={(v) => set("gain", v)}
                        label="GAIN"
                        color="amber"
                      />

                      {/* USB Board selector */}
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className="text-[10px] font-brand tracking-widest mb-1"
                          style={{ color: "oklch(0.45 0.01 240)" }}
                        >
                          USB BOARD
                        </span>
                        {(["MP3", "RealPlay", "Wire"] as UsbBoard[]).map(
                          (b) => (
                            <button
                              type="button"
                              key={b}
                              data-ocid="usb_board.select"
                              onClick={() => set("usbBoard", b)}
                              className={cn(
                                "px-3 py-1 rounded text-[10px] font-brand tracking-wider transition-all w-full",
                                usbBoard === b
                                  ? "btn-input-active"
                                  : "btn-input",
                              )}
                              style={{
                                color:
                                  usbBoard === b
                                    ? "oklch(0.82 0.14 65)"
                                    : "oklch(0.50 0.01 240)",
                              }}
                            >
                              {b}
                            </button>
                          ),
                        )}
                      </div>

                      {/* Surround mode */}
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className="text-[10px] font-brand tracking-widest mb-1"
                          style={{ color: "oklch(0.45 0.01 240)" }}
                        >
                          SURROUND
                        </span>
                        {SURROUND_MODES.map((m) => (
                          <button
                            type="button"
                            key={m}
                            data-ocid="surround.select"
                            onClick={() => set("surroundMode", m)}
                            className="px-3 py-1 rounded text-[10px] font-brand tracking-wider border transition-all w-full"
                            style={{
                              background:
                                surroundMode === m
                                  ? "oklch(0.16 0.06 195 / 0.5)"
                                  : "linear-gradient(180deg, #3a4048, #2e3440)",
                              borderColor:
                                surroundMode === m
                                  ? "oklch(0.65 0.12 195)"
                                  : "rgba(80,90,110,0.4)",
                              color:
                                surroundMode === m
                                  ? "oklch(0.85 0.12 195)"
                                  : "oklch(0.50 0.01 240)",
                              boxShadow:
                                surroundMode === m
                                  ? "0 0 10px oklch(0.80 0.12 195 / 0.35), inset 0 1px 0 rgba(255,255,255,0.08)"
                                  : "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
                            }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Channel Faders ── */}
                  <div
                    className="panel-bevel rounded-xl p-4"
                    data-ocid="faders.panel"
                  >
                    {/* Mode tabs */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {MODES.map((m) => (
                        <button
                          type="button"
                          key={m}
                          data-ocid="mode.tab"
                          onClick={() => set("currentMode", m)}
                          className={cn(
                            "px-3 py-1 rounded text-[10px] font-brand tracking-widest transition-all",
                            currentMode === m ? "btn-amber" : "btn-input",
                          )}
                          style={{
                            color:
                              currentMode === m
                                ? "oklch(0.10 0.01 240)"
                                : "oklch(0.50 0.01 240)",
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <div
                      className="font-brand text-[10px] tracking-widest mb-4"
                      style={{ color: "oklch(0.40 0.01 240)" }}
                    >
                      CHANNEL TRIMS — FINAL LEVEL
                    </div>

                    <div className="grid grid-cols-6 gap-4 justify-items-center">
                      {CHANNELS.map((ch) => (
                        <ChannelFader
                          key={ch}
                          channel={ch}
                          trim={channelTrims[ch]}
                          master={masterVolume}
                          onTrimChange={(v) => setTrim(ch, v)}
                        />
                      ))}
                    </div>

                    {/* Level bar visualization */}
                    <div className="mt-4 grid grid-cols-6 gap-4">
                      {CHANNELS.map((ch) => {
                        const lvl = finalLevel(masterVolume, channelTrims[ch]);
                        return (
                          <div
                            key={ch}
                            className="flex flex-col gap-0.5"
                            data-ocid={`channel.item.${CHANNELS.indexOf(ch) + 1}`}
                          >
                            <div
                              className="h-2 rounded-full overflow-hidden"
                              style={{
                                background: "#0e1014",
                                boxShadow: "inset 0 1px 4px rgba(0,0,0,0.8)",
                              }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-200"
                                style={{
                                  width: `${(lvl / 79) * 100}%`,
                                  background:
                                    lvl > 65
                                      ? "oklch(0.65 0.18 25)"
                                      : "linear-gradient(to right, oklch(0.55 0.12 195), oklch(0.82 0.12 195))",
                                  boxShadow:
                                    "0 0 6px oklch(0.80 0.12 195 / 0.6)",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Action Buttons ── */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 panel-bevel rounded-xl p-4"
                    data-ocid="actions.panel"
                  >
                    <div className="flex flex-wrap gap-3">
                      {/* MUTE */}
                      <button
                        type="button"
                        data-ocid="mute.toggle"
                        onClick={() => set("mute", !mute)}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-5 py-2 rounded-lg font-brand tracking-widest text-sm transition-all",
                          mute ? "btn-amber" : "btn-input",
                        )}
                        style={{
                          color: mute
                            ? "oklch(0.10 0.01 240)"
                            : "oklch(0.50 0.01 240)",
                          minWidth: 80,
                          boxShadow: mute
                            ? "0 0 20px oklch(0.75 0.15 65 / 0.7), 0 0 40px oklch(0.75 0.15 65 / 0.3), inset 0 1px 0 rgba(255,255,255,0.3)"
                            : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {mute ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          MUTE
                        </div>
                        {mute && (
                          <span
                            className="text-[9px] font-lcd tracking-widest"
                            style={{
                              color: "oklch(0.12 0.01 240)",
                              opacity: 0.85,
                            }}
                          >
                            ● ACTIVE
                          </span>
                        )}
                      </button>

                      {/* STANDBY */}
                      <button
                        type="button"
                        data-ocid="standby.button"
                        onClick={() => set("standby", !standby)}
                        className={cn(
                          "flex items-center gap-2 px-5 py-2 rounded-lg font-brand tracking-widest text-sm transition-all",
                          standby ? "btn-amber" : "btn-input",
                        )}
                        style={{
                          color: standby
                            ? "oklch(0.10 0.01 240)"
                            : "oklch(0.50 0.01 240)",
                        }}
                      >
                        <Power size={16} />
                        STANDBY
                      </button>

                      {/* 2.1 / 5.1 */}
                      <button
                        type="button"
                        data-ocid="speaker_mode.toggle"
                        onClick={() =>
                          set(
                            "speakerMode",
                            speakerMode === "5.1" ? "2.1" : "5.1",
                          )
                        }
                        className="flex items-center gap-2 px-5 py-2 rounded-lg font-brand tracking-widest text-sm transition-all btn-input"
                        style={{
                          color: "oklch(0.80 0.12 195)",
                          borderColor: "oklch(0.40 0.08 195)",
                          boxShadow:
                            "0 0 8px oklch(0.80 0.12 195 / 0.2), 0 2px 4px rgba(0,0,0,0.4)",
                        }}
                      >
                        <Zap size={16} />
                        {speakerMode} MODE
                      </button>
                    </div>

                    {/* Surround / status */}
                    <div className="flex items-center gap-2">
                      <span
                        className="font-brand text-[10px] tracking-widest"
                        style={{ color: "oklch(0.40 0.01 240)" }}
                      >
                        EFFECT:
                      </span>
                      <Badge
                        className="font-brand tracking-widest border"
                        style={{
                          background: "oklch(0.16 0.06 195 / 0.4)",
                          borderColor: "oklch(0.50 0.10 195)",
                          color: "oklch(0.85 0.12 195)",
                          boxShadow: "0 0 8px oklch(0.80 0.12 195 / 0.3)",
                        }}
                      >
                        {surroundMode}
                      </Badge>
                      <Badge
                        className="font-brand tracking-widest border"
                        style={{
                          background: "oklch(0.14 0.01 240)",
                          borderColor: "oklch(0.28 0.01 240)",
                          color: "oklch(0.55 0.01 240)",
                        }}
                      >
                        USB: {usbBoard}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-3 text-center"
        style={{
          borderTop: "1px solid rgba(0,0,0,0.3)",
          background: "linear-gradient(180deg, #191e24, #141820)",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.4)",
        }}
      >
        <p
          className="font-brand text-[10px] tracking-widest"
          style={{ color: "oklch(0.35 0.01 240)" }}
        >
          © {new Date().getFullYear()} ULTRA DIGITAL 5.1 &nbsp;·&nbsp;
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline transition-colors"
            style={{ color: "oklch(0.48 0.01 240)" }}
          >
            Built with ♥ using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
