import os
import subprocess
import time
import threading
import telebot
from telebot import TeleBot
from telebot.types import ReplyKeyboardMarkup, KeyboardButton
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
deploying = False  # Prevent concurrent deploys

def is_authorized(message):
    return str(message.chat.id) == CHAT_ID

def get_keyboard():
    markup = ReplyKeyboardMarkup(row_width=3, resize_keyboard=True)
    markup.add(KeyboardButton('deploy'), KeyboardButton('stop'), KeyboardButton('status'))
    markup.add(KeyboardButton('link'), KeyboardButton('logs'))
    return markup

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    if not is_authorized(message): return
    bot.reply_to(message, "online. (use buttons)", reply_markup=get_keyboard())

@bot.message_handler(commands=['status'])
@bot.message_handler(func=lambda msg: msg.text == 'status')
def check_status(message):
    if not is_authorized(message): return
    bot.reply_to(message, "checking status...")
    try:
        result = subprocess.run(['docker', 'ps', '--format', '{{.Names}} - {{.Status}}'], capture_output=True, text=True)
        bot.reply_to(message, f"containers:\n{result.stdout}")
    except Exception as e:
        bot.reply_to(message, f"Failed to check status: {str(e)}")

@bot.message_handler(commands=['link'])
@bot.message_handler(func=lambda msg: msg.text == 'link')
def get_link(message):
    if not is_authorized(message): return
    try:
        # Check cloudflare.log for recent link
        result = subprocess.run(['grep', '-oE', 'https://[a-zA-Z0-9-]+\\.trycloudflare\\.com', 'cloudflare.log'], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        if lines and lines[0]:
            bot.reply_to(message, f"link: {lines[-1]}")
        else:
             bot.reply_to(message, "no link. deploy first.")
    except Exception as e:
        bot.reply_to(message, f"Error finding link: {str(e)}")

@bot.message_handler(commands=['stop'])
@bot.message_handler(func=lambda msg: msg.text == 'stop')
def stop_server(message):
    if not is_authorized(message): return
    bot.reply_to(message, "stopping server...")
    try:
        # Kill Cloudflare tunnel
        subprocess.run(['pkill', '-f', 'cloudflared tunnel'], capture_output=True)
        # Stop Docker containers
        result = subprocess.run(['docker', 'compose', 'down'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
        if result.returncode != 0:
            # Fallback to docker-compose
            result = subprocess.run(['docker-compose', 'down'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
        bot.reply_to(message, "server stopped.")
    except Exception as e:
        bot.reply_to(message, f"stop failed: {str(e)}")

@bot.message_handler(commands=['logs'])
@bot.message_handler(func=lambda msg: msg.text == 'logs')
def get_logs(message):
    if not is_authorized(message): return
    try:
        result = subprocess.run(['docker', 'compose', 'logs', '--tail', '20'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
        output = result.stdout.strip() or result.stderr.strip() or 'no logs.'
        # Telegram msg limit is 4096 chars
        if len(output) > 4000:
            output = output[-4000:]
        bot.reply_to(message, output)
    except Exception as e:
        bot.reply_to(message, f"logs failed: {str(e)}")

def run_deploy(chat_id):
    """Run deployment in background thread so bot stays responsive."""
    global deploying
    try:
        process = subprocess.run(
            ['/bin/bash', 'auto-deploy.sh'],
            capture_output=True, text=True, timeout=600  # 10 min max
        )
        if process.returncode == 0:
            bot.send_message(chat_id, "deploy finished.")
        else:
            # Send last 10 lines of output for debugging
            output = (process.stdout + process.stderr).strip().split('\n')[-10:]
            bot.send_message(chat_id, f"deploy error:\n{''.join(output[-5:])}")
    except subprocess.TimeoutExpired:
        bot.send_message(chat_id, "deploy timed out (10min). check server.")
    except Exception as e:
        bot.send_message(chat_id, f"deploy failed: {str(e)}")
    finally:
        deploying = False

@bot.message_handler(commands=['deploy', 'update'])
@bot.message_handler(func=lambda msg: msg.text == 'deploy')
def deploy_server(message):
    if not is_authorized(message): return
    global deploying
    if deploying:
        bot.reply_to(message, "already deploying. wait.")
        return
    deploying = True
    bot.reply_to(message, "deploying... (bot stays responsive)")
    thread = threading.Thread(target=run_deploy, args=(message.chat.id,), daemon=True)
    thread.start()

print("bot started.")
bot.set_my_commands([
    telebot.types.BotCommand("deploy", "Deploy/redeploy the server"),
    telebot.types.BotCommand("stop", "Stop all containers and tunnel"),
    telebot.types.BotCommand("status", "Check container health"),
    telebot.types.BotCommand("link", "Get the current live URL"),
    telebot.types.BotCommand("logs", "View recent container logs"),
])
bot.infinity_polling()
