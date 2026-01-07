interface Navigator {
  bluetooth?: {
    requestDevice(options?: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
  };
}

interface BluetoothDevice {
  name?: string;
}

interface BluetoothRequestDeviceOptions {
  acceptAllDevices?: boolean;
  filters?: Array<{ services: string[] }>;
  optionalServices?: string[];
}
