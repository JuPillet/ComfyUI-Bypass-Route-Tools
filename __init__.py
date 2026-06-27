import os
import importlib.util
import sys

NODE_DIR = os.path.join(os.path.dirname(__file__), "nodes")

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./js"

print("--- Loading MultiRouteTools nodes ---")

for filename in os.listdir(NODE_DIR):
	if filename.endswith(".py"):
		module_name = filename[:-3]
		file_path = os.path.join(NODE_DIR, filename)
		
		try:
			spec = importlib.util.spec_from_file_location(module_name, file_path)
			module = importlib.util.module_from_spec(spec)
			sys.modules[module_name] = module
			spec.loader.exec_module(module)
			
			if hasattr(module, "NODE_CLASS_MAPPINGS"):
				NODE_CLASS_MAPPINGS.update(module.NODE_CLASS_MAPPINGS)
				NODE_DISPLAY_NAME_MAPPINGS.update(module.NODE_DISPLAY_NAME_MAPPINGS)
				print(f"Loaded: {module_name}")
		except Exception as e:
			print(f"Error loading {filename}: {e}")