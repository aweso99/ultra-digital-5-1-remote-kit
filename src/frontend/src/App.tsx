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
 * ====================================================================
 *  FR6311  5.1 Remote Kit Firmware  v2.0
 *  MCU     : ATmega328P  (Arduino UNO / Nano / Pro Mini)
 *  Audio   : FR6311 6-channel volume controller  (I2C)
 *  Display : HD44780 16x2 LCD, 4-bit parallel
 *  Remote  : NEC 32-bit IR  (IRremote v2.0)
 *  Encoder : Rotary encoder + push-switch
 *  Storage : AVR EEPROM  (EEPROM.update - wear-safe)
 *  License : MIT
 * ====================================================================
 *
 *  Wiring
 *  ------
 *  LCD    RS->4   EN->5   D4->6   D5->7   D6->8   D7->9
 *  IR     OUT->11
 *  ENC    CLK->2(INT0)   DT->3   SW->A1
 *  FR6311 SDA->A4   SCL->A5   ADDR->GND (addr 0x40)
 *  USB    5V-sense->A2   IR-sense->A3
 * ====================================================================
 */

#include <Wire.h>
#include <LiquidCrystal.h>
#include <IRremote.h>
#include <EEPROM.h>

// -- Pin map ------------------------------------------------------------------
#define PIN_LCD_RS   4
#define PIN_LCD_EN   5
#define PIN_LCD_D4   6
#define PIN_LCD_D5   7
#define PIN_LCD_D6   8
#define PIN_LCD_D7   9
#define PIN_IR      11
#define PIN_ENC_CLK  2    // INT0
#define PIN_ENC_DT   3
#define PIN_ENC_SW  A1
#define PIN_USB_5V  A2
#define PIN_USB_IR  A3

// -- FR6311 I2C ---------------------------------------------------------------
// I2C Write Address: 0x88 (7-bit: 0x44)
#define FR6311_ADDR   0x44

// FR6311 Register Map (verified)
#define FR_INPUT_SEL  0x00   // Input Selector & Input Gain
#define FR_FL         0x01   // Volume - Front Left
#define FR_FR_REG     0x02   // Volume - Front Right
#define FR_CENTER     0x03   // Volume - Center
#define FR_SUB        0x04   // Volume - Subwoofer
#define FR_RL         0x05   // Volume - Surround Left
#define FR_RR         0x06   // Volume - Surround Right
#define FR_BASS       0x07   // Tone Control - Bass
#define FR_TREBLE     0x08   // Tone Control - Treble
#define FR_MULTICHAN  0x09   // Multi-Channel Input Configuration
#define FR_REC_GAIN   0x0A   // REC Output Gain
#define FR_ADC_CFG    0x0B   // ADC Configuration & Attenuation

