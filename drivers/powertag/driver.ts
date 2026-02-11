'use strict';

import Homey from 'homey';
import * as net from 'net';
import * as Modbus from 'jsmodbus';
import {
  POWERTAG_MODELS,
  getCapabilitiesForModel,
  getCapabilityOptionsForModel,
} from '../../lib/PowerTagRegistry';
import { readDeviceType } from '../../lib/ModbusHelpers';
import type { PowerTagSettings, PowerTagStore, PowerTagDeviceData } from '../../lib/types';

class PowerTagDriver extends Homey.Driver {

  async onInit(): Promise<void> {
    this.log('PowerTag driver initialized');
  }

  async onPair(session: any): Promise<void> {
    let gatewaySettings: PowerTagSettings | null = null;

    session.setHandler('gateway_settings', async (data: PowerTagSettings) => {
      this.log(`Validating gateway at ${data.address}:${data.port}`);
      gatewaySettings = data;

      // Validate connection to the gateway
      await this.validateGateway(data.address, data.port);
      this.log('Gateway validation successful');

      // Navigate to list_devices from the driver side
      await session.nextView();
      return true;
    });

    session.setHandler('list_devices', async () => {
      if (!gatewaySettings) {
        throw new Error('No gateway configured');
      }
      return this.discoverDevices(gatewaySettings);
    });
  }

  /**
   * Validate that we can connect to the gateway via TCP.
   */
  private async validateGateway(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection timeout to ${host}:${port}`));
      }, 5000);

      socket.connect({ host, port }, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve();
      });

      socket.on('error', (err: Error) => {
        clearTimeout(timeout);
        socket.destroy();
        reject(new Error(`Cannot connect to ${host}:${port}: ${err.message}`));
      });
    });
  }

  /**
   * Scan slave IDs 150-169 for PowerTag devices on the gateway.
   *
   * Uses a single Modbus client created before socket.connect() so that
   * jsmodbus sees the 'connect' event. The unit ID is swapped per slave.
   */
  private async discoverDevices(settings: PowerTagSettings): Promise<any[]> {
    const socket = new net.Socket();
    const devices: any[] = [];

    // Create the Modbus client BEFORE connecting — jsmodbus must see the
    // socket 'connect' event to transition its internal state to 'online'.
    const client = new Modbus.client.TCP(socket, 150);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error('Discovery connection timeout'));
        }, 10000);

        socket.connect({ host: settings.address, port: settings.port }, () => {
          clearTimeout(timeout);
          resolve();
        });

        socket.on('error', (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      this.log('Starting Modbus scan of slave IDs 150-169...');
      for (let slaveId = 150; slaveId < 170; slaveId++) {
        try {
          // Reuse client, swap unit ID for each slave
          (client as any)._unitId = slaveId;
          (client as any)._requestHandler._unitId = slaveId;

          const typeId = await readDeviceType(client);
          this.log(`Slave ${slaveId}: typeId=${typeId}`);

          if (typeId === 0 || typeId === 65535) continue;

          const modelConfig = POWERTAG_MODELS.get(typeId);
          if (!modelConfig) {
            this.log(`Unknown device type ${typeId} at slave ${slaveId}, skipping`);
            continue;
          }

          devices.push({
            name: `${modelConfig.name} (${slaveId})`,
            data: { id: `${settings.address}:${settings.port}:${slaveId}` } as PowerTagDeviceData,
            settings: {
              address: settings.address,
              port: settings.port,
              polling: settings.polling,
            },
            store: { slaveId, typeId, model: modelConfig.model } as PowerTagStore,
            capabilities: getCapabilitiesForModel(modelConfig),
            capabilitiesOptions: getCapabilityOptionsForModel(modelConfig),
          });

          this.log(`Found ${modelConfig.model} at slave ${slaveId}`);
        } catch (err: any) {
          this.log(`Slave ${slaveId}: ${err.message || err}`);
        }

        await new Promise(r => setTimeout(r, 150));
      }
    } finally {
      socket.destroy();
    }

    this.log(`Discovery complete: found ${devices.length} devices`);
    return devices;
  }

}

module.exports = PowerTagDriver;
