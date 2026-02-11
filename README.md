# Schneider EcoStruxure

Monitor your Schneider EcoStruxure devices in Homey via Modbus TCP.

## Supported Gateways

- Smartlink SI D
- PowerTag Link
- EcoStruxure Panel Server

## Supported Devices

### Energy Sensors
- PowerTag M63 series (1P, 1P+N, 3P, 3P+N)
- PowerTag F63 series (1P+N, 3P, 3P+N)
- PowerTag P63 series (1P+N, 3P+N)
- PowerTag NSX series (M250, M630)
- PowerTag Rope series (R200, R600, R1000, R2000)
- PowerTag F160

### Control Modules
- PowerTag C 2DI — 2 digital inputs (breaker position, trip indicator)
- PowerTag C IO — 1 digital input + 1 digital output (remote control)

### Environmental Sensors
- HeatTag Sensor — temperature, humidity, and heat alarm

## Capabilities

### Energy Sensors
- **Power** — total active power (W)
- **Energy** — cumulative energy consumption (kWh)
- **Voltage** — per phase (V)
- **Current** — per phase (A)
- **Power per phase** — per phase (W)
- **Power factor**
- **Frequency** (Hz)
- **Temperature** (°C)

3-phase devices report values for L1, L2, and L3 individually.

### HeatTag Sensor
- **Temperature** (°C)
- **Humidity** (%)
- **Heat alarm**

### Control Modules
- **Digital inputs** — contact status monitoring
- **Digital output** (C IO only) — on/off remote control

## Pairing

1. Enter the IP address and port of your gateway
2. The app scans for connected PowerTag devices via Modbus
3. Select the devices you want to add

## Configuration

Each device has the following settings:

- **Gateway IP Address** — IP of your Smartlink SI D, PowerTag Link, or Panel Server
- **Gateway Port** — Modbus TCP port (default: 502)
- **Polling Interval** — how often to read measurements (default: 30 seconds)