// -- IR codes (32-bit NEC) ----------------------------------------------------
#define IR_STANDBY      0x807F827DUL
#define IR_MUTE         0x807F42BDUL
#define IR_DVD          0x807F02FDUL
#define IR_USB_SRC      0x807F629DUL
#define IR_AUX1         0x807FA25DUL
#define IR_AUX2         0x807F22DDUL
#define IR_AUX3         0x807F20DFUL
#define IR_FT003_SEL    0x807F12EDUL
#define IR_GAIN_KEY     0x807F52ADUL
#define IR_GAIN_PLUS    0x807F926DUL
#define IR_GAIN_MINUS   0x807FB04FUL
#define IR_USB_PREV     0x807F728DUL
#define IR_USB_NEXT     0x807F32CDUL
#define IR_USB_PLAY     0x807FB24DUL
#define IR_USB_EQ       0x807FD827UL
#define IR_USB_MODE     0x807F58A7UL
#define IR_ESC          0x807FF00FUL
#define IR_SEL_21_51    0x807F30CFUL
#define IR_FRONT_MINUS  0x807FC03FUL
#define IR_FRONT_PLUS   0x807F40BFUL
#define IR_REAR_MINUS   0x807F807FUL
#define IR_REAR_PLUS    0x807F00FFUL
#define IR_SUB_MINUS    0x807FD02FUL
#define IR_SUB_PLUS     0x807FE01FUL
#define IR_CTR_MINUS    0x807F50AFUL
#define IR_CTR_PLUS     0x807F609FUL
#define IR_MSTR_MINUS   0x807F906FUL
#define IR_MSTR_PLUS    0x807FA05FUL
#define IR_BASS_MINUS   0x807FC837UL
#define IR_BASS_PLUS    0x807F48B7UL
#define IR_TREB_MINUS   0x807F8877UL
#define IR_TREB_PLUS    0x807F08F7UL
#define IR_NUM1         0x807F4AB5UL
#define IR_NUM2         0x807F8A75UL
#define IR_NUM3         0x807F0AF5UL
#define IR_NUM4         0x807FE817UL
#define IR_NUM5         0x807F6897UL
#define IR_NUM6         0x807FA857UL
#define IR_NUM7         0x807F6A95UL
#define IR_NUM8         0x807FAA55UL
#define IR_NUM9         0x807F2AD5UL
#define IR_NUM0         0x807F9A65UL
#define IR_REPEAT_KEY   0x807F5AA5UL
#define IR_RESET_KEY    0x807F1AE5UL
#define IR_TEST_TONE    0x807F9867UL
#define IR_SURROUND_KEY 0x807F18E7UL
#define IR_NEC_RPT      0xFFFFFFFFUL

// -- EEPROM addresses ---------------------------------------------------------
#define EE_MASTER  0
#define EE_FRONT   1
#define EE_CENTER  2
#define EE_SUB     3
#define EE_REAR    4
#define EE_BASS    5
#define EE_TREBLE  6
#define EE_GAIN    7
#define EE_INPUT   8
#define EE_SURR    9

// -- Enumerations -------------------------------------------------------------
enum CtrlMode {
  CM_MASTER=0, CM_FRONT, CM_CENTER, CM_SUB,
  CM_REAR, CM_GAIN, CM_BASS, CM_TREBLE, CM_COUNT
};
enum SurrMode { SM_OFF=0, SM_MUSIC, SM_MOVIE, SM_MONO, SM_COUNT };
enum InputSrc { IS_DVD=0, IS_USB, IS_AUX1, IS_AUX2, IS_AUX3, IS_FT003, IS_COUNT };

const char* CM_LBL[CM_COUNT] = {
  "MASTER", "FRONT ", "CENTER", "SUB   ",
  "REAR  ", "GAIN  ", "BASS  ", "TREBLE"
};
const char* SM_SHORT[SM_COUNT] = { "OF", "MU", "MV", "MN" };
const char* IS_LBL[IS_COUNT]   = { "DVD","USB","AU1","AU2","AU3","FT3" };

// -- Big-digit custom character data ------------------------------------------
//  8 segments in LCD CGRAM slots 0-7. Each digit is 3 cols x 2 rows.
byte BD_CHARS[8][8] = {
  { B00111,B01111,B11111,B11111,B11111,B11111,B11111,B11111 },
  { B11111,B11111,B11111,B00000,B00000,B00000,B00000,B00000 },
  { B11100,B11110,B11111,B11111,B11111,B11111,B11111,B11111 },
  { B11111,B11111,B11111,B11111,B11111,B11111,B01111,B00111 },
  { B00000,B00000,B00000,B00000,B00000,B11111,B11111,B11111 },
  { B11111,B11111,B11111,B11111,B11111,B11111,B11110,B11100 },
  { B11111,B11111,B11111,B00000,B00000,B00000,B11111,B11111 },
  { B11111,B11111,B11111,B11111,B11111,B11111,B11111,B11111 }
};

const char BD_TOP[10][3] = {
  {0,1,2},{1,2,32},{6,6,2},{6,6,2},{3,4,7},
  {7,6,6},{0,6,6},{1,1,2},{0,6,2},{0,6,2}
};
const char BD_BOT[10][3] = {
  {3,4,5},{4,7,4},{7,4,4},{4,4,5},{32,32,7},
  {4,4,5},{3,4,5},{32,32,7},{3,4,5},{4,4,5}
};

