from typing import Tuple, Dict, Any

class BypassRouteSwitcher:
	@classmethod
	def INPUT_TYPES(cls) -> Dict[str, Any]:
		return {
			"required": {
				# Default initial list; JS will overwrite and populate choices at runtime
				"controller": (["Select a BypassRouteController..."],),
				# The index corresponding to the "index" widget retrieved and configured by JS
				"index": ("INT", {"default": 1, "min": 1, "max": 64, "step": 1}),
			},
			"hidden": {
				"unique_id": "UNIQUE_ID",
				"extra_pnginfo": "EXTRA_PNGINFO"
			}
		}

	RETURN_TYPES = ("*",)
	RETURN_NAMES = ("output",)
	FUNCTION = "route"
	CATEGORY = "Bypass Route Tools"
	TITLE = "Bypass Route Switcher"

	def route(self, controller: str, index: int, **kwargs) -> Tuple[Any]:
		# JS generates input entries named "input_1", "input_2", etc.
		input_name = f"input_{index}"
		
		# Retrieve the value connected to the corresponding dynamic input
		value = kwargs.get(input_name, None)
		return (value,)

	@classmethod
	def VALIDATE_INPUTS(cls, **kwargs) -> bool:
		"""
		FORCES VALIDATION: Essential to avoid ComfyUI's 'Value not in list' error 
		since the dropdown choices change dynamically on the JS side.
		"""
		return True

	@classmethod
	def IS_CHANGED(cls, **kwargs) -> float:
		"""
		Forces node execution to ensure real-time responsiveness 
		when paths or indices change.
		"""
		return float("nan")

NODE_CLASS_MAPPINGS = {"BypassRouteSwitcher": BypassRouteSwitcher}
NODE_DISPLAY_NAME_MAPPINGS = {"BypassRouteSwitcher": "Bypass Route Switcher"}