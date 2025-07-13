from us_visa.logger import logging
from us_visa.exception import USvisaException
import sys
logging.info("Starting the application")

try:
    logging.info("We are dividing 1 by 0")
    result = 1/0
except Exception as e:
    logging.error(e)
    raise USvisaException(e, sys)

