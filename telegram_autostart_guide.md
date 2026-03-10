# Skyvault Automation: Telegram Bot & Autostart Guide

You requested a setup where your Debian server runs like a true server: it pulls from GitHub, starts Docker, starts the Cloudflare tunnel, and gives you complete control via a **Two-Way Telegram Bot**. Crucially, you wanted it to **open a terminal automatically when the OS boots up** so you can see the server running live.

Here is the exact step-by-step guide to setting this up using the scripts I just created for you (`auto-deploy.sh` and `bot.py`).

---

## 1. Get Your Telegram Bot Tokens
Before we activate the scripts, we need to create your personal bot.
1. Open the Telegram app on your phone.
2. Search for `@BotFather` (the official verified bot).
3. Send the message `/newbot`. It will ask for a name (e.g., "My Skyvault Bot") and a unique username (e.g., `myskyvault_123_bot`).
4. `@BotFather` will reply with a long **HTTP API Token**. Save this sequence securely.
5. In Telegram, search for `@userinfobot` and click Start. It will send you a number (e.g., `123456789`). This is your **Chat ID**.

---

## 2. Prepare the Scripts
I have already generated `auto-deploy.sh` (the bash workhorse) and `bot.py` (the listener) in your project folder (`d:\dev\personal-cloud-server`). 

Since you are running Debian Linux, you need to make the bash script executable and install the python bot libraries. Open a terminal on your Debian machine inside the project folder:

```bash
chmod +x auto-deploy.sh check-updates.sh

# Install the python-venv package
sudo apt update
sudo apt install python3-venv

# Create a virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install pyTelegramBotAPI python-dotenv
```

---

## 3. Setup Secure Secrets (.env)
We must never hardcode secrets. I have already added `.env` to your `.gitignore`. Let's create the environment file securely.

In your Debian terminal inside the project folder:
```bash
nano .env
```
Paste the following (replacing with your actual tokens if needed):
```env
BOT_TOKEN=8691796650:AAFgau0dRiIjgY2TwzCCQ8pipncDGEcNDDw
CHAT_ID=1249916645
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 4. How to Make Your Bot Private (Unsearchable)
By default, anyone who guesses the username can search for your bot. Even though the Python script blocks them, you can also hide the bot entirely so they can't message it.
1. Message `@BotFather` on Telegram.
2. Send `/mybots` and select your Skyvault bot.
3. Click **Bot Settings** -> **Inline Mode** -> Make sure it is **Turned OFF**.
4. Click **Bot Settings** -> **Allow Groups?** -> **Turn groups OFF** (so it can't be added to public chats).
*Note: Telegram bots with random usernames are effectively unsearchable to the global public unless they know the exact `@username`. Combined with the hardcoded Chat ID check in the script, it is perfectly secure.*

---

## 5. Configure the Autostart Terminal (The "Actual Server" Feel)
You want a terminal to pop open immediately when you turn on the PC and see the bot running live. Debian usually uses the GNOME or XFCE desktop environment.

We will create a `.desktop` autostart file.

1. Open your Debian terminal and run:
   ```bash
   mkdir -p ~/.config/autostart
   nano ~/.config/autostart/skyvault-bot.desktop
   ```
2. Paste the following configuration into the file (Replace `/path/to/your/project` with the actual path to your personal-cloud-server folder on Debian, like `/home/user/personal-cloud-server`):

   ```ini
   [Desktop Entry]
   Type=Application
   Name=Skyvault Server Bot
   Comment=Starts the Skyvault Telegram Bot on boot
   # If you use GNOME/Ubuntu-style Debian:
   Exec=gnome-terminal -- bash -c "cd /path/to/your/project && source venv/bin/activate && python3 bot.py; exec bash"
   # If you use XFCE/LXDE-style Debian:
   # Exec=xfce4-terminal -x bash -c "cd /path/to/your/project && source venv/bin/activate && python3 bot.py; bash"
   Terminal=false
   X-GNOME-Autostart-enabled=true
   ```
3. Save the file (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

## 6. Setup Automated GitHub Checking (Cron Polling)
You requested that Debian check for updates in the background automatically. The script `check-updates.sh` does this. If it finds new code on GitHub, it automatically texts the bot and runs the deployment!
1. In your Debian terminal, open the cron scheduler:
   ```bash
   crontab -e
   ```
   *(If prompted, choose `nano` as your editor).*
2. Add this line to the very bottom of the file (replace the path with your actual path):
   ```text
   */5 * * * * /path/to/your/project/check-updates.sh >> /path/to/your/project/cron.log 2>&1
   ```
   *This tells Debian to run the check every 5 minutes in the background.*
3. Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 7. Test It Out!
1. Reboot your Debian PC.
2. When you log in, a black terminal window will literally pop open on your screen and say `Skyvault Telegram Bot started. Listening for commands...`
3. Pull out your phone, open your new Telegram bot chat, and send:
   `/deploy`
4. The terminal on your PC screen will instantly print out the output of `git fetch`, `docker compose up`, and starting the tunnel. 
5. Wait ~10 seconds. Your phone will buzz with a new message: 
   `🚀 Skyvault Auto-Deploy Complete! Server is Live at: https://something.trycloudflare.com`

You now have a fully interactive home server! You can send `/status` or `/link` from your phone anytime to check on the container health or get the last live URL.
