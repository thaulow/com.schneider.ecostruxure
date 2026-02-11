'use strict';

import Homey from 'homey';
import { ModbusConnectionManager } from './lib/ModbusConnectionManager';

class Acti9App extends Homey.App {

  public modbusManager!: ModbusConnectionManager;

  async onInit() {
    this.modbusManager = new ModbusConnectionManager(this.homey);
    this.log('Schneider Acti9 app initialized');
  }

  async onUninit() {
    this.modbusManager.destroy();
  }

}

module.exports = Acti9App;
