from flask import Flask

# Initialize Flask app
app = Flask(__name__)

# Load configuration
app.config['SECRET_KEY'] = '8a64dae5133aafa1a20eef4e5bd5f642cf7bce7ae80fa6cefad30189057bdf42'  # Replace with env var in production

# Import routes (after app is created to avoid circular imports)
from app import routes
