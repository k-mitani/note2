using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Text;
using System.Text.RegularExpressions;

namespace Note2Launcher
{
    public partial class Form1 : Form
    {
        private const int ServerPort = 3000;
        private static readonly Regex AnsiEscapePattern = new(@"\x1B\[[0-?]*[ -/]*[@-~]", RegexOptions.Compiled);

        private readonly string _repoRoot;
        private Process? _serverProcess;
        private Process? _commandProcess;
        private bool _shouldExit;

        public Form1()
        {
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
            _repoRoot = FindRepoRoot();

            InitializeComponent();
            Application.ApplicationExit += Application_ApplicationExit;

            Opacity = 0;
            AppendLog($"Repository: {_repoRoot}");
            StartNoteServerProcess();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            BeginInvoke(() =>
            {
                Hide();
                Opacity = 1;
            });
        }

        private static string FindRepoRoot()
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir.FullName, "package.json")))
                {
                    return dir.FullName;
                }
                dir = dir.Parent;
            }

            return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
        }

        private void Application_ApplicationExit(object? sender, EventArgs e)
        {
            StopServer();
            StopProcess(_commandProcess);
        }

        private void StartNoteServerProcess()
        {
            StopProcessesUsingPort(ServerPort);

            _serverProcess = StartProcess(
                "cmd.exe",
                "/d /s /c \"chcp 65001 > nul && npx next start\"",
                _repoRoot,
                "server",
                configure: startInfo =>
                {
                    startInfo.Environment["NO_COLOR"] = "1";
                    startInfo.Environment["FORCE_COLOR"] = "0";
                });
        }

        private Process StartProcess(
            string fileName,
            string arguments,
            string workingDir,
            string label,
            Action<ProcessStartInfo>? configure = null)
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                WorkingDirectory = workingDir,
                CreateNoWindow = true,
                UseShellExecute = false,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
            };
            configure?.Invoke(startInfo);

            var proc = new Process
            {
                StartInfo = startInfo,
                EnableRaisingEvents = true,
            };
            proc.OutputDataReceived += (_, e) => AppendLog(e.Data);
            proc.ErrorDataReceived += (_, e) => AppendLog(e.Data);
            proc.Exited += (_, _) => AppendLog($"{label} exited with code {proc.ExitCode}");

            proc.Start();
            proc.BeginOutputReadLine();
            proc.BeginErrorReadLine();
            AppendLog($"{label} started. PID: {proc.Id}");
            return proc;
        }

        private void StopServer()
        {
            StopProcess(_serverProcess);
            _serverProcess = null;
            StopProcessesUsingPort(ServerPort);
        }

        private void StopProcess(Process? proc)
        {
            if (proc == null) return;

            try
            {
                if (!proc.HasExited)
                {
                    AppendLog($"Stopping PID: {proc.Id}");
                    proc.Kill(entireProcessTree: true);
                    proc.WaitForExit(5000);
                }
            }
            catch (Exception e)
            {
                AppendLog($"Failed to stop PID {SafeProcessId(proc)}: {e.Message}");
            }
        }

        private static int SafeProcessId(Process proc)
        {
            try
            {
                return proc.Id;
            }
            catch
            {
                return 0;
            }
        }

        private void StopProcessesUsingPort(int port)
        {
            var currentPid = Environment.ProcessId;
            var listeners = IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpListeners();
            if (!listeners.Any(x => x.Port == port && IsLocalAddress(x.Address)))
            {
                return;
            }

            foreach (var pid in FindProcessIdsUsingPort(port).Where(x => x != currentPid).Distinct())
            {
                try
                {
                    using var proc = Process.GetProcessById(pid);
                    AppendLog($"Stopping process using port {port}. PID: {pid} ({proc.ProcessName})");
                    proc.Kill(entireProcessTree: true);
                    proc.WaitForExit(5000);
                }
                catch (Exception e)
                {
                    AppendLog($"Failed to stop port {port} PID {pid}: {e.Message}");
                }
            }
        }

        private static bool IsLocalAddress(IPAddress address)
        {
            return address.Equals(IPAddress.Any)
                || address.Equals(IPAddress.IPv6Any)
                || IPAddress.IsLoopback(address);
        }

        private static IEnumerable<int> FindProcessIdsUsingPort(int port)
        {
            var output = RunHidden("netstat", $"-ano -p tcp");
            foreach (var line in output.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries))
            {
                var columns = Regex.Split(line.Trim(), @"\s+");
                if (columns.Length < 5 || !columns[0].Equals("TCP", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var localAddress = columns[1];
                var state = columns[3];
                var pidText = columns[4];
                if (!state.Equals("LISTENING", StringComparison.OrdinalIgnoreCase)
                    || !localAddress.EndsWith($":{port}", StringComparison.Ordinal))
                {
                    continue;
                }

                if (int.TryParse(pidText, out var pid))
                {
                    yield return pid;
                }
            }
        }

        private static string RunHidden(string fileName, string arguments)
        {
            using var proc = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = fileName,
                    Arguments = arguments,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    StandardOutputEncoding = Encoding.UTF8,
                },
            };
            proc.Start();
            var output = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit();
            return output;
        }

        private void updateToolStripMenuItem_Click(object sender, EventArgs e)
        {
            StopServer();
            updateToolStripMenuItem.Enabled = false;
            restartToolStripMenuItem.Enabled = false;

            _commandProcess = StartProcess(
                "cmd.exe",
                "/d /s /c \"chcp 65001 > nul && git pull && npm install && npm run build\"",
                _repoRoot,
                "update",
                configure: startInfo =>
                {
                    startInfo.Environment["NO_COLOR"] = "1";
                    startInfo.Environment["FORCE_COLOR"] = "0";
                });
            var proc = _commandProcess;

            Task.Run(() =>
            {
                proc.WaitForExit();
                BeginInvoke(() =>
                {
                    updateToolStripMenuItem.Enabled = true;
                    restartToolStripMenuItem.Enabled = true;
                    _commandProcess = null;
                    if (proc.ExitCode == 0)
                    {
                        StartNoteServerProcess();
                    }
                });
            });
        }

        private void restartToolStripMenuItem_Click(object sender, EventArgs e)
        {
            StopServer();
            StartNoteServerProcess();
        }

        private void exitToolStripMenuItem_Click(object sender, EventArgs e)
        {
            _shouldExit = true;
            StopServer();
            StopProcess(_commandProcess);
            Close();
        }

        private void notifyIcon1_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            Visible = true;
            ShowInTaskbar = true;
            WindowState = FormWindowState.Normal;
            Activate();
        }

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing && !_shouldExit)
            {
                e.Cancel = true;
                Visible = false;
                ShowInTaskbar = false;
            }
        }

        private void AppendLog(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return;

            var cleanText = AnsiEscapePattern.Replace(text, "");
            if (textBox1.InvokeRequired)
            {
                textBox1.BeginInvoke(() => AppendLog(cleanText));
                return;
            }

            textBox1.AppendText(cleanText + Environment.NewLine);
        }
    }
}
