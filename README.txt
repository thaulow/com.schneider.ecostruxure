Monitor your Schneider EcoStruxure devices in Homey using Modbus TCP.

This app connects to your EcoStruxure Panel Server, Smartlink SI D, or PowerTag Link gateway and automatically discovers all connected devices. It supports the full range of PowerTag energy sensors (M63, F63, P63, NSX, Rope, F160), PowerTag Control modules (C 2DI, C IO), and HeatTag temperature sensors.

Energy sensors report real-time power consumption, cumulative energy usage, voltage, current, power factor, frequency, and temperature. Three-phase devices provide individual readings for L1, L2, and L3. Control modules monitor digital inputs such as breaker position and trip indicators, and the C IO module supports remote on/off control. HeatTag sensors monitor temperature, humidity, and heat alarms in your electrical panel.

Simply enter your gateway IP address and the app will scan for devices and add them to Homey. Configure the polling interval to balance between update frequency and network load.
