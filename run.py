from app import create_app

app = create_app()  # Make sure this is named 'app'

if __name__ == "__main__":
    app.run()
