import sys


from us_visa.exception import USvisaException
from us_visa.logger import logging

import os
from dotenv import load_dotenv
from pathlib import Path

from us_visa.constants import DATABASE_NAME, connection_url
import pymongo
import certifi

ca = certifi.where()

class MongoDBClient:
    client = None

    def __init__(self, database_name=DATABASE_NAME) -> None:
        try:
            if MongoDBClient.client is None:
                env_path = Path('') / '.env' 
                # load_dotenv(dotenv_path=env_path)
                load_dotenv()
                mongo_db_url = os.getenv("connection_url")
                if mongo_db_url is None:
                    raise Exception(f"Environment key: {connection_url} is not set.")
                MongoDBClient.client = pymongo.MongoClient(mongo_db_url, tlsCAFile = ca)
            self.client = MongoDBClient.client
            self.database = self.client[database_name]
            self.database_name = database_name
            logging.info("MongoDB connection successfull")
        except Exception as e:
            raise USvisaException(e, sys)




















