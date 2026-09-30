using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Windows.Forms;

internal sealed class RetrioInstaller : Form
{
    const string Url = "https://github.com/FloFish44/retrio/releases/download/v0.5.2-beta/RetrioWeb.zip";
    const string ExpectedHash = "EB12B4E412DFD53B2E596C9E4614DE4D212B903F0EB67C25B9E3A1B140656E1D";
    readonly string installDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Retrio");
    readonly ProgressBar progress = new ProgressBar();
    readonly Label status = new Label();
    readonly Button action = new Button();
    string installedExe;

    [DllImport("user32.dll")] static extern bool ReleaseCapture();
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

    public RetrioInstaller()
    {
        Text = "Installation de Retrio";
        ClientSize = new Size(620, 590);
        MinimumSize = new Size(580, 550);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(251, 248, 240);
        ForeColor = Color.FromArgb(20, 37, 28);
        Font = new Font("Segoe UI", 10F);
        FormBorderStyle = FormBorderStyle.None;
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);

        Panel header = new Panel { Dock = DockStyle.Top, Height = 48, BackColor = Color.FromArgb(27, 67, 50) };
        Label headerTitle = new Label { Text = "R   Retrio · Installation sécurisée", ForeColor = Color.White, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Padding = new Padding(18, 0, 0, 0), Font = new Font("Segoe UI", 10F, FontStyle.Bold) };
        FlowLayoutPanel buttons = new FlowLayoutPanel { Dock = DockStyle.Right, Width = 116, Padding = new Padding(0, 8, 0, 0), BackColor = header.BackColor };
        Button minimize = WindowButton("—"), maximize = WindowButton("□"), close = WindowButton("×");
        minimize.Click += delegate { WindowState = FormWindowState.Minimized; };
        maximize.Click += delegate { WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized; };
        close.Click += delegate { Close(); };
        buttons.Controls.Add(minimize); buttons.Controls.Add(maximize); buttons.Controls.Add(close);
        header.Controls.Add(headerTitle); header.Controls.Add(buttons);
        header.MouseDown += DragWindow; headerTitle.MouseDown += DragWindow;

