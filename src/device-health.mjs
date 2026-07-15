import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const THIS_FILE = fileURLToPath(import.meta.url);

const TRACKED_PROCESSES = {
  chromium: ['chromium'],
  node: ['node'],
  proot: ['proot'],
  xtigervnc: ['xtigervnc'],
  websockify: ['websockify'],
  cloudflared: ['cloudflared'],
  sshd: ['sshd'],
};

function round(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function kbToMb(value) {
  if (!Number.isFinite(value)) return null;
  return round(value / 1024, 1);
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function parseMeminfo(text) {
  const values = {};

  for (const line of String(text || '').split('\n')) {
    const match = line.match(/^([A-Za-z_()]+):\s+(\d+)\s+kB$/);
    if (!match) continue;
    values[match[1]] = Number(match[2]);
  }

  return values;
}

async function collectMemory() {
  const text = await readText('/proc/meminfo');

  if (!text) {
    return {
      available: false,
      error: 'proc_meminfo_unreadable',
    };
  }

  const info = parseMeminfo(text);
  const totalKb = info.MemTotal;
  const availableKb = info.MemAvailable;

  if (
    !Number.isFinite(totalKb) ||
    !Number.isFinite(availableKb) ||
    totalKb <= 0
  ) {
    return {
      available: false,
      error: 'memory_values_unavailable',
    };
  }

  const usedKb = Math.max(0, totalKb - availableKb);

  return {
    available: true,
    totalMb: kbToMb(totalKb),
    availableMb: kbToMb(availableKb),
    usedMb: kbToMb(usedKb),
    usedPercent: round((usedKb / totalKb) * 100, 1),
    swapTotalMb: kbToMb(info.SwapTotal),
    swapFreeMb: kbToMb(info.SwapFree),
  };
}

async function collectProcesses() {
  try {
    const { stdout } = await execFileAsync(
      'ps',
      ['-A', '-o', 'comm='],
      {
        timeout: 3000,
        maxBuffer: 1024 * 1024,
      }
    );

    const names = String(stdout || '')
      .split('\n')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const counts = {};

    for (const [label, aliases] of Object.entries(TRACKED_PROCESSES)) {
      const normalizedAliases = aliases.map((value) =>
        value.toLowerCase()
      );

      counts[label] = names.filter((name) =>
        normalizedAliases.includes(name)
      ).length;
    }

    return {
      available: true,
      scope: 'processes_visible_to_termux',
      totalVisible: names.length,
      ...counts,
    };
  } catch (error) {
    return {
      available: false,
      scope: 'processes_visible_to_termux',
      error: error?.message || String(error),
    };
  }
}

function normalizeThermalTemperature(rawText) {
  const raw = Number(String(rawText || '').trim());

  if (!Number.isFinite(raw)) {
    return null;
  }

  const celsius = Math.abs(raw) >= 1000
    ? raw / 1000
    : raw;

  if (celsius < 0 || celsius > 120) {
    return null;
  }

  return round(celsius, 1);
}

function normalizeBatteryTemperature(rawText) {
  const raw = Number(String(rawText || '').trim());

  if (!Number.isFinite(raw)) {
    return null;
  }

  let celsius;

  if (Math.abs(raw) >= 1000) {
    celsius = raw / 1000;
  } else if (Math.abs(raw) >= 100) {
    celsius = raw / 10;
  } else {
    celsius = raw;
  }

  if (celsius < 0 || celsius > 80) {
    return null;
  }

  return round(celsius, 1);
}

function highestSensor(sensors) {
  if (!sensors.length) return null;

  return sensors.reduce((highest, current) =>
    current.celsius > highest.celsius ? current : highest
  );
}

async function collectThermalZones() {
  const thermalRoot = '/sys/class/thermal';

  let entries;

  try {
    entries = await fs.readdir(thermalRoot, {
      withFileTypes: true,
    });
  } catch {
    return {
      sensors: [],
      invalidSensors: 0,
      accessAvailable: false,
    };
  }

  const zones = entries
    .filter((entry) =>
      entry.name.startsWith('thermal_zone')
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const sensors = [];
  let invalidSensors = 0;

  for (const zone of zones) {
    const zonePath = path.join(thermalRoot, zone.name);

    const [typeText, tempText] = await Promise.all([
      readText(path.join(zonePath, 'type')),
      readText(path.join(zonePath, 'temp')),
    ]);

    const celsius = normalizeThermalTemperature(tempText);

    if (celsius === null) {
      invalidSensors += 1;
      continue;
    }

    sensors.push({
      zone: zone.name,
      type: String(typeText || 'unknown').trim() || 'unknown',
      celsius,
    });
  }

  return {
    sensors,
    invalidSensors,
    accessAvailable: true,
  };
}

async function collectBatteryTemperature() {
  const text = await readText(
    '/sys/class/power_supply/battery/temp'
  );

  if (text === null) {
    return null;
  }

  return normalizeBatteryTemperature(text);
}

async function collectTemperature() {
  const [thermal, batteryC] = await Promise.all([
    collectThermalZones(),
    collectBatteryTemperature(),
  ]);

  const all = thermal.sensors;
  const cpu = all.filter((sensor) =>
    /cpu|cpuss/i.test(sensor.type)
  );
  const gpu = all.filter((sensor) =>
    /gpu|gpuss/i.test(sensor.type)
  );

  const highest = highestSensor(all);
  const highestCpu = highestSensor(cpu);
  const highestGpu = highestSensor(gpu);

  return {
    available:
      thermal.accessAvailable &&
      all.length > 0,
    maxReadableC: highest?.celsius ?? null,
    maxSensorType: highest?.type ?? null,
    cpuMaxC: highestCpu?.celsius ?? null,
    gpuMaxC: highestGpu?.celsius ?? null,
    batteryC,
    readableSensors: all.length,
    invalidSensors: thermal.invalidSensors,
    note:
      'Thermal values are filtered to 0-120 C. Invalid sentinel values such as -273 C and -40 C are excluded.',
  };
}

export async function collectDeviceHealth() {
  const sampledAt = new Date().toISOString();

  const [memory, processes, temperature] = await Promise.all([
    collectMemory(),
    collectProcesses(),
    collectTemperature(),
  ]);

  return {
    ok: true,
    sampledAt,
    memory,
    processes,
    temperature,
    safety:
      'Health collection excludes command lines, environment values, credentials, tokens, cookies, and storageState contents.',
  };
}

async function main() {
  const result = await collectDeviceHealth();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] === THIS_FILE) {
  main().catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error?.message || String(error),
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  });
}
