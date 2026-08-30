using System;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using NAudio.Wave;
using NAudio.CoreAudioApi;

namespace AudioCaptureHelper
{
    class Program
    {
        [DllImport("user32.dll", SetLastError = true)]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        static async Task Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine("Error: Required arguments missing. Usage: --pid <PID> [port] OR --hwnd <HWND> [port]");
                return;
            }

            string mode = args[0];
            string valueStr = args[1];
            uint pid = 0;

            if (mode == "--pid")
            {
                if (!uint.TryParse(valueStr, out pid))
                {
                    Console.WriteLine("Error: Invalid PID format.");
                    return;
                }
            }
            else if (mode == "--hwnd")
            {
                if (!long.TryParse(valueStr, out long hwndVal))
                {
                    Console.WriteLine("Error: Invalid HWND format.");
                    return;
                }

                IntPtr hWnd = new IntPtr(hwndVal);
                GetWindowThreadProcessId(hWnd, out uint resolvedPid);
                if (resolvedPid == 0)
                {
                    Console.WriteLine($"Error: Could not resolve PID for HWND: {hwndVal}");
                    return;
                }
                pid = resolvedPid;
                Console.WriteLine($"Resolved HWND {hwndVal} to PID: {pid}");
            }
            else
            {
                Console.WriteLine($"Error: Unknown mode '{mode}'. Use --pid or --hwnd.");
                return;
            }

            int port = 8090;
            if (args.Length >= 3 && int.TryParse(args[2], out int customPort))
            {
                port = customPort;
            }

            Console.WriteLine($"Starting AudioCaptureHelper for PID: {pid} on port: {port}");

            TcpListener server = null;
            WasapiRecorder recorder = null;
            NetworkStream clientStream = null;
            TcpClient client = null;

            try
            {
                server = new TcpListener(IPAddress.Loopback, port);
                server.Start();

                Console.WriteLine("Waiting for TCP connection...");
                client = await server.AcceptTcpClientAsync();
                clientStream = client.GetStream();
                Console.WriteLine("TCP client connected! Initializing WASAPI Process Loopback...");

                // Setup WASAPI recorder using NAudio 3 builder
                var builder = new WasapiRecorderBuilder()
                    .WithProcessLoopback(pid, ProcessLoopbackMode.IncludeTargetProcessTree)
                    .WithFormat(new WaveFormat(48000, 16, 2)); // 48kHz, 16-bit, stereo PCM

                recorder = await builder.BuildAsync();

                recorder.DataAvailable += (buffer, flags, devicePosition, qpcPosition) =>
                {
                    try
                    {
                        if (client.Connected && clientStream.CanWrite)
                        {
                            // Write raw PCM ReadOnlySpan<byte> to TCP socket directly (zero-copy)
                            clientStream.Write(buffer);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error writing to stream: {ex.Message}");
                        recorder.StopRecording();
                    }
                };

                recorder.StartRecording();
                Console.WriteLine("Loopback recording started.");

                // Keep process running until TCP client disconnects
                byte[] pingBuffer = new byte[1];
                while (client.Connected)
                {
                    // Non-blocking wait, check connection status
                    await Task.Delay(1000);
                    if (client.Client.Poll(0, SelectMode.SelectRead) && client.Client.Receive(pingBuffer, SocketFlags.Peek) == 0)
                    {
                        // Client disconnected
                        break;
                    }
                }

                Console.WriteLine("Client disconnected. Cleaning up...");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Fatal Error: {ex.Message}");
            }
            finally
            {
                if (recorder != null)
                {
                    recorder.StopRecording();
                    recorder.Dispose();
                }
                clientStream?.Close();
                client?.Close();
                server?.Stop();
                Console.WriteLine("AudioCaptureHelper stopped successfully.");
            }
        }
    }
}
