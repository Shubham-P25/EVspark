import sys
import os

ml_service_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ml-service"))
if ml_service_path not in sys.path:
    sys.path.insert(0, ml_service_path)

from features import *
