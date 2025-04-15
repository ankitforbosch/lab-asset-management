from flask import Flask
import os
from dotenv import load_dotenv

# Initialize environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Ensure credentials.json exists for Google Sheets
    if not os.path.exists('credentials.json') and os.getenv('GOOGLE_CREDENTIALS'):
        with open('credentials.json', 'w') as cred_file:
            cred_file.write(os.getenv('GOOGLE_CREDENTIALS'))
    
    # Register blueprints/routes
    from app.routes import bp as main_bp
    app.register_blueprint(main_bp)
    
    # Create necessary directories
    os.makedirs('app/static/js', exist_ok=True)
    os.makedirs('app/static/css', exist_ok=True)
    os.makedirs('app/templates', exist_ok=True)
    
    return app
