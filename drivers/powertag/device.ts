'use strict';

import Homey from 'homey';
import { POWERTAG_MODELS } from '../../lib/PowerTagRegistry';
import { readAllRegisters } from '../../lib/ModbusHelpers';
import { ModbusConnectionManager } from '../../lib/ModbusConnectionManager';
import type { PowerTagSettings, PowerTagStore, PowerTagModelConfig, PollResult } from '../../lib/types';

class PowerTagDevice extends Homey.Device {

  private settings!: PowerTagSettings;
  private store!: PowerTagStore;
  private modelConfig!: PowerTagModelConfig;
  private pollTimer?: ReturnType<typeof setInterval>;

  private getConnectionManager(): ModbusConnectionManager {
    return (this.homey.app as any).modbusManager;
  }

  async onInit(): Promise<void> {
    this.settings = this.getSettings() as PowerTagSettings;
    this.store = {
      slaveId: this.getStoreValue('slaveId'),
      typeId: this.getStoreValue('typeId'),
      model: this.getStoreValue('model'),
    };

    const config = POWERTAG_MODELS.get(this.store.typeId);
    if (!config) {
      await this.setUnavailable(`Unknown model type: ${this.store.typeId}`);
      return;
    }
    this.modelConfig = config;

    // Acquire shared connection
    try {
      await this.getConnectionManager().acquire(
        this.settings.address,
        this.settings.port,
      );
      await this.setAvailable();
    } catch (err) {
      this.error('Failed to acquire connection:', err);
      await this.setUnavailable('Cannot connect to gateway');
    }

    this.startPolling();
    this.log(`${this.modelConfig.model} initialized (slave ${this.store.slaveId})`);
  }

  async onUninit(): Promise<void> {
    this.stopPolling();
    this.getConnectionManager().release(this.settings.address, this.settings.port);
  }

  async onDeleted(): Promise<void> {
    this.log('Device deleted');
  }

  async onSettings({
    newSettings,
    changedKeys,
  }: {
    oldSettings: Record<string, any>;
    newSettings: Record<string, any>;
    changedKeys: string[];
  }): Promise<string | void> {
    if (changedKeys.includes('address') || changedKeys.includes('port')) {
      // Release old connection, acquire new one
      this.getConnectionManager().release(this.settings.address, this.settings.port);

      const newAddress = newSettings.address || this.settings.address;
      const newPort = newSettings.port || this.settings.port;

      try {
        await this.getConnectionManager().acquire(newAddress, newPort);
        this.settings.address = newAddress;
        this.settings.port = newPort;
        await this.setAvailable();
      } catch {
        await this.setUnavailable('Cannot connect to new gateway');
      }
    }

    if (changedKeys.includes('polling')) {
      this.settings.polling = newSettings.polling;
      this.startPolling();
    }
  }

  private startPolling(): void {
    this.stopPolling();

    // Immediate first poll
    this.poll().catch((err) => this.error('Initial poll failed:', err));

    const intervalMs = (this.settings.polling || 30) * 1000;
    this.pollTimer = this.homey.setInterval(() => {
      this.poll().catch((err) => this.error('Poll failed:', err));
    }, intervalMs);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      this.homey.clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async poll(): Promise<void> {
    try {
      const result = await this.getConnectionManager().execute(
        this.settings.address,
        this.settings.port,
        this.store.slaveId,
        (client) => readAllRegisters(client, this.modelConfig.voltageMode),
      );

      await this.updateCapabilities(result);

      if (!this.getAvailable()) {
        await this.setAvailable();
      }
    } catch (err) {
      this.error(`Poll error for slave ${this.store.slaveId}:`, err);
      await this.setUnavailable('Communication error').catch(() => {});
    }
  }

  private async updateCapabilities(data: PollResult): Promise<void> {
    // Total measurements (always present)
    await this.safeSetCapability('measure_power', data.totalPower);
    await this.safeSetCapability('meter_power', data.totalEnergy);
    await this.safeSetCapability('measure_power_factor', data.powerFactor);
    await this.safeSetCapability('measure_temperature', data.temperature);
    await this.safeSetCapability('measure_frequency', data.frequency);

    // Per-phase: L1 (always present)
    await this.safeSetCapability('measure_voltage.l1', data.voltagePh1);
    await this.safeSetCapability('measure_current.l1', data.currentL1);
    await this.safeSetCapability('measure_power.l1', data.powerL1);

    // Per-phase: L2, L3 (3P models only)
    if (this.modelConfig.phaseCount === 3) {
      await this.safeSetCapability('measure_voltage.l2', data.voltagePh2);
      await this.safeSetCapability('measure_current.l2', data.currentL2);
      await this.safeSetCapability('measure_power.l2', data.powerL2);

      await this.safeSetCapability('measure_voltage.l3', data.voltagePh3);
      await this.safeSetCapability('measure_current.l3', data.currentL3);
      await this.safeSetCapability('measure_power.l3', data.powerL3);
    }
  }

  private async safeSetCapability(id: string, value: number): Promise<void> {
    if (!this.hasCapability(id)) return;
    if (value === null || value === undefined || !isFinite(value)) return;

    const rounded = Math.round(value * 100) / 100;
    await this.setCapabilityValue(id, rounded).catch((err) => {
      this.error(`Failed to set ${id}:`, err);
    });
  }

}

module.exports = PowerTagDevice;
