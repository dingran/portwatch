import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process to control exec output
const execMock = vi.fn();

vi.mock('child_process', () => ({
  exec: execMock,
}));

describe('port-scanner', () => {
  beforeEach(() => {
    execMock.mockReset();
    vi.resetModules();
  });

  it('applies basic filters before enrichment', async () => {
    const lsofOutput = [
      'node    123 user  21u  IPv4 0x1  0t0  TCP *:3000 (LISTEN)',
      'python  456 user  22u  IPv4 0x2  0t0  TCP 127.0.0.1:8000 (LISTEN)',
    ].join('\n');

    execMock.mockImplementation((command: string, callback: any) => {
      if (command.startsWith('lsof -i')) {
        callback(null, { stdout: lsofOutput, stderr: '' });
      } else {
        callback(new Error(`Unexpected command: ${command}`));
      }
      return {} as any;
    });

    const { scanPorts } = await import('../src/port-scanner');
    const result = await scanPorts({ portRange: { min: 3000, max: 3000 } });

    expect(result).toHaveLength(1);
    expect(result[0]?.port).toBe(3000);
    expect(result[0]?.pid).toBe(123);
  });

  it('filters workingDirectory after enrichment', async () => {
    const lsofOutput = [
      'node    123 user  21u  IPv4 0x1  0t0  TCP *:3000 (LISTEN)',
      'python  456 user  22u  IPv4 0x2  0t0  TCP 127.0.0.1:8000 (LISTEN)',
    ].join('\n');

    execMock.mockImplementation((command: string, callback: any) => {
      if (command.startsWith('lsof -i')) {
        callback(null, { stdout: lsofOutput, stderr: '' });
      } else if (command.startsWith('lsof -p 123')) {
        callback(null, { stdout: 'node cwd /Users/test/app', stderr: '' });
      } else if (command.startsWith('lsof -p 456')) {
        callback(null, { stdout: 'python cwd /tmp/other', stderr: '' });
      } else if (command.startsWith('ps -p 123')) {
        callback(null, { stdout: 'node /Users/test/app/server.js', stderr: '' });
      } else if (command.startsWith('ps -p 456')) {
        callback(null, { stdout: 'python /tmp/other/app.py', stderr: '' });
      } else {
        callback(new Error(`Unexpected command: ${command}`));
      }
      return {} as any;
    });

    const { scanPortsEnriched } = await import('../src/port-scanner');
    const result = await scanPortsEnriched({ workingDirectory: 'app' });

    expect(result).toHaveLength(1);
    expect(result[0]?.pid).toBe(123);
    expect(result[0]?.workingDirectory).toContain('/Users/test/app');
  });
});