#define BD_COL 10   // big digits start at column 10 (cols 10-15)

// -- Hardware objects ---------------------------------------------------------
LiquidCrystal lcd(PIN_LCD_RS, PIN_LCD_EN,
                  PIN_LCD_D4, PIN_LCD_D5, PIN_LCD_D6, PIN_LCD_D7);
IRrecv        irRecv(PIN_IR);
decode_results irData;

// -- Application state --------------------------------------------------------
uint8_t   volMaster = 40;
uint8_t   volFront  = 40;
uint8_t   volCenter = 40;
uint8_t   volSub    = 40;
uint8_t   volRear   = 40;
uint8_t   valGain   = 40;
uint8_t   valBass   = 7;      // 0-14 (7 = flat)
uint8_t   valTreble = 7;

bool      isMuted   = false;
bool      isStandby = false;

CtrlMode  ctrlMode  = CM_MASTER;
SurrMode  surrMode  = SM_OFF;
InputSrc  inputSrc  = IS_DVD;

unsigned long lastKeyMs  = 0;
uint32_t      lastIRCode = 0;
#define AUTO_RETURN_MS  5000UL

volatile int8_t  encDelta = 0;

// -- FR6311 I2C helpers -------------------------------------------------------
void fr6311Write(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(FR6311_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

// -- Surround Mode Preset Application ----------------------------------------
// MUSIC MODE: Wide stereo spread, nice ambience
//   Bass: Medium (10/14)  Treble: Slightly high (10/14)
//   Rear: boosted +6 for wide field  Center/Sub: neutral
// MOVIE MODE: Voice enhance, dialogue clarity
//   Bass: Low (4/14)  Treble: High (12/14)
//   Center: boosted +6 for dialogue  Rear: reduced -4 for bg control
// MONO: Centered mono fold-down, flat tone
// OFF: Restore user-set bass/treble, flat channel trims
//
// Note: These write directly to hardware. User bass/treble knobs are
// overridden while a surround mode is active; they resume on SM_OFF.
uint8_t surrBassOverride   = 7;  // active when surrMode != SM_OFF
uint8_t surrTrebleOverride = 7;
int8_t  surrRearTrim       = 0;  // extra trim on RL/RR vs user setting
int8_t  surrCenterTrim     = 0;  // extra trim on CT vs user setting
int8_t  surrSubTrim        = 0;  // extra trim on SW vs user setting

void applySurroundPreset() {
  switch (surrMode) {
    case SM_MUSIC:
      // Wide stereo: medium bass, treble up slightly, surround boosted
      surrBassOverride   = 10;  // 10/14 = moderate warmth
      surrTrebleOverride = 10;  // 10/14 = slightly bright for air
      surrRearTrim       = +6;  // boost rear for wide field
      surrCenterTrim     =  0;  // centre neutral
      surrSubTrim        = +2;  // sub slight bump for body
      break;
    case SM_MOVIE:
      // Voice enhance: low bass, high treble, centre boosted, rear subdued
      surrBassOverride   =  4;  // 4/14 = low bass, keep it tight
      surrTrebleOverride = 12;  // 12/14 = high treble, sharp dialogue
      surrRearTrim       = -4;  // reduce rear (background control)
      surrCenterTrim     = +6;  // boost centre for dialogue clarity
      surrSubTrim        = -2;  // reduce sub (voice-first mix)
      break;
    case SM_MONO:
      // Mono fold-down: flat tone, equal channels
      surrBassOverride   = 7;
      surrTrebleOverride = 7;
      surrRearTrim       = 0;
      surrCenterTrim     = 0;
      surrSubTrim        = 0;
      break;
    case SM_OFF:
    default:
      // Restore flat / user-controlled values
      surrBassOverride   = valBass;
      surrTrebleOverride = valTreble;
      surrRearTrim       = 0;
      surrCenterTrim     = 0;
      surrSubTrim        = 0;
      break;
  }
}

void fr6311ApplyAll() {
  // 0x00: Input Selector & Input Gain - encode input source
  fr6311Write(FR_INPUT_SEL, (uint8_t)inputSrc);

  if (isStandby || isMuted) {
    // Mute all 6 channel volume registers
    fr6311Write(FR_FL,     0); fr6311Write(FR_FR_REG, 0);
    fr6311Write(FR_CENTER, 0); fr6311Write(FR_SUB,    0);
    fr6311Write(FR_RL,     0); fr6311Write(FR_RR,     0);
    return;
  }

  // Master volume applied as base across all channels (0x01-0x06)
  // Individual channel levels are master + channel trim + surround trim, clamped 0-79
  applySurroundPreset();
  uint8_t fl  = (uint8_t)constrain((int16_t)volMaster + (volFront  - 40), 0, 79);
  uint8_t fr_ = (uint8_t)constrain((int16_t)volMaster + (volFront  - 40), 0, 79);
  uint8_t ct  = (uint8_t)constrain((int16_t)volMaster + (volCenter - 40) + surrCenterTrim, 0, 79);
  uint8_t sw  = (uint8_t)constrain((int16_t)volMaster + (volSub    - 40) + surrSubTrim,    0, 79);
  uint8_t rl  = (uint8_t)constrain((int16_t)volMaster + (volRear   - 40) + surrRearTrim,   0, 79);
  uint8_t rr  = rl;

  fr6311Write(FR_FL,      fl);  fr6311Write(FR_FR_REG, fr_);
  fr6311Write(FR_CENTER,  ct);  fr6311Write(FR_SUB,    sw);
  fr6311Write(FR_RL,      rl);  fr6311Write(FR_RR,     rr);

  // Tone controls (0x07-0x08) — surround modes override user bass/treble
  uint8_t activeBass   = (surrMode != SM_OFF) ? surrBassOverride   : valBass;
  uint8_t activeTreble = (surrMode != SM_OFF) ? surrTrebleOverride : valTreble;
  fr6311Write(FR_BASS,    activeBass);
  fr6311Write(FR_TREBLE,  activeTreble);

  // Multi-Channel Input Configuration (0x09) - default stereo-to-multi
  fr6311Write(FR_MULTICHAN, 0x00);

  // REC Output Gain (0x0A) - unity gain
  fr6311Write(FR_REC_GAIN, valGain);

  // ADC Configuration & Attenuation (0x0B) - default
  fr6311Write(FR_ADC_CFG, 0x00);
}

// -- Big-digit LCD functions --------------------------------------------------
void createBigDigits() {
  for (uint8_t i = 0; i < 8; i++)
    lcd.createChar(i, BD_CHARS[i]);
}

void drawBigDigit(uint8_t d, uint8_t col) {
  if (d > 9) d = 0;
  lcd.setCursor(col, 0);
  for (uint8_t i = 0; i < 3; i++) lcd.write((uint8_t)BD_TOP[d][i]);
  lcd.setCursor(col, 1);
  for (uint8_t i = 0; i < 3; i++) lcd.write((uint8_t)BD_BOT[d][i]);
}

void drawBigNumber(uint8_t n) {
  if (n > 99) n = 99;
  drawBigDigit(n / 10, BD_COL);
  drawBigDigit(n % 10, BD_COL + 3);
}

// -- Display ------------------------------------------------------------------
void lcdPrint(uint8_t col, uint8_t row, const char* s, uint8_t w) {
  lcd.setCursor(col, row);
  uint8_t n = 0;
  while (*s && n < w) { lcd.write(*s++); n++; }
  while (n++ < w)     { lcd.write(' '); }
}

void updateDisplay() {
  lcd.clear();

  if (isStandby) {
    lcd.setCursor(3, 0); lcd.print(F("** STANDBY **"));
    lcd.setCursor(2, 1); lcd.print(F("- POWER  OFF -"));
    return;
  }

  if (isMuted) {
    lcd.setCursor(1, 0); lcd.print(F("  ** MUTED **  "));
    lcd.setCursor(0, 1); lcd.print(F(" AUDIO  MUTED  "));
    return;
  }

  // Row 0: <IN:XXX>SS  (10 chars) + big-digit top (6 chars)
  // '<'=1 + "IN:"=3 + SRC=3 + '>'=1 + SURR=2 = 10 chars
  lcd.setCursor(0, 0);
  lcd.write('<');
  lcd.print(F("IN:"));
  lcd.print(IS_LBL[inputSrc]);
  lcd.write('>');
  lcd.print(SM_SHORT[surrMode]);

  // Row 1: mode label (10 chars) + big-digit bottom (6 chars)
  lcdPrint(0, 1, CM_LBL[ctrlMode], 10);

  // Big digits cols 10-15, rows 0-1
  uint8_t dv;
  switch (ctrlMode) {
    case CM_MASTER: dv = volMaster; break;
    case CM_FRONT:  dv = volFront;  break;
    case CM_CENTER: dv = volCenter; break;
    case CM_SUB:    dv = volSub;    break;
    case CM_REAR:   dv = volRear;   break;
    case CM_GAIN:   dv = valGain;   break;
    case CM_BASS:   dv = valBass;   break;
    case CM_TREBLE: dv = valTreble; break;
    default:        dv = volMaster; break;
  }
  drawBigNumber(dv);
}

// -- EEPROM -------------------------------------------------------------------
void eepromSave() {
  EEPROM.update(EE_MASTER, volMaster);
  EEPROM.update(EE_FRONT,  volFront);
  EEPROM.update(EE_CENTER, volCenter);
  EEPROM.update(EE_SUB,    volSub);
  EEPROM.update(EE_REAR,   volRear);
  EEPROM.update(EE_BASS,   valBass);
  EEPROM.update(EE_TREBLE, valTreble);
  EEPROM.update(EE_GAIN,   valGain);
  EEPROM.update(EE_INPUT,  (uint8_t)inputSrc);
  EEPROM.update(EE_SURR,   (uint8_t)surrMode);
}

void eepromLoad() {
  uint8_t v;
  v = EEPROM.read(EE_MASTER); if (v <= 79)      volMaster = v;
  v = EEPROM.read(EE_FRONT);  if (v <= 79)      volFront  = v;
  v = EEPROM.read(EE_CENTER); if (v <= 79)      volCenter = v;
  v = EEPROM.read(EE_SUB);    if (v <= 79)      volSub    = v;
  v = EEPROM.read(EE_REAR);   if (v <= 79)      volRear   = v;
  v = EEPROM.read(EE_BASS);   if (v <= 14)      valBass   = v;
  v = EEPROM.read(EE_TREBLE); if (v <= 14)      valTreble = v;
  v = EEPROM.read(EE_GAIN);   if (v <= 79)      valGain   = v;
  v = EEPROM.read(EE_INPUT);  if (v < IS_COUNT) inputSrc  = (InputSrc)v;
  v = EEPROM.read(EE_SURR);   if (v < SM_COUNT) surrMode  = (SurrMode)v;
}

// -- Volume helpers -----------------------------------------------------------
uint8_t getMaxVol(CtrlMode m) {
  return (m == CM_BASS || m == CM_TREBLE) ? 14 : 79;
}

void adjustVol(int8_t delta) {
  uint8_t mx = getMaxVol(ctrlMode);
  switch (ctrlMode) {
    case CM_MASTER: volMaster=(uint8_t)constrain((int)volMaster+delta,0,mx); break;
    case CM_FRONT:  volFront =(uint8_t)constrain((int)volFront +delta,0,mx); break;
    case CM_CENTER: volCenter=(uint8_t)constrain((int)volCenter+delta,0,mx); break;
    case CM_SUB:    volSub   =(uint8_t)constrain((int)volSub   +delta,0,mx); break;
    case CM_REAR:   volRear  =(uint8_t)constrain((int)volRear  +delta,0,mx); break;
    case CM_GAIN:   valGain  =(uint8_t)constrain((int)valGain  +delta,0,mx); break;
    case CM_BASS:   valBass  =(uint8_t)constrain((int)valBass  +delta,0,mx); break;
    case CM_TREBLE: valTreble=(uint8_t)constrain((int)valTreble+delta,0,mx); break;
    default: break;
  }
}

// -- Encoder ISR --------------------------------------------------------------
void encoderISR() {
  if (digitalRead(PIN_ENC_CLK) == LOW) {
    encDelta += (digitalRead(PIN_ENC_DT) == HIGH) ? +1 : -1;
  }
}

// -- IR handler ---------------------------------------------------------------
void handleIR(uint32_t code) {
  if (code == IR_NEC_RPT) code = lastIRCode;
  else                    lastIRCode = code;
  if (code == 0) return;

  lastKeyMs = millis();

  switch (code) {
    case IR_STANDBY:     isStandby = !isStandby;                    break;
    case IR_MUTE:        if (!isStandby) isMuted = !isMuted;        break;

    case IR_DVD:         inputSrc = IS_DVD;   break;
    case IR_USB_SRC:     inputSrc = IS_USB;   break;
    case IR_AUX1:        inputSrc = IS_AUX1;  break;
    case IR_AUX2:        inputSrc = IS_AUX2;  break;
    case IR_AUX3:        inputSrc = IS_AUX3;  break;
    case IR_FT003_SEL:   inputSrc = IS_FT003; break;

    case IR_MSTR_PLUS:   ctrlMode = CM_MASTER; adjustVol(+1); break;
    case IR_MSTR_MINUS:  ctrlMode = CM_MASTER; adjustVol(-1); break;
    case IR_FRONT_PLUS:  ctrlMode = CM_FRONT;  adjustVol(+1); break;
    case IR_FRONT_MINUS: ctrlMode = CM_FRONT;  adjustVol(-1); break;
    case IR_CTR_PLUS:    ctrlMode = CM_CENTER; adjustVol(+1); break;
    case IR_CTR_MINUS:   ctrlMode = CM_CENTER; adjustVol(-1); break;
    case IR_SUB_PLUS:    ctrlMode = CM_SUB;    adjustVol(+1); break;
    case IR_SUB_MINUS:   ctrlMode = CM_SUB;    adjustVol(-1); break;
    case IR_REAR_PLUS:   ctrlMode = CM_REAR;   adjustVol(+1); break;
    case IR_REAR_MINUS:  ctrlMode = CM_REAR;   adjustVol(-1); break;

    case IR_GAIN_KEY:    ctrlMode = CM_GAIN;               break;
    case IR_GAIN_PLUS:   ctrlMode = CM_GAIN;   adjustVol(+1); break;
    case IR_GAIN_MINUS:  ctrlMode = CM_GAIN;   adjustVol(-1); break;

    case IR_BASS_PLUS:   ctrlMode = CM_BASS;   adjustVol(+1); break;
    case IR_BASS_MINUS:  ctrlMode = CM_BASS;   adjustVol(-1); break;
    case IR_TREB_PLUS:   ctrlMode = CM_TREBLE; adjustVol(+1); break;
    case IR_TREB_MINUS:  ctrlMode = CM_TREBLE; adjustVol(-1); break;

    case IR_SURROUND_KEY:
      surrMode = (SurrMode)((surrMode + 1) % SM_COUNT);
      applySurroundPreset();
      fr6311ApplyAll();
      break;

    case IR_RESET_KEY:
      volMaster = volFront = volCenter = volSub = volRear = 40;
      valBass = valTreble = 7;
      valGain = 40;
      isMuted = false;
      ctrlMode = CM_MASTER;
      surrMode = SM_OFF;
      break;

    case IR_ESC:
      ctrlMode = CM_MASTER;
      break;

    case IR_SEL_21_51:
    case IR_TEST_TONE:
    case IR_USB_PREV: case IR_USB_NEXT: case IR_USB_PLAY:
    case IR_USB_EQ:   case IR_USB_MODE:
      break;

    default: break;
  }

  fr6311ApplyAll();
  eepromSave();
  updateDisplay();
}

// -- setup() ------------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  pinMode(PIN_ENC_CLK, INPUT_PULLUP);
  pinMode(PIN_ENC_DT,  INPUT_PULLUP);
  pinMode(PIN_ENC_SW,  INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_CLK), encoderISR, CHANGE);

  pinMode(PIN_USB_5V, INPUT);
  pinMode(PIN_USB_IR, INPUT);

  Wire.begin();

  lcd.begin(16, 2);
  createBigDigits();

  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(F("ULTRA  DIGITAL"));
  lcd.setCursor(2, 1); lcd.print(F("5.1  READY"));
  delay(1500);

  eepromLoad();
  fr6311ApplyAll();

  irRecv.enableIRIn();
  lastKeyMs = millis();
  updateDisplay();
}

