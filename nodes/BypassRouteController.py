from typing import Tuple, Dict, Any

class BypassRouteController:
	"""
	A controller node that centralizes the bypass logic of multiple nodes.
	The primary logic is handled via the front-end JS extension for immediate 
	UI responsiveness. This backend node parses the active index to the workflow.
	"""
	
	@classmethod
	def INPUT_TYPES(cls) -> Dict[str, Any]:
		return {
			"required": {
				"active_index": ("INT", {"default": 1, "min": 1, "max": 64}),
				"inverted": ("BOOLEAN", {"default": False}),
			},
			"hidden": {
				"unique_id": "UNIQUE_ID", 
				"extra_pnginfo": "EXTRA_PNGINFO"
			}
		}

	RETURN_TYPES = ("INT",)
	RETURN_NAMES = ("selected index",)
	FUNCTION = "execute"
	CATEGORY = "Multi Route Tools"
	TITLE = "Bypass Route Controller"

	def execute(self, active_index: int, inverted: bool, unique_id: str = None, extra_pnginfo: dict = None) -> Tuple[int]:
		"""
		Outputs the 1-based index of the currently active route.
		"""
		return (active_index,)

	@classmethod
	def IS_CHANGED(cls, active_index: int, inverted: bool, **kwargs) -> float:
		"""
		Forces the node to execute and update even if inputs appear unchanged.
		Returns NaN to ensure ComfyUI re-evaluates the bypass state dynamically.
		"""
		return float("nan")


# ============================================================================
# NODE REGISTRATION
# ============================================================================

NODE_CLASS_MAPPINGS = {
	"BypassRouteController": BypassRouteController,
}

NODE_DISPLAY_NAME_MAPPINGS = {
	"BypassRouteController": "Bypass Route Controller",
}