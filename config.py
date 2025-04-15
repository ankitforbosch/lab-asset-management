import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GOOGLE_CREDENTIALS = os.getenv('GOOGLE_CREDENTIALS')
    if GOOGLE_CREDENTIALS:
        with open("credentials.json", "w") as cred_file:
            cred_file.write(GOOGLE_CREDENTIALS)
