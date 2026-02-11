'use strict';

import * as Modbus from 'jsmodbus';
import { VoltageMode, PollResult } from './types';

// Register addresses (0-based, FC3 Read Holding Registers)

const REG_CURRENT_L1   = 2999;
const REG_VOLTAGE_LN_1 = 3027;
const REG_VOLTAGE_LL_1 = 3019;
const REG_POWER_L1     = 3053;
const REG_POWER_FACTOR = 3083;
const REG_FREQUENCY    = 3109;
const REG_TEMPERATURE  = 3131;
const REG_ENERGY_TOTAL = 3203;

/** Device type ID register, used during discovery */
export const REG_DEVICE_TYPE = 31024;

/**
 * Read all measurement registers for a PowerTag device.
 *
 * Groups adjacent registers into contiguous block reads to minimize
 * Modbus transactions:
 *   Block 1: Current L1/L2/L3 (2999-3004, 6 regs)
 *   Block 2: Voltage (3019-3024 L-L or 3027-3032 L-N, 6 regs)
 *   Block 3: Power L1/L2/L3 + Total (3053-3060, 8 regs)
 *   Block 4: Power Factor (3083-3084, 2 regs)
 *   Block 5: Frequency (3109-3110, 2 regs)
 *   Block 6: Temperature (3131-3132, 2 regs)
 *   Block 7: Total Energy (3203-3206, 4 regs)
 */
export async function readAllRegisters(
  client: InstanceType<typeof Modbus.client.TCP>,
  voltageMode: VoltageMode,
): Promise<PollResult> {
  const voltStart = voltageMode === 'L-N' ? REG_VOLTAGE_LN_1 : REG_VOLTAGE_LL_1;

  const [currResp, voltResp, powerResp, pfResp, freqResp, tempResp, energyResp] =
    await Promise.all([
      client.readHoldingRegisters(REG_CURRENT_L1, 6),
      client.readHoldingRegisters(voltStart, 6),
      client.readHoldingRegisters(REG_POWER_L1, 8),
      client.readHoldingRegisters(REG_POWER_FACTOR, 2),
      client.readHoldingRegisters(REG_FREQUENCY, 2),
      client.readHoldingRegisters(REG_TEMPERATURE, 2),
      client.readHoldingRegisters(REG_ENERGY_TOTAL, 4),
    ]);

  const currBuf   = currResp.response.body.valuesAsBuffer;
  const voltBuf   = voltResp.response.body.valuesAsBuffer;
  const powerBuf  = powerResp.response.body.valuesAsBuffer;
  const pfBuf     = pfResp.response.body.valuesAsBuffer;
  const freqBuf   = freqResp.response.body.valuesAsBuffer;
  const tempBuf   = tempResp.response.body.valuesAsBuffer;
  const energyBuf = energyResp.response.body.valuesAsBuffer;

  return {
    currentL1:   currBuf.readFloatBE(0),
    currentL2:   currBuf.readFloatBE(4),
    currentL3:   currBuf.readFloatBE(8),
    voltagePh1:  voltBuf.readFloatBE(0),
    voltagePh2:  voltBuf.readFloatBE(4),
    voltagePh3:  voltBuf.readFloatBE(8),
    powerL1:     powerBuf.readFloatBE(0),
    powerL2:     powerBuf.readFloatBE(4),
    powerL3:     powerBuf.readFloatBE(8),
    totalPower:  powerBuf.readFloatBE(12),
    powerFactor: pfBuf.readFloatBE(0),
    frequency:   freqBuf.readFloatBE(0),
    temperature: tempBuf.readFloatBE(0),
    totalEnergy: Number(energyBuf.readBigInt64BE(0)) / 1000, // Wh -> kWh
  };
}

/**
 * Read the device type code at a given slave ID.
 * Returns 0 or 65535 if no device is present.
 */
export async function readDeviceType(
  client: InstanceType<typeof Modbus.client.TCP>,
): Promise<number> {
  const resp = await client.readHoldingRegisters(REG_DEVICE_TYPE, 1);
  return resp.response.body.valuesAsBuffer.readUInt16BE(0);
}
