'use strict';

import Homey from 'homey';
import { ModbusConnectionManager } from './lib/ModbusConnectionManager';

class EcoStruxureApp extends Homey.App {

  public modbusManager!: ModbusConnectionManager;

  async onInit() {
    this.modbusManager = new ModbusConnectionManager(this.homey);
    this.log('Schneider EcoStruxure app initialized');
  }

  async onUninit() {
    this.modbusManager.destroy();
  }

}

module.exports = EcoStruxureApp;
