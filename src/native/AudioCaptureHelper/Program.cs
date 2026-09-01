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

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern int GetWindowTextLength(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(uint processAccess, bool bInheritHandle, uint processId);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern bool QueryFullProcessImageName(IntPtr hProcess, int flags, System.Text.StringBuilder lpExeName, ref int lpdwSize);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);

        private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

        private const int GWL_EXSTYLE = -20;
        private const int WS_EX_TOOLWINDOW = 0x00000080;

        private static void ListWindowsJson()
        {
            var list = new System.Collections.Generic.List<object>();

            EnumWindows((hWnd, lParam) =>
            {
                try
                {
                    GetWindowThreadProcessId(hWnd, out uint pid);
                    if (pid == 0) return true;

                    string processName = "";
                    IntPtr hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
                    if (hProcess != IntPtr.Zero)
                    {
                        try
                        {
                            var exeSb = new System.Text.StringBuilder(1024);
                            int size = exeSb.Capacity;
                            if (QueryFullProcessImageName(hProcess, 0, exeSb, ref size))
                            {
                                processName = System.IO.Path.GetFileNameWithoutExtension(exeSb.ToString());
                            }
                        }
                        finally
                        {
                            CloseHandle(hProcess);
                        }
                    }

                    if (string.IsNullOrEmpty(processName))
                    {
                        try
                        {
                            using (var proc = System.Diagnostics.Process.GetProcessById((int)pid))
                            {
                                processName = proc.ProcessName;
                            }
                        }
                        catch {}
                    }

                    var classSb = new System.Text.StringBuilder(256);
                    GetClassName(hWnd, classSb, 256);
                    string className = classSb.ToString();

                    var titleSb = new System.Text.StringBuilder(512);
                    GetWindowText(hWnd, titleSb, 512);
                    string title = titleSb.ToString().Trim();

                    bool isGame = processName.IndexOf("valorant", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                 processName.IndexOf("riot", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                 className.Equals("UnrealWindow", StringComparison.OrdinalIgnoreCase) ||
                                 processName.IndexOf("cs2", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                 processName.IndexOf("fortnite", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                 processName.IndexOf("league", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                 processName.IndexOf("overwatch", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                 processName.IndexOf("r5apex", StringComparison.OrdinalIgnoreCase) >= 0;

                    if (!IsWindowVisible(hWnd) && !isGame) return true;

                    if (string.IsNullOrEmpty(title))
                    {
                        if (isGame)
                        {
                            if (processName.IndexOf("valorant", StringComparison.OrdinalIgnoreCase) >= 0 || className.Equals("UnrealWindow", StringComparison.OrdinalIgnoreCase))
                                title = "VALORANT";
                            else
                                title = processName;
                        }
                        else
                        {
                            return true;
                        }
                    }

                    if (processName.Equals("TextInputHost", StringComparison.OrdinalIgnoreCase) ||
                        processName.Equals("ApplicationFrameHost", StringComparison.OrdinalIgnoreCase) && string.IsNullOrEmpty(title) ||
                        processName.Equals("Echo", StringComparison.OrdinalIgnoreCase) && title.Equals("echo", StringComparison.OrdinalIgnoreCase) ||
                        title.Equals("Program Manager", StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    list.Add(new
                    {
                        id = $"window:{hWnd.ToInt64()}:0",
                        name = isGame && !title.Contains("(") ? $"{title} (Jogo)" : title,
                        processName = processName,
                        pid = pid,
                        type = "window"
                    });
                }
                catch {}

                return true;
            }, IntPtr.Zero);

            string json = System.Text.Json.JsonSerializer.Serialize(list);
            Console.WriteLine(json);
        }

        static async Task Main(string[] args)
        {
            if (args.Length >= 1 && args[0] == "--list-windows")
            {
                ListWindowsJson();
                return;
            }

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