// -- loop() -------------------------------------------------------------------
void loop() {

  if (irRecv.decode(&irData)) {
    if (irData.decode_type == NEC) {
      Serial.print(F("IR 0x"));
      Serial.println(irData.value, HEX);
      handleIR(irData.value);
    }
    irRecv.resume();
  }

  if (encDelta != 0) {
    noInterrupts();
    int8_t d = encDelta;
    encDelta  = 0;
    interrupts();
    if (!isStandby) {
      lastKeyMs = millis();
      adjustVol(d);
      fr6311ApplyAll();
      eepromSave();
      updateDisplay();
    }
  }

  static bool swPrev = HIGH;
  bool swNow = digitalRead(PIN_ENC_SW);
  if (swPrev == HIGH && swNow == LOW) {
    delay(40);
    if (digitalRead(PIN_ENC_SW) == LOW) {
      lastKeyMs = millis();
      ctrlMode  = (CtrlMode)((ctrlMode + 1) % CM_COUNT);
      updateDisplay();
    }
  }
  swPrev = swNow;

  if (ctrlMode != CM_MASTER &&
      (millis() - lastKeyMs >= AUTO_RETURN_MS)) {
    ctrlMode = CM_MASTER;
    updateDisplay();
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
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedIR, setCopiedIR] = useState(false);

  const handleCopyFull = async () => {
    await navigator.clipboard.writeText(ARDUINO_CODE);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 1800);
  };

  const handleCopyIR = async () => {
    const irMap = ARDUINO_CODE.split("\n")
      .filter((l: string) => l.trim().startsWith("#define IR_"))
      .join("\n");
    await navigator.clipboard.writeText(irMap);
    setCopiedIR(true);
    setTimeout(() => setCopiedIR(false), 1800);
  };

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

          {/* ── Arduino Firmware Card ── */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{
              background: "oklch(0.13 0.02 240)",
              border: "1px solid oklch(0.22 0.04 220)",
              boxShadow:
                "inset 0 1px 0 oklch(0.28 0.02 240 / 0.5), 0 4px 16px oklch(0.05 0.01 240 / 0.6)",
            }}
          >
            <span
              className="font-brand text-[10px] tracking-[0.3em]"
              style={{ color: "oklch(0.50 0.01 240)" }}
            >
              ARDUINO FIRMWARE
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyFull}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-brand tracking-[0.15em] transition-all duration-200"
                style={{
                  background: copiedFull
                    ? "oklch(0.25 0.08 170)"
                    : "oklch(0.20 0.04 220)",
                  border: copiedFull
                    ? "1px solid oklch(0.45 0.15 170)"
                    : "1px solid oklch(0.30 0.04 220)",
                  color: copiedFull
                    ? "oklch(0.75 0.15 170)"
                    : "oklch(0.70 0.06 220)",
                }}
                data-ocid="preview.firmware.button"
              >
                {copiedFull ? <Check size={12} /> : <Copy size={12} />}
                {copiedFull ? "COPIED!" : "Copy Full .ino"}
              </button>
              <button
                type="button"
                onClick={handleCopyIR}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-brand tracking-[0.15em] transition-all duration-200"
                style={{
                  background: copiedIR
                    ? "oklch(0.25 0.08 170)"
                    : "oklch(0.20 0.04 220)",
                  border: copiedIR
                    ? "1px solid oklch(0.45 0.15 170)"
                    : "1px solid oklch(0.30 0.04 220)",
                  color: copiedIR
                    ? "oklch(0.75 0.15 170)"
                    : "oklch(0.70 0.06 220)",
                }}
                data-ocid="preview.irmap.button"
              >
                {copiedIR ? <Check size={12} /> : <Copy size={12} />}
                {copiedIR ? "COPIED!" : "Copy IR Map"}
              </button>
            </div>
            <div
              className="relative rounded-lg overflow-hidden"
              style={{
                background: "oklch(0.09 0.02 240)",
                border: "1px solid oklch(0.18 0.03 220)",
              }}
            >
              <pre
                className="font-lcd text-[10px] leading-[1.6] p-3 overflow-hidden"
                style={{
                  color: "oklch(0.70 0.12 195)",
                  maxHeight: "120px",
                  whiteSpace: "pre",
                }}
              >
                {ARDUINO_CODE.split("\n").slice(0, 15).join("\n")}
              </pre>
              <div
                className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, oklch(0.09 0.02 240))",
                }}
              />
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
const SURROUND_MODES: SurroundMode[] = ["STEREO", "MUSIC", "MOVIE", "GAME"];

