from flask import Flask
from . import routes

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = '8a64dae5133aafa1a20eef4e5bd5f642cf7bce7ae80fa6cefad30189057bdf42'
    
    # Register routes
    app.register_blueprint(routes.bp)
    
    return app
