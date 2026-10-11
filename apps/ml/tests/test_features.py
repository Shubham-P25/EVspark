import sys
import os

ml_service_tests = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml-service", "tests"))
sys.path.insert(0, ml_service_tests)

from test_features import *