const SURROUND_MODE_INFO: Record<
  SurroundMode,
  { goal: string; bass: string; treble: string; result: string }
> = {
  STEREO: {
    goal: "Flat, unprocessed output",
    bass: "User-set",
    treble: "User-set",
    result: "Natural reference",
  },
  MUSIC: {
    goal: "Sound wide ah kekkanum — stereo spread",
    bass: "Medium (warm body)",
    treble: "Slightly high (air & shimmer)",
    result: "Songs spread feel · Stereo wide · Nice ambience",
  },
  MOVIE: {
    goal: "Dialogue clear ah kekkanum — voice enhance",
    bass: "Low (tight, controlled)",
    treble: "High (sharp presence)",
    result: "Voice sharp · Background control · Dialogue clear",
  },
  GAME: {
    goal: "Immersive surround field",
    bass: "User-set",
    treble: "User-set",
    result: "360° positioning",
  },
};
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
                      {/* Mode info panel */}
                      {SURROUND_MODE_INFO[surroundMode] && (
                        <div
                          className="mt-2 rounded-lg px-3 py-2 text-[9px] font-lcd leading-relaxed border"
                          style={{
                            background: "oklch(0.10 0.04 195 / 0.55)",
                            borderColor: "oklch(0.40 0.10 195 / 0.4)",
                            color: "oklch(0.70 0.10 195)",
                          }}
                        >
                          <div
                            className="font-brand tracking-widest text-[8px] mb-1"
                            style={{ color: "oklch(0.80 0.15 195)" }}
                          >
                            {surroundMode} —{" "}
                            {SURROUND_MODE_INFO[surroundMode].goal}
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                            <span style={{ color: "oklch(0.55 0.06 195)" }}>
                              BASS
                            </span>
                            <span>{SURROUND_MODE_INFO[surroundMode].bass}</span>
                            <span style={{ color: "oklch(0.55 0.06 195)" }}>
                              TREBLE
                            </span>
                            <span>
                              {SURROUND_MODE_INFO[surroundMode].treble}
                            </span>
                          </div>
                          <div
                            className="mt-1 pt-1 border-t"
                            style={{
                              borderColor: "oklch(0.30 0.06 195 / 0.4)",
                              color: "oklch(0.65 0.12 195)",
                            }}
                          >
                            {SURROUND_MODE_INFO[surroundMode].result}
                          </div>
                        </div>
                      )}
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