        Panel content = new Panel { Dock = DockStyle.Fill, Padding = new Padding(38, 30, 38, 25) };
        Label mark = new Label { Text = "R", Size = new Size(58, 58), BackColor = Color.FromArgb(149, 213, 178), TextAlign = ContentAlignment.MiddleCenter, Font = new Font("Georgia", 20F, FontStyle.Bold) };
        Label title = new Label { Text = "Installez Retrio", AutoSize = true, Location = new Point(0, 78), Font = new Font("Georgia", 25F, FontStyle.Bold) };
        Label intro = new Label { Text = "Retrouvez vos documents et vos photos avec vos propres mots.", AutoSize = true, Location = new Point(0, 124), ForeColor = Color.FromArgb(76, 90, 80) };
        Label info = new Label { Text = "✓ Analyse locale après l’installation\r\n✓ Raccourci Retrio créé sur le Bureau\r\n✓ Mise à jour propre de la version existante", Location = new Point(0, 164), Size = new Size(544, 86), Padding = new Padding(14, 12, 14, 10), BackColor = Color.FromArgb(238, 243, 236), BorderStyle = BorderStyle.FixedSingle };
        progress.Location = new Point(0, 273); progress.Size = new Size(544, 10); progress.Style = ProgressBarStyle.Continuous;
        status.Text = "Prêt à installer la version 0.5.2."; status.Location = new Point(0, 298); status.Size = new Size(544, 44); status.ForeColor = Color.FromArgb(122, 113, 97);
        action.Text = "Installer Retrio"; action.Location = new Point(0, 350); action.Size = new Size(544, 46); action.FlatStyle = FlatStyle.Flat; action.FlatAppearance.BorderSize = 0; action.BackColor = Color.FromArgb(27, 67, 50); action.ForeColor = Color.White; action.Font = new Font("Segoe UI", 10F, FontStyle.Bold); action.Click += ActionClick;
        Label foot = new Label { Text = "Windows 10/11 · Les fichiers personnels ne sont jamais envoyés sur Internet.", Location = new Point(0, 414), Size = new Size(544, 35), TextAlign = ContentAlignment.TopCenter, ForeColor = Color.FromArgb(127, 140, 131), Font = new Font("Segoe UI", 8F) };
        content.Controls.Add(mark); content.Controls.Add(title); content.Controls.Add(intro); content.Controls.Add(info); content.Controls.Add(progress); content.Controls.Add(status); content.Controls.Add(action); content.Controls.Add(foot);
        Controls.Add(content); Controls.Add(header);
    }

    static Button WindowButton(string text)
    {
        Button b = new Button { Text = text, Width = 34, Height = 30, Margin = new Padding(2, 0, 2, 0), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(27, 67, 50), ForeColor = Color.White };
        b.FlatAppearance.BorderColor = Color.FromArgb(100, 255, 255, 255);
        return b;
    }

    void DragWindow(object sender, MouseEventArgs e)
    {
        if (e.Button == MouseButtons.Left) { ReleaseCapture(); SendMessage(Handle, 0xA1, 0x2, 0); }
    }

    void ActionClick(object sender, EventArgs e)
    {
        if (!String.IsNullOrEmpty(installedExe) && File.Exists(installedExe))
        {
            Process.Start(new ProcessStartInfo(installedExe) { WorkingDirectory = Path.GetDirectoryName(installedExe), UseShellExecute = true });
            Close(); return;
        }
        action.Enabled = false; action.Text = "Installation en cours…"; SetProgress(2, "Préparation du téléchargement…");
        BackgroundWorker worker = new BackgroundWorker { WorkerReportsProgress = true };
        worker.DoWork += Install;
        worker.ProgressChanged += delegate(object s, ProgressChangedEventArgs a) { SetProgress(a.ProgressPercentage, (string)a.UserState); };
        worker.RunWorkerCompleted += Completed;
        worker.RunWorkerAsync();
    }

    void Install(object sender, DoWorkEventArgs e)
    {
        BackgroundWorker worker = (BackgroundWorker)sender;
        string archive = Path.Combine(installDir, "retrio-download.zip"), staging = Path.Combine(installDir, "app-new"), current = Path.Combine(installDir, "app"), previous = Path.Combine(installDir, "app-previous");
        try
        {
            Directory.CreateDirectory(installDir);
            worker.ReportProgress(4, "Connexion au serveur Retrio…");
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(Url);
            request.UserAgent = "Retrio-Installer/0.5.2 (Windows)"; request.Timeout = 30000;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            using (Stream source = response.GetResponseStream())
            using (FileStream destination = File.Create(archive))
            {
                long total = response.ContentLength, downloaded = 0; byte[] buffer = new byte[1024 * 1024]; int read; Stopwatch timer = Stopwatch.StartNew();
                while ((read = source.Read(buffer, 0, buffer.Length)) > 0)
                {
                    destination.Write(buffer, 0, read); downloaded += read;
                    int percent = total > 0 ? Math.Min(68, 5 + (int)(downloaded * 63 / total)) : 12;
                    double speed = downloaded / Math.Max(timer.Elapsed.TotalSeconds, .1) / 1048576.0;
                    string amount = total > 0 ? String.Format("{0:0}/{1:0} Mo", downloaded / 1048576.0, total / 1048576.0) : String.Format("{0:0} Mo", downloaded / 1048576.0);
                    worker.ReportProgress(percent, String.Format("Téléchargement… {0} · {1:0.0} Mo/s", amount, speed));
                }
            }
            worker.ReportProgress(70, "Vérification du téléchargement…");
            string hash; using (SHA256 sha = SHA256.Create()) using (FileStream input = File.OpenRead(archive)) hash = BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "");
            if (!hash.Equals(ExpectedHash, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Le téléchargement est incomplet ou non officiel.");
            if (Directory.Exists(staging)) Directory.Delete(staging, true); Directory.CreateDirectory(staging);
            using (ZipArchive zip = ZipFile.OpenRead(archive))
            {
                int count = zip.Entries.Count; string root = Path.GetFullPath(staging + Path.DirectorySeparatorChar);
                for (int i = 0; i < count; i++)
                {
                    ZipArchiveEntry entry = zip.Entries[i]; string target = Path.GetFullPath(Path.Combine(staging, entry.FullName));
                    if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Chemin invalide dans l’archive.");
                    if (String.IsNullOrEmpty(entry.Name)) Directory.CreateDirectory(target); else { Directory.CreateDirectory(Path.GetDirectoryName(target)); entry.ExtractToFile(target, true); }
                    if (i % 12 == 0 || i + 1 == count) worker.ReportProgress(76 + (i + 1) * 18 / Math.Max(count, 1), String.Format("Installation des fichiers… {0}/{1}", i + 1, count));
                }
            }
            File.Delete(archive);
            string found = FindFile(staging, "RetrioWeb.exe"); if (found == null) throw new FileNotFoundException("Retrio est absent de l’archive.");
            string relative = found.Substring(staging.Length).TrimStart(Path.DirectorySeparatorChar);
            if (Directory.Exists(previous)) Directory.Delete(previous, true); if (Directory.Exists(current)) Directory.Move(current, previous); Directory.Move(staging, current);
            installedExe = Path.Combine(current, relative);
            worker.ReportProgress(96, "Création du raccourci sur le Bureau…"); CreateShortcut(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Retrio.lnk"), installedExe);
            if (Directory.Exists(previous)) Directory.Delete(previous, true);
        }
        catch { try { if (File.Exists(archive)) File.Delete(archive); } catch { } throw; }
    }

    void Completed(object sender, RunWorkerCompletedEventArgs e)
    {
        if (e.Error != null) { status.Text = "Installation impossible : " + e.Error.Message; progress.Value = 0; action.Text = "Réessayer"; action.Enabled = true; try { File.WriteAllText(Path.Combine(installDir, "installer.log"), e.Error.ToString()); } catch { } return; }
        SetProgress(100, "Retrio 0.5.2 est installé."); action.Text = "Ouvrir Retrio"; action.Enabled = true;
    }

    void SetProgress(int value, string message) { progress.Value = Math.Max(0, Math.Min(100, value)); status.Text = message; }
    static string FindFile(string root, string name) { string[] files = Directory.GetFiles(root, name, SearchOption.AllDirectories); return files.Length > 0 ? files[0] : null; }
    static void CreateShortcut(string shortcut, string target)
    {
        string s = shortcut.Replace("'", "''"), t = target.Replace("'", "''"), d = Path.GetDirectoryName(target).Replace("'", "''");
        string script = "$w=New-Object -ComObject WScript.Shell;$s=$w.CreateShortcut('" + s + "');$s.TargetPath='" + t + "';$s.WorkingDirectory='" + d + "';$s.IconLocation='" + t + "';$s.Save()";
        Process p = Process.Start(new ProcessStartInfo("powershell.exe", "-NoProfile -NonInteractive -Command \"" + script.Replace("\"", "\\\"") + "\"") { UseShellExecute = false, CreateNoWindow = true }); p.WaitForExit();
        if (p.ExitCode != 0) throw new InvalidOperationException("Impossible de créer le raccourci Retrio.");
    }

    [STAThread] static void Main()
    {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false); Application.Run(new RetrioInstaller());
    }
}
