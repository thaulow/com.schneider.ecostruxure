'use strict';

/** Phases this PowerTag model measures */
export type PhaseConfig = '1P' | '1P+N' | '3P' | '3P+N';

/** How voltage is measured — Line-to-Neutral or Line-to-Line */
export type VoltageMode = 'L-N' | 'L-L';

/** Configuration for a single PowerTag model */
export interface PowerTagModelConfig {
  typeId: number;
  model: string;
  name: string;
  phases: PhaseConfig;
  voltageMode: VoltageMode;
  phaseCount: 1 | 3;
}

/** Data returned from a single poll cycle */
export interface PollResult {
  currentL1: number;
  currentL2: number;
  currentL3: number;
  voltagePh1: number;
  voltagePh2: number;
  voltagePh3: number;
  powerL1: number;
  powerL2: number;
  powerL3: number;
  totalPower: number;
  powerFactor: number;
  totalEnergy: number; // kWh (converted from Wh)
  temperature: number;
  frequency: number;
}

/** Settings stored per device */
export interface PowerTagSettings {
  address: string;
  port: number;
  polling: number;
}

/** Store values persisted per device */
export interface PowerTagStore {
  slaveId: number;
  typeId: number;
  model: string;
}

/** Device data (unique identifier for Homey) */
export interface PowerTagDeviceData {
  id: string; // "{ip}:{port}:{slaveId}"
}
