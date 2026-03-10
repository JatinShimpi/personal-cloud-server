import os
import subprocess
import time
from telebot import TeleBot
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get environment variables
BOT_TOKEN = os.getenv('BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
CHAT_ID = os.getenv('CHAT_ID', 'YOUR_CHAT_ID_HERE')

if BOT_TOKEN == 'YOUR_BOT_TOKEN_HERE' or CHAT_ID == 'YOUR_CHAT_ID_HERE':
    print("WARNING: BOT_TOKEN or CHAT_ID not set. Please update the script or set env vars.")
    exit(1)

bot = TeleBot(BOT_TOKEN)

def is_authorized(message):
    return str(message.chat.id) == CHAT_ID

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    if not is_authorized(message): return
    bot.reply_to(message, "☁️ Skyvault Bot Online!\n\nCommands:\n/deploy - Pull from GitHub and restart the server\n/status - Check if containers are running\n/link - Get the current Cloudflare tunnel link")

@bot.message_handler(commands=['status'])
def check_status(message):
    if not is_authorized(message): return
    bot.reply_to(message, "Checking Docker status...")
    try:
        result = subprocess.run(['docker', 'ps', '--format', '{{.Names}} - {{.Status}}'], capture_output=True, text=True)
        bot.reply_to(message, f"🐳 **Containers:**\n{result.stdout}")
    except Exception as e:
        bot.reply_to(message, f"Failed to check status: {str(e)}")

@bot.message_handler(commands=['link'])
def get_link(message):
    if not is_authorized(message): return
    try:
        # Check cloudflare.log for recent link
        result = subprocess.run(['grep', '-oE', 'https://[a-zA-Z0-9-]+\.trycloudflare\.com', 'cloudflare.log'], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        if lines and lines[0]:
            bot.reply_to(message, f"🔗 Current Link:\n{lines[-1]}")
        else:
             bot.reply_to(message, "No link found in logs yet. Try /deploy.")
    except Exception as e:
        bot.reply_to(message, f"Error finding link: {str(e)}")

@bot.message_handler(commands=['deploy', 'update'])
def deploy_server(message):
    if not is_authorized(message): return
    
    bot.reply_to(message, "🛠️ Starting Skyvault deployment sequence...\nPulling from GitHub and starting Docker...")
    
    # Run the auto-deploy.sh script explicitly via bash
    try:
        # Run script in foreground of the terminal so user can see it
        bot.reply_to(message, "Deployment running. Check your server terminal, you will receive the final Cloudflare link shortly...")
        process = subprocess.Popen(['/bin/bash', 'auto-deploy.sh'])
        
        # Wait for the script to finish
        process.wait()
        
        if process.returncode != 0:
            bot.reply_to(message, "⚠️ Deployment encountered an error. Please check the server terminal for details.")
            
    except Exception as e:
         bot.reply_to(message, f"Failed to run deploy script: {str(e)}")

print("Skyvault Telegram Bot started. Listening for commands...")
bot.infinity_polling()
